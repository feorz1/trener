import type { OwnerId } from "./owner";

export type ClientStatus = "active" | "paused" | "new";
export type ClientGender = "male" | "female";

export type ClientIntake = {
  ageYears?: number;
  targetWeightKg?: number;
  healthConstraints?: string[];
  exerciseRestrictions?: string[];
  activityLevel?: string;
  sleep?: string;
  workoutsPerWeek?: number;
  trainingExperience?: string;
  sports?: string[];
};

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
  intake?: ClientIntake;
  createdAt?: string;
  updatedAt?: string;
  metrics: {
    weightKg: number;
    heightCm: number;
    attendanceRate: number;
  };
};
