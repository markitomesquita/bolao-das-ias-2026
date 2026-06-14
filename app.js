// =============================================
// BOLÃO DAS IAs - Copa do Mundo 2026
// =============================================

const STORAGE_KEY = "bolao_ias_2026";

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
    scores[ai] = { total: 0, exact: 0, correct: 0, wrong: 0, byPhase: {} };
    for (const p of PHASES) scores[ai].byPhase[p.id] = 0;
  }

  const allMatches = [...state.matches, ...state.knockoutMatches];
  for (const match of allMatches) {
    if (!match.result) continue;
    const mult = getMultiplier(match.phase);
    for (const ai of AI_NAMES) {
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

// ---- Ranking View ----
function renderRanking() {
  const scores = calcAllScores();
  const sorted = AI_NAMES.slice().sort((a, b) => scores[b].total - scores[a].total);
  const maxScore = Math.max(...sorted.map(ai => scores[ai].total), 1);

  // Cards
  const grid = document.getElementById("ranking-grid");
  grid.innerHTML = "";

  sorted.forEach((ai, idx) => {
    const s = scores[ai];
    const rankClass = ["rank-1", "rank-2", "rank-3", "rank-4"][idx];

    const phaseRows = PHASES.map(p => {
      const pts = s.byPhase[p.id] || 0;
      const maxPhase = Math.max(...AI_NAMES.map(a => scores[a].byPhase[p.id] || 0), 1);
      const pct = Math.round((pts / maxPhase) * 100);
      return `<div class="progress-row">
        <span class="progress-lbl">${p.label.split(" ")[0]}</span>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="progress-pts">${pts}</span>
      </div>`;
    }).join("");

    grid.innerHTML += `
      <div class="ai-card" data-ai="${ai}">
        <div class="card-rank ${rankClass}">${idx + 1}</div>
        <div class="card-name">${AI_LABELS[ai]}</div>
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

  // Table
  const tbody = document.getElementById("ranking-tbody");
  tbody.innerHTML = "";
  sorted.forEach((ai, idx) => {
    const s = scores[ai];
    const medals = ["🥇", "🥈", "🥉", "4️⃣"];
    const total = state.matches.length + state.knockoutMatches.length;
    const played = [...state.matches, ...state.knockoutMatches].filter(m => m.result && m.predictions[ai]).length;
    tbody.innerHTML += `<tr>
      <td>${medals[idx]}</td>
      <td><span class="ai-dot dot-${ai}"></span>${AI_LABELS[ai]}</td>
      <td style="font-weight:700">${s.total}</td>
      <td style="color:#22C55E">${s.exact * 3}</td>
      <td style="color:#F59E0B">${s.correct * 1}</td>
      <td>${s.exact}</td>
      <td>${s.correct}</td>
      <td>${s.wrong}</td>
      <td style="color:var(--text-muted)">${played}/${total}</td>
    </tr>`;
  });
}

// ---- Matches View ----
let currentPhase = "groups";
let currentGroup = "A";

function renderMatches() {
  const phaseTabsEl = document.getElementById("phase-tabs");
  phaseTabsEl.innerHTML = PHASES.map(p =>
    `<button class="phase-tab ${currentPhase === p.id ? "active" : ""}" onclick="setPhase('${p.id}')">${p.label}</button>`
  ).join("");

  if (currentPhase === "groups") {
    renderGroupMatches();
  } else {
    renderKnockoutMatches();
  }
}

function setPhase(phase) {
  currentPhase = phase;
  renderMatches();
}

function setGroup(group) {
  currentGroup = group;
  renderGroupMatches();
}

function renderGroupMatches() {
  const groups = Object.keys(state.groups);

  document.getElementById("group-tabs").innerHTML = groups.map(g =>
    `<button class="group-tab ${currentGroup === g ? "active" : ""}" onclick="setGroup('${g}')">Grupo ${g}</button>`
  ).join("");
  document.getElementById("group-tabs").style.display = "flex";

  const matches = state.matches.filter(m => m.group === currentGroup);
  const list = document.getElementById("matches-list");
  list.innerHTML = "";

  if (matches.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚽</div><div class="empty-title">Nenhum jogo</div><div class="empty-desc">Configure os times do Grupo ${currentGroup} na aba Configurações.</div></div>`;
    return;
  }

  matches.forEach(match => {
    list.innerHTML += renderMatchCard(match);
  });
}

function renderKnockoutMatches() {
  document.getElementById("group-tabs").innerHTML = "";
  document.getElementById("group-tabs").style.display = "none";

  const phase = PHASES.find(p => p.id === currentPhase);
  const matches = state.knockoutMatches.filter(m => m.phase === currentPhase);
  const list = document.getElementById("matches-list");
  list.innerHTML = "";

  // Add match form
  list.innerHTML += `
    <div class="add-match-row">
      <input type="text" id="new-home" placeholder="Time mandante">
      <span style="color:var(--text-muted);font-size:12px">×</span>
      <input type="text" id="new-away" placeholder="Time visitante">
      <input type="date" id="new-date" style="color:var(--text-muted)">
      <button class="btn-add" onclick="addKnockoutMatch('${currentPhase}')">+ Adicionar Jogo</button>
    </div>`;

  if (matches.length === 0) {
    list.innerHTML += `<div class="empty-state" style="padding:30px 20px"><div class="empty-desc">Nenhum jogo adicionado para ${phase.label} ainda.</div></div>`;
  } else {
    matches.forEach(match => {
      list.innerHTML += renderMatchCard(match, true);
    });
  }
}

function renderMatchCard(match, deletable = false) {
  const mult = getMultiplier(match.phase);
  const hasResult = match.result !== null;
  const rh = hasResult ? match.result.home : "";
  const ra = hasResult ? match.result.away : "";

  const predRows = AI_NAMES.map(ai => {
    const pred = match.predictions[ai];
    const ph = pred ? pred.home : "";
    const pa = pred ? pred.away : "";
    let pts = null, ptsClass = "";
    if (hasResult && pred) {
      pts = calcPoints(pred, match.result, mult);
      ptsClass = pts === 3 * mult ? "pts-exact" : pts > 0 ? "pts-correct" : "pts-wrong";
    }
    return `<div class="prediction-row">
      <span class="pred-ai-name"><span class="ai-dot dot-${ai}"></span>${AI_LABELS[ai]}</span>
      <div class="score-inputs">
        <input type="number" class="score-input" min="0" max="99" value="${ph}"
          onchange="savePrediction('${match.id}','${ai}','home',this.value)"
          placeholder="-">
        <span class="score-sep">×</span>
        <input type="number" class="score-input" min="0" max="99" value="${pa}"
          onchange="savePrediction('${match.id}','${ai}','away',this.value)"
          placeholder="-">
      </div>
      ${pts !== null ? `<span class="pred-points ${ptsClass}">+${pts}pts</span>` : '<span class="pred-points"></span>'}
    </div>`;
  }).join("");

  const deleteBtn = deletable ? `<button class="match-delete-btn" onclick="deleteMatch('${match.id}')" title="Remover">✕</button>` : "";

  return `
    <div class="match-card ${hasResult ? "has-result completed" : ""}" id="mc-${match.id}">
      <div class="match-header">
        <div class="match-teams">
          <span>${match.home}</span>
          <span class="match-vs">vs</span>
          <span>${match.away}</span>
        </div>
        ${match.date ? `<span class="match-date">${formatDate(match.date)}</span>` : ""}
        ${hasResult ? `<span class="match-result-badge">${rh} × ${ra}</span>` : ""}
        ${deleteBtn}
      </div>
      <div class="match-predictions">${predRows}</div>
      <div class="match-result-row">
        <span class="result-label">Resultado real</span>
        <div class="result-score-inputs">
          <input type="number" class="result-input" min="0" max="99" value="${rh}"
            id="r-home-${match.id}" placeholder="-">
          <span class="score-sep" style="font-size:14px">×</span>
          <input type="number" class="result-input" min="0" max="99" value="${ra}"
            id="r-away-${match.id}" placeholder="-">
        </div>
        <button class="btn-save-result" onclick="saveResult('${match.id}')">Salvar</button>
        ${hasResult ? `<button class="btn-clear-result" onclick="clearResult('${match.id}')">Limpar</button>` : ""}
      </div>
    </div>`;
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch { return d; }
}

// ---- Actions ----
function savePrediction(matchId, ai, side, value) {
  const match = findMatch(matchId);
  if (!match) return;
  if (!match.predictions[ai]) match.predictions[ai] = { home: "", away: "" };
  match.predictions[ai][side] = value === "" ? "" : parseInt(value);
  saveState();
  updateMatchPoints(matchId);
}

function saveResult(matchId) {
  const match = findMatch(matchId);
  if (!match) return;
  const h = document.getElementById(`r-home-${matchId}`)?.value;
  const a = document.getElementById(`r-away-${matchId}`)?.value;
  if (h === "" || a === "") { toast("Preencha o placar completo", "error"); return; }
  match.result = { home: parseInt(h), away: parseInt(a) };
  saveState();
  renderMatches();
  renderRanking();
  toast("Resultado salvo! 🎉");
}

function clearResult(matchId) {
  const match = findMatch(matchId);
  if (!match) return;
  match.result = null;
  saveState();
  renderMatches();
  renderRanking();
  toast("Resultado removido");
}

function updateMatchPoints(matchId) {
  renderRanking();
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
  renderMatches();
  toast("Jogo adicionado!");
}

function deleteMatch(matchId) {
  state.knockoutMatches = state.knockoutMatches.filter(m => m.id !== matchId);
  saveState();
  renderMatches();
  renderRanking();
  toast("Jogo removido");
}

function findMatch(id) {
  return state.matches.find(m => m.id === id) || state.knockoutMatches.find(m => m.id === id);
}

// ---- Settings / Teams ----
function renderSettings() {
  const grid = document.getElementById("teams-grid");
  grid.innerHTML = "";
  for (const [group, teams] of Object.entries(state.groups)) {
    const inputs = teams.map((t, i) =>
      `<input class="team-input" value="${t}" placeholder="Time ${i+1}" onchange="updateTeam('${group}',${i},this.value)">`
    ).join("");
    grid.innerHTML += `<div class="group-editor"><h3>Grupo ${group}</h3>${inputs}</div>`;
  }
}

function updateTeam(group, idx, value) {
  state.groups[group][idx] = value;
}

function applyTeams() {
  state.matches = generateGroupMatches(state.groups);
  saveState();
  toast("Times atualizados! Jogos da fase de grupos recriados.");
  renderRanking();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "bolao-ias-2026.json"; a.click();
  toast("Dados exportados!");
}

function importData() {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        state = JSON.parse(ev.target.result);
        saveState();
        renderAll();
        toast("Dados importados com sucesso!");
      } catch { toast("Erro ao importar arquivo", "error"); }
    };
    reader.readAsText(file);
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
  saveState();
  renderAll();
  toast("Dados resetados");
}

// ---- Auto-fetch results (API) ----
async function fetchResults() {
  const apiKey = document.getElementById("api-key")?.value?.trim();
  if (!apiKey) { toast("Insira a chave da API primeiro", "error"); return; }

  toast("Buscando resultados...");
  try {
    // Using football-data.org API (free tier)
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED", {
      headers: { "X-Auth-Token": apiKey }
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    let updated = 0;
    for (const game of data.matches) {
      const home = game.homeTeam.name;
      const away = game.awayTeam.name;
      const gh = game.score.fullTime.home;
      const ga = game.score.fullTime.away;
      if (gh === null || ga === null) continue;

      const match = state.matches.find(m =>
        (normalize(m.home) === normalize(home) || normalize(m.away) === normalize(home)) &&
        (normalize(m.home) === normalize(away) || normalize(m.away) === normalize(away))
      );
      if (match && !match.result) {
        match.result = {
          home: normalize(match.home) === normalize(home) ? gh : ga,
          away: normalize(match.away) === normalize(away) ? ga : gh
        };
        updated++;
      }
    }
    saveState();
    renderAll();
    toast(`${updated} resultado(s) atualizado(s) via API!`);
  } catch (e) {
    toast(`Erro na API: ${e.message}`, "error");
  }
}

function normalize(s) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// ---- Navigation ----
function showView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`view-${view}`).classList.add("active");
  document.querySelector(`[data-view="${view}"]`).classList.add("active");

  if (view === "matches") renderMatches();
  if (view === "settings") renderSettings();
}

function renderAll() {
  renderRanking();
  if (document.getElementById("view-matches").classList.contains("active")) renderMatches();
  if (document.getElementById("view-settings").classList.contains("active")) renderSettings();
}

// ---- Toast ----
function toast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 3000);
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  renderRanking();
});
