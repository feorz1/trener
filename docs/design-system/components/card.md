# Card

Canonical trainer dashboard card. It covers the day plan block, workout entries, and add-workout entry.

## Figma

- Source node ID: `295:1313`
- Component set: `Card`
- URL: `https://www.figma.com/design/WX5ZEAu5746PYS5ScZlVhW?node-id=295-1313`

## Anatomy

- `root container`: rounded Auto Layout card surface.
- `header`: muscle group icon/label and optional more action.
- `client title`: client name.
- `metadata`: planned time and exercise count, or workout progress.
- `action`: start/continue/add buttons using canonical `Button`.
- `menu`: more menu with move/cancel actions.

## Props

| Prop | Type | Description |
|---|---|---|
| `variant` | `"dayPlan" | "workout" | "addWorkout"` | Card family. |
| `dayPlanState` | `"plan" | "planNext"` | Day plan state: summary only or next-plan add action. |
| `workoutStatus` | `"planned" | "inProgress" | "completed"` | Workout entry state. |
| `showAction` | `boolean` | Shows the card action button. |
| `showMenu` | `boolean` | Shows the more menu button. |
| `muscleGroup` | `string` | Muscle group label from the workout plan. |
| `muscleIconName` | `IconName` | Canonical icon for the muscle group. |
| `clientName` | `string` | Client name. |
| `workoutTime` | `string` | Scheduled training time. |
| `exerciseCount` | `number` | Total exercises from the plan. |
| `completedExercises` | `number` | Completed exercises for progress state. |

## Token Map

| Usage | Figma token | Code token |
|---|---|---|
| workout surface | `color/background/canvas-soft` | `theme.colors.background.canvasSoft` |
| plan surface | `color/content/ink-deep` | `theme.colors.content.inkDeep` |
| plan title/meta | `color/content/primary-pale` | `theme.colors.content.primaryPale` |
| plan count | `color/content/primary` | `theme.colors.content.primary` |
| primary text | `color/content/ink` | `theme.colors.content.ink` |
| muscle icon/text | `color/status/negative` | `theme.colors.status.negative` |
| radius | `radius/xl` | `theme.radius.xl` |
| content padding | `spacing/lg` | `theme.spacing.lg` |
| day plan content gap | `spacing/xs` | `theme.spacing.xs` |
| header-to-body gap | `spacing/sm` | `theme.spacing.sm` |
| action top padding | `spacing/xxs` | `theme.spacing.xxs` |
| action horizontal/bottom padding | `spacing/lg` | `theme.spacing.lg` |
| workout preview width | Figma width `359` | `theme.sizes.cardWorkoutWidth` |
| day plan preview width | Figma width `343` | `theme.sizes.cardPlanWidth` |
| add workout height | Figma height `74` | `theme.sizes.cardAddWorkoutMinHeight` |
| plan height | Figma height `120` | content-driven |
| plan next height | Figma height `164` | content-driven |
| client typography | `Typography/Display/XS` | `theme.typography.display.xs` |
| muscle group typography | `Typography/Body/MD Strong`, 20px line height | `theme.typography.body.mdStrong` with line-height override |
| meta typography | `Typography/Body/SM Strong` | `theme.typography.body.smStrong` |
| plan meta typography | `Typography/Body/SM`, 18px line height | `theme.typography.body.sm` with line-height override |
| plan count typography | `Typography/Display/MD`, 44px line height | `theme.typography.display.md` with line-height override |
| muscle icon | `Icons / muscle arms` | `Icon name="muscle arms"` |
| workout action button height | `spacing/sm + Typography/Button/MD + spacing/sm` | `Button size="medium"` with compact card override |
| plan next action button height | Figma height `48` | `theme.sizes.buttonMdHeight` |

## Implementation Requirements

- `Card` composes canonical `Button`, `Icon`, `Badge`, and `ProgressBar`.
- More action opens an in-card move/cancel menu.
- The menu resets when `variant`, `dayPlanState`, or `workoutStatus` changes.
- `dayPlanState="plan"` renders the 343x120 summary with title, count, and meta text; `dayPlanState="planNext"` renders the 343x164 summary with one green add action and no meta line.
- Workout entries use the same nesting as Figma: a `content` block with 16 px padding and 8 px internal gap, followed by `Action small` with 16 px horizontal padding, 2 px top padding, 16 px bottom padding, and compact 34 px action buttons.
- In-progress workout cards show an action by default. Planned workout cards use `showAction` to match the Figma property.
- The more menu must render above the progress/action area and menu labels must stay on one line.
- Storybook previews should render Card at its canonical Figma width on web, while native screens may stretch it to the available container width.
- Card content is driven by workout-plan data, not hardcoded screen data.
- All styling must come from `src/theme`.
