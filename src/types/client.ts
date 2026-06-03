export type ClientStatus = "active" | "paused" | "new";

export type Client = {
  id: string;
  name: string;
  goal: string;
  status: ClientStatus;
  avatarInitials: string;
  nextWorkoutAt: string;
  notes: string;
  metrics: {
    weightKg: number;
    heightCm: number;
    attendanceRate: number;
  };
};
