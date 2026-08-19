# Color

## Metadata

- Tier: foundations
- Source: `DESIGN.md`
- Figma: `Wise / Trainer Tokens`
- Code: `theme.colors`

## Overview

Use grouped Figma variables and nested code tokens. Do not use raw hex values in component code.

The application supports `system`, `light`, and `dark` appearance preferences. Components always consume the same semantic token paths; `ThemeProvider` and platform-adaptive colors resolve their light or dark values. Do not add `isDark` props to components.

## Token Groups

- `color/content/*` -> `theme.colors.content.*`
- `color/background/*` -> `theme.colors.background.*`
- `color/status/*` -> `theme.colors.status.*`
- `color/accent/*` -> `theme.colors.accent.*`

## Usage

- Primary actions: `color/content/primary`
- Primary control fills, selected indicators, and focus rings: `color/content/control-accent`
- Text on primary: `color/content/on-primary`
- Page/card surfaces: `color/background/canvas`, `color/background/canvas-soft`
- Subtle card stroke: `color/background/border`
- Card slot separators: `card-divider`
- Semantic status: `color/status/*`
- Illustration accents only: `color/accent/*`

## Dark Mode

- Keep page, card, inactive control, border, general-purpose icon, and secondary-text neutrals achromatic. Do not tint neutral roles with brand green.
- Use lightness to separate base and elevated surfaces: `canvas` is the base surface and `canvas-soft` is the brighter secondary/control surface.
- Reserve `controlAccent` green for brand actions, selected states, and focus; use other green tokens only for progress and positive status feedback.
- Dark values are designed counterparts, not literal RGB inversions of the light palette.

## Audit

Raw hex, `rgb()`, and `rgba()` values are not allowed in components or app screens.

Run `npm run theme:contrast` after changing color values. Normal text pairs documented by that test must remain at or above WCAG AA `4.5:1` in both modes.
