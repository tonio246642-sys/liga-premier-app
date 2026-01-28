import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Esto le dice a Tailwind: "Busca mis estilos en estas carpetas"
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;