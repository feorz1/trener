# CalendarDayStrip

`CalendarDayStrip` is a calendar navigation component for trainer schedules. It shows one week of seven days, supports a separate current-day dot, and lets the trainer select a date to filter workout cards.

## Source Of Truth

- Figma source node: `327:1476`
- Figma day cell variants: `327:1421`
- Code: `src/components/calendar/CalendarDayStrip.tsx`
- Storybook: `src/components/calendar/CalendarDayStrip.stories.tsx`

## Anatomy

- `root`: horizontal week strip with clipped overflow and no container radius.
- `week page`: seven day cells. Paging moves exactly one week.
- `day cell`: pressable date surface.
- `weekday`: short weekday label.
- `day number`: numeric date.
- `current day dot`: optional 4px marker independent from selected state.
- `selected fill`: animated fill layer for the selected day.

## Props

| Prop | Type | Purpose |
|---|---|---|
| `items` | `CalendarDayStripItem[]` | Single week with up to 7 days. |
| `weeks` | `CalendarDayStripItem[][]` | Multiple pages; each page is one week. |
| `selectedKey` | `string` | Controlled selected day key. |
| `defaultSelectedKey` | `string` | Initial selected day key for uncontrolled usage. |
| `todayKey` | `string` | Day that shows the current-day dot. |
| `disabled` | `boolean` | Disables interaction and week scrolling. |
| `width` | `number \| "full"` | Fixed Figma width or parent-fill width. |
| `onSelect` | `(key, item) => void` | Called when a day is pressed. |
| `onWeekChange` | `(weekStartKey, weekIndex) => void` | Called after paging to another week. |

## Item Shape

```ts
type CalendarDayStripItem = {
  key: string;
  weekday: string;
  dayNumber: string;
  temporalState?: "past" | "default" | "future";
  disabled?: boolean;
};
```

## Variant Logic

| Figma property | Code mapping |
|---|---|
| `state=прошедший день` | `temporalState="past"` |
| `state=текущий день` | `selectedKey === item.key` |
| `state=будущий день` | `temporalState="future"` |
| `currentDay=true` | `todayKey === item.key` |

`selectedKey` and `todayKey` are intentionally separate. A trainer can select any date while the dot still marks the real current day.

## Token Map

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
| past day fill | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| future day fill | `color/background/canvas` | `theme.colors.background.canvas` |
| selected fill | `color/content/primary` | `theme.colors.content.primary` |
| selected text/dot | `color/content/on-primary` | `theme.colors.content.onPrimary` |
| weekday text | `color/content/body` | `theme.colors.content.body` |
| date text | `color/content/ink` | `theme.colors.content.ink` |
| weekday typography | `Typography/Caption` | `theme.typography.caption` |
| date typography | `Typography/Body/MD Strong` | `theme.typography.body.mdStrong` |

## Motion

- Selecting a day uses a short opacity fill animation (`180ms`) so the active state feels responsive but not abrupt.
- Horizontal paging uses native scroll paging and snaps to exactly one week width.

## Usage

```tsx
<CalendarDayStrip
  items={week}
  selectedKey={selectedDate}
  todayKey={today}
  width="full"
  onSelect={setSelectedDate}
/>
```

## Rules

- Do not hardcode weekday colors or cell sizes in screens.
- Show workout cards from selected date data outside the component.
- Use `weeks` only when the screen needs horizontal one-week paging.
- Keep day cells as atomic pressable date controls; do not place cards or appointments inside cells.
