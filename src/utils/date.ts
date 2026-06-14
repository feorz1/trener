export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));

const ruMonthsGenitive = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const ruMonthsNominative = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const ruWeekdays = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

export const capitalize = (value: string) => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value);

export const formatRuDayMonth = (date: Date) => `${date.getDate()} ${ruMonthsGenitive[date.getMonth()]}`;

export const formatRuMonth = (date: Date) => capitalize(ruMonthsNominative[date.getMonth()] ?? "");

export const formatRuHeaderDate = (date: Date) => `${formatRuDayMonth(date)} · ${ruWeekdays[date.getDay()]}`;

export const formatRuSelectDate = (date: Date) => `${capitalize(ruWeekdays[date.getDay()] ?? "")}, ${formatRuDayMonth(date)}`;

export const formatDay = (iso: string) => formatRuDayMonth(new Date(iso));

export const isSameDate = (leftIso: string, right: Date) => {
  const left = new Date(leftIso);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};
