# Icon

## Figma

- Component set: `Icons`
- Component set node ID: `47:849`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=47-849`

## Anatomy

- `root`: fixed square icon viewport.
- `glyph`: vector mark rendered inside the viewport.

## Props

| Prop | Values | Code prop |
|---|---|---|
| `icon` | Figma icon names from `Icons` | `name` |
| `size` | number, default `24` | `size` |
| `color` | theme color token value | `color` |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| default icon color | `color/content/ink` | `theme.colors.content.ink` |
| muted icon color | `color/content/mute` | `theme.colors.content.mute` |
| inverse icon color | `color/background/canvas` | `theme.colors.background.canvas` |
| status icon colors | `color/status/*` | `theme.colors.status.*` |
| default size | component size token | `theme.spacing.xl` |

## Implementation Requirements

- Use `src/components/ui/Icon.tsx` for icons in code.
- Do not import `@expo/vector-icons`, `lucide-react-native`, or any other icon package directly inside product components.
- `Icon` names mirror the Figma `Icons` component-set names where possible.
- Icons used by canonical components must render local SVG paths copied from the Figma `Icons` component set.
- Expo `@expo/vector-icons/MaterialIcons` is allowed only as a temporary fallback inside `Icon.tsx` for icons that have not been migrated yet.
- If a Figma icon does not match the fallback exactly, copy its SVG path into `Icon.tsx` once and keep component code unchanged.
- All colors passed to `Icon` must come from `theme.colors`.
- Workout cards use migrated muscle icons from Figma: `muscle arms`, `muscle legs`, `muscle chest`, `muscle all`.
