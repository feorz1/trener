# Avatar

Canonical person or group identity primitive for client lists, trainer profiles, participant stacks, and status-bearing profile markers.

## Figma

- Source node: `avatars`
- Source node ID: `177:778`
- State reference node ID: `34:3129`
- Component set: `Avatar`
- Component set node ID: `200:256`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=200-256`

## Anatomy

- `root container`: fixed-size circular or grouped avatar surface.
- `image`: editable image fill. This replaces the old flag artwork in the reference.
- `initials`: fallback text for users without a photo.
- `overlay`: optional badge, notification dot, or count bubble.

## Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `type` | `Icon`, `Initials`, `Image`, `Count`, `Pair`, `Badge`, `Notification` | `type` |
| `size` | `40`, `48`, `56`, `72` | `size` |
| `icon` | any canonical icon name | `iconName` |

Canonical Avatar sizes are `40`, `48`, `56`, and `72`. `40` is used by dense list rows such as `ListItemCell`.

## Figma Variants

| Figma variant | Code props |
|---|---|
| `type=Image, size=56` | `<Avatar type="image" size={56} source={source} />` |
| `type=Icon, size=40` | `<Avatar type="icon" size={40} />` |
| `type=Initials, size=56` | `<Avatar type="initials" size={56} initials="JW" />` |
| `type=Count, size=56` | `<Avatar type="count" size={56} count="+3" />` |
| `type=Pair, size=56` | `<Avatar type="pair" size={56} />` |
| `type=Badge, size=56` | `<Avatar type="badge" size={56} />` |
| `type=Notification, size=56` | `<Avatar type="notification" size={56} />` |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| image fallback background | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| initials background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| initials text | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| icon background | `color/background/canvas` | `theme.colors.background.canvas` |
| icon stroke | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| icon glyph | `Icons / user` by default | `<Icon name={iconName} />` |
| badge indicator | `color/content/primary` | `theme.colors.content.primary` |
| notification indicator | `color/status/negative` | `theme.colors.status.negative` |
| avatar radius | `radius/full` | dynamic full radius from size |
| sizes | component size tokens | `theme.sizes.avatar40`, `theme.sizes.avatar48`, `theme.sizes.avatar56`, `theme.sizes.avatar72` |
| initials typography | `Typography/Caption`, `Typography/Body/SM Strong`, `Typography/Body/MD Strong` | `theme.typography.caption`, `theme.typography.body.smStrong`, `theme.typography.body.mdStrong` |

## Implementation Requirements

- `Avatar` must accept an optional `source` image and use initials or a themed placeholder when no image is provided.
- The old flag reference must not be used for canonical variants; image variants represent user photos.
- The `Icon` variant must use `src/components/ui/Icon.tsx`; default icon is `user`.
- Size values are fixed to `40`, `48`, `56`, and `72`.
- `count` and `pair` variants must use a white separation ring around the overlapping avatar.
- `badge` indicator sits on the bottom-right side of the avatar.
- `notification` indicator sits on the top-right side of the avatar.
- Group variants (`count`, `pair`) may be wider than their individual avatar size.
- All visual styling must come from `src/theme`.

## Examples

```tsx
<Avatar type="image" size={56} source={source} />
<Avatar type="icon" size={56} iconName="user" />
<Avatar type="initials" size={48} initials="JW" />
<Avatar type="count" size={56} count="+3" />
```
