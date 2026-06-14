// Copa do Mundo 2026 - Dados iniciais
const DEFAULT_GROUPS = {
  A: ["México", "Equador", "Croácia", "Marrocos"],
  B: ["EUA", "Panamá", "Bolívia", "Nova Zelândia"],
  C: ["Canadá", "Portugal", "Argélia", "Uruguai"],
  D: ["Espanha", "Japão", "Camarões", "Chile"],
  E: ["França", "Sérvia", "Costa Rica", "Coréia do Sul"],
  F: ["Alemanha", "Colômbia", "Egito", "Arábia Saudita"],
  G: ["Argentina", "Holanda", "Venezuela", "Quênia"],
  H: ["Brasil", "Bélgica", "Japão", "Guatemala"],
  I: ["Inglaterra", "Itália", "Costa do Marfim", "Eslováquia"],
  J: ["Austrália", "Turquia", "Gabão", "Ucrânia"],
  K: ["Suíça", "Dinamarca", "Nigéria", "Cuba"],
  L: ["Senegal", "Suécia", "Indonésia", "Paraguai"]
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
