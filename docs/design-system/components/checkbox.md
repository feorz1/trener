# Checkbox

Canonical binary selection control for forms, filters, and checklist-like choices.

## Figma

- Source node: `checkbox`
- Source node ID: `34:3958`
- Component set: `Checkbox`
- Component set node ID: `34:3958`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=34-3958`

## Anatomy

- `root container`: horizontal Auto Layout row with fixed gap.
- `box`: 24x24 selection box with fill or stroke.
- `icon / check`: check marker shown when selected, rendered through the canonical `Icon` pack.
- `label`: optional text label.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `selected` | `Yes`, `No` | `selected` |
| `state` | `Default`, `Error`, `Disabled` | `state`, `disabled` |
| `size` | `md` | `size` |
| `Show label` | `true`, `false` | `showLabel` |

## Figma Variants

| Figma variant | Code props |
|---|---|
| `selected=Yes, state=Default, size=md` | `<Checkbox selected />` |
| `selected=No, state=Default, size=md` | `<Checkbox selected={false} />` |
| `selected=Yes, state=Error, size=md` | `<Checkbox selected state="error" />` |
| `selected=No, state=Error, size=md` | `<Checkbox selected={false} state="error" />` |
| `selected=Yes, state=Disabled, size=md` | `<Checkbox selected disabled />` |
| `selected=No, state=Disabled, size=md` | `<Checkbox selected={false} disabled />` |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| selected box background | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| check mark | `color/background/canvas` | `theme.colors.background.canvas` |
| unchecked box background | `color/background/canvas` | `theme.colors.background.canvas` |
| unchecked border | `color/content/mute` | `theme.colors.content.mute` |
| error fill / border | `color/status/negative` | `theme.colors.status.negative` |
| disabled fill | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| disabled content | `color/content/mute` | `theme.colors.content.mute` |
| label text | `color/content/ink` | `theme.colors.content.ink` |
| root gap | `spacing/lg` | `theme.spacing.lg` |
| box size | component size token | `theme.sizes.checkboxMd` |
| box radius | `radius/sm` | `theme.radius.sm` |
| label typography | `Typography/Body/MD` | `theme.typography.body.md` |
| check icon | `Icons / checkmark`, 24x24 viewport | `<Icon name="checkmark" size={theme.spacing.xl} />` |

## Implementation Requirements

- `Checkbox` uses `accessibilityRole="checkbox"` and exposes checked/disabled accessibility state.
- `onChange` receives the next selected value.
- Disabled checkboxes must not call `onChange`.
- Error checkboxes remain interactive; the error state only changes the box fill or border.
- Label is optional in code, but the canonical Figma variants include a label.
- `showLabel=false` renders the 24x24 control only for trailing slots inside `List item/Cell`.
- The selected check mark must use `src/components/ui/Icon.tsx`, not an inline SVG or direct icon library import.
- All visual styling must come from `src/theme`.

## Examples

```tsx
<Checkbox selected label="Text" />
<Checkbox selected={false} label="Text" />
<Checkbox selected state="error" label="Text" />
<Checkbox selected disabled label="Text" />
<Checkbox selected showLabel={false} />
```
