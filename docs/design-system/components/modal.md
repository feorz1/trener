# Modal

Canonical mobile modal container for titled dialogs with body content and footer actions.

## Figma

- Source node ID: `250:1692`
- Body node ID: `250:1960`
- Text node ID: `250:2026`
- Component set: `Modal`
- Component set node ID: `284:1406`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=284-1406`

## Anatomy

- `root container`: rounded white modal surface.
- `header`: title, optional subline, and optional close icon button.
- `body`: internal content area with 8px horizontal and 8px vertical padding.
- `text block`: optional subheader and description inside the body.
- `content slot`: optional component content, including `List item/Cell`.
- `actions`: canonical `Action` component.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `action` | `single`, `stacked`, `inline`, `triple` | `actionLayout` |
| `Show subline` | `true`, `false` | `showSubline` |
| `Subline` | text override | `subline` |
| `Show body text` | `true`, `false` | `showBodyText` |

## Figma Variants

| Figma variant | Code props |
|---|---|
| `action=single` | `<Modal actionLayout="single" />` |
| `action=stacked` | `<Modal actionLayout="stacked" />` |
| `action=inline` | `<Modal actionLayout="inline" />` |
| `action=triple` | `<Modal actionLayout="triple" />` |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas` | `theme.colors.background.canvas` |
| title text | `color/content/ink` | `theme.colors.content.ink` |
| subline text | `color/content/ink` | `theme.colors.content.ink` |
| body text | `color/content/ink` | `theme.colors.content.ink` |
| header top / horizontal padding | `spacing/xl` | `theme.spacing.xl` |
| header bottom padding | `spacing/md` | `theme.spacing.md` |
| header gap | `spacing/lg` | `theme.spacing.lg` |
| header text gap | `spacing/xs` | `theme.spacing.xs` |
| body horizontal padding | `spacing/sm` | `theme.spacing.sm` |
| body vertical padding | `spacing/sm` | `theme.spacing.sm` |
| body child gap | `0` | `theme.spacing[0]` |
| overlay horizontal inset | `spacing/sm` | `theme.spacing.sm` |
| overlay bottom inset | `spacing/xl` | `theme.spacing.xl` |
| text horizontal padding | `spacing/lg` | `theme.spacing.lg` |
| radius | `radius/xl` | `theme.radius.xl` |
| title typography | `Typography/Display/XS` | `theme.typography.display.xs` |
| subline typography | `Typography/Body/LG` | `theme.typography.body.lg` |
| subheader typography | `Typography/Body/MD Strong` | `theme.typography.body.mdStrong` |
| description typography | `Typography/Body/MD` | `theme.typography.body.md` |

## Implementation Requirements

- `Modal` must compose existing canonical `Button`, `Icon`, `Action`, and optional child components.
- Header uses 24px top/horizontal padding and 12px bottom padding to match the bottom-sheet reference height.
- `ModalBody` keeps 8px horizontal and 8px vertical padding with no default child gap, so `List item/Cell` can keep its own canonical 16px internal padding while aligning to the modal 24px rhythm.
- `showBodyText=false` hides the internal subheader/description block and keeps only slotted body content.
- Do not remove or override `List item/Cell` padding for modal usage.
- `presentation="inline"` renders the panel for Storybook and embedded previews.
- `presentation="overlay"` uses React Native `Modal` with a dimmed overlay and bottom-sheet slide animation.
- Overlay modal position must use `spacing/sm` left/right and `spacing/xl` bottom inset.
- Overlay modals must lift above the native keyboard while preserving the `spacing/xl` gap so body inputs remain editable immediately after focus.
- Overlay modals animate layout changes when their internal content changes, including bottom-sheet height changes between steps.
- Closing the overlay preserves the last rendered content while animating the sheet down before unmounting.
- All styling must come from `src/theme`.

## Examples

```tsx
<Modal actionLayout="single">
  <ListItemCell eyebrow="Payment method" title="Bank transfer" subtitle="Wise account" trailing="icon" />
</Modal>

<Modal presentation="overlay" visible={visible} onClose={closeModal} actionLayout="single" subline="Subline" showSubline>
  <ListItemCell eyebrow="Payment method" title="Bank transfer" subtitle="Wise account" trailing="icon" />
</Modal>

<Modal actionLayout="single" showSubline={false} showBodyText={false} primaryAction={{ label: "Кнопка" }}>
  <ListItemCell eyebrow="Payment method" title="Bank transfer" trailing="switch" selected />
</Modal>
```
