# Switch

## Purpose

Binary on/off control for settings that apply immediately.

## Figma

- Source node: `switch`
- Component set: `Switch`
- Component set node ID: `128:10`
- Source node ID: `34:5194`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=128-10`

## Anatomy

- `track`: 52x32 pill container. Owns selected/off/disabled fill and touch target.
- `thumb`: 28x28 circular knob. Moves left/right by selected state.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `selected` | `boolean` | `false` | Maps to Figma variant prop `selected=Yes/No`. |
| `disabled` | `boolean` | `false` | Maps to Figma variant prop `state=Disabled`. |
| `size` | `md` | `md` | Only canonical size. |
| `onChange` | `(selected: boolean) => void` | `undefined` | Called with the next selected value. |

## Variants

| Figma variant | Code props |
|---|---|
| `selected=Yes, state=Default, size=md` | `<Switch selected />` |
| `selected=No, state=Default, size=md` | `<Switch selected={false} />` |
| `selected=Yes, state=Disabled, size=md` | `<Switch selected disabled />` |
| `selected=No, state=Disabled, size=md` | `<Switch selected={false} disabled />` |

## Token Usage

| Usage | Figma token | Code token |
|---|---|---|
| selected track | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| off track | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| thumb default | `color/background/canvas` | `theme.colors.background.canvas` |
| thumb disabled | `color/content/mute` | `theme.colors.content.mute` |
| track padding | `spacing/xxs` | `theme.spacing.xxs` |
| track radius | `radius/pill` | `theme.radius.pill` |
| thumb radius | `radius/full` | `theme.radius.full` |
| track width | design size token | `theme.sizes.switchWidth` |
| track height | design size token | `theme.sizes.switchHeight` |
| thumb size | design size token | `theme.sizes.switchThumb` |
| thumb shadow | item shadow | `theme.shadows.switchThumb` |

## Usage

```tsx
<Switch selected={isEnabled} onChange={setIsEnabled} />
```

## Do / Don't

- Do use `Switch` for immediate binary settings.
- Do use `disabled` when the setting cannot be changed.
- Don't use `Switch` for mutually exclusive multi-option choices; use `SegmentedControl`.
- Don't attach a separate submit action to a switch change.
