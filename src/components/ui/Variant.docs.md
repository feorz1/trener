# Variant

## Purpose

`Variant` is a controlled value picker for mutually exclusive short values. It is used where an input should be chosen from visible options instead of typed or opened in a modal.

## Anatomy

- Root: vertical field container with optional label and optional message.
- Label: field label using `Typography/Body/SM Strong`.
- Grid: one to five rows, each row containing one to five option cells.
- Option: pressable value cell with default, selected, pressed, and disabled states.
- Message: optional helper row below the grid.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `label` | `string` | yes | Field label. |
| `items` | `Array<{ label: string; value?: string; key?: string; disabled?: boolean }>` | yes | Values to render. Maximum 25. |
| `value` | `string` | yes | Selected value. |
| `onChange` | `(value: string) => void` | yes | Selection callback. |
| `columns` | `number` | no | Preferred values per row. Clamped from 1 to 5 and increased when needed to keep the grid within five rows. Defaults to the item count up to 5. |
| `message` | `string` | no | Helper text. |
| `showLabel` | `boolean` | no | Shows the label. Defaults to `true`. |
| `showMessage` | `boolean` | no | Shows the helper message. Defaults to `false`. |
| `disabled` | `boolean` | no | Disables all options. |
| `width` | `"fixed" \| "fill"` | no | Fixed 375px field width or stretch to parent. |

## Variants And States

- `state=Default`: unselected option, canvas-soft fill and border.
- `state=Selected`: selected option, primary-pale fill and ink-deep border.
- `state=Disabled`: option opacity is reduced and press handling is disabled.
- `showMessage=true`: renders the helper row.

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| selected option background | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| selected option border | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| default option background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| option text | `color/content/ink` | `theme.colors.content.ink` |
| helper text | `color/content/body` | `theme.colors.content.body` |
| disabled text | `color/content/mute` | `theme.colors.content.mute` |
| root padding | `spacing/lg`, `spacing/md` | `theme.spacing.lg`, `theme.spacing.md` |
| row and field gap | `spacing/sm` | `theme.spacing.sm` |
| option padding | `spacing/lg`, `spacing/md` | `theme.spacing.lg`, `theme.spacing.md` |
| option radius | `radius/md` | `theme.radius.md` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |
| option typography | `Typography/Body/MD` | `theme.typography.body.md` |

## Figma

- Component: `Variant`
- Source node: `487:5790`
- Used in screen node: `484:6703`
- Code component: `src/components/ui/Variant.tsx`
- Figma property names should map to code props: `state`, `label`, `showMessage`, and `message`.

## Examples

```tsx
<Variant
  label="Пол"
  items={[
    { value: "male", label: "Мужской" },
    { value: "female", label: "Женский" }
  ]}
  value={gender}
  columns={2}
  onChange={setGender}
/>
```

```tsx
<Variant label="Рост" items={heightOptions} value={height} columns={5} onChange={setHeight} />
```

## Do And Don't

- Do use this component for visible, mutually exclusive option sets with up to 25 values.
- Do use `columns={5}` for dense five-column grids like the Figma matrix.
- Do not use it for switching app views; use `SegmentedControl` for that.
- Do not pass long free-form labels that cannot fit inside compact option cells.
