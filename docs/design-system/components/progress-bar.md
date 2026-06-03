# ProgressBar

Canonical progress indicator for workout completion inside trainer cards.

## Figma

- Source nodes: `295:2261`, `295:2318`, `295:2227`
- Component usage: inside `Card`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=295-2261`

## Anatomy

- `header`: completed exercise count and compact percent badge.
- `track`: 4px horizontal progress surface.
- `fill`: status-colored completion bar.

## Props

| Prop | Type | Description |
|---|---|---|
| `completed` | `number` | Completed exercise count. |
| `total` | `number` | Total exercise count. |
| `label` | `string` | Optional label override. |
| `showBadge` | `boolean` | Shows the percent badge. |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| label text | `color/content/ink` | `theme.colors.content.ink` |
| low progress | `color/status/negative` | `theme.colors.status.negative` |
| medium progress | `color/status/warning-deep` | `theme.colors.status.warningDeep` |
| complete progress | `color/content/primary` | `theme.colors.content.primary` |
| empty track | `color/content/disabled` | `theme.colors.content.disabled` |
| fill separator | `product/background/screen` | `theme.colors.background.canvas` |
| track height | `spacing/xs` | `theme.spacing.xs` |
| fill separator width | 2px stroke | `theme.spacing.xxs` |
| gap | `spacing/sm` | `theme.spacing.sm` |
| track radius | `radius/lg` | `theme.radius.lg` |
| fill radius | `radius/xl` | `theme.radius.xl` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

## Implementation Requirements

- Used by `Card` for in-progress and completed workouts.
- Percent is clamped to `0...100`.
- `0%` renders the disabled track only, without a fill segment.
- `1...99%` renders a 2px canvas-colored separator at the fill edge to match the Figma stroke.
- Percent badge uses canonical `Badge size="sm"`.
- All styling must come from `src/theme`.
