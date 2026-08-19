# MeasurementSlider

## Purpose

`MeasurementSlider` is a controlled horizontal ruler for selecting body measurements during client creation. The current value uses a digit-by-digit rolling transition powered by `number-flow-react-native` while the ruler is dragged or adjusted with accessibility actions.

## Anatomy

- Root: accessible adjustable control that owns the complete spoken value.
- Title: centered measurement label.
- Animated value: current value rendered with tabular numerals; every digit uses the same `NumberFlow` renderer.
- Ruler: horizontally scrolling minor and major ticks with numeric labels.
- Marker: fixed center tick and triangle showing the selected position.
- Fades: non-interactive edge gradients that keep the center value prominent.
- Reference state: optional previous value, arrow, and animated target value.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `title` | `string` | yes | Visible label and accessibility label. |
| `value` | `number` | yes | Controlled selected value. |
| `min` | `number` | yes | Minimum selectable value. |
| `max` | `number` | yes | Maximum selectable value. |
| `step` | `number` | no | Distance between adjacent values. Defaults to `1`. |
| `majorStep` | `number` | no | Distance between labeled major ticks. Defaults to `5`. |
| `onChange` | `(value: number) => void` | yes | Called when the selected value is committed. |
| `referenceValue` | `number` | no | Previous value shown before the target-value arrow. |
| `rangeFrom` | `number` | no | Reserved range-start input used by the client flow. |

## Variants And States

| State | When used | Visual change |
|---|---|---|
| Current value | Age, height, or current weight | One centered animated value. |
| Reference value | Desired weight | Previous value and arrow precede the positive-colored animated target value. |
| Scrolling | Drag or momentum scroll | Value updates digit by digit and the device emits light haptics at discrete steps. |
| Reduced motion | Enabled in system accessibility settings | `NumberFlow` updates the number without rolling animation. |

## Tokens

- Colors: `theme.colors.background.canvas`, `theme.colors.content.ink`, `theme.colors.content.disabled`, `theme.colors.content.controlAccent`, `theme.colors.status.positive`.
- Typography: `theme.typography.body.lg`, `theme.typography.body.md`, `theme.typography.display.xl`.
- Spacing: `theme.spacing.xs`, `theme.spacing.md`, `theme.spacing.lg`, `theme.spacing.xl`, `theme.spacing["3xl"]`.
- Radius: `theme.radius.xl`.
- Sizes: `theme.sizes.measurementSlider*`.
- Motion: library defaults are used with the native gradient mask enabled through `@rednegniw/masked-view`; `respectMotionPreference` remains enabled. The leading integer digit uses the same glyph metrics as the rolling digits but does not animate, so rapid slider updates keep the value complete and baseline-aligned.

## Figma

- Component name: `MeasurementSlider`.
- Component set: not yet registered.
- Variant properties: `referenceValue` presence.
- Source: body-parameters screenshot supplied for the client-creation flow.

## Usage

```tsx
<MeasurementSlider
  title="Текущий рост"
  value={height}
  min={0}
  max={250}
  majorStep={5}
  onChange={setHeight}
/>
```

## Do

- Keep the component controlled and store committed values in the parent form.
- Use it for ordered numeric measurements where the ruler gives useful context.
- Preserve the parent adjustable accessibility semantics and Reduce Motion behavior.

## Don't

- Do not use the web-only `@number-flow/react` package in native screens.
- Do not add independently accessible children inside the adjustable control.
- Do not disable motion preferences for this decorative transition.
