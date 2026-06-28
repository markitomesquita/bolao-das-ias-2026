// =============================================
// APP.JS — lógica exclusiva do painel admin
// Depende de: shared.js, logos.js, data.js
// =============================================

// ---- Import view ----
function renderImport() {
  for (const ai of AI_NAMES) {
    const count = countImported(ai);
    const total = totalGames();
    const el = document.getElementById(`import-status-${ai}`);
    if (!el) continue;
    el.textContent = count > 0 ? `✓ ${count}/${total} palpites importados` : "Aguardando documento...";
    el.className   = `import-status ${count > 0 ? "ok" : ""}`;
  }
}

function generatePrompt() {
  const groupMatches = state.matches.filter(m => m.phase === "groups");
  const knockoutPhases = PHASES.filter(p => p.id !== "groups");

  const knockoutTodo = knockoutPhases
    .map(p => ({ phase: p, matches: state.knockoutMatches.filter(m => m.phase === p.id) }))
    .filter(({ matches }) => matches.length > 0);

  const hasKnockout = knockoutTodo.length > 0;

  let matchList = "";
  let totalGamesInPrompt = 0;

  if (hasKnockout) {
    for (const { phase, matches } of knockoutTodo) {
      matchList += `\n${phase.label.toUpperCase()}:\n`;
      matches.forEach((m, i) => {
        matchList += `  Jogo ${i + 1}: ${m.home} x ${m.away}\n`;
        totalGamesInPrompt++;
      });
    }
  } else {
    // Fallback: fase de grupos (só usada antes do mata-mata começar)
    const groups = [...new Set(groupMatches.map(m => m.group))].sort();
    for (const g of groups) {
      matchList += `\nGRUPO ${g}:\n`;
      groupMatches.filter(m => m.group === g).forEach((m, i) => {
        matchList += `  Jogo ${i + 1}: ${m.home} x ${m.away}\n`;
        totalGamesInPrompt++;
      });
    }
  }

  const phaseDesc = hasKnockout
    ? knockoutTodo.map(({ phase }) => phase.label).join(" e ")
    : "fase de grupos";

  const cutoffNote = hasKnockout
    ? `REGRA IMPORTANTE: Use apenas seu conhecimento sobre os times classificados. Você pode e deve considerar os resultados da fase de grupos para fazer seus palpites no mata-mata.`
    : `REGRA IMPORTANTE: Use apenas seu conhecimento até 10 de junho de 2026 (dia anterior ao início da Copa). Não considere nenhum resultado real de jogo que já tenha acontecido. Seus palpites devem ser baseados APENAS em análise prévia dos times.`;

  return `Você é um analista esportivo fazendo palpites para um bolão da Copa do Mundo FIFA 2026.

${cutoffNote}

Sua tarefa: prever o placar de TODOS os jogos da ${phaseDesc} listados abaixo.

FORMATO DE RESPOSTA OBRIGATÓRIO — um jogo por linha, exatamente assim:
[Time Mandante] [gols] x [gols] [Time Visitante]

Exemplo:
Brasil 2 x 0 Argentina
França 1 x 1 Alemanha

JOGOS PARA PREENCHER:
${matchList}
INSTRUÇÕES:
- Preencha TODOS os ${totalGamesInPrompt} jogos, sem pular nenhum
- Use os nomes dos times EXATAMENTE como aparecem na lista acima
- Apenas números inteiros nos placares
- Não adicione comentários junto aos palpites
- Ao final, adicione uma linha: "FIM DOS PALPITES"`;
}

function showPrompt() {
  const box = document.getElementById("prompt-box");
  const ta  = document.getElementById("prompt-output");
  if (!box || !ta) return;
  box.style.display = "block";
  ta.value = generatePrompt();
  ta.select();
}

function copyPrompt() {
  const ta = document.getElementById("prompt-output");
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => toast("Prompt copiado!"));
}

// ---- Parser de palpites ----
function parseDocument(text, ai) {
  const scoreRe = /^(.+?)\s+(\d+)\s*[x×\-:]\s*(\d+)\s+(.+?)[\s.]*$/i;
  let imported = 0, skipped = 0;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.toUpperCase().includes("FIM DOS PALPITES")) continue;
    if (/^(GRUPO|Jogo|\/\/)/.test(line)) continue;
    const m = line.match(scoreRe);
    if (!m) continue;
    const [, homeRaw, gh, ga, awayRaw] = m;
    const match = [...state.matches, ...state.knockoutMatches].find(m =>
      fuzzyMatch(m.home, homeRaw.trim(), m.away, awayRaw.trim()) ||
      fuzzyMatch(m.home, awayRaw.trim(), m.away, homeRaw.trim())
    );
    if (!match) { skipped++; continue; }
    const rev = fuzzyMatch(match.away, homeRaw.trim(), match.home, awayRaw.trim()) &&
                !fuzzyMatch(match.home, homeRaw.trim(), match.away, awayRaw.trim());
    match.predictions[ai] = rev
      ? { home: parseInt(ga), away: parseInt(gh) }
      : { home: parseInt(gh), away: parseInt(ga) };
    imported++;
  }
  saveState();
  renderImport();
  return { imported, skipped };
}

function fuzzyMatch(mHome, rawHome, mAway, rawAway) {
  const nh = normalize(rawHome), na = normalize(rawAway);
  return (normalize(mHome).includes(nh) || nh.includes(normalize(mHome))) &&
         (normalize(mAway).includes(na) || na.includes(normalize(mAway)));
}

function handleImport(ai) {
  const ta   = document.getElementById(`import-text-${ai}`);
  const text = ta?.value?.trim();
  if (!text) { toast("Cole o documento antes de importar", "error"); return; }
  const { imported, skipped } = parseDocument(text, ai);
  if (!imported) toast("Nenhum palpite reconhecido. Verifique o formato.", "error");
  else { toast(`${AI_LABELS[ai]}: ${imported} palpites importados!${skipped ? ` (${skipped} não mapeados)` : ""}`); ta.value = ""; }
}

function handleFileImport(ai, input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById(`import-text-${ai}`).value = e.target.result;
    toast("Arquivo carregado. Clique em Importar.");
  };
  reader.readAsText(file);
}

function clearPredictions(ai) {
  if (!confirm(`Apagar todos os palpites de ${AI_LABELS[ai]}?`)) return;
  [...state.matches, ...state.knockoutMatches].forEach(m => m.predictions[ai] = null);
  saveState(); renderImport();
  toast(`Palpites de ${AI_LABELS[ai]} removidos`);
}

// ---- Results view ----
let currentPhase = "groups";
let currentGroup = "A";

function renderResults() {
  document.getElementById("phase-tabs").innerHTML = PHASES.map(p =>
    `<button class="phase-tab ${currentPhase === p.id ? "active" : ""}" onclick="setPhase('${p.id}')">${p.label}</button>`
  ).join("");
  currentPhase === "groups" ? renderGroupResults() : renderKnockoutResults();
}

function setPhase(p) { currentPhase = p; renderResults(); }
function setGroup(g)  { currentGroup = g; renderGroupResults(); }

function renderGroupResults() {
  const groups = Object.keys(state.groups);
  document.getElementById("group-tabs").innerHTML = groups.map(g =>
    `<button class="group-tab ${currentGroup === g ? "active" : ""}" onclick="setGroup('${g}')">Grupo ${g}</button>`
  ).join("");
  document.getElementById("group-tabs").style.display = "flex";
  const matches = sortByDate(state.matches.filter(m => m.group === currentGroup));
  document.getElementById("results-list").innerHTML = matches.map(m => renderResultCard(m)).join("");
}

function renderKnockoutResults() {
  document.getElementById("group-tabs").innerHTML = "";
  document.getElementById("group-tabs").style.display = "none";
  const phase   = PHASES.find(p => p.id === currentPhase);
  const matches = sortByDate(state.knockoutMatches.filter(m => m.phase === currentPhase));
  document.getElementById("results-list").innerHTML = `
    <div class="add-match-row">
      <input type="text"  id="new-home" placeholder="Time mandante">
      <span style="color:var(--text-muted)">×</span>
      <input type="text"  id="new-away" placeholder="Time visitante">
      <input type="date"  id="new-date">
      <button class="btn-add" onclick="addKnockoutMatch('${currentPhase}')">+ Adicionar</button>
    </div>
    ${matches.length ? matches.map(m => renderResultCard(m, true)).join("") :
      `<div class="empty-state" style="padding:30px"><div class="empty-desc">Nenhum jogo adicionado para ${phase.label}.</div></div>`}`;
}

function renderResultCard(match, deletable = false) {
  const mult = getMultiplier(match.phase);
  const rh   = match.result?.home ?? "";
  const ra   = match.result?.away ?? "";

  const predRows = AI_NAMES.map(ai => {
    const pred = match.predictions[ai];
    if (!pred) return `<div class="prediction-row">
      <span class="pred-ai-name"><span class="pred-logo"><img src="${ai}.png" class="ai-logo-img"></span>${AI_LABELS[ai]}</span>
      <span style="color:var(--text-muted);font-size:12px;margin-left:auto">Sem palpite</span>
    </div>`;
    const pts    = match.result ? calcPoints(pred, match.result, mult) : null;
    const rawPts = match.result ? calcPoints(pred, match.result, 1)    : null;
    const cls    = rawPts === 5 ? "pts-exact" : rawPts >= 1 ? "pts-correct" : rawPts === 0 ? "pts-wrong" : "";
    return `<div class="prediction-row">
      <span class="pred-ai-name"><span class="pred-logo"><img src="${ai}.png" class="ai-logo-img"></span>${AI_LABELS[ai]}</span>
      <div class="score-inputs">
        <span class="score-display">${pred.home}</span>
        <span class="score-sep">×</span>
        <span class="score-display">${pred.away}</span>
      </div>
      ${pts !== null ? `<span class="pred-points ${cls}">+${pts}pts</span>` : ""}
    </div>`;
  }).join("");

  return `
  <div class="match-card ${match.result ? "has-result completed" : ""}">
    <div class="match-header">
      <div class="match-teams">
        <span>${teamLabel(match.home)}</span>
        <span class="match-vs">vs</span>
        <span>${teamLabel(match.away)}</span>
      </div>
      ${match.date ? `<span class="match-date">${formatDate(match.date)}</span>` : ""}
      ${match.result ? `<span class="match-result-badge">${rh} × ${ra}</span>` : ""}
      ${deletable ? `<button class="match-delete-btn" onclick="deleteMatch('${match.id}')">✕</button>` : ""}
    </div>
    <div class="match-predictions">${predRows}</div>
    <div class="match-result-row">
      <span class="result-label">Resultado real</span>
      <div class="result-score-inputs">
        <input type="number" class="result-input" min="0" max="99" value="${rh}" id="r-home-${match.id}" placeholder="-">
        <span class="score-sep" style="font-size:14px">×</span>
        <input type="number" class="result-input" min="0" max="99" value="${ra}" id="r-away-${match.id}" placeholder="-">
      </div>
      <button class="btn-save-result" onclick="saveResult('${match.id}')">Salvar</button>
      ${match.result ? `<button class="btn-clear-result" onclick="clearResult('${match.id}')">Limpar</button>` : ""}
    </div>
  </div>`;
}

function sortByDate(arr) {
  return [...arr].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

function formatDate(d) {
  try { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
  catch { return d; }
}

function saveResult(matchId) {
  const match = findMatchById(matchId);
  if (!match) return;
  const h = document.getElementById(`r-home-${matchId}`)?.value;
  const a = document.getElementById(`r-away-${matchId}`)?.value;
  if (h === "" || a === "") { toast("Preencha o placar completo", "error"); return; }
  match.result = { home: parseInt(h), away: parseInt(a) };
  saveState(); renderResults();
  toast("Resultado salvo! ⚽");
}

function clearResult(matchId) {
  const match = findMatchById(matchId);
  if (!match) return;
  match.result = null;
  saveState(); renderResults();
  toast("Resultado removido");
}

function addKnockoutMatch(phase) {
  const home = document.getElementById("new-home")?.value?.trim();
  const away = document.getElementById("new-away")?.value?.trim();
  const date = document.getElementById("new-date")?.value || "";
  if (!home || !away) { toast("Preencha os dois times", "error"); return; }
  state.knockoutMatches.push({
    id: `K${Date.now()}`, phase, home, away, date, result: null,
    predictions: { claude: null, chatgpt: null, gemini: null, deepseek: null, grok: null }
  });
  saveState(); renderResults();
  toast("Jogo adicionado!");
}

function deleteMatch(id) {
  state.knockoutMatches = state.knockoutMatches.filter(m => m.id !== id);
  saveState(); renderResults();
}

function findMatchById(id) {
  return state.matches.find(m => m.id === id) || state.knockoutMatches.find(m => m.id === id);
}

// ---- Settings ----
function renderSettings() {
  const grid = document.getElementById("teams-grid");
  if (!grid) return;
  grid.innerHTML = Object.entries(state.groups).map(([group, teams]) => {
    const inputs = teams.map((t, i) =>
      `<input class="team-input" value="${t}" placeholder="Time ${i+1}" onchange="state.groups['${group}'][${i}]=this.value">`
    ).join("");
    return `<div class="group-editor"><h3>Grupo ${group}</h3>${inputs}</div>`;
  }).join("");
}

function applyTeams() {
  if (!confirm("Isso recria todos os jogos da fase de grupos e apaga palpites/resultados existentes. Continuar?")) return;
  state.matches = generateGroupMatches(state.groups);
  saveState(); renderImport();
  toast("Times atualizados!");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "bolao-ias-2026.json";
  a.click();
  toast("Dados exportados!");
}

function importData() {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json";
  input.onchange = e => {
    const reader = new FileReader();
    reader.onload = ev => {
      try { state = JSON.parse(ev.target.result); saveState(); renderImport(); toast("Dados importados!"); }
      catch { toast("Erro ao importar", "error"); }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function resetData() {
  if (!confirm("Apagar TUDO? Isso não tem volta.")) return;
  state = {
    groups:          JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
    matches:         generateGroupMatches(JSON.parse(JSON.stringify(DEFAULT_GROUPS))),
    knockoutMatches: []
  };
  saveState(); renderImport();
  toast("Dados resetados");
}

// ---- Navigation ----
function showView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`view-${view}`)?.classList.add("active");
  document.querySelector(`[data-view="${view}"]`)?.classList.add("active");
  if (view === "results")  renderResults();
  if (view === "settings") { renderSettings(); if (typeof initJsonBinUI === "function") initJsonBinUI(); }
  if (view === "import")   renderImport();
}

// ---- Toast ----
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}
