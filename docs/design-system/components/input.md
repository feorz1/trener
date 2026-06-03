# Input

## Status

- Figma: ready
- Code: ready
- Storybook: ready
- Docs: ready

## Purpose

`Input` lets a trainer enter a single-line value, phone-like double-field value, or inspect validation feedback states.

## Anatomy

- Root: vertical stack.
- Label: field label above the input.
- Field frame: background and focus/error stroke layer.
- Field text: editable text value with fixed vertical padding.
- Message: optional helper or status message.
- Status marker: solid circular marker for `error`, `positive`, and `warning`.
- Prefix field: optional fixed-width field in `doubleField` mode.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `label` | `string` | yes | Visible field label. |
| `value` | `string` | no | Controlled input value. |
| `onChangeText` | `(value: string) => void` | no | Controlled value callback. |
| `message` | `string` | no | Helper or status message. |
| `state` | `"empty" | "default" | "focus" | "error" | "positive" | "warning" | "disabled"` | no | Visual state. |
| `disabled` | `boolean` | no | Disables editing. |
| `doubleField` | `boolean` | no | Shows prefix field plus input field. |
| `prefixValue` | `string` | no | Prefix text for `doubleField`. Defaults to `+1`. |
| `onChangePrefixText` | `(value: string) => void` | no | Controlled prefix value callback for `doubleField`. |
| `showLabel` | `boolean` | no | Shows or hides the label. Defaults to `true`. |
| `showMessage` | `boolean` | no | Shows or hides the helper/status message row. Defaults to `true`. |
| `width` | `"fixed" \| "fill"` | no | Uses the canonical 358px design width by default, or fills the parent preview/container when set to `fill`. |

## States

| State | Purpose |
|---|---|
| `empty` | Empty placeholder input. |
| `default` | Filled neutral input. |
| `focus` | Focused input border. |
| `error` | Validation error. |
| `positive` | Positive validation feedback. |
| `warning` | Warning feedback. |
| `disabled` | Non-editable input. |

## Token Usage

| Usage | Code token |
|---|---|
| field background | `theme.colors.background.canvas` |
| disabled background | `theme.colors.background.canvasSoft` |
| text | `theme.colors.content.ink` |
| helper text | `theme.colors.content.body` |
| muted text | `theme.colors.content.mute` |
| focus border | `theme.colors.content.inkDeep` |
| error | `theme.colors.status.negative` |
| positive | `theme.colors.status.positiveDeep` |
| warning | `theme.colors.status.warningContent` |
| status marker size | `theme.spacing.md` |
| spacing | `theme.spacing.*` |
| radius | `theme.radius.md`, `theme.radius.pill` |
| typography | `theme.typography.body.*`, `theme.typography.caption` |

## Layout Notes

- Field text uses `theme.spacing.md` vertical padding and `theme.spacing.lg` horizontal padding.
- The visual stroke is rendered as an overlay inside the field frame, so focus stroke width does not change text position on iOS.
- Single and double-field variants use the same field text padding.
- Message marker is a filled circle with no icon or glyph inside.
- `showLabel` and `showMessage` must be available in Storybook and mobile preview.
- Use `width="fill"` only inside constrained containers such as Storybook preview cards; standalone examples keep the fixed Figma component width.

## Examples

```tsx
<Input label="Вес" value={weight} onChangeText={setWeight} />
<Input label="Телефон" doubleField prefixValue="+7" value={phone} onChangeText={setPhone} />
<Input label="Email" state="error" message="Введите корректный email" />
```

## QA

- Typecheck: passed after implementation
- Design token audit: passed after implementation
- Figma component set: `Input`, node `103:699`
- Figma source reference: `34:4555`
- Storybook controls: `state`, `label`, `value`, `message`, `disabled`, `doubleField`, `prefixValue`, `showLabel`, `showMessage`
- Double field focus: prefix and value fields focus independently
