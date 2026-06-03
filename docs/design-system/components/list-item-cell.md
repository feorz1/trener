# List item/Cell

Canonical mobile list row for settings, client metadata, payment-style rows, and compact object lists.

## Figma

- Source node: `container`
- Source node ID: `34:4696`
- Component set: `List item/Cell`
- Component set node ID: `265:1062`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=265-1062`

## Anatomy

- `root container`: Auto Layout horizontal row with white surface, 16px padding, and 16px gap.
- `leading slot`: optional `Avatar` at 40x40 or canonical `Icon`.
- `content`: optional eyebrow, required title, optional subtitle.
- `trailing slot`: optional `Button`, `Checkbox`, `Radio`, `Icon`, `Switch`, `Badge`, text, or none.

Trailing canonical metrics:

- `Button`: hug width, 30px minimum height in the small size.
- `Checkbox` / `Radio`: 24x24 control only when used as a trailing action, with nested `showLabel=false`.
- `Icon`: 20x20 viewport.
- `Switch`: 52x32 control.
- Storybook examples must render inside a 390px frame so trailing actions can be checked against the mobile reference row.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `state` | `Default`, `Pressed`, `Disabled` | `state`, `disabled` |
| `leading` | `none`, `avatar`, `icon` | `leading` |
| `trailing` | `none`, `button`, `checkbox`, `radio`, `icon`, `switch`, `badge`, `text` | `trailing` |
| `showEyebrow` | `true`, `false` | `showEyebrow` |
| `showSubtitle` | `true`, `false` | `showSubtitle` |
| `selected` | `true`, `false` | `selected` |

## Figma Variants

| Figma variant | Code props |
|---|---|
| `state=Default` | `<ListItemCell state="default" />` |
| `state=Pressed` | `<ListItemCell state="pressed" />` |
| `state=Disabled` | `<ListItemCell state="disabled" disabled />` |

Optional leading/trailing/content controls are component properties on each variant. They should not be modeled as a large variant matrix.

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas` | `theme.colors.background.canvas` |
| pressed surface | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| title text | `color/content/ink` | `theme.colors.content.ink` |
| secondary text | `color/content/body` | `theme.colors.content.body` |
| disabled text | `color/content/mute` | `theme.colors.content.mute` |
| padding | `spacing/lg` | `theme.spacing.lg` |
| gap | `spacing/lg` | `theme.spacing.lg` |
| leading avatar size | component size token | `theme.sizes.avatar40` |
| trailing icon size | component size token | `theme.sizes.listItemCellIcon` |
| title typography | `Typography/Body/MD Strong` | `theme.typography.body.mdStrong` |
| eyebrow/subtitle typography | `Typography/Body/SM` | `theme.typography.body.sm` |

## Implementation Requirements

- Use existing canonical components inside slots: `Avatar`, `Button`, `Checkbox`, `Radio`, `Icon`, `Switch`, and `Badge`.
- `Avatar` in the leading slot uses the canonical 40px size.
- Disabled rows must not fire row `onPress`.
- Trailing checkbox, radio, and switch use `selected` and `onSelectedChange`.
- Trailing checkbox and radio must pass `showLabel={false}` rather than hiding label text with an empty string.
- Code exposes slot props rather than separate row components for each action type.
- All visual styling must come from `src/theme`.

## Examples

```tsx
<ListItemCell
  eyebrow="Payment method"
  title="Bank transfer"
  subtitle="Wise account"
  trailing="button"
  buttonLabel="Change"
/>

<ListItemCell title="Allow notifications" showSubtitle={false} trailing="switch" selected />
```
