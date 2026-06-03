# Approach

Workout exercise approach editor with set rows, add action, swipe delete, and note editing.

## Figma

- Source node ID: `387:3810`
- State node ID: `391:3325`
- Note modal node ID: `453:7464`
- Number style node ID: `387:3765`
- Component set: `Approach`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=387-3810`

## Anatomy

- `root`: 359px white card with 8px padding, 8px gap, 24px radius, and canvas-soft stroke.
- `header`: 40x40 rounded exercise thumbnail slot, title/note text stack, and 32x24 edit note button.
- `set list`: vertical stack of 65px rows with 4px gap; in Move state rows can be reordered by long press drag.
- `set row`: number chip, two editable metric fields, and status/move affordance.
- `add action`: full-width secondary neutral button with plus icon.
- `note modal`: bottom-sheet modal with `TextArea` and a single save action.

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Exercise title. |
| `note` | `string` | Optional note shown below the title and edited in the modal. |
| `sets` | `ApproachSet[]` | Set rows. |
| `showDeleteAction` | `boolean` | Enables swipe-to-delete row behavior. |
| `onNoteChange` | `(note: string) => void` | Called when the note modal saves. |
| `onSetStateChange` | `(id, state) => void` | Called when a row toggles selected/default. |
| `onSetValueChange` | `(id, patch) => void` | Called when metric values change. |
| `onSetsReorder` | `(sets) => void` | Called after a Move-state row is dropped into a new vertical position. |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| root surface | `color/background/canvas` | `theme.colors.background.canvas` |
| root stroke / move row | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| selected row | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| title/value text | `color/content/ink` | `theme.colors.content.ink` |
| note/unit text | `color/content/mute` | `theme.colors.content.mute` |
| number text / selected check | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| inactive status | `color/content/disabled` | `theme.colors.content.disabled` |
| delete action | `color/status/negative` | `theme.colors.status.negative` |
| add/save label | `color/content/primary` | `theme.colors.content.primary` |
| thumbnail surface | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| thumbnail radius | `radius/sm` | `theme.radius.sm` |
| root padding / gap | `spacing/sm` | `theme.spacing.sm` |
| row horizontal padding | `spacing/md` | `theme.spacing.md` |
| row vertical padding | `spacing/sm` | `theme.spacing.sm` |
| set list gap | `spacing/xs` | `theme.spacing.xs` |
| root radius | `radius/xl` | `theme.radius.xl` |
| row radius | `radius/lg` | `theme.radius.lg` |
| number radius | `radius/sm` | `theme.radius.sm` |
| title/value typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |
| number typography | `Typography/Body/SM Caption` | `theme.typography.body.smCaption` |
| note/unit typography | `Typography/Body/Caption` | `theme.typography.body.caption` |

## State Mapping

| Figma state | Code path |
|---|---|
| `Default` | `set.state="default"` |
| `Select` | `set.state="selected"` |
| `Move` | `set.state="move"` |
| `Delete=Yes` | swipe row left to reveal delete action |

## Implementation Requirements

- Row surfaces own the state background; metric fields must not add their own gray backing.
- Default completed rows use `content.disabled` for the trailing check circle.
- Selected rows use `content.primaryPale` row fill and `content.inkDeep` status fill.
- The header thumbnail is local Approach media, not the canonical circular `Avatar`.
- Move rows reorder vertically by long press: lift applies raised elevation, rows shift by one row slot as the dragged row crosses them, and release commits the new set order.
- Move interaction fires light haptic feedback on lift and selection feedback when the target position changes.
- The delete action uses a staged horizontal swipe: a short swipe snaps open to the 56px negative slab, and a longer swipe expands the negative field across the full row before deletion.
- Delete interaction fires medium haptic feedback once when the full-delete threshold is crossed.
- Only one delete row may be open at a time; opening another row closes the previous row.
- Delete capability must not change the row visual state by itself.
- Horizontal delete gestures must require horizontal dominance so vertical page scrolling remains available.
- Note editing uses the canonical `Modal` and `TextArea`.
- All styling must come from `src/theme`.
