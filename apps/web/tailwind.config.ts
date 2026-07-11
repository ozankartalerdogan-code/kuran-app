import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // dark: sınıfları OS temasına değil, yalnızca gece modu düğmesinin
  // eklediği html.night-mode sınıfına bağlı — iki ayrı karanlık sistem
  // (media + night-mode) çakışması bu satırla biter.
  darkMode: ["selector", ".night-mode"],
  theme: {
    extend: {
      fontFamily: {
        // UI tipografisi: sistem sans yığını (indirme yok, her platformda
        // yerli his). Georgia gövde fontu UI elemanlarını amatör gösteriyordu.
        sans: [
          "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI",
          "Roboto", "Helvetica Neue", "Arial", "sans-serif"
        ],
        // Arapça metinler: yerel Amiri + yaygın sistem Arapça fontları.
        // Her iki utility de aynı yığına bağlanır; ileride mushafa özel
        // Scheherazade New eklenirse "scheherazade" ayrışır.
        arabic: ["Amiri", "Scheherazade New", "Traditional Arabic", "serif"],
        scheherazade: ["Amiri", "Scheherazade New", "Traditional Arabic", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
