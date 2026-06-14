# Figma Token Map

`DESIGN.md` is the source of truth for the trainer app design system. Figma local variables and text styles must mirror it, and generated code theme files must mirror those Figma tokens.

Current Figma collection: `Wise / Trainer Tokens`.

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
| `color/content/body` | `#454745` | `theme.colors.content.body` |
| `color/content/mute` | `#868685` | `theme.colors.content.mute` |
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
| `Typography/Display/Mega` | Inter Bold | `126` | `107.1` | `0` | `theme.typography.display.mega` |
| `Typography/Display/XXL` | Inter Bold | `96` | `81.6` | `0` | `theme.typography.display.xxl` |
| `Typography/Display/XL` | Inter Bold | `64` | `54.4` | `0` | `theme.typography.display.xl` |
| `Typography/Display/LG` | Inter Regular | `47` | `70.5` | `-0.108` | `theme.typography.display.lg` |
| `Typography/Display/MD` | Inter Bold | `40` | `34` | `0` | `theme.typography.display.md` |
| `Typography/Display/SM` | Inter Semi Bold | `32` | `38.4` | `-0.96` | `theme.typography.display.sm` |
| `Typography/Display/XS` | Inter Semi Bold | `24` | `31.2` | `-0.48` | `theme.typography.display.xs` |
| `Typography/Body/LG` | Inter Semi Bold | `20` | `24` | `0` | `theme.typography.body.lg` |
| `Typography/Body/MD` | Inter Regular | `16` | `24` | `0` | `theme.typography.body.md` |
| `Typography/Body/MD Strong` | Inter Semi Bold | `16` | `20` | `0` | `theme.typography.body.mdStrong` |
| `Typography/Body/SM` | Inter Regular | `14` | `20` | `0` | `theme.typography.body.sm` |
| `Typography/Body/SM Strong` | Inter Semi Bold | `14` | `18` | `0` | `theme.typography.body.smStrong` |
| `Typography/Body/SM Caption` | Inter Semi Bold | `12` | `16` | `0` | `theme.typography.body.smCaption` |
| `Typography/Body/Caption` | Inter Semi Bold | `10` | `16` | `0` | `theme.typography.body.caption` |
| `Typography/Caption` | Inter Regular | `12` | `16` | `0` | `theme.typography.caption` |
| `Typography/Button/MD` | Inter Semi Bold | `16` | `20` | `0` | `theme.typography.button.md` |

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
