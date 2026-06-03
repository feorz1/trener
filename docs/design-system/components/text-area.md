# TextArea

## Purpose

Multi-line text input for longer trainer notes, exercise comments, client limitations, and workout summaries.

## Figma

- Source node: `Text Area`
- Component set: `TextArea`
- Component set node ID: `116:678`
- Source node ID: `34:5221`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=116-678`

## Anatomy

- `root container`: vertical stack. Owns width, minimum height, and vertical rhythm.
- `label`: optional field label.
- `field`: multiline editable surface with internal padding and focus border.
- `value`: multiline text area content.
- `message`: optional helper or error text below the textarea field.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `label` | `string` | required | Visible when `showLabel=true`. |
| `value` | `string` | `undefined` | Controlled value. |
| `message` | `string` | `Message` | Visible when `showMessage=true`. |
| `state` | `empty \| default \| focus \| error \| disabled` | derived from `value` | Runtime focus overrides this state while editing, except `error` and `disabled`. |
| `disabled` | `boolean` | `state === "disabled"` | Makes native textarea non-editable. |
| `showLabel` | `boolean` | `true` | Maps to Figma boolean property `Label#124:0`. |
| `showMessage` | `boolean` | `true` | Maps to Figma boolean property `Message#124:6`. |
| `width` | `fixed \| fill` | `fixed` | Uses the canonical design width by default, or fills the parent preview/container when set to `fill`. |
| `onChangeText` | `(value: string) => void` | `undefined` | Controlled text update handler. |

## Variants

| Figma variant | Code props |
|---|---|
| `state=Empty, size=md` | `<TextArea state="empty" value="" />` |
| `state=Default, size=md` | `<TextArea state="default" value="Value" />` |
| `state=Focus, size=md` | `<TextArea state="focus" value="Value" />` |
| `state=Error, size=md` | `<TextArea state="error" value="Value" message="Error message" />` |
| `state=Disabled, size=md` | `<TextArea state="disabled" value="Value" disabled />` |

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| field background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| label text | `color/content/ink` | `theme.colors.content.ink` |
| value text | `color/content/ink` | `theme.colors.content.ink` |
| placeholder text | `color/content/mute` | `theme.colors.content.mute` |
| message text | `color/content/body` | `theme.colors.content.body` |
| default border | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| focus border | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| error border/message | `color/status/negative` | `theme.colors.status.negative` |
| disabled fill | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| disabled text | `color/content/mute` | `theme.colors.content.mute` |
| root gap | `spacing/sm` | `theme.spacing.sm` |
| field horizontal padding | `spacing/lg` | `theme.spacing.lg` |
| field vertical padding | `spacing/md` | `theme.spacing.md` |
| field radius | `radius/md` | `theme.radius.md` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |
| value typography | `Typography/Body/MD` | `theme.typography.body.md` |
| message typography | `Typography/Body/SM` | `theme.typography.body.sm` |
| component width | design size token | `theme.sizes.textAreaMdWidth` |
| component min height | design size token | `theme.sizes.textAreaMdHeight` |
| field min height | design size token | `theme.sizes.textAreaFieldMinHeight` |

Use `width="fill"` only inside constrained containers such as Storybook preview cards; standalone examples keep the fixed Figma component width.

## Usage

```tsx
<TextArea
  label="Comment"
  value={comment}
  message="Visible for the trainer only"
  onChangeText={setComment}
/>
```

## Do / Don't

- Do use `TextArea` for long-form text.
- Do keep it controlled through `value` and `onChangeText`.
- Do use `showLabel` and `showMessage` instead of creating separate variants in code.
- Do use `state="error"` for validation errors and `state="disabled"` or `disabled` for locked fields.
- Don't use `TextArea` for weight, reps, dates, or short single-line values.
- Don't override colors, spacing, radius, or typography outside `theme`.
