# Divider

## Purpose

`Divider` is a decorative card-slot separator from Figma nodes `465:9862` and `352:2404`. It creates the 6px horizontal gap between stacked rounded card surfaces and renders the four 32px corner masks that preserve the rounded-card silhouette.

## Anatomy

- Root: 320px fixed or parent-filling horizontal container.
- Bar: 6px gap line. This line defines the whole visible spacing between sections.
- Corners: four non-interactive SVG masks positioned outside the bar bounds.

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

## Notes

- The component is decorative and disables pointer events.
- It does not fill the neighboring sections; parent surfaces provide their own background.
- Do not replace the corner SVG paths with remote Figma assets; the Figma asset URLs are temporary.
