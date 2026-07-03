# Figma To Code Map

This file maps canonical Figma design-system components to Expo React Native components. Use it before implementing screens or new components.

Source of truth order:

1. `DESIGN.md`
2. Figma local variables and text styles
3. Figma canonical component sets
4. `src/theme`
5. React Native components

Do not build screens from ad hoc Figma layers when a canonical component exists in this map.

## Canonical Components

| Figma component set | Figma node | Code component | Code path | Status |
|---|---|---|---|---|
| `Alert` | `215:948` | `Alert` | `src/components/ui/Alert.tsx` | Ready |
| `Action` | `250:1890` | `Action` | `src/components/ui/Action.tsx` | Ready |
| `Modal` | `284:1406` | `Modal` | `src/components/ui/Modal.tsx` | Ready |
| `Card` | `295:1313` | `Card` | `src/components/ui/Card.tsx` | Ready |
| `Day strip` | `327:1476` | `CalendarDayStrip` | `src/components/calendar/CalendarDayStrip.tsx` | Ready |
| `ProgressBar` | `295:2261` | `ProgressBar` | `src/components/ui/ProgressBar.tsx` | Ready |
| `Approach` | `387:3810` | `Approach` | `src/components/ui/Approach.tsx` | Ready |
| `Button` | `137:126` | `Button` | `src/components/ui/Button.tsx` | Ready |
| `Loader` | `146:1134` | `Loader` | `src/components/ui/Loader.tsx` | Ready |
| `Icons` | `47:849` | `Icon` | `src/components/ui/Icon.tsx` | Ready |
| `Avatar` | `200:256` | `Avatar` | `src/components/ui/Avatar.tsx` | Ready |
| `List item/Cell` | `265:1062` | `ListItemCell` | `src/components/ui/ListItemCell.tsx` | Ready |
| `Badge` | `89:596` | `Badge` | `src/components/ui/Badge.tsx` | Ready |
| `Checkbox` | `34:3958` | `Checkbox` | `src/components/ui/Checkbox.tsx` | Ready |
| `Radio` | `34:5090` | `Radio` | `src/components/ui/Radio.tsx` | Ready |
| `SegmentedControl` | `96:613` | `SegmentedControl` | `src/components/ui/SegmentedControl.tsx` | Ready |
| `Input` | `103:699` | `Input` | `src/components/ui/Input.tsx` | Ready |
| `TextArea` | `116:678` | `TextArea` | `src/components/ui/TextArea.tsx` | Ready |
| `Switch` | `128:10` | `Switch` | `src/components/ui/Switch.tsx` | Ready |

## Alert

### Figma

- Source node ID: `207:836`
- Expanded/action reference node ID: `34:3064`
- Component set: `Alert`
- Component set node ID: `215:948`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=215-948`

### Anatomy

- `root container`: Auto Layout horizontal feedback surface.
- `icon`: 32x32 tone marker.
- `content`: title, optional description, optional action button.
- `toggle button`: optional 24x24 icon button for expanded/action layouts.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `tone` | `neutral`, `positive`, `negative`, `warning` | `tone` |
| `layout` | `compact`, `expanded`, `action` | `layout` |

### Figma Variants

| Figma variant family | Code props |
|---|---|
| `tone=neutral` | `<Alert tone="neutral" />` |
| `tone=positive` | `<Alert tone="positive" />` |
| `tone=negative` | `<Alert tone="negative" />` |
| `tone=warning` | `<Alert tone="warning" />` |
| `layout=compact` | `<Alert layout="compact" />` |
| `layout=expanded` | `<Alert layout="expanded" />` |
| `layout=action` | `<Alert layout="action" />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| compact title | `color/content/ink` | `theme.colors.content.ink` |
| rich text | `color/content/body` | `theme.colors.content.body` |
| neutral icon fill | `color/content/body` | `theme.colors.content.body` |
| positive icon fill | `color/status/positive-deep` | `theme.colors.status.positiveDeep` |
| negative icon fill | `color/status/negative` | `theme.colors.status.negative` |
| warning icon fill | `color/status/warning` | `theme.colors.status.warning` |
| compact radius | `radius/full` | `theme.radius.pill` |
| rich radius | `radius/md` | `theme.radius.md` |
| padding / gap | `spacing/lg` | `theme.spacing.lg` |
| content gap | `spacing/sm` | `theme.spacing.sm` |
| compact typography | `Typography/Body/MD` | `theme.typography.body.md` |
| rich typography | `Typography/Body/SM` | `theme.typography.body.sm` |

### Implementation Requirements

- `Alert` is a feedback/callout primitive, not a card.
- Compact layout has one text line and no toggle/action.
- Expanded layout shows description and a toggle button.
- Action layout shows description, action button, and toggle button.
- Width defaults to the Figma reference width and can fill its parent.
- All styling must come from `src/theme`.

## CalendarDayStrip

### Figma

- Source node ID: `327:1476`
- Day cell variants node ID: `327:1421`
- Component set: `Day strip`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=327-1476`

### Anatomy

- `root`: horizontal one-week strip.
- `week page`: seven fixed day cells.
- `day cell`: pressable date control.
- `weekday`: short weekday label.
- `day number`: numeric date.
- `current day dot`: optional marker controlled independently from selection, centered horizontally with a token-derived absolute top offset.
- `selected fill`: animated active fill for the selected day.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `state` | `past`, `default`, `selected`, `disabled` | `temporalState`, `selectedKey`, `disabled` |
| `currentDay` | `true`, `false` | `todayKey` |
| `paging` | `singleWeek`, `multiWeek` | `items`, `weeks` |

### Figma Variants

| Figma state | Code props |
|---|---|
| `state=прошедший день` | `temporalState="past"` |
| `state=текущий день` | `selectedKey === item.key` |
| `state=будущий день` | `temporalState="future"` |
| `currentDay=true` | `todayKey === item.key` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| strip width | component size | `theme.sizes.calendarDayStripWidth` |
| day height | component size | `theme.sizes.calendarDayHeight` |
| current day dot | component size | `theme.sizes.calendarDayDot` |
| strip radius | none | no root `borderRadius` |
| day radius | `radius/lg` | `theme.radius.lg` |
| strip padding | `spacing/xxs` | `theme.spacing.xxs` |
| day padding | `spacing/sm` | `theme.spacing.sm` |
| day gap | `spacing/xxs` | `theme.spacing.xxs` |
| page gap | `spacing/xs` | `theme.spacing.xs` |
| past fill | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| default/future fill | `color/background/canvas` | `theme.colors.background.canvas` |
| selected fill | `color/content/primary` | `theme.colors.content.primary` |
| selected text/dot | `color/content/on-primary` | `theme.colors.content.onPrimary` |
| weekday text | `color/content/body` | `theme.colors.content.body` |
| date text | `color/content/ink` | `theme.colors.content.ink` |
| weekday typography | `Typography/Body/SM Caption` | `theme.typography.body.smCaption` |
| date typography | `Typography/Body/MD Strong` | `theme.typography.body.mdStrong` |

### Implementation Requirements

- Selecting a day must animate the fill smoothly.
- Horizontal scrolling must snap to exactly one week.
- Appointments are rendered by the parent screen from selected date data.
- `todayKey` must stay separate from `selectedKey`.
- All styling must come from `src/theme`.

## Button

### Figma

- Source node: `Button fields`
- Source node ID: `34:3412`
- Component set: `Button`
- Component set node ID: `137:126`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=137-126`

### Anatomy

- `root container`: Auto Layout horizontal control. Owns fill, size, padding, radius, alignment, and disabled opacity.
- `label`: action text for text button sizes.
- `icon`: chevron-down glyph for icon-only sizes.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `type` | `primary`, `secondary`, `secondary neutral`, `destructive`, `tertiary` | `type` |
| `size` | `large`, `medium`, `small`, `medium icon`, `small icon` | `size` |
| `state` | `active`, `disabled`, `loading` | `state`, `disabled` |
| `width` | `hug` | `width` |

### Figma Variants

| Figma variant family | Code props |
|---|---|
| `type=primary` | `<Button type="primary" />` |
| `type=secondary` | `<Button type="secondary" />` |
| `type=secondary neutral` | `<Button type="secondaryNeutral" />` |
| `type=destructive` | `<Button type="destructive" />` |
| `type=tertiary` | `<Button type="tertiary" />` |
| `state=disabled` | `<Button state="disabled" />` or `<Button disabled />` |
| `state=loading` | `<Button state="loading" />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| primary background | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| primary text/icon | `color/content/primary` | `theme.colors.content.primary` |
| secondary background | `color/content/primary` | `theme.colors.content.primary` |
| secondary text/icon | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| neutral background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| neutral text/icon | `color/content/ink` | `theme.colors.content.ink` |
| destructive background | `color/status/negative` | `theme.colors.status.negative` |
| destructive text/icon | `color/background/canvas` | `theme.colors.background.canvas` |
| tertiary background | `color/background/canvas` | `theme.colors.background.canvas` |
| tertiary text | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| large / medium text radius | `radius/lg` | `theme.radius.lg` |
| small text radius | `radius/md` | `theme.radius.md` |
| icon-only radius | `radius/pill` | `theme.radius.pill` |
| label typography | `Typography/Button/MD` | `theme.typography.button.md` |
| small label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

### Implementation Requirements

- `Button` must remain a single action primitive, not a card or navigation row.
- Disabled buttons must not fire `onPress`.
- Loading buttons render `Loader`, expose busy accessibility state, and must not fire `onPress`.
- Icon-only sizes default to `Icon name="chevron down"` and may accept a custom icon node.
- All styling must come from `src/theme`.

## Loader

### Figma

- Component set: `Loader`
- Component set node ID: `146:1134`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=146-1134`

### Anatomy

- `root container`: Auto Layout horizontal frame.
- `plates`: dumbbell side plates.
- `bar`: center connector.
- `state variants`: assembly frames in order `state5 -> state4 -> state3 -> state2 -> 01`.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `size` | `small`, `medium` | `size` |
| `tone` | `brand`, `inverse`, `negative`, `neutral`, `canvas` | `tone` |
| `state` | `state5`, `state4`, `state3`, `state2`, `01` | internal animation frame |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| brand tone | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| inverse tone | `color/content/primary` | `theme.colors.content.primary` |
| negative tone | `color/status/negative` | `theme.colors.status.negative` |
| neutral tone | `color/content/body` | `theme.colors.content.body` |
| canvas tone | `color/background/canvas` | `theme.colors.background.canvas` |
| plate radius | component loader radius | `theme.sizes.loaderCornerRadius` |
| bar radius | component loader radius | `theme.sizes.loaderCornerRadius` |

### Implementation Requirements

- `Loader` must be standalone and usable inside `Button`.
- Figma shows editable assembly states; code animates `state5 -> state4 -> state3 -> state2 -> 01` with eased plate movement and a short completed-state pause.
- Loader parts are filled rounded rectangles without stroke to avoid clipped edges in small button sizes.
- All styling must come from `src/theme`.

## Icon

### Figma

- Component set: `Icons`
- Component set node ID: `47:849`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=47-849`

### Anatomy

- `root`: fixed square viewport.
- `glyph`: vector mark.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `icon` | Figma icon names | `name` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| default color | `color/content/ink` | `theme.colors.content.ink` |
| muted color | `color/content/mute` | `theme.colors.content.mute` |
| inverse color | `color/background/canvas` | `theme.colors.background.canvas` |
| status colors | `color/status/*` | `theme.colors.status.*` |
| default size | component size token | `theme.spacing.xl` |

### Implementation Requirements

- Code components must use `<Icon />` from `src/components/ui/Icon.tsx`.
- Do not import icon packs directly inside UI/product components.
- The wrapper maps Figma `Icons` names to Expo `@expo/vector-icons/MaterialIcons` glyphs.
- If a mapping is missing, extend `Icon.tsx`; do not add ad hoc SVG or icon imports inside the consuming component.
- Muscle group card icons use local SVG paths in `Icon.tsx`: `muscle arms`, `muscle legs`, `muscle chest`, `muscle all`.

## Avatar

### Figma

- Source node: `avatars`
- Source node ID: `177:778`
- State reference node ID: `34:3129`
- Component set: `Avatar`
- Component set node ID: `200:256`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=200-256`

### Anatomy

- `root container`: fixed-size circular or grouped avatar surface.
- `image`: editable image fill, replacing the old flag reference.
- `initials`: fallback user initials.
- `overlay`: optional badge, notification, or count bubble.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `type` | `Icon`, `Initials`, `Image`, `Count`, `Pair`, `Badge`, `Notification` | `type` |
| `size` | `40`, `48`, `56`, `72` | `size` |

Canonical Avatar sizes are supported: `40`, `48`, `56`, and `72`.

### Figma Variants

| Figma variant family | Code props |
|---|---|
| `type=Image` | `<Avatar type="image" />` |
| `type=Initials` | `<Avatar type="initials" />` |
| `type=Count` | `<Avatar type="count" />` |
| `type=Pair` | `<Avatar type="pair" />` |
| `type=Badge` | `<Avatar type="badge" />` |
| `type=Notification` | `<Avatar type="notification" />` |
| `size=48 / 56 / 72` | `<Avatar size={56} />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| fallback background | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| initials background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| initials text | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| icon background | `color/background/canvas` | `theme.colors.background.canvas` |
| icon stroke | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| badge indicator | `color/content/primary` | `theme.colors.content.primary` |
| notification indicator | `color/status/negative` | `theme.colors.status.negative` |
| radius | `radius/full` | dynamic full radius from size |
| size tokens | component size tokens | `theme.sizes.avatar40`, `theme.sizes.avatar48`, `theme.sizes.avatar56`, `theme.sizes.avatar72` |
| initials typography | `Typography/Caption`, `Typography/Body/SM Strong`, `Typography/Body/MD Strong` | `theme.typography.caption`, `theme.typography.body.smStrong`, `theme.typography.body.mdStrong` |

### Implementation Requirements

- `Avatar` accepts `source` and `secondarySource` image props.
- If `source` is missing, it renders a themed placeholder or initials depending on `type`.
- The flag reference is not part of the canonical component API.
- Only `40`, `48`, `56`, and `72` size variants are canonical.
- `Count` and `Pair` use white separation rings between overlapping avatars.
- `Badge` indicator sits on the bottom-right side of the avatar.
- `Notification` indicator sits on the top-right side of the avatar.
- Group variants may render wider than the base avatar size.
- All styling must come from `src/theme`.

## List item/Cell

### Figma

- Source node ID: `34:4696`
- Component set: `List item/Cell`
- Component set node ID: `265:1062`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=265-1062`

### Anatomy

- `root container`: 390px mobile row with Auto Layout, white surface, 16px padding, and 16px gap.
- `leading slot`: optional 40x40 Avatar or icon.
- `content`: optional eyebrow, required title, optional subtitle.
- `trailing slot`: optional Button, Checkbox, Radio, Icon, Switch, Badge, text, or none.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `state` | `Default`, `Pressed`, `Disabled` | `state`, `disabled` |
| `leading` | `none`, `avatar`, `icon` | `leading` |
| `trailing` | `none`, `button`, `checkbox`, `radio`, `icon`, `switch`, `badge`, `text` | `trailing` |
| `showEyebrow` | `true`, `false` | `showEyebrow` |
| `showSubtitle` | `true`, `false` | `showSubtitle` |
| `selected` | `true`, `false` | `selected` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas` | `theme.colors.background.canvas` |
| pressed surface | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| title text | `color/content/ink` | `theme.colors.content.ink` |
| secondary text | `color/content/body` | `theme.colors.content.body` |
| disabled text | `color/content/mute` | `theme.colors.content.mute` |
| padding / gap | `spacing/lg` | `theme.spacing.lg` |
| leading avatar size | component size token | `theme.sizes.avatar40` |
| trailing icon size | component size token | `theme.sizes.listItemCellIcon` |
| title typography | `Typography/Body/MD Strong` | `theme.typography.body.mdStrong` |
| eyebrow/subtitle typography | `Typography/Body/SM` | `theme.typography.body.sm` |

### Implementation Requirements

- Reuse existing canonical components inside slots: `Avatar`, `Button`, `Checkbox`, `Radio`, `Icon`, `Switch`, and `Badge`.
- Figma visibility and text changes must be component properties, not duplicated one-off rows.
- Code must expose slot props instead of creating separate row components per action type.
- All styling must come from `src/theme`.

## Badge

### Figma

- Component set: `Badge`
- Node ID: `89:596`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW/Тренерская?node-id=89-596`

### Anatomy

- `root container`: Auto Layout horizontal pill. Owns fill, padding, gap, radius, and min height.
- `optional icon`: 8x8 status marker. Present only when `icon=true`.
- `label`: status text. Uses `Typography/Body/SM Strong`.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `tone` | `error`, `info`, `success`, `warning`, `neutral`, `negativeSolid`, `warningDeep`, `primary` | `tone` |
| `size` | `md`, `sm` | `size` |
| `icon` | `true`, `false` | `icon` |

### Figma Variants

| Figma variant | Code props |
|---|---|
| `tone=error, size=md, icon=true` | `<Badge tone="error" size="md" icon />` |
| `tone=info, size=md, icon=true` | `<Badge tone="info" size="md" icon />` |
| `tone=success, size=md, icon=true` | `<Badge tone="success" size="md" icon />` |
| `tone=warning, size=md, icon=true` | `<Badge tone="warning" size="md" icon />` |
| `tone=neutral, size=md, icon=false` | `<Badge tone="neutral" size="md" />` |
| `tone=negativeSolid, size=sm, icon=false` | `<Badge tone="negativeSolid" size="sm" />` |
| `tone=warningDeep, size=sm, icon=false` | `<Badge tone="warningDeep" size="sm" />` |
| `tone=primary, size=sm, icon=false` | `<Badge tone="primary" size="sm" />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| error background | `color/status/negative-bg` | `theme.colors.status.negativeBg` |
| error text | `color/background/canvas` | `theme.colors.background.canvas` |
| error icon | `color/status/negative` | `theme.colors.status.negative` |
| info background | `color/accent/cyan` | `theme.colors.accent.cyan` |
| info text/icon | `color/content/ink` | `theme.colors.content.ink` |
| success background | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| success text | `color/status/positive-deep` | `theme.colors.status.positiveDeep` |
| success icon | `color/status/positive` | `theme.colors.status.positive` |
| warning background | `color/status/warning` | `theme.colors.status.warning` |
| warning text/icon | `color/status/warning-content` | `theme.colors.status.warningContent` |
| neutral background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| neutral text | `color/content/body` | `theme.colors.content.body` |
| vertical padding | `spacing/xs` | `theme.spacing.xs` |
| horizontal padding | `spacing/md` | `theme.spacing.md` |
| gap | `spacing/xs` | `theme.spacing.xs` |
| min height | `spacing/2xl` | `theme.spacing["2xl"]` |
| radius | `radius/pill` | `theme.radius.pill` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

### Implementation Requirements

- Code component must not introduce new tone names without updating Figma variants.
- `neutral` defaults to `icon=false`.
- Icon can be rendered as a small View marker unless a canonical icon component exists.
- Label text must be passed as children or `label`; choose one API and document it in `Badge.docs.md`.
- All styling must come from `src/theme`.

## Checkbox

### Figma

- Source node: `checkbox`
- Source node ID: `34:3958`
- Component set: `Checkbox`
- Component set node ID: `34:3958`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=34-3958`

### Anatomy

- `root container`: horizontal Auto Layout row with fixed gap.
- `box`: 24x24 selection box with fill or stroke.
- `icon / check`: check marker shown when selected.
- `label`: optional text label.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `selected` | `Yes`, `No` | `selected` |
| `state` | `Default`, `Error`, `Disabled` | `state`, `disabled` |
| `size` | `md` | `size` |
| `Show label` | `true`, `false` | `showLabel` |

### Figma Variants

| Figma variant | Code props |
|---|---|
| `selected=Yes, state=Default, size=md` | `<Checkbox selected />` |
| `selected=No, state=Default, size=md` | `<Checkbox selected={false} />` |
| `selected=Yes, state=Error, size=md` | `<Checkbox selected state="error" />` |
| `selected=No, state=Error, size=md` | `<Checkbox selected={false} state="error" />` |
| `selected=Yes, state=Disabled, size=md` | `<Checkbox selected disabled />` |
| `selected=No, state=Disabled, size=md` | `<Checkbox selected={false} disabled />` |

### Token Map

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

### Implementation Requirements

- `Checkbox` uses `accessibilityRole="checkbox"` and exposes checked/disabled accessibility state.
- `onChange` receives the next selected value.
- Disabled checkboxes must not call `onChange`.
- Error checkboxes remain interactive; the error state only changes the box fill or border.
- `showLabel=false` renders the 24x24 control only for `List item/Cell` trailing slots.
- All styling must come from `src/theme`.

## Radio

### Figma

- Source node: `radio`
- Source node ID: `34:5090`
- Component set: `Radio`
- Component set node ID: `34:5090`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=34-5090`

### Anatomy

- `root container`: horizontal Auto Layout row with fixed gap.
- `radio control`: 24x24 circular control.
- `outer`: radio outline and surface.
- `dot`: inner selected indicator shown only when selected.
- `label`: optional text label.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `selected` | `Yes`, `No` | `selected` |
| `state` | `Default`, `Error`, `Disabled` | `state`, `disabled` |
| `size` | `md` | `size` |
| `Show label` | `true`, `false` | `showLabel` |

### Figma Variants

| Figma variant | Code props |
|---|---|
| `selected=Yes, state=Default, size=md` | `<Radio selected />` |
| `selected=No, state=Default, size=md` | `<Radio selected={false} />` |
| `selected=Yes, state=Error, size=md` | `<Radio selected state="error" />` |
| `selected=No, state=Error, size=md` | `<Radio selected={false} state="error" />` |
| `selected=Yes, state=Disabled, size=md` | `<Radio selected disabled />` |
| `selected=No, state=Disabled, size=md` | `<Radio selected={false} disabled />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| selected outline / dot | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| control background | `color/background/canvas` | `theme.colors.background.canvas` |
| unchecked outline | `color/content/mute` | `theme.colors.content.mute` |
| error outline / dot | `color/status/negative` | `theme.colors.status.negative` |
| disabled selected fill | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| disabled content | `color/content/mute` | `theme.colors.content.mute` |
| label text | `color/content/ink` | `theme.colors.content.ink` |
| root gap | `spacing/lg` | `theme.spacing.lg` |
| control size | component size token | `theme.sizes.radioMd` |
| dot size | component size token | `theme.sizes.radioDot` |
| control radius | `radius/full` | `theme.radius.full` |
| label typography | `Typography/Body/MD` | `theme.typography.body.md` |

### Implementation Requirements

- `Radio` uses `accessibilityRole="radio"` and exposes checked/disabled accessibility state.
- `onChange` receives the next selected value.
- Disabled radios must not call `onChange`.
- Error radios remain interactive; the error state only changes the control outline or dot.
- `showLabel=false` renders the 24x24 control only for `List item/Cell` trailing slots.
- All styling must come from `src/theme`.

## SegmentedControl

### Figma

- Component set: `SegmentedControl`
- Node ID: `96:613`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=96-613`

### Anatomy

- `root container`: Auto Layout horizontal pill. Owns background, padding, gap, radius, and minimum touch height.
- `segment`: Pressable item container. Selected segment owns active fill; unselected segment uses neutral surface fill.
- `label`: Segment text. Uses `Typography/Body/SM Strong`.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `items` | `Two`, `Three` | derived from `items.length` |
| `selected` | `First`, `Second`, `Third` | `value` |
| `size` | `md` | `size` |

### Figma Variants

| Figma variant | Code props |
|---|---|
| `items=Two, selected=First, size=md` | `<SegmentedControl items={[...2]} value={first} />` |
| `items=Two, selected=Second, size=md` | `<SegmentedControl items={[...2]} value={second} />` |
| `items=Three, selected=First, size=md` | `<SegmentedControl items={[...3]} value={first} />` |
| `items=Three, selected=Second, size=md` | `<SegmentedControl items={[...3]} value={second} />` |
| `items=Three, selected=Third, size=md` | `<SegmentedControl items={[...3]} value={third} />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| root background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| selected segment background | `color/content/primary` | `theme.colors.content.primary` |
| unselected segment background | `color/background/canvas` | `theme.colors.background.canvas` |
| selected label | `color/content/on-primary` | `theme.colors.content.onPrimary` |
| unselected label | `color/content/body` | `theme.colors.content.body` |
| root padding | `spacing/xs` | `theme.spacing.xs` |
| segment vertical padding | `spacing/sm` | `theme.spacing.sm` |
| segment horizontal padding | `spacing/md` | `theme.spacing.md` |
| gap | `spacing/xs` | `theme.spacing.xs` |
| min height | `spacing/3xl` | `theme.spacing["3xl"]` |
| radius | `radius/pill` | `theme.radius.pill` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |

### Implementation Requirements

- Figma variants cover two or three items; code can render more items for existing screens.
- `items=Two, selected=Third` is not a valid rendered variant, even though Figma exposes `Third` as a set-level value.
- Segment labels must come from data, not be hardcoded in the component.
- All styling must come from `src/theme`.

## Input

### Figma

- Source node: `Input fields`
- Component set: `Input`
- Component set node ID: `103:699`
- Source node ID: `34:4555`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=103-699`

### Anatomy

- `root container`: vertical stack with optional label, field area, and optional helper/status message.
- `label`: optional field label above the input.
- `field`: editable single-line value container.
- `message`: optional helper text or status message under the field.
- `status marker`: filled circle marker for error, positive, and warning states. No icon or glyph inside.
- `prefix field`: optional left field used by the double-field variant.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `layout` | `Single`, `Double` | `doubleField` |
| `state` | `Empty`, `Default`, `Focus`, `Error`, `Positive`, `Warning`, `Disabled`, `PrefixFocus`, `ValueFocus` | `state`, focus target |
| `size` | `md` | implicit |
| `Label#111:0` | `true`, `false` | `showLabel` |
| `Message#111:13` | `true`, `false` | `showMessage` |

### Figma Variants

| Figma state | Code props |
|---|---|
| `empty` | `<Input state="empty" value="" />` |
| `default` | `<Input state="default" value="Value" />` |
| `focus` | `<Input state="focus" value="Value" />` |
| `error` | `<Input state="error" message="Error message" />` |
| `positive` | `<Input state="positive" message="Positive message" />` |
| `warning` | `<Input state="warning" message="Warning message" />` |
| `disabled` | `<Input state="disabled" disabled />` |
| `double field` | `<Input doubleField prefixValue="+1" />` |
| `prefix focus` | `<Input doubleField />` with prefix field focused |
| `value focus` | `<Input doubleField />` with value field focused |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| field background | `color/background/canvas` | `theme.colors.background.canvas` |
| disabled background | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| primary text | `color/content/ink` | `theme.colors.content.ink` |
| helper text | `color/content/body` | `theme.colors.content.body` |
| placeholder/disabled text | `color/content/mute` | `theme.colors.content.mute` |
| focus border | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| error border/message | `color/status/negative` | `theme.colors.status.negative` |
| positive message | `color/status/positive-deep` | `theme.colors.status.positiveDeep` |
| warning message | `color/status/warning-content` | `theme.colors.status.warningContent` |
| status marker size | `spacing/md` | `theme.spacing.md` |
| root gap | `spacing/sm` | `theme.spacing.sm` |
| field horizontal padding | `spacing/lg` | `theme.spacing.lg` |
| field vertical padding | `spacing/md` | `theme.spacing.md` |
| field min height | `spacing/3xl` | `theme.spacing["3xl"]` |
| field radius | `radius/md` | `theme.radius.md` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |
| value typography | `Typography/Body/MD` | `theme.typography.body.md` |
| message typography | `Typography/Body/SM` | `theme.typography.body.sm` |

### Implementation Requirements

- `Input` is controlled by `value` and `onChangeText`.
- Runtime focus overrides `state` while the native input is focused.
- `doubleField` is the phone-like two-field layout from the Figma reference.
- `showLabel` and `showMessage` map to Figma boolean component properties `Label` and `Message`.
- Status markers are solid circles without inner icon/text.
- All styling must come from `src/theme`.

## TextArea

### Figma

- Source node: `Text Area`
- Component set: `TextArea`
- Component set node ID: `116:678`
- Source node ID: `34:5221`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=116-678`

### Anatomy

- `root container`: vertical Auto Layout stack.
- `label`: optional field label.
- `message`: optional helper or error text below the textarea field.
- `field`: multiline editable surface with fixed md height behavior.
- `value`: multiline text content.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `state` | `Empty`, `Default`, `Focus`, `Error`, `Disabled` | `state`, `disabled` |
| `size` | `md` | implicit |
| `Label#124:0` | `true`, `false` | `showLabel` |
| `Message#124:6` | `true`, `false` | `showMessage` |

### Figma Variants

| Figma state | Code props |
|---|---|
| `empty` | `<TextArea state="empty" value="" />` |
| `default` | `<TextArea state="default" value="Value" />` |
| `focus` | `<TextArea state="focus" value="Value" />` |
| `error` | `<TextArea state="error" message="Error message" />` |
| `disabled` | `<TextArea state="disabled" disabled />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| field background | `color/background/canvas` | `theme.colors.background.canvas` |
| primary text | `color/content/ink` | `theme.colors.content.ink` |
| helper text | `color/content/body` | `theme.colors.content.body` |
| placeholder text | `color/content/mute` | `theme.colors.content.mute` |
| default border | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| focus border | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| error border/message | `color/status/negative` | `theme.colors.status.negative` |
| disabled fill/text | `color/background/canvas-soft`, `color/content/mute` | `theme.colors.background.canvasSoft`, `theme.colors.content.mute` |
| root gap | `spacing/sm` | `theme.spacing.sm` |
| field horizontal padding | `spacing/lg` | `theme.spacing.lg` |
| field vertical padding | `spacing/md` | `theme.spacing.md` |
| field radius | `radius/md` | `theme.radius.md` |
| label typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |
| value typography | `Typography/Body/MD` | `theme.typography.body.md` |
| message typography | `Typography/Body/SM` | `theme.typography.body.sm` |

### Implementation Requirements

- `TextArea` is controlled by `value` and `onChangeText`.
- Runtime focus overrides `state` while the native textarea is focused, except `error` and `disabled`.
- `showLabel` and `showMessage` map to Figma boolean component properties `Label#124:0` and `Message#124:6`.
- Text order follows the Figma source: label, field, message.
- All styling must come from `src/theme`.

## Switch

### Figma

- Source node: `switch`
- Component set: `Switch`
- Component set node ID: `128:10`
- Source node ID: `34:5194`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=128-10`

### Anatomy

- `track`: 52x32 pill container.
- `thumb`: 28x28 circular knob.

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `selected` | `Yes`, `No` | `selected` |
| `state` | `Default`, `Disabled` | `disabled` |
| `size` | `md` | implicit |

### Figma Variants

| Figma variant | Code props |
|---|---|
| `selected=Yes, state=Default, size=md` | `<Switch selected />` |
| `selected=No, state=Default, size=md` | `<Switch selected={false} />` |
| `selected=Yes, state=Disabled, size=md` | `<Switch selected disabled />` |
| `selected=No, state=Disabled, size=md` | `<Switch selected={false} disabled />` |

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| selected track | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| off/disabled track | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| thumb default | `color/background/canvas` | `theme.colors.background.canvas` |
| thumb disabled | `color/content/mute` | `theme.colors.content.mute` |
| padding | `spacing/xxs` | `theme.spacing.xxs` |
| track radius | `radius/pill` | `theme.radius.pill` |
| thumb radius | `radius/full` | `theme.radius.full` |

### Implementation Requirements

- `Switch` uses `accessibilityRole="switch"` and exposes checked/disabled accessibility state.
- `onChange` receives the next selected value.
- Disabled switches must not call `onChange`.
- All styling must come from `src/theme`.

## Future Component Entries

Add a new section for every processed canonical component:

```md
## ComponentName

### Figma

- Component set:
- Node ID:
- URL:

### Anatomy

### Variant Props

### Figma Variants

### Token Map

### Implementation Requirements
```

## Action

### Figma

- Source node ID: `250:1890`
- Component set: `Action`
- Component set node ID: `250:1890`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=250-1890`

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `layout` | `single`, `stacked`, `inline`, `triple` | `layout` |

### Implementation Requirements

- Composes only canonical `Button` instances.
- Used as the footer action group for `Modal`.

### Token Map

| Usage | Figma token | Code token |
|---|---|---|
| surface | `color/background/canvas` | `theme.colors.background.canvas` |
| padding | `spacing/xl` | `theme.spacing.xl` |
| gap | `spacing/md` | `theme.spacing.md` |
| buttons | `Button` component tokens | `Button` component tokens |

## Modal

### Figma

- Source node ID: `250:1692`
- Body node ID: `250:1960`
- Component set: `Modal`
- Component set node ID: `284:1406`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=284-1406`

### Variant Props

| Prop | Values | Code prop |
|---|---|---|
| `action` | `single`, `stacked`, `inline`, `triple` | `actionLayout` |
| `Show subline` | `true`, `false` | `showSubline` |
| `Subline` | text override | `subline` |
| `Show body text` | `true`, `false` | `showBodyText` |

### Implementation Requirements

- Composes canonical `Action`, `Button`, `Icon`, and child content.
- `ModalBody` keeps the Figma body padding of `8px` horizontal and `4px` vertical so nested `List item/Cell` keeps its own canonical padding.
- `showBodyText=false` is used when the modal body should contain only slotted content, for example a `List item/Cell` plus footer action.
- `presentation="overlay"` opens as a bottom sheet with overlay dimming, side insets `spacing/sm`, and bottom inset `spacing/xl`.
