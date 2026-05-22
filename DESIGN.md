---
name: The Emerald Canopy
colors:
  background: '#051F20'
  on-background: '#DAF1DE'
  surface: '#051F20'
  on-surface: '#DAF1DE'
  primary: '#8EB69B'
  on-primary: '#051F20'
  primary-container: '#0B2B26'
  on-primary-container: '#DAF1DE'
  secondary: '#163832'
  on-secondary: '#DAF1DE'
  secondary-container: '#235347'
  on-secondary-container: '#DAF1DE'
  surface-container: '#0B2B26'
  surface-container-low: '#051F20'
  surface-container-high: '#163832'
  surface-container-highest: '#235347'
  outline: '#8EB69B'
  outline-variant: '#163832'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  button:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  stack-gap: 16px
  element-gap: 12px
  section-margin: 40px
---

## Brand & Style Description

This design system, **The Emerald Canopy**, is designed to evoke a sense of deep prestige, digital focus, and academic sanctuary for school management. The visual language is deeply atmospheric, using linear color transitions and high tonal shifts.

### 🎨 Color Palette Harmony
The palette is built directly from the provided architectural green palette:
*   **Base Void (#051F20):** Background foundation, establishing a serene dark sanctuary.
*   **Deep Accents (#0B2B26):** Main container backgrounds and glass panels.
*   **Tonal Layers (#163832):** Active hover states, interactive buttons, and high elevation containers.
*   **Active Accents (#235347):** Tag pills, custom selected navigation items, and focus rings.
*   **Luminous Highlights (#8EB69B):** Core brand actions, links, primary buttons, and custom status indicators.
*   **High-Contrast Text (#DAF1DE):** Clean, crisp, high-readability mint-white text for headings, numbers, and descriptive bodies.

### 🔐 Surface Hierarchy & Glassmorphism
We strictly avoid using divider lines. Structural groups are achieved through:
1.  **Background Color Recess:** Alternate listings and sub-sections shift to `#0B2B26` against `#051F20`.
2.  **Backdrop Blurs:** The bottom navigation bar and profile popups float with a `backdrop-filter: blur(24px)` using `#163832` at `60%` opacity.
3.  **Accent Shimmer:** Highlight cards feature a 1px border using `#8EB69B` at `15%` opacity.
