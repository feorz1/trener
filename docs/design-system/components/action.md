# Action

Canonical action group for modal and sheet footer buttons.

## Figma

- Source node ID: `250:1890`
- Component set: `Action`
- Component set node ID: `250:1890`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=250-1890`

## Anatomy

- `root container`: Auto Layout action area with white surface and 24px padding.
- `button slots`: one, two, or three canonical `Button` instances.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `layout` | `single`, `stacked`, `inline`, `triple` | `layout` |

## Figma Variants

| Figma variant | Code props |
|---|---|
| `layout=single` | `<Action layout="single" />` |
| `layout=stacked` | `<Action layout="stacked" />` |
| `layout=inline` | `<Action layout="inline" />` |
| `layout=triple` | `<Action layout="triple" />` |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas` | `theme.colors.background.canvas` |
| padding | `spacing/xl` | `theme.spacing.xl` |
| gap | `spacing/md` | `theme.spacing.md` |
| buttons | `Button` component tokens | `Button` component tokens |

## Implementation Requirements

- `Action` must compose existing canonical `Button` only.
- `single` and `stacked` layouts render full-width buttons.
- `inline` and `triple` layouts distribute buttons equally.
- Button labels, types, states, and handlers are configurable through action configs.
- All styling must come from `src/theme`.

## Examples

```tsx
<Action layout="single" />
<Action layout="stacked" secondary={{ label: "Cancel", type: "secondaryNeutral" }} />
<Action layout="inline" primary={{ label: "Save" }} secondary={{ label: "Later" }} />
```
