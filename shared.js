// =============================================
// SHARED — scoring, ESPN, state (público + admin)
// =============================================

const STORAGE_KEY  = "bolao_ias_2026";
const JSONBIN_ID        = "6a2eca44da38895dfebf3453";
const JSONBIN_READ      = "https://api.jsonbin.io/v3/b/" + JSONBIN_ID + "/latest";
const JSONBIN_WRITE     = "https://api.jsonbin.io/v3/b/" + JSONBIN_ID;
const JSONBIN_READ_KEY  = "$2a$10$l5majOY6zob71wzTpdopYeovHE9HERaid1h3bqMe44YWr4/tYFckK";
const JSONBIN_KEY_STORAGE = "bolao_jsonbin_key";
const ESPN_BASE    = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const WC_START     = "20260611";
const WC_END       = "20260720";
const POLL_ACTIVE  = 90  * 1000;   // 90s durante jogos
const POLL_IDLE    = 5 * 60 * 1000; // 5min fora

let _pollTimer  = null;
let _fetching   = false;
let _lastUpdate = null;

// ---- State ----
let state = {
  groups:          JSON.parse(JSON.stringify(DEFAULT_GROUPS)),
  matches:         [],
  knockoutMatches: []
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = { ...state, ...JSON.parse(saved) };
    else       state.matches = generateGroupMatches(state.groups);
  } catch { state.matches = generateGroupMatches(state.groups); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveToCloud().catch(() => {});
}

// ---- Cloud sync (JSONBin) ----
async function saveToCloud() {
  const key = localStorage.getItem(JSONBIN_KEY_STORAGE);
  if (!key) return;
  await fetch(JSONBIN_WRITE, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Master-Key": key },
    body: JSON.stringify(state)
  });
}

async function loadFromCloud() {
  try {
    const masterKey = localStorage.getItem(JSONBIN_KEY_STORAGE);
    const headers = { "X-Access-Key": JSONBIN_READ_KEY };
    if (masterKey) headers["X-Master-Key"] = masterKey;
    const res  = await fetch(JSONBIN_READ, { headers });
    if (!res.ok) return false;
    const data = await res.json();
    const cloud = data.record;
    if (cloud && cloud.groups && Object.keys(cloud.groups).length > 0) {
      state = { ...state, ...cloud };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    }
  } catch {}
  return false;
}

// ---- Scoring ----
function calcPoints(prediction, result, multiplier) {
  if (!prediction || !result) return null;
  const ph = parseInt(prediction.home), pa = parseInt(prediction.away);
  const rh = parseInt(result.home),     ra = parseInt(result.away);
  if (isNaN(ph)||isNaN(pa)||isNaN(rh)||isNaN(ra)) return null;
  if (ph === rh && pa === ra) return 3 * multiplier;
  const pO = ph > pa ? "H" : ph < pa ? "A" : "D";
  const rO = rh > ra ? "H" : rh < ra ? "A" : "D";
  return pO === rO ? 1 * multiplier : 0;
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
  for (const match of [...state.matches, ...state.knockoutMatches]) {
    const mult = getMultiplier(match.phase);
    for (const ai of AI_NAMES) {
      if (!match.result) { if (match.predictions[ai]) scores[ai].pending++; continue; }
      const pts = calcPoints(match.predictions[ai], match.result, mult);
      if (pts === null) continue;
      scores[ai].total += pts;
      scores[ai].byPhase[match.phase] = (scores[ai].byPhase[match.phase] || 0) + pts;
      const raw = calcPoints(match.predictions[ai], match.result, 1);
      if (raw === 3) scores[ai].exact++;
      else if (raw === 1) scores[ai].correct++;
      else scores[ai].wrong++;
    }
  }
  return scores;
}

function countImported(ai) {
  return [...state.matches, ...state.knockoutMatches].filter(m => m.predictions[ai] !== null).length;
}

function totalGames() {
  return state.matches.length + state.knockoutMatches.length;
}

function completedGames() {
  return [...state.matches, ...state.knockoutMatches].filter(m => m.result).length;
}

function recentResults(n = 8) {
  return [...state.matches, ...state.knockoutMatches]
    .filter(m => m.result)
    .sort((a, b) => {
      const dateDiff = (b.date || "").localeCompare(a.date || "");
      if (dateDiff !== 0) return dateDiff;
      return (b.id || "").localeCompare(a.id || "", undefined, { numeric: true });
    })
    .slice(0, n);
}

// ---- Normalize ----
function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}

// ---- EN → PT mapping ----
const EN_TO_PT = {
  "South Africa":"África do Sul","Korea Republic":"Coreia do Sul","Republic of Korea":"Coreia do Sul",
  "South Korea":"Coreia do Sul","Czech Republic":"Rep. Tcheca","Czechia":"Rep. Tcheca","Mexico":"México",
  "Canada":"Canadá","Qatar":"Catar","Switzerland":"Suíça",
  "Bosnia and Herzegovina":"Bósnia e Herzegovina","Bosnia & Herzegovina":"Bósnia e Herzegovina",
  "Bosnia-Herzegovina":"Bósnia e Herzegovina",
  "Brazil":"Brasil","Morocco":"Marrocos","Scotland":"Escócia","Haiti":"Haiti",
  "USA":"EUA","United States":"EUA","United States of America":"EUA",
  "Paraguay":"Paraguai","Australia":"Austrália","Turkey":"Turquia","Türkiye":"Turquia",
  "Germany":"Alemanha","Ecuador":"Equador",
  "Ivory Coast":"Costa do Marfim","Côte d'Ivoire":"Costa do Marfim","Cote d'Ivoire":"Costa do Marfim",
  "Curacao":"Curaçao","Curaçao":"Curaçao",
  "Netherlands":"Países Baixos","Holland":"Países Baixos",
  "Japan":"Japão","Tunisia":"Tunísia","Sweden":"Suécia",
  "Belgium":"Bélgica","Iran":"Irã","IR Iran":"Irã","Islamic Republic of Iran":"Irã",
  "Egypt":"Egito","New Zealand":"Nova Zelândia",
  "Spain":"Espanha","Uruguay":"Uruguai","Saudi Arabia":"Arábia Saudita",
  "Cape Verde":"Cabo Verde","Cabo Verde":"Cabo Verde",
  "France":"França","Senegal":"Senegal","Norway":"Noruega","Iraq":"Iraque",
  "Argentina":"Argentina","Austria":"Áustria","Algeria":"Argélia","Jordan":"Jordânia",
  "Portugal":"Portugal","Colombia":"Colômbia","Uzbekistan":"Uzbequistão",
  "DR Congo":"Rep. Dem. do Congo","Congo DR":"Rep. Dem. do Congo","Congo, DR":"Rep. Dem. do Congo",
  "Democratic Republic of Congo":"Rep. Dem. do Congo",
  "Democratic Republic of the Congo":"Rep. Dem. do Congo",
  "England":"Inglaterra","Croatia":"Croácia","Ghana":"Gana","Panama":"Panamá"
};

function toPortuguese(name) {
  if (!name) return name;
  if (EN_TO_PT[name]) return EN_TO_PT[name];
  const norm = normalize(name);
  for (const [en, pt] of Object.entries(EN_TO_PT))
    if (normalize(en) === norm) return pt;
  return name;
}

function matchInState(homePt, awayPt) {
  return [...state.matches, ...state.knockoutMatches].find(m =>
    (normalize(m.home) === normalize(homePt) && normalize(m.away) === normalize(awayPt)) ||
    (normalize(m.home) === normalize(awayPt)  && normalize(m.away) === normalize(homePt))
  );
}

// ---- ESPN fetch ----
async function fetchESPN(silent = false) {
  if (_fetching) return;
  _fetching = true;
  onSyncStart?.();
  try {
    const res  = await fetch(`${ESPN_BASE}?dates=${WC_START}-${WC_END}&limit=200`);
    if (!res.ok) throw new Error(`ESPN ${res.status}`);
    const data = await res.json();
    let updated = 0;

    for (const event of (data.events || [])) {
      const comp = event.competitions?.[0];
      if (!comp?.status?.type?.completed) continue;
      const home = comp.competitors?.find(c => c.homeAway === "home");
      const away = comp.competitors?.find(c => c.homeAway === "away");
      if (!home || !away) continue;
      const gh = parseInt(home.score), ga = parseInt(away.score);
      if (isNaN(gh) || isNaN(ga)) continue;

      const homePt = toPortuguese(home.team.displayName || home.team.name);
      const awayPt = toPortuguese(away.team.displayName || away.team.name);
      const match  = matchInState(homePt, awayPt);
      if (!match) continue;

      const rev = normalize(match.home) === normalize(awayPt);
      const nr  = rev ? { home: ga, away: gh } : { home: gh, away: ga };
      if (!match.result || match.result.home !== nr.home || match.result.away !== nr.away) {
        match.result = nr;
        updated++;
      }
    }

    if (updated > 0) { saveState(); onResultsUpdated?.(); }
    _lastUpdate = new Date();
    onSyncOk?.(_lastUpdate);
  } catch (e) {
    onSyncError?.(e.message);
  } finally {
    _fetching = false;
  }
}

function isMatchWindow() {
  const h = new Date().getUTCHours();
  return h >= 16 || h <= 3; // 13h–00h BRT
}

function scheduleNextPoll() {
  clearTimeout(_pollTimer);
  _pollTimer = setTimeout(async () => {
    await fetchESPN(true);
    scheduleNextPoll();
  }, isMatchWindow() ? POLL_ACTIVE : POLL_IDLE);
}

function startAutoSync() {
  fetchESPN(true);
  scheduleNextPoll();
}

// Hooks opcionais — cada página implementa os que precisar
let onSyncStart    = null;
let onSyncOk       = null;
let onSyncError    = null;
let onResultsUpdated = null;
