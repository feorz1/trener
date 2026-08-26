import { REPEAT_DAYS, type RepeatDayRecord } from "./types";

export const DEFAULT_OCCURRENCE_WINDOW_DAYS = 90;
export const MAX_OCCURRENCE_WINDOW_DAYS = 366;

export type WorkoutSeriesScheduleSlot = {
  id: string;
  weekday: RepeatDayRecord;
  localTime: string;
};

export type WorkoutSeriesOccurrence = {
  seriesSlotId: string;
  occurrenceKey: string;
  scheduledAt: Date;
  scheduledLocalDate: string;
  scheduledLocalTime: string;
};

const WEEKDAY_BY_INDEX: readonly RepeatDayRecord[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
];

export function generateWorkoutSeriesOccurrences(input: {
  seriesId: string;
  scheduleVersion: number;
  timezone: string;
  startDate: string;
  throughDate: string;
  slots: WorkoutSeriesScheduleSlot[];
}): WorkoutSeriesOccurrence[] {
  assertLocalDate(input.startDate, "startDate");
  assertLocalDate(input.throughDate, "throughDate");
  assertTimezone(input.timezone);
  if (!Number.isInteger(input.scheduleVersion) || input.scheduleVersion < 1) {
    throw new Error("scheduleVersion must be a positive integer");
  }
  if (input.throughDate < input.startDate) return [];
  if (localDayDistance(input.startDate, input.throughDate) > MAX_OCCURRENCE_WINDOW_DAYS) {
    throw new WorkoutSeriesRangeError();
  }

  const slotsByWeekday = new Map<RepeatDayRecord, WorkoutSeriesScheduleSlot[]>();
  for (const slot of input.slots) {
    assertLocalTime(slot.localTime, "slot.localTime");
    if (!REPEAT_DAYS.includes(slot.weekday)) throw new Error(`Unsupported weekday: ${slot.weekday}`);
    const daySlots = slotsByWeekday.get(slot.weekday) ?? [];
    daySlots.push(slot);
    slotsByWeekday.set(slot.weekday, daySlots);
  }

  const occurrences: WorkoutSeriesOccurrence[] = [];
  for (let cursor = input.startDate; cursor <= input.throughDate; cursor = addLocalDays(cursor, 1)) {
    const weekday = weekdayForLocalDate(cursor);
    for (const slot of slotsByWeekday.get(weekday) ?? []) {
      const scheduledAt = localDateTimeToUtc(cursor, slot.localTime, input.timezone);
      occurrences.push({
        seriesSlotId: slot.id,
        occurrenceKey: `v${input.scheduleVersion}:${slot.id}:${cursor}`,
        scheduledAt,
        scheduledLocalDate: utcDateToLocalDate(scheduledAt, input.timezone),
        scheduledLocalTime: utcDateToLocalTime(scheduledAt, input.timezone)
      });
    }
  }

  return occurrences.sort(
    (left, right) =>
      left.scheduledAt.getTime() - right.scheduledAt.getTime() ||
      left.seriesSlotId.localeCompare(right.seriesSlotId)
  );
}

export function localDateTimeToUtc(localDate: string, localTime: string, timezone: string) {
  const { year, month, day } = parseLocalDate(localDate);
  const { hour, minute } = parseLocalTime(localTime);
  assertTimezone(timezone);

  const target = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let instant = target;
  for (let pass = 0; pass < 4; pass += 1) {
    const observed = localPartsAt(new Date(instant), timezone);
    const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, 0, 0);
    const correction = target - observedAsUtc;
    instant += correction;
    if (correction === 0) break;
  }

  const resolved = new Date(instant);
  const observed = localPartsAt(resolved, timezone);
  if (
    observed.year !== year ||
    observed.month !== month ||
    observed.day !== day ||
    observed.hour !== hour ||
    observed.minute !== minute
  ) {
    throw new WorkoutSeriesLocalTimeError(localDate, localTime, timezone);
  }
  return resolved;
}

export function addLocalDays(localDate: string, days: number) {
  const { year, month, day } = parseLocalDate(localDate);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatLocalDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function utcDateToLocalDate(date: Date, timezone: string) {
  assertTimezone(timezone);
  const parts = localPartsAt(date, timezone);
  return formatLocalDate(parts.year, parts.month, parts.day);
}

export function utcDateToLocalTime(date: Date, timezone: string) {
  assertTimezone(timezone);
  const parts = localPartsAt(date, timezone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function dateOnlyToLocalDate(date: Date) {
  return formatLocalDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function localDateToDateOnly(localDate: string) {
  const { year, month, day } = parseLocalDate(localDate);
  return new Date(Date.UTC(year, month - 1, day));
}

export function assertTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new Error(`Unsupported timezone: ${timezone}`);
  }
}

function weekdayForLocalDate(localDate: string) {
  const { year, month, day } = parseLocalDate(localDate);
  return WEEKDAY_BY_INDEX[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function parseLocalDate(value: string) {
  assertLocalDate(value, "localDate");
  const [year, month, day] = value.split("-").map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() + 1 !== month ||
    normalized.getUTCDate() !== day
  ) {
    throw new Error(`Invalid local date: ${value}`);
  }
  return { year, month, day };
}

function parseLocalTime(value: string) {
  assertLocalTime(value, "localTime");
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

function assertLocalDate(value: string, name: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must use YYYY-MM-DD`);
}

function assertLocalTime(value: string, name: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`${name} must use HH:mm`);
}

function formatLocalDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function localDayDistance(startDate: string, throughDate: string) {
  return Math.round((localDateToDateOnly(throughDate).getTime() - localDateToDateOnly(startDate).getTime()) / 86_400_000);
}

export class WorkoutSeriesRangeError extends Error {
  constructor() {
    super(`Occurrence window cannot exceed ${MAX_OCCURRENCE_WINDOW_DAYS} days`);
    this.name = "WorkoutSeriesRangeError";
  }
}

export class WorkoutSeriesLocalTimeError extends Error {
  constructor(localDate: string, localTime: string, timezone: string) {
    super(`Local time ${localDate} ${localTime} does not exist in ${timezone}`);
    this.name = "WorkoutSeriesLocalTimeError";
  }
}

function localPartsAt(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute")
  };
}
