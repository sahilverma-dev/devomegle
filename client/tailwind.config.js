/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1360px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        faint: "hsl(var(--faint))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        signal: {
          DEFAULT: "hsl(var(--signal))",
          foreground: "hsl(var(--signal-foreground))",
        },
        ok: "hsl(var(--ok))",
        warn: "hsl(var(--warn))",
      },
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        tactile:
          "inset 0 1px 0 0 hsl(0 0% 100% / 0.09), 0 1px 2px 0 hsl(0 0% 0% / 0.55)",
        "tactile-primary":
          "inset 0 1px 0 0 hsl(0 0% 100% / 0.9), 0 1px 2px 0 hsl(0 0% 0% / 0.6)",
        panel:
          "inset 0 1px 0 0 hsl(0 0% 100% / 0.04), 0 24px 48px -32px hsl(0 0% 0% / 0.9)",
        recessed: "inset 0 1px 3px 0 hsl(0 0% 0% / 0.6)",
        float: "0 24px 64px -24px hsl(0 0% 0% / 0.9)",
      },
      keyframes: {
        "sheet-in": {
          from: { transform: "translateY(24px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        scan: {
          to: { transform: "rotate(360deg)" },
        },
        dash: {
          from: { strokeDashoffset: "240" },
          to: { strokeDashoffset: "0" },
        },
        "ping-slow": {
          "0%": { transform: "scale(0.85)", opacity: "0.7" },
          "70%, 100%": { transform: "scale(1.9)", opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "sheet-in": "sheet-in 0.32s cubic-bezier(0.32, 0.72, 0, 1) both",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        scan: "scan 7s linear infinite",
        dash: "dash 6s linear infinite",
        "ping-slow": "ping-slow 3.2s cubic-bezier(0, 0, 0.2, 1) infinite",
        shimmer: "shimmer 1.8s infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
