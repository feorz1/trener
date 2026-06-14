import { capitalize, formatRuMonth } from "@/utils/date";

export type DateCell = {
  date: Date;
  key: string;
  label: string;
  disabled?: boolean;
};

export type CalendarSlot = "15:00" | "16:00" | "17:00" | "18:00";
export type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const freeSlots: CalendarSlot[] = ["15:00", "16:00", "17:00", "18:00"];
export const repeatOptions: { key: RepeatDay; label: string }[] = [
  { key: "monday", label: "Каждый понедельник" },
  { key: "tuesday", label: "Каждый вторник" },
  { key: "wednesday", label: "Каждую среду" },
  { key: "thursday", label: "Каждый четверг" },
  { key: "friday", label: "Каждую пятницу" },
  { key: "saturday", label: "Каждую субботу" },
  { key: "sunday", label: "Каждое воскресенье" }
];
export const repeatDayLabels: Record<RepeatDay, string> = {
  monday: "понедельник",
  tuesday: "вторник",
  wednesday: "среда",
  thursday: "четверг",
  friday: "пятница",
  saturday: "суббота",
  sunday: "воскресенье"
};
export const weekdayShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function addMonths(date: Date, months: number) {
  const value = new Date(date);
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  return value;
}

export function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value?: string) {
  if (!value) return startOfDay(new Date());

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(new Date());

  return startOfDay(new Date(year, month - 1, day));
}

export function parseRepeatDays(value?: string) {
  if (!value) return [];
  const repeatKeys = new Set(repeatOptions.map((option) => option.key));
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is RepeatDay => repeatKeys.has(item as RepeatDay));
}

export function isCalendarSlot(value?: string): value is CalendarSlot {
  return freeSlots.includes(value as CalendarSlot);
}

export function buildMonthWeeks(monthDate: Date, selectedKey?: string): (DateCell | null)[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const days: (DateCell | null)[] = Array.from({ length: leadingBlanks }, () => null);
  const today = startOfDay(new Date());

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = startOfDay(new Date(year, month, day));
    const key = getDateKey(date);

    days.push({
      date,
      key,
      label: String(day),
      disabled: date < today && key !== selectedKey
    });
  }

  const trailingBlanks = (7 - (days.length % 7)) % 7;
  days.push(...Array.from({ length: trailingBlanks }, () => null));

  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
}

export function getRepeatValue(selectedDays: RepeatDay[]) {
  if (selectedDays.length === 0) return undefined;
  if (selectedDays.length === 1) return repeatOptions.find((option) => option.key === selectedDays[0])?.label;

  const orderedLabels = repeatOptions
    .filter((option) => selectedDays.includes(option.key))
    .map((option) => repeatDayLabels[option.key]);
  const formattedLabels = orderedLabels.map((label, index) => (index === 0 ? capitalize(label) : label));

  if (formattedLabels.length === 2) {
    return `${formattedLabels[0]} и ${formattedLabels[1]}`;
  }

  return `${formattedLabels.slice(0, -1).join(", ")} и ${formattedLabels[formattedLabels.length - 1]}`;
}

export { formatRuMonth };
