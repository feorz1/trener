# Loader

Canonical loading indicator for buttons and compact waiting states. The visual imitates assembling a dumbbell in five compact states.

## Figma

- Component set: `Loader`
- Component set node ID: `146:1134`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=146-1134`

## Anatomy

- `root container`: Auto Layout horizontal frame.
- `plates`: editable filled dumbbell plates.
- `bar`: center connector.
- `state variants`: five Figma variants that show the assembly sequence from loose parts to full dumbbell.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `size` | `small`, `medium` | `size` |
| `tone` | `brand`, `inverse`, `negative`, `neutral`, `canvas` | `tone` |
| `state` | `state5`, `state4`, `state3`, `state2`, `01` | internal animation frame |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| brand tone | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| inverse tone | `color/content/primary` | `theme.colors.content.primary` |
| negative tone | `color/status/negative` | `theme.colors.status.negative` |
| neutral tone | `color/content/body` | `theme.colors.content.body` |
| canvas tone | `color/background/canvas` | `theme.colors.background.canvas` |
| plate radius | component loader radius | `theme.sizes.loaderCornerRadius` |
| bar radius | component loader radius | `theme.sizes.loaderCornerRadius` |
| dimensions | component size tokens | `theme.sizes.loader*` |

## Implementation Requirements

- `Loader` must be usable standalone and inside `Button`.
- `small` size must fit inside `Button size="smallIcon"` without overflow.
- `Loader` must not own background; parent surfaces control background.
- Code cycles through `state5 -> state4 -> state3 -> state2 -> 01`, pauses on each assembly beat, then holds briefly on the completed dumbbell before restarting.
- Moving plates accelerate into position; the visual must read as assembling, not disassembling.
- Loader parts are filled rounded rectangles without stroke to avoid clipped edges in small button sizes.
- Button loading states must use `Loader`, not inline one-off geometry.
- All colors, radius, spacing, and dimensions must come from `src/theme`.

## Examples

```tsx
<Loader size="medium" tone="brand" />
<Loader size="small" tone="inverse" />
```
