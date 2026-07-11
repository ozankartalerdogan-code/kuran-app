import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // dark: sınıfları OS temasına değil, yalnızca gece modu düğmesinin
  // eklediği html.night-mode sınıfına bağlı — iki ayrı karanlık sistem
  // (media + night-mode) çakışması bu satırla biter.
  darkMode: ["selector", ".night-mode"],
  theme: {
    extend: {
      // ── Kuran Yolu marka paleti ───────────────────────────────────────
      // navy: birincil kimlik (güven, derinlik) · gold: vurgu (az ve öz)
      // Sıcak nötrler için Tailwind'in stone ölçeği kullanılmaya devam eder.
      colors: {
        navy: {
          50:  "#f3f6fa",
          100: "#e4eaf3",
          200: "#c6d3e5",
          300: "#9db3cf",
          400: "#6f8db4",
          500: "#4d6f9b",
          600: "#3b5881",
          700: "#31486a",
          800: "#2a3c58",
          900: "#1e2c42",
          950: "#131d2e",
        },
        gold: {
          50:  "#fbf7ec",
          100: "#f5ecd3",
          200: "#eadaa5",
          300: "#dcc272",
          400: "#d0ab4c",
          500: "#c2933a",
          600: "#a97730",
          700: "#8a5c2b",
          800: "#724b29",
          900: "#613f26",
          950: "#382112",
        },
      },
      boxShadow: {
        // Premium yumuşak kart gölgesi — sert kenarlı shadow-md yerine
        card: "0 1px 2px rgba(19,29,46,0.05), 0 4px 16px rgba(19,29,46,0.06)",
        "card-hover": "0 2px 4px rgba(19,29,46,0.06), 0 10px 28px rgba(19,29,46,0.10)",
      },
      fontFamily: {
        // Başlık serifi: içerik odaklı, kitap hissi (yalnızca display kullanımında)
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
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
