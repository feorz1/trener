import type {
  ApiClientDto,
  ApiExerciseDto,
  ApiPreviousExercisePerformanceDto,
  ApiQuickValueDto,
  ApiWorkoutDto,
  ApiWorkoutExerciseDto,
  ApiWorkoutResultDto,
  ApiWorkoutSessionDto,
  ApiWorkoutSessionExerciseDto,
  ApiWorkoutSetDto
} from "./dto";
import { ApiError } from "./errors";

export type ApiSchema<T> = {
  parse(input: unknown): T;
};

function object(input: unknown, name: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError("validation", `${name} must be an object`, { retryable: false });
  }
  return input as Record<string, unknown>;
}

function stringField(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string") throw new ApiError("validation", `${key} must be a string`, { retryable: false });
  return value;
}

function optionalStringField(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new ApiError("validation", `${key} must be a string`, { retryable: false });
  return value;
}

function numberField(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError("validation", `${key} must be a finite number`, { retryable: false });
  }
  return value;
}

function optionalNumberField(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError("validation", `${key} must be a finite number`, { retryable: false });
  }
  return value;
}

function booleanField(source: Record<string, unknown>, key: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") throw new ApiError("validation", `${key} must be a boolean`, { retryable: false });
  return value;
}

function optionalBooleanField(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new ApiError("validation", `${key} must be a boolean`, { retryable: false });
  return value;
}

function stringArrayField(source: Record<string, unknown>, key: string): string[] {
  const value = source[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ApiError("validation", `${key} must be a string array`, { retryable: false });
  }
  return [...value];
}

function optionalStringArrayField(source: Record<string, unknown>, key: string): string[] | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ApiError("validation", `${key} must be a string array`, { retryable: false });
  }
  return [...value];
}

function numberArrayField(source: Record<string, unknown>, key: string): number[] {
  const value = source[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "number" && Number.isFinite(item))) {
    throw new ApiError("validation", `${key} must be a finite number array`, { retryable: false });
  }
  return [...value];
}

function parseArray<T>(source: Record<string, unknown>, key: string, parseItem: (input: unknown) => T): T[] {
  const value = source[key];
  if (!Array.isArray(value)) throw new ApiError("validation", `${key} must be an array`, { retryable: false });
  return value.map(parseItem);
}

function optionalRecord(source: Record<string, unknown>, key: string): Record<string, string> | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  const parsed = object(value, key);
  for (const item of Object.values(parsed)) {
    if (typeof item !== "string") throw new ApiError("validation", `${key} values must be strings`, { retryable: false });
  }
  return parsed as Record<string, string>;
}

function optionalNumberRecord(source: Record<string, unknown>, key: string): Record<string, number> | undefined {
  const value = source[key];
  if (value === undefined) return undefined;
  const parsed = object(value, key);
  for (const item of Object.values(parsed)) {
    if (typeof item !== "number" || !Number.isFinite(item)) throw new ApiError("validation", `${key} values must be numbers`, { retryable: false });
  }
  return parsed as Record<string, number>;
}

function parseWorkoutSet(input: unknown): ApiWorkoutSetDto {
  const value = object(input, "workout set");
  return {
    id: stringField(value, "id"),
    order: numberField(value, "order"),
    values: optionalNumberRecord(value, "values"),
    target_weight_kg: optionalNumberField(value, "target_weight_kg"),
    target_reps: optionalNumberField(value, "target_reps"),
    target_duration_seconds: optionalNumberField(value, "target_duration_seconds"),
    target_distance_meters: optionalNumberField(value, "target_distance_meters"),
    actual_weight_kg: optionalNumberField(value, "actual_weight_kg"),
    actual_reps: optionalNumberField(value, "actual_reps"),
    actual_duration_seconds: optionalNumberField(value, "actual_duration_seconds"),
    actual_distance_meters: optionalNumberField(value, "actual_distance_meters"),
    completed: booleanField(value, "completed")
  };
}

function parseWorkoutExercise(input: unknown): ApiWorkoutExerciseDto {
  const value = object(input, "workout exercise");
  return {
    id: stringField(value, "id"),
    exercise_id: stringField(value, "exercise_id"),
    exercise_name: stringField(value, "exercise_name"),
    result_type: optionalStringField(value, "result_type") as ApiWorkoutExerciseDto["result_type"],
    order: optionalNumberField(value, "order"),
    day: optionalStringField(value, "day") as ApiWorkoutExerciseDto["day"],
    muscle_group: optionalStringField(value, "muscle_group"),
    comment: optionalStringField(value, "comment"),
    collapsed: optionalBooleanField(value, "collapsed"),
    superset_with_next: optionalBooleanField(value, "superset_with_next"),
    sets: parseArray(value, "sets", parseWorkoutSet)
  };
}

function parseSessionExercise(input: unknown): ApiWorkoutSessionExerciseDto {
  const value = object(input, "session exercise");
  return {
    id: stringField(value, "id"),
    exercise_id: stringField(value, "exercise_id"),
    exercise_name: stringField(value, "exercise_name"),
    exercise_name_snapshot: optionalStringField(value, "exercise_name_snapshot"),
    result_type_snapshot: optionalStringField(value, "result_type_snapshot") as ApiWorkoutSessionExerciseDto["result_type_snapshot"],
    order: numberField(value, "order"),
    comment: optionalStringField(value, "comment"),
    planned_sets: optionalNumberField(value, "planned_sets"),
    planned_repetitions: optionalNumberField(value, "planned_repetitions"),
    planned_weight: optionalNumberField(value, "planned_weight")
  };
}

export const apiSchemas = {
  client: {
    parse(input: unknown): ApiClientDto {
      const value = object(input, "client");
      const metrics = object(value.metrics, "metrics");
      return {
        id: stringField(value, "id"),
        owner_id: stringField(value, "owner_id"),
        name: stringField(value, "name"),
        phone: optionalStringField(value, "phone"),
        email: optionalStringField(value, "email"),
        birth_date: optionalStringField(value, "birth_date"),
        telegram: optionalStringField(value, "telegram"),
        gender: optionalStringField(value, "gender") as ApiClientDto["gender"],
        goal: stringField(value, "goal"),
        status: stringField(value, "status") as ApiClientDto["status"],
        avatar_initials: stringField(value, "avatar_initials"),
        next_workout_at: stringField(value, "next_workout_at"),
        notes: stringField(value, "notes"),
        restrictions: optionalStringArrayField(value, "restrictions"),
        created_at: optionalStringField(value, "created_at"),
        updated_at: optionalStringField(value, "updated_at"),
        metrics: {
          weight_kg: numberField(metrics, "weight_kg"),
          height_cm: numberField(metrics, "height_cm"),
          attendance_rate: numberField(metrics, "attendance_rate")
        }
      };
    }
  },
  exercise: {
    parse(input: unknown): ApiExerciseDto {
      const value = object(input, "exercise");
      return {
        id: stringField(value, "id"),
        owner_id: stringField(value, "owner_id"),
        name: stringField(value, "name"),
        category: stringField(value, "category") as ApiExerciseDto["category"],
        source: optionalStringField(value, "source") as ApiExerciseDto["source"],
        primary_muscles: stringArrayField(value, "primary_muscles"),
        secondary_muscles: optionalStringArrayField(value, "secondary_muscles"),
        equipment: stringField(value, "equipment"),
        result_type: optionalStringField(value, "result_type") as ApiExerciseDto["result_type"],
        search_aliases: optionalStringArrayField(value, "search_aliases"),
        restriction_tags: optionalStringArrayField(value, "restriction_tags") as ApiExerciseDto["restriction_tags"],
        coach_notes: optionalStringField(value, "coach_notes"),
        notes: optionalStringField(value, "notes"),
        archived_at: optionalStringField(value, "archived_at"),
        created_at: optionalStringField(value, "created_at"),
        updated_at: optionalStringField(value, "updated_at")
      };
    }
  },
  workoutSet: { parse: parseWorkoutSet },
  workoutExercise: { parse: parseWorkoutExercise },
  workout: {
    parse(input: unknown): ApiWorkoutDto {
      const value = object(input, "workout");
      return {
        id: stringField(value, "id"),
        owner_id: stringField(value, "owner_id"),
        client_id: optionalStringField(value, "client_id"),
        title: stringField(value, "title"),
        starts_at: stringField(value, "starts_at"),
        timezone: optionalStringField(value, "timezone"),
        duration_minutes: numberField(value, "duration_minutes"),
        focus: stringField(value, "focus"),
        location: stringField(value, "location"),
        status: stringField(value, "status") as ApiWorkoutDto["status"],
        source_workout_id: optionalStringField(value, "source_workout_id"),
        cancelled_at: optionalStringField(value, "cancelled_at"),
        cancellation_reason: optionalStringField(value, "cancellation_reason"),
        created_at: optionalStringField(value, "created_at"),
        updated_at: optionalStringField(value, "updated_at"),
        exercises: parseArray(value, "exercises", parseWorkoutExercise),
        repeat_days: optionalStringArrayField(value, "repeat_days") as ApiWorkoutDto["repeat_days"],
        schedule_times: optionalRecord(value, "schedule_times")
      };
    }
  },
  sessionExercise: { parse: parseSessionExercise },
  session: {
    parse(input: unknown): ApiWorkoutSessionDto {
      const value = object(input, "session");
      return {
        id: stringField(value, "id"),
        owner_id: stringField(value, "owner_id"),
        workout_id: stringField(value, "workout_id"),
        client_id: optionalStringField(value, "client_id"),
        status: stringField(value, "status") as ApiWorkoutSessionDto["status"],
        started_at: stringField(value, "started_at"),
        started_timezone: optionalStringField(value, "started_timezone"),
        completed_at: optionalStringField(value, "completed_at"),
        completed_timezone: optionalStringField(value, "completed_timezone"),
        duration_seconds: optionalNumberField(value, "duration_seconds"),
        workout_title_snapshot: optionalStringField(value, "workout_title_snapshot"),
        created_at: optionalStringField(value, "created_at"),
        updated_at: optionalStringField(value, "updated_at"),
        exercises: parseArray(value, "exercises", parseSessionExercise)
      };
    }
  },
  result: {
    parse(input: unknown): ApiWorkoutResultDto {
      const value = object(input, "result");
      return {
        id: stringField(value, "id"),
        owner_id: stringField(value, "owner_id"),
        session_id: stringField(value, "session_id"),
        session_exercise_item_id: optionalStringField(value, "session_exercise_item_id"),
        exercise_id: stringField(value, "exercise_id"),
        exercise_name_snapshot: optionalStringField(value, "exercise_name_snapshot"),
        result_type: optionalStringField(value, "result_type") as ApiWorkoutResultDto["result_type"],
        set_index: numberField(value, "set_index"),
        set_id: optionalStringField(value, "set_id"),
        values: optionalNumberRecord(value, "values"),
        weight: optionalNumberField(value, "weight"),
        repetitions: optionalNumberField(value, "repetitions"),
        duration_seconds: optionalNumberField(value, "duration_seconds"),
        distance_meters: optionalNumberField(value, "distance_meters"),
        unit: optionalStringField(value, "unit"),
        completed: booleanField(value, "completed")
      };
    }
  },
  quickValue: {
    parse(input: unknown): ApiQuickValueDto {
      const value = object(input, "quick value");
      return {
        id: stringField(value, "id"),
        owner_id: stringField(value, "owner_id"),
        exercise_id: stringField(value, "exercise_id"),
        client_id: optionalStringField(value, "client_id"),
        metric: stringField(value, "metric") as ApiQuickValueDto["metric"],
        values: numberArrayField(value, "values"),
        updated_at: stringField(value, "updated_at")
      };
    }
  },
  previousExercisePerformance: {
    parse(input: unknown): ApiPreviousExercisePerformanceDto {
      const value = object(input, "previous exercise performance");
      return {
        session_id: stringField(value, "session_id"),
        completed_at: stringField(value, "completed_at"),
        result_type: stringField(value, "result_type") as ApiPreviousExercisePerformanceDto["result_type"],
        exercise_name: stringField(value, "exercise_name"),
        sets: parseArray(value, "sets", (item) => {
          const set = object(item, "previous exercise performance set");
          return {
            set_index: numberField(set, "set_index"),
            result_type: stringField(set, "result_type") as ApiPreviousExercisePerformanceDto["sets"][number]["result_type"],
            values: optionalNumberRecord(set, "values"),
            weight: optionalNumberField(set, "weight"),
            repetitions: optionalNumberField(set, "repetitions"),
            duration_seconds: optionalNumberField(set, "duration_seconds"),
            distance_meters: optionalNumberField(set, "distance_meters"),
            unit: optionalStringField(set, "unit")
          };
        })
      };
    }
  }
} satisfies Record<string, ApiSchema<unknown>>;
