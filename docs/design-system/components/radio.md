# Radio

Canonical single-choice selection control for radio groups and mutually exclusive options.

## Figma

- Source node: `radio`
- Source node ID: `34:5090`
- Component set: `Radio`
- Component set node ID: `34:5090`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=34-5090`

## Anatomy

- `root container`: horizontal Auto Layout row with fixed gap.
- `radio control`: 24x24 circular control.
- `outer`: radio outline and surface.
- `dot`: inner selected indicator shown only when selected.
- `label`: optional text label.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `selected` | `boolean` | `false` | Maps to Figma variant prop `selected=Yes/No`. |
| `state` | `default`, `error`, `disabled` | `default` | Maps to Figma variant prop `state`. |
| `disabled` | `boolean` | `false` | Forces disabled behavior. |
| `label` | `string` | `Text` | Optional visible label. |
| `showLabel` | `boolean` | `true` | Hides label for control-only trailing usage inside `List item/Cell`. |
| `size` | `md` | `md` | Only canonical size. |
| `onChange` | `(selected: boolean) => void` | `undefined` | Called with the next selected value. |

## Variants

| Figma variant | Code props |
|---|---|
| `selected=Yes, state=Default, size=md` | `<Radio selected />` |
| `selected=No, state=Default, size=md` | `<Radio selected={false} />` |
| `selected=Yes, state=Error, size=md` | `<Radio selected state="error" />` |
| `selected=No, state=Error, size=md` | `<Radio selected={false} state="error" />` |
| `selected=Yes, state=Disabled, size=md` | `<Radio selected disabled />` |
| `selected=No, state=Disabled, size=md` | `<Radio selected={false} disabled />` |

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| selected outline / dot | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| control background | `color/background/canvas` | `theme.colors.background.canvas` |
| unchecked outline | `color/content/mute` | `theme.colors.content.mute` |
| error outline / dot | `color/status/negative` | `theme.colors.status.negative` |
| disabled selected fill | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| disabled content | `color/content/mute` | `theme.colors.content.mute` |
| label text | `color/content/ink` | `theme.colors.content.ink` |
| root gap | `spacing/lg` | `theme.spacing.lg` |
| control size | component size token | `theme.sizes.radioMd` |
| dot size | component size token | `theme.sizes.radioDot` |
| control radius | `radius/full` | `theme.radius.full` |
| label typography | `Typography/Body/MD` | `theme.typography.body.md` |

## Usage

```tsx
<Radio selected={value === "first"} label="Text" onChange={() => setValue("first")} />
```

## Do / Don't

- Do use `Radio` inside a radio group for mutually exclusive options.
- Do use `state="error"` when the group has a validation problem.
- Do keep label text short enough for one row unless the parent layout supports wrapping.
- Do use `showLabel={false}` when Radio is used as a control-only trailing action inside `List item/Cell`.
- Don't use `Radio` for independent multi-select choices; use `Checkbox`.
