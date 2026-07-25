---
name: Vibe Deck
colors:
  surface: '#12131b'
  surface-dim: '#12131b'
  surface-bright: '#383941'
  surface-container-lowest: '#0d0e15'
  surface-container-low: '#1a1b23'
  surface-container: '#1e1f27'
  surface-container-high: '#292932'
  surface-container-highest: '#33343d'
  on-surface: '#e3e1ed'
  on-surface-variant: '#c4c5d7'
  inverse-surface: '#e3e1ed'
  inverse-on-surface: '#2f3038'
  outline: '#8e90a0'
  outline-variant: '#444654'
  surface-tint: '#b7c4ff'
  primary: '#b7c4ff'
  on-primary: '#002682'
  primary-container: '#6a89ff'
  on-primary-container: '#002073'
  inverse-primary: '#2a52d2'
  secondary: '#b8c4fe'
  on-secondary: '#202d5d'
  secondary-container: '#3a4678'
  on-secondary-container: '#aab6ef'
  tertiary: '#ffb784'
  on-tertiary: '#4f2500'
  tertiary-container: '#dc7518'
  on-tertiary-container: '#451f00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b6'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4fe'
  on-secondary-fixed: '#081748'
  on-secondary-fixed-variant: '#384475'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb784'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#12131b'
  on-background: '#e3e1ed'
  surface-variant: '#33343d'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
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
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  sidebar-width: 280px
  playback-height: 88px
---

## Brand & Style

The design system is engineered for a high-end, immersive audio experience. It targets a tech-savvy audience that values aesthetic depth and a premium "night-mode" feel. The brand personality has shifted from electric neon to a more sophisticated, atmospheric, and cinematic aesthetic—feeling like a high-fidelity cockpit for sound.

The visual direction is **Glassmorphism**. This style leverages layered translucency to create a sense of physical space within a digital interface. By using high-density backdrop blurs, subtle inner glows, and thin, semi-transparent borders, the UI feels lightweight and sophisticated. The interface should feel like a series of etched glass panels floating over a deep, atmospheric void characterized by cool slate and deep indigo tones.

## Colors

The palette is anchored in a sophisticated dark environment, moving away from pure obsidian toward a more nuanced, neutral-slate foundation.

- **Primary (Cobalt Blue):** Used for active states, primary actions, and brand-heavy moments.
- **Secondary (Steel Blue):** Used for secondary highlights, subtle progress bars, and balanced UI elements.
- **Tertiary (Amber):** A warm accent used for specific "now playing" highlights or high-contrast alerts.
- **Neutral/Background:** The environment is built on a neutral slate foundation, creating a softer, more professional dark mode that reduces eye strain compared to pure black.
- **Glass Effects:** Surfaces are defined not by solid colors, but by `glass_fill` (a very low opacity white) and `glass_stroke` (a thin, luminous border) to simulate the edge of a glass pane.

## Typography

This design system utilizes **Inter** across all levels to maintain a clean, systematic, and utilitarian appearance that doesn't distract from the album artwork. 

Headlines use heavy weights (Bold and ExtraBold) with tight letter spacing to create a high-impact, modern editorial look. For body text on dark backgrounds, slightly increased line height and standard weights ensure readability against glowing glass elements. Label styles are set in uppercase with increased letter spacing to provide a clear distinction for metadata like "Artist Name" or "Genre."

## Layout & Spacing

The layout follows a **fluid grid** model with fixed functional zones. 

1. **The Sidebar:** A fixed-width (280px) vertical container on the left with a high backdrop-blur (40px) and a subtle right-hand border.
2. **The Main Stage:** A fluid content area that expands to fill the screen. Content within this area should use a 12-column grid with 24px gutters.
3. **Floating Playback Bar:** A persistent bottom element that is detached from the window edges (floating). It maintains a 24px margin from the bottom and sides of the viewport.

All spacing is derived from a base-8 unit to ensure mathematical harmony across the interface.

## Elevation & Depth

Depth is conveyed through a "Glass Stack" hierarchy rather than traditional shadows.

- **Level 0 (Base):** Atmospheric Neutral Slate background.
- **Level 1 (Surface):** Main content containers. Backdrop blur: 12px. Fill: `glass_fill`.
- **Level 2 (Cards/Items):** Floating over surfaces. Backdrop blur: 20px. 1px `glass_stroke`.
- **Level 3 (Floating/Overlays):** Playback bar and Modals. Backdrop blur: 40px. Fill: `rgba(255, 255, 255, 0.08)`. These elements should have a "bloom" effect—a soft, low-opacity shadow tinted with the primary cobalt blue to suggest an inner glow.

**Key Rule:** Never use solid black or solid white borders. Always use semi-transparent variants to allow the colors behind the glass to bleed through slightly.

## Shapes

The design system uses a **Rounded** (0.5rem base) shape language. This balances the technical, sharp nature of the slate palette with a friendly, approachable tactile feel.

- **Standard Elements (Buttons, Small Inputs):** 0.5rem (8px).
- **Large Elements (Cards, Modals):** 1rem (16px).
- **Floating Controls (Play/Pause):** 1.5rem (24px) or fully rounded (pill) for circular buttons.
- **Album Art:** Should maintain a 0.5rem radius to align with the card containers.

## Components

### Buttons
Primary buttons use a linear gradient from Cobalt Blue to Steel Blue (45-degree angle). Secondary buttons are "Ghost Glass"—no fill, just a 1px glass stroke and primary-colored text.

### Frosted Glass Cards
Album and playlist cards feature a 1px top-down inner glow. The bottom 30% of the card can feature a slightly darker glass overlay where the text resides to ensure legibility over varying album art colors.

### Floating Playback Bar
This is the most critical component. It must be detached from the bottom screen edge. It features a heavy 40px blur, a subtle 1px border, and uses the primary Cobalt Blue for the progress bar. The progress bar itself should have a `box-shadow` of the same color to create a "neon" glow.

### Input Fields
Inputs are semi-transparent with a 1px `glass_stroke`. On focus, the border color transitions to Cobalt Blue with a soft outer glow.

### Sidebar Lists
Navigation items use a high-contrast white text for the active state, accompanied by a small vertical cobalt blue indicator on the left edge. Hover states should trigger a `rgba(255, 255, 255, 0.05)` background fill with a 4px corner radius.