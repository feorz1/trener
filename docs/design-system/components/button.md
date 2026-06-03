# Button

Canonical action control for primary, secondary, neutral, destructive, tertiary, and icon-only actions.

## Figma

- Source node: `Button fields`
- Source node ID: `34:3412`
- Component set: `Button`
- Component set node ID: `137:126`
- Target section: `134:1190`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=137-126`

## Anatomy

- `root container`: Auto Layout horizontal control. Owns fill, radius, size, padding, alignment, and disabled opacity.
- `label`: action text for text buttons. Uses `Typography/Button/MD` for large/medium and `Typography/Body/SM Strong` for small.
- `icon`: chevron-only icon for icon button sizes.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `type` | `primary`, `secondary`, `secondary neutral`, `destructive`, `tertiary` | `type` |
| `size` | `large`, `medium`, `small`, `medium icon`, `small icon` | `size` |
| `state` | `active`, `disabled`, `loading` | `state`, `disabled` |
| `width` | `hug` | `width` |

## Figma Variants

- `primary`, `secondary`, `secondary neutral`, and `destructive` cover `large`, `medium`, `small`, `medium icon`, and `small icon` in `active`, `disabled`, and `loading` states.
- `tertiary` covers text sizes and the `small icon` size in `active`, `disabled`, and `loading` states.

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| primary background | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| primary text/icon | `color/content/primary` | `theme.colors.content.primary` |
| secondary background | `color/content/primary` | `theme.colors.content.primary` |
| secondary text/icon | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| secondary neutral background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| secondary neutral text/icon | `color/content/ink` | `theme.colors.content.ink` |
| destructive background | `color/status/negative` | `theme.colors.status.negative` |
| destructive text/icon | `color/background/canvas` | `theme.colors.background.canvas` |
| tertiary background | `color/background/canvas` | `theme.colors.background.canvas` |
| tertiary text | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| horizontal padding medium | `spacing/lg` | `theme.spacing.lg` |
| horizontal padding small | `spacing/md` | `theme.spacing.md` |
| large / medium text radius | `radius/lg` | `theme.radius.lg` |
| small text radius | `radius/md` | `theme.radius.md` |
| icon-only radius | `radius/pill` | `theme.radius.pill` |
| label typography | `Typography/Button/MD` | `theme.typography.button.md` |
| small label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

## Implementation Requirements

- `Button` is a `Pressable` and exposes `accessibilityRole="button"`.
- Disabled buttons must not call `onPress`.
- Loading buttons must expose busy accessibility state and must not call `onPress`.
- Loading buttons render the canonical `Loader` component instead of label/icon content.
- Icon-only sizes use `Icon name="chevron down"` by default and can accept a custom `icon`.
- `width="fill"` is allowed in code for layout needs, but Figma canonical variants currently document `width=hug`.
- All visual styling must come from `src/theme`.

## Examples

```tsx
<Button type="primary" size="medium" label="Medium" />
<Button type="secondaryNeutral" size="small" label="Small" />
<Button type="destructive" size="mediumIcon" />
<Button type="primary" state="disabled" label="Disabled" />
<Button type="primary" state="loading" />
```

## Do / Don't

- Do use `primary` for main actions and `destructive` for irreversible actions.
- Do use `secondaryNeutral` for quiet utility actions.
- Don't add new color variants without updating Figma variants, this spec, and `component-registry.json`.
