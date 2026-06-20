import { Client } from "@/types";

const today = new Date();
const atToday = (hour: number, minute: number) => {
  const value = new Date(today);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};

export const mockClients: Client[] = [
  {
    id: "client-1",
    name: "Анна Морозова",
    goal: "Силовая база и осанка",
    status: "active",
    avatarInitials: "АМ",
    nextWorkoutAt: atToday(9, 30),
    notes: "Следить за положением плеч в жимах. Лучше реагирует на короткие технические подсказки.",
    metrics: { weightKg: 64, heightCm: 170, attendanceRate: 92 }
  },
  {
    id: "client-2",
    name: "Константин",
    phone: "+7 999-312-21-42",
    telegram: "@konstantin",
    gender: "male",
    goal: "Поддержать форму",
    status: "active",
    avatarInitials: "К",
    nextWorkoutAt: atToday(12, 0),
    notes: "Нельзя скручивания, Нельзя осевые нагрузки",
    restrictions: ["Травмы спины", "Грыжи / протрузии", "Нельзя скручивания", "Нельзя осевые нагрузки"],
    metrics: { weightKg: 78, heightCm: 181, attendanceRate: 86 }
  },
  {
    id: "client-3",
    name: "Мария Лебедева",
    goal: "Возвращение после перерыва",
    status: "new",
    avatarInitials: "МЛ",
    nextWorkoutAt: atToday(18, 30),
    notes: "Первый месяц без отказных подходов.",
    metrics: { weightKg: 58, heightCm: 166, attendanceRate: 100 }
  }
];

export { atToday };
