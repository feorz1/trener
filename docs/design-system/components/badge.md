# Badge

## Status

- Figma: ready
- Code: ready
- Docs: ready

## Purpose

`Badge` communicates a compact status or classification. It is used in workout cards, client states, summaries, alerts, and inline metadata.

## Anatomy

- Root: Auto Layout horizontal pill container.
- Optional icon: 8x8 status marker shown when `icon=true`.
- Label: text node using `Typography/Body/SM Strong`.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `tone` | `"error" | "info" | "success" | "warning" | "neutral" | "negativeSolid" | "warningDeep" | "primary"` | yes | Semantic visual tone. |
| `size` | `"md" | "sm"` | no | Current supported sizes. Defaults to `md`. |
| `icon` | `boolean` | no | Shows or hides the status marker. |
| `children` or `label` | `string` | yes | Visible badge text. |

## Variants

| Figma variant |
|---|
| `tone=error, size=md, icon=true` |
| `tone=info, size=md, icon=true` |
| `tone=success, size=md, icon=true` |
| `tone=warning, size=md, icon=true` |
| `tone=neutral, size=md, icon=false` |
| `tone=negativeSolid, size=sm, icon=false` |
| `tone=warningDeep, size=sm, icon=false` |
| `tone=primary, size=sm, icon=false` |

`size=sm` is the compact progress badge used inside `ProgressBar` and workout cards. It is 24 px tall with `spacing/sm` horizontal padding and `spacing/xxs` vertical padding.

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| error background | `color/status/negative-bg` | `theme.colors.status.negativeBg` |
| error text | `color/background/canvas` | `theme.colors.background.canvas` |
| error icon | `color/status/negative` | `theme.colors.status.negative` |
| info background | `color/accent/cyan` | `theme.colors.accent.cyan` |
| info text/icon | `color/content/ink` | `theme.colors.content.ink` |
| success background | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| success text | `color/status/positive-deep` | `theme.colors.status.positiveDeep` |
| success icon | `color/status/positive` | `theme.colors.status.positive` |
| warning background | `color/status/warning` | `theme.colors.status.warning` |
| warning text/icon | `color/status/warning-content` | `theme.colors.status.warningContent` |
| warning deep background | `color/status/warning-deep` | `theme.colors.status.warningDeep` |
| solid negative background | `color/status/negative` | `theme.colors.status.negative` |
| primary background | `color/content/primary` | `theme.colors.content.primary` |
| neutral background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| neutral text | `color/content/body` | `theme.colors.content.body` |
| vertical padding | `spacing/xs` | `theme.spacing.xs` |
| horizontal padding | `spacing/md` | `theme.spacing.md` |
| gap | `spacing/xs` | `theme.spacing.xs` |
| min height | `spacing/2xl` | `theme.spacing["2xl"]` |
| small min height | `spacing/xl` | `theme.spacing.xl` |
| radius | `radius/pill` | `theme.radius.pill` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

## Figma QA

- Variables applied: yes
- Text styles applied: yes
- Auto Layout: yes
- Instances tested: yes
- Component set node: `89:596`

## Code QA

- Typecheck: pending after code sync
- Dev-kit examples: pending after code sync
- Hardcoded color audit: pending after code sync
