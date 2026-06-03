# Data Model

First phase uses mock data. Keep types stable so backend integration can replace data sources later.

## Main Entities

- `Client`
- `Exercise`
- `Workout`
- `WorkoutExercise`
- `WorkoutSet`
- `ResultHistoryItem`
- `CalendarDayItem`
- `CalendarSlot`

## Type Location

Use `src/types`.

Do not define duplicate domain types inside components.

