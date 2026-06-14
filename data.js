// Copa do Mundo 2026 — Dados oficiais
const DEFAULT_GROUPS = {
  A: ["África do Sul", "Coreia do Sul", "Rep. Tcheca", "México"],
  B: ["Canadá", "Catar", "Suíça", "Bósnia e Herzegovina"],
  C: ["Brasil", "Marrocos", "Escócia", "Haiti"],
  D: ["EUA", "Paraguai", "Austrália", "Turquia"],
  E: ["Alemanha", "Equador", "Costa do Marfim", "Curaçao"],
  F: ["Países Baixos", "Japão", "Tunísia", "Suécia"],
  G: ["Bélgica", "Irã", "Egito", "Nova Zelândia"],
  H: ["Espanha", "Uruguai", "Arábia Saudita", "Cabo Verde"],
  I: ["França", "Senegal", "Noruega", "Iraque"],
  J: ["Argentina", "Áustria", "Argélia", "Jordânia"],
  K: ["Portugal", "Colômbia", "Uzbequistão", "Rep. Dem. do Congo"],
  L: ["Inglaterra", "Croácia", "Gana", "Panamá"]
};

const PHASES = [
  { id: "groups", label: "Fase de Grupos",   multiplier: 1 },
  { id: "r32",    label: "Oitavas de Final",  multiplier: 2 },
  { id: "qf",     label: "Quartas de Final",  multiplier: 3 },
  { id: "sf",     label: "Semifinal",         multiplier: 4 },
  { id: "third",  label: "3º Lugar",          multiplier: 4 },
  { id: "final",  label: "Final",             multiplier: 5 }
];

const AI_NAMES   = ["claude", "chatgpt", "gemini", "deepseek", "grok"];
const AI_LABELS  = { claude: "Claude", chatgpt: "ChatGPT", gemini: "Gemini", deepseek: "DeepSeek", grok: "Grok" };

// Datas dos jogos da fase de grupos (Rodada 1: 11-16/06 | Rodada 2: 17-21/06 | Rodada 3: 22-26/06)
// Formato: "Home|Away|YYYY-MM-DD"
const GROUP_DATES = {
  // Grupo A
  "África do Sul|Coreia do Sul":  "2026-06-11",
  "Rep. Tcheca|México":           "2026-06-11",
  "África do Sul|Rep. Tcheca":    "2026-06-15",
  "Coreia do Sul|México":         "2026-06-15",
  "México|África do Sul":         "2026-06-19",
  "Coreia do Sul|Rep. Tcheca":    "2026-06-19",
  // Grupo B
  "Canadá|Catar":                        "2026-06-11",
  "Suíça|Bósnia e Herzegovina":          "2026-06-12",
  "Canadá|Suíça":                        "2026-06-16",
  "Catar|Bósnia e Herzegovina":          "2026-06-16",
  "Bósnia e Herzegovina|Canadá":         "2026-06-20",
  "Catar|Suíça":                         "2026-06-20",
  // Grupo C
  "Brasil|Marrocos":              "2026-06-12",
  "Escócia|Haiti":                "2026-06-12",
  "Brasil|Escócia":               "2026-06-16",
  "Marrocos|Haiti":               "2026-06-16",
  "Haiti|Brasil":                 "2026-06-20",
  "Marrocos|Escócia":             "2026-06-20",
  // Grupo D
  "EUA|Paraguai":                 "2026-06-12",
  "Austrália|Turquia":            "2026-06-13",
  "EUA|Austrália":                "2026-06-17",
  "Paraguai|Turquia":             "2026-06-17",
  "Turquia|EUA":                  "2026-06-21",
  "Paraguai|Austrália":           "2026-06-21",
  // Grupo E
  "Alemanha|Equador":             "2026-06-13",
  "Costa do Marfim|Curaçao":      "2026-06-13",
  "Alemanha|Costa do Marfim":     "2026-06-17",
  "Equador|Curaçao":              "2026-06-17",
  "Curaçao|Alemanha":             "2026-06-21",
  "Equador|Costa do Marfim":      "2026-06-21",
  // Grupo F
  "Países Baixos|Japão":          "2026-06-14",
  "Tunísia|Suécia":               "2026-06-14",
  "Países Baixos|Tunísia":        "2026-06-18",
  "Japão|Suécia":                 "2026-06-18",
  "Suécia|Países Baixos":         "2026-06-22",
  "Japão|Tunísia":                "2026-06-22",
  // Grupo G
  "Bélgica|Irã":                  "2026-06-14",
  "Egito|Nova Zelândia":          "2026-06-14",
  "Bélgica|Egito":                "2026-06-18",
  "Irã|Nova Zelândia":            "2026-06-18",
  "Nova Zelândia|Bélgica":        "2026-06-22",
  "Irã|Egito":                    "2026-06-22",
  // Grupo H
  "Espanha|Uruguai":              "2026-06-15",
  "Arábia Saudita|Cabo Verde":    "2026-06-15",
  "Espanha|Arábia Saudita":       "2026-06-19",
  "Uruguai|Cabo Verde":           "2026-06-19",
  "Cabo Verde|Espanha":           "2026-06-23",
  "Uruguai|Arábia Saudita":       "2026-06-23",
  // Grupo I
  "França|Senegal":               "2026-06-15",
  "Noruega|Iraque":               "2026-06-15",
  "França|Noruega":               "2026-06-19",
  "Senegal|Iraque":               "2026-06-19",
  "Iraque|França":                "2026-06-23",
  "Senegal|Noruega":              "2026-06-23",
  // Grupo J
  "Argentina|Áustria":            "2026-06-16",
  "Argélia|Jordânia":             "2026-06-16",
  "Argentina|Argélia":            "2026-06-20",
  "Áustria|Jordânia":             "2026-06-20",
  "Jordânia|Argentina":           "2026-06-24",
  "Áustria|Argélia":              "2026-06-24",
  // Grupo K
  "Portugal|Colômbia":            "2026-06-17",
  "Uzbequistão|Rep. Dem. do Congo":"2026-06-17",
  "Portugal|Uzbequistão":         "2026-06-21",
  "Colômbia|Rep. Dem. do Congo":  "2026-06-21",
  "Rep. Dem. do Congo|Portugal":  "2026-06-25",
  "Colômbia|Uzbequistão":         "2026-06-25",
  // Grupo L
  "Inglaterra|Croácia":           "2026-06-17",
  "Gana|Panamá":                  "2026-06-17",
  "Inglaterra|Gana":              "2026-06-21",
  "Croácia|Panamá":               "2026-06-21",
  "Panamá|Inglaterra":            "2026-06-25",
  "Croácia|Gana":                 "2026-06-25"
};

function getMatchDate(home, away) {
  return GROUP_DATES[`${home}|${away}`]
      || GROUP_DATES[`${away}|${home}`]
      || "";
}

// Gera os jogos da fase de grupos com datas
function generateGroupMatches(groups) {
  const matches = [];
  let id = 1;
  for (const [group, teams] of Object.entries(groups)) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const home = teams[i], away = teams[j];
        matches.push({
          id: `G${id++}`,
          phase: "groups",
          group,
          home,
          away,
          date: getMatchDate(home, away),
          result: null,
          predictions: { claude: null, chatgpt: null, gemini: null, deepseek: null, grok: null }
        });
      }
    }
  }
  return matches;
}
