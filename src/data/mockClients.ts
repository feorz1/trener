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
    name: "Anna Morozova",
    goal: "Strength base and posture",
    status: "active",
    avatarInitials: "AM",
    nextWorkoutAt: atToday(9, 30),
    notes: "Watch shoulder position during pressing. Prefers short technique cues.",
    metrics: { weightKg: 64, heightCm: 170, attendanceRate: 92 }
  },
  {
    id: "client-2",
    name: "Ilya Sokolov",
    goal: "Muscle gain",
    status: "active",
    avatarInitials: "IS",
    nextWorkoutAt: atToday(12, 0),
    notes: "Keep rest periods at least 2 minutes.",
    metrics: { weightKg: 78, heightCm: 181, attendanceRate: 86 }
  },
  {
    id: "client-3",
    name: "Maria Lebedeva",
    goal: "Return after a break",
    status: "new",
    avatarInitials: "ML",
    nextWorkoutAt: atToday(18, 30),
    notes: "First month without failure sets.",
    metrics: { weightKg: 58, heightCm: 166, attendanceRate: 100 }
  }
];

export { atToday };
