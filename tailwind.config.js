/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#051F20", // Base Void
          light: "#F3F4F6",   
        },
        surface: {
          DEFAULT: "#0B2B26", // Deep Accents
          light: "#FFFFFF",
        },
        primary: {
          50: "#DAF1DE",      // High-contrast text
          100: "#c3eccf",
          500: "#8EB69B",     // Luminous Sage/Green Highlight
          600: "#8EB69B",
          700: "#8EB69B",
          DEFAULT: "#8EB69B",
        },
        accent: {
          emerald: "#8EB69B",
          gold: "#F59E0B",
          purple: "#163832",  // Tonal layers
          rose: "#F43F5E",
        },
        neutral: {
          text: "#DAF1DE",     // High contrast mint-white text
          muted: "#8EB69B",    // Sage secondary
          border: "#163832",   // Tonal borders
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Outfit", "sans-serif"],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(5, 31, 32, 0.6)',
        'premium': '0 20px 40px -15px rgba(0, 0, 0, 0.8)',
        'glow-primary': '0 0 15px rgba(142, 182, 155, 0.35)',
        'glow-emerald': '0 0 15px rgba(142, 182, 155, 0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pulse-glow': 'pulseGlow 2s infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 2px rgba(99, 102, 241, 0.2))' },
          '100%': { transform: 'scale(1.02)', filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' },
        }
      }
    },
  },
  plugins: [],
}
