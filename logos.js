// Logos das IAs — usa as imagens da pasta
const AI_LOGOS = {
  claude:   `<img src="claude.png"   alt="Claude"   class="ai-logo-img">`,
  chatgpt:  `<img src="chatgpt.png"  alt="ChatGPT"  class="ai-logo-img">`,
  gemini:   `<img src="gemini.png"   alt="Gemini"   class="ai-logo-img">`,
  deepseek: `<img src="deepseek.png" alt="DeepSeek" class="ai-logo-img">`,
  grok:     `<img src="grok.png"     alt="Grok"     class="ai-logo-img">`
};

// Emojis de bandeira por nome de seleção
const TEAM_FLAGS = {
  // Grupo A
  "África do Sul":          "🇿🇦",
  "Coreia do Sul":          "🇰🇷",
  "Rep. Tcheca":            "🇨🇿",
  "México":                 "🇲🇽",
  // Grupo B
  "Canadá":                 "🇨🇦",
  "Catar":                  "🇶🇦",
  "Suíça":                  "🇨🇭",
  "Bósnia e Herzegovina":   "🇧🇦",
  // Grupo C
  "Brasil":                 "🇧🇷",
  "Marrocos":               "🇲🇦",
  "Escócia":                "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Haiti":                  "🇭🇹",
  // Grupo D
  "EUA":                    "🇺🇸",
  "Paraguai":               "🇵🇾",
  "Austrália":              "🇦🇺",
  "Turquia":                "🇹🇷",
  // Grupo E
  "Alemanha":               "🇩🇪",
  "Equador":                "🇪🇨",
  "Costa do Marfim":        "🇨🇮",
  "Curaçao":                "🇨🇼",
  // Grupo F
  "Países Baixos":          "🇳🇱",
  "Japão":                  "🇯🇵",
  "Tunísia":                "🇹🇳",
  "Suécia":                 "🇸🇪",
  // Grupo G
  "Bélgica":                "🇧🇪",
  "Irã":                    "🇮🇷",
  "Egito":                  "🇪🇬",
  "Nova Zelândia":          "🇳🇿",
  // Grupo H
  "Espanha":                "🇪🇸",
  "Uruguai":                "🇺🇾",
  "Arábia Saudita":         "🇸🇦",
  "Cabo Verde":             "🇨🇻",
  // Grupo I
  "França":                 "🇫🇷",
  "Senegal":                "🇸🇳",
  "Noruega":                "🇳🇴",
  "Iraque":                 "🇮🇶",
  // Grupo J
  "Argentina":              "🇦🇷",
  "Áustria":                "🇦🇹",
  "Argélia":                "🇩🇿",
  "Jordânia":               "🇯🇴",
  // Grupo K
  "Portugal":               "🇵🇹",
  "Colômbia":               "🇨🇴",
  "Uzbequistão":            "🇺🇿",
  "Rep. Dem. do Congo":     "🇨🇩",
  // Grupo L
  "Inglaterra":             "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "Croácia":                "🇭🇷",
  "Gana":                   "🇬🇭",
  "Panamá":                 "🇵🇦"
};

function teamLabel(name) {
  const flag = TEAM_FLAGS[name] || "🏳️";
  return `${flag} ${name}`;
}
