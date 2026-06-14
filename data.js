// Copa do Mundo 2026 - Dados iniciais
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
  { id: "groups", label: "Fase de Grupos", multiplier: 1 },
  { id: "r32",    label: "Oitavas de Final", multiplier: 2 },
  { id: "qf",     label: "Quartas de Final", multiplier: 3 },
  { id: "sf",     label: "Semifinal", multiplier: 4 },
  { id: "third",  label: "3º Lugar", multiplier: 4 },
  { id: "final",  label: "Final", multiplier: 5 }
];

const AI_NAMES = ["claude", "chatgpt", "gemini", "deepseek"];
const AI_LABELS = {
  claude:   "Claude",
  chatgpt:  "ChatGPT",
  gemini:   "Gemini",
  deepseek: "DeepSeek"
};

// Generate group stage matches from teams
function generateGroupMatches(groups) {
  const matches = [];
  let id = 1;
  for (const [group, teams] of Object.entries(groups)) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: `G${id++}`,
          phase: "groups",
          group,
          home: teams[i],
          away: teams[j],
          date: "",
          result: null,
          predictions: { claude: null, chatgpt: null, gemini: null, deepseek: null }
        });
      }
    }
  }
  return matches;
}
