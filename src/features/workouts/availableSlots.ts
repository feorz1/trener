import type { Workout } from "@/types";
import { freeSlots, getDateKey, isCalendarSlot, type CalendarSlot } from "./scheduleOptions";

export function getInitialCalendarSlot(iso?: string): CalendarSlot | undefined {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return undefined;

  const value = `${String(date.getHours()).padStart(2, "0")}:00`;
  return isCalendarSlot(value) ? value : undefined;
}

export function buildSlotDateTime(date: Date | null, slot?: CalendarSlot) {
  if (!date || !slot) return null;

  const [hours, minutes] = slot.split(":").map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

export function getAvailableWorkoutSlots(input: { date: Date | null; workouts: Workout[]; excludeWorkoutId?: string; now?: Date }) {
  if (!input.date) return [];

  const selectedKey = getDateKey(input.date);
  const now = input.now ?? new Date();
  const occupiedSlots = new Set(
    input.workouts
      .filter((item) => item.id !== input.excludeWorkoutId && item.status !== "draft" && item.status !== "cancelled" && item.status !== "completed")
      .filter((item) => getDateKey(new Date(item.startsAt)) === selectedKey)
      .map((item) => getInitialCalendarSlot(item.startsAt))
      .filter((slot): slot is CalendarSlot => Boolean(slot))
  );

  return freeSlots.filter((slot) => {
    const slotDate = buildSlotDateTime(input.date, slot);
    if (!slotDate) return false;
    if (getDateKey(now) === selectedKey && slotDate <= now) return false;
    return !occupiedSlots.has(slot);
  });
}
