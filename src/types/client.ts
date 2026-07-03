import type { OwnerId } from "./owner";

export type ClientStatus = "active" | "paused" | "new";
export type ClientGender = "male" | "female";

export type Client = {
  id: string;
  ownerId: OwnerId;
  name: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  telegram?: string;
  gender?: ClientGender;
  goal: string;
  status: ClientStatus;
  avatarInitials: string;
  nextWorkoutAt: string;
  notes: string;
  restrictions?: string[];
  createdAt?: string;
  updatedAt?: string;
  metrics: {
    weightKg: number;
    heightCm: number;
    attendanceRate: number;
  };
};
