# Trainer App Kit Generator

Local development Figma plugin for generating an editable design-system kit for the trainer mobile app.

The plugin does not use Figma MCP, external APIs, network calls, or community plugin publishing. It runs inside the currently open Figma file.

## Current Output

The current generator creates a new page named `Кит v0.3 Clean`.

It does not delete old pages, old components, or previous kit attempts.

Page structure:

- `00 Cover`
- `01 Foundations`
- `02 Base Components`
- `03 Calendar Components`
- `04 Client Components`
- `05 Workout Components`
- `06 PDF Components`
- `07 Screen Examples`
- `08 Handoff Notes`

## Build

```bash
cd C:\trener\figma-plugin
npm install
npm run build
```

The compiled plugin entry is `figma-plugin/dist/code.js`.

## Import Into Figma

1. Open Figma Desktop.
2. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`.
3. Select `figma-plugin/manifest.json`.
4. The plugin will appear as `Trainer App Kit Generator`.

## Run

1. Open the target Figma file.
2. Run `Plugins` -> `Development` -> `Trainer App Kit Generator`.
3. The plugin creates a fresh page named `Кит v0.3 Clean`.

## Variables Used

The plugin first tries to find local variables with the exact names below. If a variable is missing, it uses fallback values.

Colors:

- `color/brand/primary`
- `color/brand/soft`
- `color/brand/contrast`
- `color/background/app`
- `color/background/surface`
- `color/background/surface-soft`
- `color/background/surface-muted`
- `color/text/primary`
- `color/text/secondary`
- `color/text/muted`
- `color/text/inverse`
- `color/text/disabled`
- `color/border/default`
- `color/border/active`
- `color/status/success`
- `color/status/success-soft`
- `color/status/warning`
- `color/status/warning-soft`
- `color/status/error`
- `color/status/error-soft`
- `color/status/neutral`
- `color/workout/planned`
- `color/workout/in-progress`
- `color/workout/completed`
- `color/workout/cancelled`

Spacing:

- `spacing/1`
- `spacing/2`
- `spacing/3`
- `spacing/4`
- `spacing/5`
- `spacing/6`
- `spacing/8`
- `spacing/10`
- `spacing/12`

Radius:

- `radius/s`
- `radius/m`
- `radius/l`
- `radius/xl`
- `radius/pill`

## Text Styles

The plugin creates or updates these local text styles and applies them to generated text layers:

- `Typography / Display / Title`
- `Typography / Heading / H1`
- `Typography / Heading / H2`
- `Typography / Heading / H3`
- `Typography / Body / Regular`
- `Typography / Body / Strong`
- `Typography / Body / Small`
- `Typography / Label / Medium`
- `Typography / Label / Small`
- `Typography / Button / Medium`
- `Typography / Number / Large`
- `Typography / Number / Medium`

## Component Sets

Generated component sets:

- `Button`: `variant`, `size`, `state`, `icon`
- `IconButton`: `variant`, `size`, `state`
- `Input`: `type`, `state`, `helper`
- `Checkbox`: `state`
- `Badge`: `type`, `size`
- `SegmentedControl`: `items`, `state`
- `Card`: `density`, `state`
- `CalendarDay`: `state`
- `CalendarSlot`: `status`
- `ClientCard`: `state`
- `ClientStatsBlock`: `state`
- `ClientGoalBlock`: `state`
- `WorkoutCard`: `status`, `density`
- `SetRow`: `state`, `comment`
- `PreviousResultBlock`: `state`
- `ProgressBadge`: `direction`, `size`
- `ExerciseCard`: `state`, `progress`, `comment`
- `WorkoutSummary`: `state`

The plugin also creates PDF components and three screen examples built from component instances.
