# Color

## Metadata

- Tier: foundations
- Source: `DESIGN.md`
- Figma: `Wise / Trainer Tokens`
- Code: `theme.colors`

## Overview

Use grouped Figma variables and nested code tokens. Do not use raw hex values in component code.

## Token Groups

- `color/content/*` -> `theme.colors.content.*`
- `color/background/*` -> `theme.colors.background.*`
- `color/status/*` -> `theme.colors.status.*`
- `color/accent/*` -> `theme.colors.accent.*`

## Usage

- Primary actions: `color/content/primary`
- Text on primary: `color/content/on-primary`
- Page/card surfaces: `color/background/canvas`, `color/background/canvas-soft`
- Subtle card stroke: `color/background/border`
- Card slot separators: `card-divider`
- Semantic status: `color/status/*`
- Illustration accents only: `color/accent/*`

## Audit

Raw hex, `rgb()`, and `rgba()` values are not allowed in components or app screens.
