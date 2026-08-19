# Figma Token Map

`DESIGN.md` is the source of truth for the trainer app design system. Figma local variables and text styles must mirror it, and generated code theme files must mirror those Figma tokens.

Current Figma collection: `Wise / Trainer Tokens` with `Light` and `Dark` modes.

## Color Variables

| Figma variable | Value | Code target |
|---|---:|---|
| `color/content/primary` | `#9FE870` | `theme.colors.content.primary` |
| `color/content/on-primary` | `#0E0F0C` | `theme.colors.content.onPrimary` |
| `color/content/primary-active` | `#CDFFAD` | `theme.colors.content.primaryActive` |
| `color/content/primary-neutral` | `#C5EDAB` | `theme.colors.content.primaryNeutral` |
| `color/content/primary-pale` | `#E2F6D5` | `theme.colors.content.primaryPale` |
| `color/content/ink` | `#0E0F0C` | `theme.colors.content.ink` |
| `color/content/ink-deep` | `#163300` | `theme.colors.content.inkDeep` |
| `color/content/control-accent` | `#163300` | `theme.colors.content.controlAccent` |
| `color/content/body` | `#454745` | `theme.colors.content.body` |
| `color/content/mute` | `#6F716E` | `theme.colors.content.mute` |
| `color/content/disabled` | `#CFCFCF` | `theme.colors.content.disabled` |
| `color/background/canvas` | `#FFFFFF` | `theme.colors.background.canvas` |
| `color/background/canvas-soft` | `#EFEFEF` | `theme.colors.background.canvasSoft` |
| `color/background/border` | `#E9E9E9` | `theme.colors.background.border` |
| `card-divider` | `#F5F4F2` | `theme.colors.background.cardDivider` |
| `color/status/positive` | `#2EAD4B` | `theme.colors.status.positive` |
| `color/status/positive-deep` | `#054D28` | `theme.colors.status.positiveDeep` |
| `color/status/warning` | `#FFD11A` | `theme.colors.status.warning` |
| `color/status/warning-deep` | `#F38800` | `theme.colors.status.warningDeep` |
| `color/status/warning-deep-soft` | `#FDE7CC` | `theme.colors.status.warningDeepSoft` |
| `color/status/warning-darkest` | `#9A5600` | `theme.colors.status.warningDarkest` |
| `color/status/warning-content` | `#4A3B1C` | `theme.colors.status.warningContent` |
| `color/status/negative` | `#D03238` | `theme.colors.status.negative` |
| `color/status/negative-deep` | `#A72027` | `theme.colors.status.negativeDeep` |
| `color/status/negative-darkest` | `#A7000D` | `theme.colors.status.negativeDarkest` |
| `color/status/negative-soft` | `#F6D6D7` | `theme.colors.status.negativeSoft` |
| `color/status/negative-bg` | `#320707` | `theme.colors.status.negativeBg` |
| `color/accent/orange` | `#FFC091` | `theme.colors.accent.orange` |
| `color/accent/cyan` | `#38C8FF` | `theme.colors.accent.cyan` |

## Dark Mode Values

The code palette keeps the same semantic paths and resolves these values in dark mode. Neutral content and surfaces use graphite values; green stays limited to brand actions, selection, and positive states. These values are the target for the Figma collection's `Dark` mode.

| Semantic token | Dark value |
|---|---:|
| `color/content/primary` | `#2F571F` |
| `color/content/on-primary` | `#F5F5F4` |
| `color/content/primary-active` | `#3B682B` |
| `color/content/primary-neutral` | `#416D31` |
| `color/content/primary-pale` | `#21301D` |
| `color/content/ink` | `#F5F5F4` |
| `color/content/ink-deep` | `#F0F0EE` |
| `color/content/control-accent` | `#A9EC7D` |
| `color/content/body` | `#C7C7C4` |
| `color/content/mute` | `#A0A09C` |
| `color/content/disabled` | `#6B6B68` |
| `color/background/canvas` | `#141414` |
| `color/background/canvas-soft` | `#242424` |
| `color/background/border` | `#3A3A3A` |
| `card-divider` | `#2E2E2E` |
| `color/status/positive` | `#66CF7E` |
| `color/status/positive-deep` | `#9FE8AD` |
| `color/status/warning` | `#F2C94C` |
| `color/status/warning-deep` | `#FF9F43` |
| `color/status/warning-deep-soft` | `#3A2813` |
| `color/status/warning-darkest` | `#FFD29A` |
| `color/status/warning-content` | `#2C240D` |
| `color/status/warning-text` | `#FFD29A` |
| `color/status/negative` | `#FF6B70` |
| `color/status/negative-deep` | `#FF8C90` |
| `color/status/negative-darkest` | `#FFB4B7` |
| `color/status/negative-soft` | `#401D20` |
| `color/status/negative-bg` | `#300B0E` |
| `color/accent/orange` | `#FFB47E` |
| `color/accent/cyan` | `#66D4FF` |

## Spacing Variables

| Figma variable | Value | Code target |
|---|---:|---|
| `spacing/xxs` | `2` | `theme.spacing.xxs` |
| `spacing/xs` | `4` | `theme.spacing.xs` |
| `spacing/sm` | `8` | `theme.spacing.sm` |
| `spacing/md` | `12` | `theme.spacing.md` |
| `spacing/lg` | `16` | `theme.spacing.lg` |
| `spacing/xl` | `24` | `theme.spacing.xl` |
| `spacing/2xl` | `32` | `theme.spacing["2xl"]` |
| `spacing/3xl` | `48` | `theme.spacing["3xl"]` |

## Radius Variables

| Figma variable | Value | Code target |
|---|---:|---|
| `radius/none` | `0` | `theme.radius.none` |
| `radius/s` | `4` | `theme.radius.s` |
| `radius/sm` | `8` | `theme.radius.sm` |
| `radius/md` | `12` | `theme.radius.md` |
| `radius/lg` | `16` | `theme.radius.lg` |
| `radius/xl` | `24` | `theme.radius.xl` |
| `radius/pill` | `9999` | `theme.radius.pill` |
| `radius/full` | `9999` | `theme.radius.full` |

## Typography Styles

| Figma text style | Font | Size | Line height | Letter spacing | Code target |
|---|---|---:|---:|---:|---|
| `Typography/Display/Mega` | SF Pro Display Bold | `126` | `107.1` | `0` | `theme.typography.display.mega` |
| `Typography/Display/XXL` | SF Pro Display Bold | `96` | `81.6` | `0` | `theme.typography.display.xxl` |
| `Typography/Display/XL` | SF Pro Display Bold | `64` | `54.4` | `0.22` | `theme.typography.display.xl` |
| `Typography/Display/LG` | SF Pro Display Regular | `47` | `70.5` | `0.37` | `theme.typography.display.lg` |
| `Typography/Display/MD` | SF Pro Display Bold | `40` | `34` | `0.37` | `theme.typography.display.md` |
| `Typography/Display/SM` | SF Pro Display Semibold | `32` | `38.4` | `0.4` | `theme.typography.display.sm` |
| `Typography/Display/XS` | SF Pro Display Medium | `24` | `31.2` | `0.35` | `theme.typography.display.xs` |
| `Typography/Body/LG` | SF Pro Display Semibold | `20` | `24` | `0.38` | `theme.typography.body.lg` |
| `Typography/Body/MD` | SF Pro Display Regular | `16` | `20` | `-0.32` | `theme.typography.body.md` |
| `Typography/Body/MD Strong` | SF Pro Display Medium | `16` | `20` | `-0.32` | `theme.typography.body.mdStrong` |
| `Typography/Body/SM` | SF Pro Display Regular | `14` | `20` | `-0.15` | `theme.typography.body.sm` |
| `Typography/Body/SM Strong` | SF Pro Display Medium | `14` | `18` | `-0.15` | `theme.typography.body.smStrong` |
| `Typography/Body/SM Caption` | SF Pro Display Medium | `12` | `16` | `0` | `theme.typography.body.smCaption` |
| `Typography/Body/Caption` | SF Pro Display Semibold | `10` | `16` | `0.12` | `theme.typography.body.caption` |
| `Typography/Caption` | SF Pro Display Regular | `12` | `16` | `0` | `theme.typography.caption` |
| `Typography/Button/MD` | SF Pro Display Semibold | `16` | `20` | `-0.32` | `theme.typography.button.md` |

## Code Mapping Rules

Figma slash names map to nested `theme.*` paths:

```ts
color/content/primary            -> theme.colors.content.primary
color/content/disabled           -> theme.colors.content.disabled
color/background/canvas             -> theme.colors.background.canvas
color/background/border             -> theme.colors.background.border
color/status/positive           -> theme.colors.status.positive
color/accent/cyan        -> theme.colors.accent.cyan
spacing/md              -> theme.spacing.md
radius/s                -> theme.radius.s
radius/lg               -> theme.radius.lg
Typography/Body/MD      -> theme.typography.body.md
Typography/Button/MD    -> theme.typography.button.md
```

Code theme files should expose one root `theme` object from `src/theme`:

- `src/theme/colors.ts` -> `theme.colors`
- `src/theme/spacing.ts` -> `theme.spacing`
- `src/theme/radius.ts` -> `theme.radius`
- `src/theme/typography.ts` -> `theme.typography`
- `src/theme/index.ts` -> exports `theme`

Components must import tokens from `src/theme` and must not hardcode color literals, one-off spacing values, or local typography constants.

## Sync Direction

1. Edit `DESIGN.md` when the design-system language changes.
2. Update Figma local variables and text styles to match `DESIGN.md`.
3. Generate or update code theme files from the Figma token export.
4. Build components only from these tokens.
