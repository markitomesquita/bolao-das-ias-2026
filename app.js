// =============================================
// BOLÃO DAS IAs - Copa do Mundo 2026
// =============================================

const STORAGE_KEY = "bolao_ias_2026";

// ---- Auto-update ESPN ----
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const WC_START  = "20260611";
const WC_END    = "20260720";

// Polling: 90s durante horário de jogos (13h-24h BRT = 16h-03h UTC), 5min fora
const POLL_ACTIVE_MS = 90  * 1000;
const POLL_IDLE_MS   = 5 * 60 * 1000;

let _pollTimer   = null;
let _lastUpdated = null;
let _fetching    = false;

function isMatchWindow() {
  const h = new Date().getUTCHours(); // BRT = UTC-3
  return h >= 16 || h <= 3;          // 13h–00h BRT
}

function scheduleNextPoll() {
  clearTimeout(_pollTimer);
  _pollTimer = setTimeout(async () => {
    await fetchESPN(true);
    scheduleNextPoll();
  }, isMatchWindow() ? POLL_ACTIVE_MS : POLL_IDLE_MS);
}

async function fetchESPN(silent = false) {
  if (_fetching) return;
  _fetching = true;
  setStatusFetching(true);

  try {
    const url = `${ESPN_BASE}?dates=${WC_START}-${WC_END}&limit=200`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`ESPN API ${res.status}`);
    const data = await res.json();

    let updated = 0;
    const events = data.events || [];

    for (const event of events) {
      const comp    = event.competitions?.[0];
      if (!comp) continue;

      // Só processar jogos já finalizados
      const status  = comp.status?.type?.completed;
      if (!status) continue;

      const home = comp.competitors?.find(c => c.homeAway === "home");
      const away = comp.competitors?.find(c => c.homeAway === "away");
      if (!home || !away) continue;

      const gh = parseInt(home.score);
      const ga = parseInt(away.score);
      if (isNaN(gh) || isNaN(ga)) continue;

      const homePt = toPortuguese(home.team.displayName || home.team.name);
      const awayPt = toPortuguese(away.team.displayName || away.team.name);

      const allMatches = [...state.matches, ...state.knockoutMatches];
      const match = allMatches.find(m =>
        (normalize(m.home) === normalize(homePt) && normalize(m.away) === normalize(awayPt)) ||
        (normalize(m.home) === normalize(awayPt)  && normalize(m.away) === normalize(homePt))
      );

      if (!match) continue;

      const isReversed = normalize(match.home) === normalize(awayPt);
      const newResult  = isReversed
        ? { home: ga, away: gh }
        : { home: gh, away: ga };

      // Só atualiza se resultado mudou (evita re-renders desnecessários)
      if (!match.result ||
          match.result.home !== newResult.home ||
          match.result.away !== newResult.away) {
        match.result = newResult;
        updated++;
      }
    }

    if (updated > 0) {
      saveState();
      renderAll();
      if (!silent) toast(`✅ ${updated} resultado(s) atualizado(s)!`);
    }

    _lastUpdated = new Date();
    setStatusOk();

  } catch (e) {
    setStatusError(e.message);
    if (!silent) toast(`Erro ESPN: ${e.message}`, "error");
  } finally {
    _fetching = false;
  }
}

// ---- Status indicator ----
function setStatusFetching(on) {
  const dot  = document.getElementById("sync-dot");
  const lbl  = document.getElementById("sync-label");
  if (!dot || !lbl) return;
  if (on) {
    dot.className  = "sync-dot fetching";
    lbl.textContent = "Atualizando...";
  }
}

function setStatusOk() {
  const dot = document.getElementById("sync-dot");
  const lbl = document.getElementById("sync-label");
  if (!dot || !lbl) return;
  dot.className   = "sync-dot ok";
  lbl.textContent = `Atualizado às ${_lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function setStatusError(msg) {
  const dot = document.getElementById("sync-dot");
  const lbl = document.getElementById("sync-label");
  if (!dot || !lbl) return;
  dot.className   = "sync-dot error";
  lbl.textContent = "Erro ao sincronizar";
  console.warn("ESPN sync error:", msg);
}

// ---- State ----
let state = {
  groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
  matches: [],
  knockoutMatches: []
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } else {
      state.matches = generateGroupMatches(state.groups);
    }
  } catch (e) {
    state.matches = generateGroupMatches(state.groups);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Scoring ----
function calcPoints(prediction, result, multiplier) {
  if (!prediction || !result) return null;
  const ph = parseInt(prediction.home), pa = parseInt(prediction.away);
  const rh = parseInt(result.home), ra = parseInt(result.away);
  if (isNaN(ph) || isNaN(pa) || isNaN(rh) || isNaN(ra)) return null;
  if (ph === rh && pa === ra) return 3 * multiplier;
  const predOutcome = ph > pa ? "H" : ph < pa ? "A" : "D";
  const realOutcome = rh > ra ? "H" : rh < ra ? "A" : "D";
  if (predOutcome === realOutcome) return 1 * multiplier;
  return 0;
}

function getMultiplier(phase) {
  return PHASES.find(p => p.id === phase)?.multiplier || 1;
}

function calcAllScores() {
  const scores = {};
  for (const ai of AI_NAMES) {
    scores[ai] = { total: 0, exact: 0, correct: 0, wrong: 0, pending: 0, byPhase: {} };
    for (const p of PHASES) scores[ai].byPhase[p.id] = 0;
  }
  const allMatches = [...state.matches, ...state.knockoutMatches];
  for (const match of allMatches) {
    const mult = getMultiplier(match.phase);
    for (const ai of AI_NAMES) {
      if (!match.result) { if (match.predictions[ai]) scores[ai].pending++; continue; }
      const pts = calcPoints(match.predictions[ai], match.result, mult);
      if (pts === null) continue;
      scores[ai].total += pts;
      scores[ai].byPhase[match.phase] = (scores[ai].byPhase[match.phase] || 0) + pts;
      const rawPts = calcPoints(match.predictions[ai], match.result, 1);
      if (rawPts === 3) scores[ai].exact++;
      else if (rawPts === 1) scores[ai].correct++;
      else scores[ai].wrong++;
    }
  }
  return scores;
}

function countImported(ai) {
  const allMatches = [...state.matches, ...state.knockoutMatches];
  return allMatches.filter(m => m.predictions[ai] !== null).length;
}

// ---- Ranking View ----
function renderRanking() {
  const scores = calcAllScores();
  const sorted = AI_NAMES.slice().sort((a, b) => scores[b].total - scores[a].total);

  const grid = document.getElementById("ranking-grid");
  grid.innerHTML = "";

  sorted.forEach((ai, idx) => {
    const s = scores[ai];
    const rankClass = ["rank-1", "rank-2", "rank-3", "rank-4"][idx];
    const imported = countImported(ai);
    const total = state.matches.length + state.knockoutMatches.length;

    const phaseRows = PHASES.map(p => {
      const pts = s.byPhase[p.id] || 0;
      const maxPhase = Math.max(...AI_NAMES.map(a => scores[a].byPhase[p.id] || 0), 1);
      const pct = Math.round((pts / maxPhase) * 100);
      return `<div class="progress-row">
        <span class="progress-lbl">${p.label.split(" ")[0]}</span>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="progress-pts">${pts}</span>
      </div>`;
    }).join("");

    const importedBadge = imported > 0
      ? `<span class="imported-badge">✓ ${imported}/${total} palpites</span>`
      : `<span class="imported-badge missing">⚠ Sem palpites</span>`;

    grid.innerHTML += `
      <div class="ai-card" data-ai="${ai}">
        <div class="card-rank ${rankClass}">${idx + 1}</div>
        <div class="card-logo">${AI_LOGOS[ai]}</div>
        <div class="card-name">${AI_LABELS[ai]}</div>
        ${importedBadge}
        <div class="card-score">${s.total}</div>
        <div class="card-label">pontos totais</div>
        <div class="card-stats">
          <div class="stat"><div class="stat-val" style="color:#22C55E">${s.exact}</div><div class="stat-lbl">Exatos</div></div>
          <div class="stat"><div class="stat-val" style="color:#F59E0B">${s.correct}</div><div class="stat-lbl">Certos</div></div>
          <div class="stat"><div class="stat-val" style="color:#EF4444">${s.wrong}</div><div class="stat-lbl">Erros</div></div>
        </div>
        <div class="card-progress">${phaseRows}</div>
      </div>`;
  });

  const tbody = document.getElementById("ranking-tbody");
  tbody.innerHTML = "";
  sorted.forEach((ai, idx) => {
    const s = scores[ai];
    const medals = ["🥇", "🥈", "🥉", "4️⃣"];
    const allMatches = [...state.matches, ...state.knockoutMatches];
    const played = allMatches.filter(m => m.result && m.predictions[ai]).length;
    const total = allMatches.length;
    tbody.innerHTML += `<tr>
      <td>${medals[idx]}</td>
      <td><span class="ai-logo-sm">${AI_LOGOS[ai]}</span>${AI_LABELS[ai]}</td>
      <td style="font-weight:700">${s.total}</td>
      <td style="color:#22C55E">${s.exact * 3}</td>
      <td style="color:#F59E0B">${s.correct}</td>
      <td>${s.exact}</td>
      <td>${s.correct}</td>
      <td style="color:#EF4444">${s.wrong}</td>
      <td style="color:var(--text-muted)">${played}/${total}</td>
    </tr>`;
  });
}

// ---- Import View ----
function renderImport() {
  // Already static HTML, just update status badges
  for (const ai of AI_NAMES) {
    const count = countImported(ai);
    const total = state.matches.length + state.knockoutMatches.length;
    const el = document.getElementById(`import-status-${ai}`);
    if (el) {
      el.textContent = count > 0 ? `✓ ${count} palpites importados` : "Aguardando documento...";
      el.className = `import-status ${count > 0 ? "ok" : ""}`;
    }
  }
}

function generatePrompt() {
  const allMatches = [...state.matches, ...state.knockoutMatches];
  const groupMatches = allMatches.filter(m => m.phase === "groups");

  let matchList = "";
  const groups = [...new Set(groupMatches.map(m => m.group))].sort();
  for (const g of groups) {
    matchList += `\nGRUPO ${g}:\n`;
    groupMatches.filter(m => m.group === g).forEach((m, i) => {
      matchList += `  Jogo ${i + 1}: ${m.home} x ${m.away}\n`;
    });
  }

  return `Você é um analista esportivo fazendo palpites para um bolão da Copa do Mundo FIFA 2026.

REGRA IMPORTANTE: Use apenas seu conhecimento até 10 de junho de 2026 (dia anterior ao início da Copa). Não considere nenhum resultado real de jogo que já tenha acontecido durante o torneio. Seus palpites devem ser baseados APENAS em análise prévia dos times.

Sua tarefa: prever o placar de TODOS os jogos da fase de grupos listados abaixo.

FORMATO DE RESPOSTA OBRIGATÓRIO:
Para cada jogo, responda EXATAMENTE neste formato (um por linha):
[Time Mandante] [gols] x [gols] [Time Visitante]

Exemplo:
Brasil 2 x 0 Argentina
França 1 x 1 Alemanha

JOGOS PARA PREENCHER:
${matchList}
INSTRUÇÕES ADICIONAIS:
- Preencha TODOS os ${groupMatches.length} jogos, sem pular nenhum
- Use os nomes dos times EXATAMENTE como aparecem na lista acima
- Apenas números inteiros nos placares (sem decimais)
- Não adicione comentários ou justificativas junto aos palpites — somente os placares no formato pedido
- Ao final, adicione uma linha: "FIM DOS PALPITES"`;
}

function showPrompt() {
  const prompt = generatePrompt();
  document.getElementById("prompt-output").value = prompt;
  document.getElementById("prompt-box").style.display = "block";
  document.getElementById("prompt-output").select();
}

function copyPrompt() {
  const ta = document.getElementById("prompt-output");
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => toast("Prompt copiado! Cole em cada IA."));
}

// ---- Parser ----
function normalize(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "").trim();
}

function findMatch(homeRaw, awayRaw) {
  const h = normalize(homeRaw);
  const a = normalize(awayRaw);
  const allMatches = [...state.matches, ...state.knockoutMatches];
  return allMatches.find(m => {
    const mh = normalize(m.home), ma = normalize(m.away);
    return (
      (mh === h && ma === a) ||
      (mh === a && ma === h) ||
      (mh.includes(h) && ma.includes(a)) ||
      (mh.includes(a) && ma.includes(h)) ||
      (h.includes(mh) && a.includes(ma)) ||
      (h.includes(ma) && a.includes(mh))
    );
  }) || null;
}

function parseDocument(text, ai) {
  const lines = text.split("\n");
  let imported = 0, skipped = 0;

  // Match pattern: "Team A N x N Team B" or "Team A N-N Team B"
  const scoreRe = /^(.+?)\s+(\d+)\s*[x×\-:]\s*(\d+)\s+(.+?)[\s.]*$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.toUpperCase().includes("FIM DOS PALPITES")) continue;
    if (line.toUpperCase().startsWith("GRUPO") || line.startsWith("Jogo") || line.startsWith("//")) continue;

    const m = line.match(scoreRe);
    if (!m) continue;

    const [, homeRaw, goalsH, goalsA, awayRaw] = m;
    const match = findMatch(homeRaw.trim(), awayRaw.trim());
    if (!match) { skipped++; continue; }

    const isReversed = normalize(match.home) !== normalize(homeRaw.trim()) &&
      (normalize(match.away) === normalize(homeRaw.trim()) || normalize(match.away).includes(normalize(homeRaw.trim())));

    match.predictions[ai] = isReversed
      ? { home: parseInt(goalsA), away: parseInt(goalsH) }
      : { home: parseInt(goalsH), away: parseInt(goalsA) };

    imported++;
  }

  saveState();
  renderRanking();
  renderImport();
  return { imported, skipped };
}

function handleImport(ai) {
  const ta = document.getElementById(`import-text-${ai}`);
  const text = ta?.value?.trim();
  if (!text) { toast("Cole o documento da IA antes de importar", "error"); return; }

  const { imported, skipped } = parseDocument(text, ai);

  if (imported === 0) {
    toast(`Nenhum palpite reconhecido. Verifique o formato.`, "error");
  } else {
    toast(`${AI_LABELS[ai]}: ${imported} palpites importados! ${skipped > 0 ? `(${skipped} não reconhecidos)` : ""}`);
    ta.value = "";
  }
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
  const allMatches = [...state.matches, ...state.knockoutMatches];
  allMatches.forEach(m => m.predictions[ai] = null);
  saveState();
  renderRanking();
  renderImport();
  toast(`Palpites de ${AI_LABELS[ai]} removidos`);
}

// ---- Results View ----
let currentPhase = "groups";
let currentGroup = "A";

function renderResults() {
  const phaseTabsEl = document.getElementById("phase-tabs");
  phaseTabsEl.innerHTML = PHASES.map(p =>
    `<button class="phase-tab ${currentPhase === p.id ? "active" : ""}" onclick="setPhase('${p.id}')">${p.label}</button>`
  ).join("");

  if (currentPhase === "groups") renderGroupResults();
  else renderKnockoutResults();
}

function setPhase(phase) { currentPhase = phase; renderResults(); }
function setGroup(group) { currentGroup = group; renderGroupResults(); }

function sortByDate(matches) {
  return [...matches].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
}

function renderGroupResults() {
  const groups = Object.keys(state.groups);
  document.getElementById("group-tabs").innerHTML = groups.map(g =>
    `<button class="group-tab ${currentGroup === g ? "active" : ""}" onclick="setGroup('${g}')">Grupo ${g}</button>`
  ).join("");
  document.getElementById("group-tabs").style.display = "flex";

  const matches = sortByDate(state.matches.filter(m => m.group === currentGroup));
  const list = document.getElementById("results-list");
  list.innerHTML = matches.map(m => renderResultCard(m)).join("");
}

function renderKnockoutResults() {
  document.getElementById("group-tabs").innerHTML = "";
  document.getElementById("group-tabs").style.display = "none";

  const phase = PHASES.find(p => p.id === currentPhase);
  const matches = sortByDate(state.knockoutMatches.filter(m => m.phase === currentPhase));
  const list = document.getElementById("results-list");

  list.innerHTML = `
    <div class="add-match-row">
      <input type="text" id="new-home" placeholder="Time mandante">
      <span style="color:var(--text-muted);font-size:12px">×</span>
      <input type="text" id="new-away" placeholder="Time visitante">
      <input type="date" id="new-date">
      <button class="btn-add" onclick="addKnockoutMatch('${currentPhase}')">+ Adicionar Jogo</button>
    </div>
    ${matches.length === 0
      ? `<div class="empty-state" style="padding:30px 20px"><div class="empty-desc">Nenhum jogo adicionado para ${phase.label} ainda.</div></div>`
      : matches.map(m => renderResultCard(m, true)).join("")
    }`;
}

function renderResultCard(match, deletable = false) {
  const mult = getMultiplier(match.phase);
  const hasResult = match.result !== null;
  const rh = hasResult ? match.result.home : "";
  const ra = hasResult ? match.result.away : "";

  const predRows = AI_NAMES.map(ai => {
    const pred = match.predictions[ai];
    if (!pred) return `<div class="prediction-row">
      <span class="pred-ai-name"><span class="pred-logo">${AI_LOGOS[ai]}</span>${AI_LABELS[ai]}</span>
      <span style="color:var(--text-muted);font-size:12px">Sem palpite</span>
    </div>`;

    const ph = pred.home, pa = pred.away;
    let pts = null, ptsClass = "";
    if (hasResult) {
      pts = calcPoints(pred, match.result, mult);
      ptsClass = pts === 3 * mult ? "pts-exact" : pts > 0 ? "pts-correct" : "pts-wrong";
    }
    return `<div class="prediction-row">
      <span class="pred-ai-name"><span class="pred-logo">${AI_LOGOS[ai]}</span>${AI_LABELS[ai]}</span>
      <div class="score-inputs">
        <span class="score-display">${ph}</span>
        <span class="score-sep">×</span>
        <span class="score-display">${pa}</span>
      </div>
      ${pts !== null ? `<span class="pred-points ${ptsClass}">+${pts}pts</span>` : '<span class="pred-points"></span>'}
    </div>`;
  }).join("");

  const deleteBtn = deletable
    ? `<button class="match-delete-btn" onclick="deleteMatch('${match.id}')" title="Remover">✕</button>`
    : "";

  return `
    <div class="match-card ${hasResult ? "has-result completed" : ""}">
      <div class="match-header">
        <div class="match-teams">
          <span>${teamLabel(match.home)}</span>
          <span class="match-vs">vs</span>
          <span>${teamLabel(match.away)}</span>
        </div>
        ${match.date ? `<span class="match-date">${formatDate(match.date)}</span>` : ""}
        ${hasResult ? `<span class="match-result-badge">${rh} × ${ra}</span>` : ""}
        ${deleteBtn}
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
        ${hasResult ? `<button class="btn-clear-result" onclick="clearResult('${match.id}')">Limpar</button>` : ""}
      </div>
    </div>`;
}

function formatDate(d) {
  if (!d) return "";
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
  saveState();
  renderResults();
  renderRanking();
  toast("Resultado salvo! 🎉");
}

function clearResult(matchId) {
  const match = findMatchById(matchId);
  if (!match) return;
  match.result = null;
  saveState();
  renderResults();
  renderRanking();
  toast("Resultado removido");
}

function addKnockoutMatch(phase) {
  const home = document.getElementById("new-home")?.value?.trim();
  const away = document.getElementById("new-away")?.value?.trim();
  const date = document.getElementById("new-date")?.value || "";
  if (!home || !away) { toast("Preencha os dois times", "error"); return; }
  const id = `K${Date.now()}`;
  state.knockoutMatches.push({
    id, phase, home, away, date,
    result: null,
    predictions: { claude: null, chatgpt: null, gemini: null, deepseek: null }
  });
  saveState();
  renderResults();
  renderRanking();
  toast("Jogo adicionado!");
}

function deleteMatch(matchId) {
  state.knockoutMatches = state.knockoutMatches.filter(m => m.id !== matchId);
  saveState();
  renderResults();
  renderRanking();
}

function findMatchById(id) {
  return state.matches.find(m => m.id === id) || state.knockoutMatches.find(m => m.id === id);
}

// ---- Settings ----
function renderSettings() {
  const grid = document.getElementById("teams-grid");
  grid.innerHTML = "";
  for (const [group, teams] of Object.entries(state.groups)) {
    const inputs = teams.map((t, i) =>
      `<input class="team-input" value="${t}" placeholder="Time ${i + 1}" onchange="updateTeam('${group}',${i},this.value)">`
    ).join("");
    grid.innerHTML += `<div class="group-editor"><h3>Grupo ${group}</h3>${inputs}</div>`;
  }
}

function updateTeam(group, idx, value) { state.groups[group][idx] = value; }

function applyTeams() {
  if (!confirm("Isso vai recriar todos os jogos da fase de grupos e apagar palpites e resultados existentes. Continuar?")) return;
  state.matches = generateGroupMatches(state.groups);
  saveState();
  toast("Times atualizados! Jogos recriados.");
  renderRanking();
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
      try {
        state = JSON.parse(ev.target.result);
        saveState(); renderAll();
        toast("Dados importados com sucesso!");
      } catch { toast("Erro ao importar arquivo", "error"); }
    };
    reader.readAsText(e.target.files[0]);
  };
  input.click();
}

function resetData() {
  if (!confirm("Tem certeza? Isso apagará TODOS os dados do bolão!")) return;
  state = {
    groups: JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
    matches: generateGroupMatches(JSON.parse(JSON.stringify(DEFAULT_GROUPS))),
    knockoutMatches: []
  };
  saveState(); renderAll();
  toast("Dados resetados");
}

// ---- Mapeamento inglês → português (football-data.org) ----
const EN_TO_PT = {
  // Grupo A
  "South Africa":                  "África do Sul",
  "Korea Republic":                "Coreia do Sul",
  "Republic of Korea":             "Coreia do Sul",
  "South Korea":                   "Coreia do Sul",
  "Czech Republic":                "Rep. Tcheca",
  "Czechia":                       "Rep. Tcheca",
  "Mexico":                        "México",
  // Grupo B
  "Canada":                        "Canadá",
  "Qatar":                         "Catar",
  "Switzerland":                   "Suíça",
  "Bosnia and Herzegovina":        "Bósnia e Herzegovina",
  "Bosnia & Herzegovina":          "Bósnia e Herzegovina",
  "Bosnia-Herzegovina":            "Bósnia e Herzegovina",
  // Grupo C
  "Brazil":                        "Brasil",
  "Morocco":                       "Marrocos",
  "Scotland":                      "Escócia",
  "Haiti":                         "Haiti",
  // Grupo D
  "USA":                           "EUA",
  "United States":                 "EUA",
  "United States of America":      "EUA",
  "Paraguay":                      "Paraguai",
  "Australia":                     "Austrália",
  "Turkey":                        "Turquia",
  "Türkiye":                       "Turquia",
  // Grupo E
  "Germany":                       "Alemanha",
  "Ecuador":                       "Equador",
  "Ivory Coast":                   "Costa do Marfim",
  "Côte d'Ivoire":                 "Costa do Marfim",
  "Cote d'Ivoire":                 "Costa do Marfim",
  "Curacao":                       "Curaçao",
  "Curaçao":                       "Curaçao",
  // Grupo F
  "Netherlands":                   "Países Baixos",
  "Holland":                       "Países Baixos",
  "Japan":                         "Japão",
  "Tunisia":                       "Tunísia",
  "Sweden":                        "Suécia",
  // Grupo G
  "Belgium":                       "Bélgica",
  "Iran":                          "Irã",
  "IR Iran":                       "Irã",
  "Islamic Republic of Iran":      "Irã",
  "Egypt":                         "Egito",
  "New Zealand":                   "Nova Zelândia",
  // Grupo H
  "Spain":                         "Espanha",
  "Uruguay":                       "Uruguai",
  "Saudi Arabia":                  "Arábia Saudita",
  "Cape Verde":                    "Cabo Verde",
  "Cabo Verde":                    "Cabo Verde",
  // Grupo I
  "France":                        "França",
  "Senegal":                       "Senegal",
  "Norway":                        "Noruega",
  "Iraq":                          "Iraque",
  // Grupo J
  "Argentina":                     "Argentina",
  "Austria":                       "Áustria",
  "Algeria":                       "Argélia",
  "Jordan":                        "Jordânia",
  // Grupo K
  "Portugal":                      "Portugal",
  "Colombia":                      "Colômbia",
  "Uzbekistan":                    "Uzbequistão",
  "DR Congo":                      "Rep. Dem. do Congo",
  "Congo DR":                      "Rep. Dem. do Congo",
  "Congo, DR":                     "Rep. Dem. do Congo",
  "Democratic Republic of Congo":  "Rep. Dem. do Congo",
  "Democratic Republic of the Congo": "Rep. Dem. do Congo",
  // Grupo L
  "England":                       "Inglaterra",
  "Croatia":                       "Croácia",
  "Ghana":                         "Gana",
  "Panama":                        "Panamá"
};

function toPortuguese(englishName) {
  if (!englishName) return englishName;
  if (EN_TO_PT[englishName]) return EN_TO_PT[englishName];
  // Fuzzy: tenta normalizar e comparar
  const norm = normalize(englishName);
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    if (normalize(en) === norm) return pt;
  }
  return englishName; // mantém original se não encontrar
}

// ---- API auto-fetch ----
async function fetchResults() {
  const apiKey = (document.getElementById("api-key")?.value?.trim()) || localStorage.getItem("bolao_api_key");
  if (!apiKey) { toast("Insira a API token em ⚙️ Config primeiro", "error"); showView("settings"); return; }

  const btn = document.querySelector('[onclick="fetchResults()"]');
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Buscando..."; }

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED", {
      headers: { "X-Auth-Token": apiKey }
    });

    if (res.status === 401) throw new Error("API key inválida. Verifique a chave.");
    if (res.status === 429) throw new Error("Limite de requisições atingido. Aguarde 1 minuto.");
    if (!res.ok) throw new Error(`Erro na API: ${res.status}`);

    const data = await res.json();

    if (!data.matches || data.matches.length === 0) {
      toast("Nenhum jogo finalizado encontrado ainda.", "error");
      return;
    }

    let updated = 0, skipped = 0, notFound = [];

    for (const game of data.matches) {
      const gh = game.score?.fullTime?.home;
      const ga = game.score?.fullTime?.away;
      if (gh === null || gh === undefined || ga === null || ga === undefined) continue;

      const homePt = toPortuguese(game.homeTeam.name);
      const awayPt = toPortuguese(game.awayTeam.name);

      const allMatches = [...state.matches, ...state.knockoutMatches];
      const match = allMatches.find(m =>
        (normalize(m.home) === normalize(homePt) && normalize(m.away) === normalize(awayPt)) ||
        (normalize(m.home) === normalize(awayPt) && normalize(m.away) === normalize(homePt))
      );

      if (!match) {
        notFound.push(`${homePt} x ${awayPt}`);
        continue;
      }

      const isReversed = normalize(match.home) === normalize(awayPt);
      match.result = isReversed
        ? { home: ga, away: gh }
        : { home: gh, away: ga };
      updated++;
    }

    saveState();
    renderAll();

    let msg = `✅ ${updated} resultado(s) atualizado(s)!`;
    if (notFound.length) msg += ` (${notFound.length} não mapeado(s))`;
    toast(msg);

    if (notFound.length) {
      console.warn("Times não mapeados:", notFound);
    }

  } catch (e) {
    toast(e.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "🔄 Buscar Resultados"; }
  }
}

// ---- API Key persistence ----
function saveApiKey(value) {
  localStorage.setItem("bolao_api_key", value);
}

function toggleApiKey() {
  const input = document.getElementById("api-key");
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

function loadApiKey() {
  const key = localStorage.getItem("bolao_api_key");
  const input = document.getElementById("api-key");
  if (key && input) input.value = key;
}

// ---- Navigation ----
function showView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelector(`[data-view="${view}"]`).classList.add("active");
  if (view === "import") renderImport();
  if (view === "results") renderResults();
  if (view === "settings") { renderSettings(); loadApiKey(); }
}

function renderAll() {
  renderRanking();
  const active = document.querySelector(".view.active")?.id?.replace("view-", "");
  if (active === "import") renderImport();
  if (active === "results") renderResults();
  if (active === "settings") renderSettings();
}

// ---- Toast ----
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3500);
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderRanking();
  // Inicia auto-update imediatamente e agenda próximas chamadas
  fetchESPN(true);
  scheduleNextPoll();
});
