# Avatar

## Purpose

Canonical person, group, and icon identity marker for list rows, profiles, participant stacks, and status-bearing avatars.

## Figma

- Component name: `Avatar`
- Component set: `Avatar`
- Variant properties: `type`, `size`, and the nested icon override
- Source node: `200:256`

## Anatomy

- Root: fixed circular surface or overlapping group container.
- Main content: image, initials, count, or canonical `Icon`.
- Controls: none.
- Optional regions: secondary avatar, badge indicator, or notification indicator.

## Props

| Prop | Type | Required | Description |
|---|---|---:|---|
| `type` | `AvatarType` | No | Selects icon, initials, image, group, or indicator presentation. |
| `size` | `40 \| 48 \| 56 \| 72` | No | Selects a canonical fixed size. |
| `source` | `ImageSourcePropType` | No | Primary image source. |
| `secondarySource` | `ImageSourcePropType` | No | Secondary source for paired avatars. |
| `initials` | `string` | No | Initials fallback. |
| `count` | `string` | No | Count label for grouped avatars. |
| `iconName` | `IconName` | No | Canonical icon used by `type="icon"`. |
| `accessibilityLabel` | `string` | No | Accessible description for the avatar. |

## Variants And States

| State | When used | Visual change |
|---|---|---|
| `icon` | Settings and generic identity rows | Gray circular surface with an ink-deep icon. |
| `initials` | User has no photo | Gray circular surface with initials. |
| `image` | User photo is available | Circular cropped image or themed fallback. |
| `count` / `pair` | Group summaries | Two overlapping circles with a white separation ring. |
| `badge` | Positive status | Adds a bottom-right primary indicator. |
| `notification` | Attention state | Adds a top-right negative indicator. |

## Tokens

- Colors: `theme.colors.background.canvasSoft`, `theme.colors.content.inkDeep`, and semantic indicator colors.
- Typography: size-dependent `theme.typography.*` tokens for initials.
- Spacing: none.
- Radius: full circular geometry derived from the canonical size.
- Sizes: `theme.sizes.avatar*` and `theme.sizes.avatarIcon*`.
- Shadows: none.

## Usage

```tsx
<Avatar type="icon" size={40} iconName="user" accessibilityLabel="Профиль" />
```

## Do

- Use the 40 px variant inside `ListItemCell`.
- Use only canonical `IconName` values for icon avatars.

## Don't

- Do not add a border to icon avatars.
- Do not pass arbitrary avatar or icon sizes.
