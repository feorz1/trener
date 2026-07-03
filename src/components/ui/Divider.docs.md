# Divider

## Purpose

`Divider` is a decorative card-slot separator from Figma nodes `465:9862` and `352:2404`. It renders the 6px horizontal gap between stacked rounded card surfaces plus the four 32px corner masks that preserve the rounded-card silhouette.

## Anatomy

- Root: 320px fixed or parent-filling horizontal container.
- Bar: 6px gap line. This line defines the layout spacing between sections.
- Corners: four non-interactive 32px SVG masks that visually bleed above and below the bar.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `type` | `"card"` | No | Current Figma variant. |
| `width` | `"fixed" \| "fill"` | No | `fixed` uses the Figma 320px width; `fill` stretches to the parent. |
| `tone` | `"canvas" \| "canvasSoft" \| "cardDivider"` | No | Gap and corner-mask color. Defaults to the screen usage: `canvasSoft`. |
| `style` | `StyleProp<ViewStyle>` | No | Optional root override for placement only. |
| `testID` | `string` | No | Test selector. |

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| white gap fill | `color/background/canvas` | `theme.colors.background.canvas` |
| default gap fill | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| preview gap fill | `card-divider` | `theme.colors.background.cardDivider` |
| width | component size | `theme.sizes.dividerWidth` |
| height | component size | `theme.sizes.dividerHeight` |
| corner size | component size | `theme.sizes.dividerCorner` |
| overlay stacking | elevation token | `theme.shadows.dividerOverlay` |

## Notes

- The component is decorative and disables pointer events.
- The component contributes only `theme.sizes.dividerHeight` to surrounding layout. Its internal visual box is taller, with negative vertical margins equal to `theme.sizes.dividerCorner`, so the 32px masks stay inside the native view without making the screen seam larger.
- Keep the divider above adjacent section siblings in stacking order and avoid clipping ancestors at the seam; otherwise the lower masks can be hidden by the following section on Android or web screenshots.
- It does not fill the neighboring sections; parent surfaces provide their own background.
- Do not replace the corner SVG paths with remote Figma assets; the Figma asset URLs are temporary.

## Integration Rules

- `Divider` must be a direct sibling between the two surfaces it separates: `top surface -> Divider -> bottom surface`.
- Do not render `Divider` as the first child inside the lower section, scroll body, or list container. That breaks the corner masks because the upper surface is outside the divider's stack context.
- Do not fix divider overlap by adding `theme.sizes.dividerCorner` padding to section headers. Header rhythm should stay on normal spacing tokens; the divider owns the visual seam.
- Do not add extra top radii to the lower section to "help" the divider. The corner masks already form that seam, and duplicate radii create broken double curves.
- Match existing workout screens before changing the divider tone. `summary`, `session`, `approach`, `workouts/new`, and `workouts/exercises` use `tone="canvasSoft"` for the current workout section seam.
