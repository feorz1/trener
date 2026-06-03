export type CalendarDayState = "default" | "today" | "selected" | "hasWorkouts" | "disabled";

export type CalendarSlotStatus = "free" | "planned" | "inProgress" | "completed" | "cancelled" | "moved";

export type CalendarDayItem = {
  key: string;
  label: string;
  dayNumber: string;
  state?: CalendarDayState;
};

export type CalendarDayTemporalState = "past" | "default" | "future";

export type CalendarDayStripItem = {
  key: string;
  weekday: string;
  dayNumber: string;
  temporalState?: CalendarDayTemporalState;
  disabled?: boolean;
};
