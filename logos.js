// SVG logos das IAs
const AI_LOGOS = {
  claude: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="20" cy="20" r="19" fill="#1a1d27" stroke="#D97706" stroke-width="1.5"/>
    <!-- Anthropic/Claude stylized A -->
    <path d="M20 8 L30 30 H24 L20 22 L16 30 H10 Z" fill="#D97706" opacity="0.15"/>
    <path d="M20 8 L28 29 H25.5 L20 18 L14.5 29 H12 Z" fill="#D97706"/>
    <line x1="15.5" y1="24" x2="24.5" y2="24" stroke="#1a1d27" stroke-width="2.5"/>
  </svg>`,

  chatgpt: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="20" cy="20" r="19" fill="#1a1d27" stroke="#10A37F" stroke-width="1.5"/>
    <!-- OpenAI swirl simplified -->
    <path d="M20 10 C25.5 10 30 13.5 30 18 C30 20.5 28.5 22.8 26 24 C28 25 29.5 27 29.5 29 C29.5 31 27.5 32 25.5 32 C24 32 22.5 31.2 21.5 30 L20 28 L18.5 30 C17.5 31.2 16 32 14.5 32 C12.5 32 10.5 31 10.5 29 C10.5 27 12 25 14 24 C11.5 22.8 10 20.5 10 18 C10 13.5 14.5 10 20 10Z" fill="none" stroke="#10A37F" stroke-width="2"/>
    <circle cx="20" cy="19" r="4" fill="#10A37F" opacity="0.3"/>
    <circle cx="20" cy="19" r="2" fill="#10A37F"/>
  </svg>`,

  gemini: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="20" cy="20" r="19" fill="#1a1d27" stroke="#4285F4" stroke-width="1.5"/>
    <!-- Gemini star shape -->
    <path d="M20 6 C20 6 21.5 14 28 20 C21.5 20 21.5 20 28 20 C21.5 26 20 34 20 34 C20 34 18.5 26 12 20 C18.5 20 18.5 20 12 20 C18.5 14 20 6 20 6Z" fill="#4285F4"/>
    <path d="M20 6 C20 6 21.5 14 28 20 C21.5 26 20 34 20 34 C20 34 18.5 26 12 20 C18.5 14 20 6 20 6Z" fill="url(#gemini-grad)" opacity="0.6"/>
    <defs>
      <linearGradient id="gemini-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#EA4335"/>
        <stop offset="50%" stop-color="#4285F4"/>
        <stop offset="100%" stop-color="#34A853"/>
      </linearGradient>
    </defs>
  </svg>`,

  deepseek: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
    <circle cx="20" cy="20" r="19" fill="#1a1d27" stroke="#7C3AED" stroke-width="1.5"/>
    <!-- DeepSeek D shape -->
    <path d="M12 11 H19 C24.5 11 29 15.5 29 21 C29 26.5 24.5 31 19 31 H12 Z" fill="none" stroke="#7C3AED" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 16 H19 C21.8 16 24 18.2 24 21 C24 23.8 21.8 26 19 26 H12 Z" fill="#7C3AED" opacity="0.4"/>
    <circle cx="25" cy="13" r="2.5" fill="#7C3AED"/>
  </svg>`
};
