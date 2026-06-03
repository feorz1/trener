# Alert

Canonical feedback and callout component for short system messages, expandable explanations, and action prompts.

## Figma

- Source node ID: `207:836`
- Expanded/action reference node ID: `34:3064`
- Component set: `Alert`
- Component set node ID: `215:948`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=215-948`

## Anatomy

- `root container`: Auto Layout horizontal surface. Owns width, padding, gap, fill, and radius.
- `icon`: 32x32 tone marker rendered through the canonical `Icon` pack.
- `content`: title, optional description, optional action button.
- `toggle button`: optional 24x24 icon button for expanded/action layouts.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `tone` | `neutral`, `positive`, `negative`, `warning` | `tone` |
| `layout` | `compact`, `expanded`, `action` | `layout` |
| `Show description` | `true`, `false` | driven by `expanded` |
| `Show action button` | `true`, `false` | driven by `expanded` for `layout="action"` |
| `Chevron icon` | `chevron up`, `chevron down` | driven by `expanded` |

## Figma Variants

| Figma variant | Code props |
|---|---|
| `tone=neutral, layout=compact` | `<Alert tone="neutral" layout="compact" />` |
| `tone=positive, layout=compact` | `<Alert tone="positive" layout="compact" />` |
| `tone=negative, layout=compact` | `<Alert tone="negative" layout="compact" />` |
| `tone=warning, layout=compact` | `<Alert tone="warning" layout="compact" />` |
| `layout=expanded` + `Show description=true` + `Chevron icon=chevron up` | `<Alert layout="expanded" expanded description="..." />` |
| `layout=expanded` + `Show description=false` + `Chevron icon=chevron down` | `<Alert layout="expanded" expanded={false} />` |
| `layout=action` + `Show description=true` + `Show action button=true` + `Chevron icon=chevron up` | `<Alert layout="action" expanded actionLabel="Button" onAction={...} />` |
| `layout=action` + `Show description=false` + `Show action button=false` + `Chevron icon=chevron down` | `<Alert layout="action" expanded={false} />` |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| title text | `color/content/ink` | `theme.colors.content.ink` |
| rich description text | `color/content/body` | `theme.colors.content.body` |
| neutral icon fill | `color/content/body` | `theme.colors.content.body` |
| positive icon fill | `color/status/positive-deep` | `theme.colors.status.positiveDeep` |
| negative icon fill | `color/status/negative` | `theme.colors.status.negative` |
| warning icon fill | `color/status/warning` | `theme.colors.status.warning` |
| compact radius | `radius/full` | `theme.radius.pill` |
| rich radius | `radius/xl` | `theme.radius.xl` |
| padding / gap | `spacing/lg` | `theme.spacing.lg` |
| rich content top offset | `spacing/xs` | `theme.spacing.xs` |
| rich chevron top offset | `spacing/xs` | `theme.spacing.xs` |
| content gap | `spacing/sm` | `theme.spacing.sm` |
| title typography | `Typography/Body/MD` | `theme.typography.body.md` |
| rich description typography | `Typography/Body/SM` | `theme.typography.body.sm` |
| neutral icon | `Icons / information` | `<Icon name="information" />` |
| positive icon | `Icons / checkmark` | `<Icon name="checkmark" />` |
| negative icon | `Icons / close` | `<Icon name="close" />` |
| warning icon | `Icons / warning` | `<Icon name="warning" />` |
| toggle icon collapsed | `Icons / chevron down` | `<Icon name="chevron down" />` |
| toggle icon expanded | `Icons / chevron up` | `<Icon name="chevron up" />` |
| action button | `Button / tertiary / small / active / hug` | `<Button type="tertiary" size="small" />` |
| expand/collapse motion | n/a | `Animated.timing` |

## Implementation Requirements

- `Alert` must stay a feedback/callout primitive, not a card.
- Compact layout has one text line and no toggle/action.
- Expanded layout shows description and a toggle button.
- Action layout shows description, action button, and toggle button.
- Collapsed large alerts are not separate Figma variants. Use component properties to hide description/action and swap the chevron.
- Expanded and action titles use the same title typography as compact alerts.
- Expanded and action containers use `theme.radius.xl`.
- Expanded and action content starts with a 4px top offset, and the chevron starts with a 4px top offset in code, so open and collapsed large alerts keep the same title alignment.
- Expanded and action layouts are collapsible in code. Use `expanded` for controlled state or `defaultExpanded` for uncontrolled state.
- Expand/collapse must animate softly; title and root stay stable while description/action content fades and slides.
- Action button must be aligned to the left of the content column and use the canonical tertiary Button variant.
- Width defaults to the Figma reference width and can be set to fill.
- All icons must use `src/components/ui/Icon.tsx`; do not import icon libraries directly inside `Alert`.
- All visual styling must come from `src/theme`.

## Examples

```tsx
<Alert tone="neutral" />
<Alert tone="positive" layout="expanded" />
<Alert tone="warning" layout="action" actionLabel="Button" onAction={handlePress} />
```
