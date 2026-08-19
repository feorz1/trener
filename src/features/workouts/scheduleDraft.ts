import type { CalendarSlot, RepeatDay } from "./scheduleOptions";

export type ScheduleTimes = Partial<Record<RepeatDay, CalendarSlot>>;

export const defaultCalendarSlot: CalendarSlot = "17:00";

const repeatDayByNativeWeekday: RepeatDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

type EditDraftSchedule = {
  startsAt: string;
  repeatDays?: RepeatDay[];
  scheduleTimes?: Partial<Record<RepeatDay, string>>;
  exercises: Array<{ day?: RepeatDay }>;
};

function scheduleFromStartsAt(startsAt: string) {
  const date = new Date(startsAt);
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return {
    day: repeatDayByNativeWeekday[validDate.getDay()] ?? "monday",
    time: `${String(validDate.getHours()).padStart(2, "0")}:${String(validDate.getMinutes()).padStart(2, "0")}`
  };
}

export function normalizeEditDraftSchedule<T extends EditDraftSchedule>(draft: T): T {
  const fallbackSchedule = scheduleFromStartsAt(draft.startsAt);
  const primaryDay = draft.repeatDays?.[0] ?? fallbackSchedule.day;
  const needsRepeatDay = !draft.repeatDays?.length;
  const needsScheduleTime = !draft.scheduleTimes?.[primaryDay];
  const needsExerciseDay = draft.exercises.some((exercise) => !exercise.day);

  if (!needsRepeatDay && !needsScheduleTime && !needsExerciseDay) return draft;

  return {
    ...draft,
    repeatDays: needsRepeatDay ? [primaryDay] : draft.repeatDays,
    scheduleTimes: needsScheduleTime
      ? { ...draft.scheduleTimes, [primaryDay]: fallbackSchedule.time }
      : draft.scheduleTimes,
    exercises: needsExerciseDay
      ? draft.exercises.map((exercise) => (exercise.day ? exercise : { ...exercise, day: primaryDay }))
      : draft.exercises
  };
}

export function withDefaultScheduleTimes(days: RepeatDay[], scheduleTimes: ScheduleTimes) {
  return days.reduce<ScheduleTimes>(
    (nextTimes, day) => ({
      ...nextTimes,
      [day]: nextTimes[day] ?? defaultCalendarSlot
    }),
    { ...scheduleTimes }
  );
}

export function buildStartsAt(date: Date | undefined, time: string | undefined) {
  const value = date ? new Date(date) : new Date();
  const [hours, minutes] = (time ?? defaultCalendarSlot).split(":").map(Number);
  value.setHours(Number.isFinite(hours) ? hours : 17, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return value.toISOString();
}

export function buildScheduleDraftPatch(input: {
  selectedDate: Date | undefined;
  selectedDays: RepeatDay[];
  scheduleTimes: ScheduleTimes;
}) {
  const firstDay = input.selectedDays[0];
  const effectiveScheduleTimes = withDefaultScheduleTimes(input.selectedDays, input.scheduleTimes);

  return {
    startsAt: buildStartsAt(input.selectedDate, firstDay ? effectiveScheduleTimes[firstDay] : undefined),
    repeatDays: input.selectedDays,
    scheduleTimes: effectiveScheduleTimes
  };
}
