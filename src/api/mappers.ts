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
import type {
  Client,
  Exercise,
  PreviousExercisePerformance,
  QuickValue,
  Workout,
  WorkoutResult,
  WorkoutSession,
  WorkoutSessionExercise
} from "@/data/types";

type WorkoutExercise = Workout["exercises"][number];
type WorkoutSet = Workout["exercises"][number]["sets"][number];

export function clientDtoToDomain(dto: ApiClientDto): Client {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    name: dto.name,
    phone: dto.phone,
    email: dto.email,
    birthDate: dto.birth_date,
    telegram: dto.telegram,
    gender: dto.gender,
    goal: dto.goal,
    status: dto.status,
    avatarInitials: dto.avatar_initials,
    nextWorkoutAt: dto.next_workout_at,
    notes: dto.notes,
    restrictions: dto.restrictions ? [...dto.restrictions] : undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    metrics: {
      weightKg: dto.metrics.weight_kg,
      heightCm: dto.metrics.height_cm,
      attendanceRate: dto.metrics.attendance_rate
    }
  };
}

export function clientDomainToDto(client: Client): ApiClientDto {
  return {
    id: client.id,
    owner_id: client.ownerId,
    name: client.name,
    phone: client.phone,
    email: client.email,
    birth_date: client.birthDate,
    telegram: client.telegram,
    gender: client.gender,
    goal: client.goal,
    status: client.status,
    avatar_initials: client.avatarInitials,
    next_workout_at: client.nextWorkoutAt,
    notes: client.notes,
    restrictions: client.restrictions ? [...client.restrictions] : undefined,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
    metrics: {
      weight_kg: client.metrics.weightKg,
      height_cm: client.metrics.heightCm,
      attendance_rate: client.metrics.attendanceRate
    }
  };
}

export function exerciseDtoToDomain(dto: ApiExerciseDto): Exercise {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    name: dto.name,
    category: dto.category,
    source: dto.source,
    primaryMuscles: [...dto.primary_muscles],
    secondaryMuscles: dto.secondary_muscles ? [...dto.secondary_muscles] : undefined,
    equipment: dto.equipment,
    resultType: dto.result_type,
    searchAliases: dto.search_aliases ? [...dto.search_aliases] : undefined,
    restrictionTags: dto.restriction_tags ? [...dto.restriction_tags] : undefined,
    coachNotes: dto.coach_notes,
    notes: dto.notes,
    archivedAt: dto.archived_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at
  };
}

export function exerciseDomainToDto(exercise: Exercise): ApiExerciseDto {
  return {
    id: exercise.id,
    owner_id: exercise.ownerId,
    name: exercise.name,
    category: exercise.category,
    source: exercise.source,
    primary_muscles: [...exercise.primaryMuscles],
    secondary_muscles: exercise.secondaryMuscles ? [...exercise.secondaryMuscles] : undefined,
    equipment: exercise.equipment,
    result_type: exercise.resultType,
    search_aliases: exercise.searchAliases ? [...exercise.searchAliases] : undefined,
    restriction_tags: exercise.restrictionTags ? [...exercise.restrictionTags] : undefined,
    coach_notes: exercise.coachNotes,
    notes: exercise.notes,
    archived_at: exercise.archivedAt,
    created_at: exercise.createdAt,
    updated_at: exercise.updatedAt
  };
}

export function workoutSetDtoToDomain(dto: ApiWorkoutSetDto): WorkoutSet {
  return {
    id: dto.id,
    order: dto.order,
    targetWeightKg: dto.target_weight_kg,
    targetReps: dto.target_reps,
    values: dto.values,
    targetDurationSeconds: dto.target_duration_seconds,
    targetDistanceMeters: dto.target_distance_meters,
    actualWeightKg: dto.actual_weight_kg,
    actualReps: dto.actual_reps,
    actualDurationSeconds: dto.actual_duration_seconds,
    actualDistanceMeters: dto.actual_distance_meters,
    completed: dto.completed
  };
}

export function workoutSetDomainToDto(set: WorkoutSet): ApiWorkoutSetDto {
  return {
    id: set.id,
    order: set.order,
    target_weight_kg: set.targetWeightKg,
    target_reps: set.targetReps,
    values: set.values,
    target_duration_seconds: set.targetDurationSeconds,
    target_distance_meters: set.targetDistanceMeters,
    actual_weight_kg: set.actualWeightKg,
    actual_reps: set.actualReps,
    actual_duration_seconds: set.actualDurationSeconds,
    actual_distance_meters: set.actualDistanceMeters,
    completed: set.completed
  };
}

export function workoutExerciseDtoToDomain(dto: ApiWorkoutExerciseDto): WorkoutExercise {
  return {
    id: dto.id,
    exerciseId: dto.exercise_id,
    exerciseName: dto.exercise_name,
    resultType: dto.result_type,
    order: dto.order,
    day: dto.day,
    muscleGroup: dto.muscle_group,
    comment: dto.comment,
    collapsed: dto.collapsed,
    supersetWithNext: dto.superset_with_next,
    sets: dto.sets.map(workoutSetDtoToDomain)
  };
}

export function workoutExerciseDomainToDto(exercise: WorkoutExercise): ApiWorkoutExerciseDto {
  return {
    id: exercise.id,
    exercise_id: exercise.exerciseId,
    exercise_name: exercise.exerciseName,
    result_type: exercise.resultType,
    order: exercise.order,
    day: exercise.day,
    muscle_group: exercise.muscleGroup,
    comment: exercise.comment,
    collapsed: exercise.collapsed,
    superset_with_next: exercise.supersetWithNext,
    sets: exercise.sets.map(workoutSetDomainToDto)
  };
}

export function workoutDtoToDomain(dto: ApiWorkoutDto): Workout {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    clientId: dto.client_id,
    title: dto.title,
    startsAt: dto.starts_at,
    timezone: dto.timezone,
    durationMinutes: dto.duration_minutes,
    focus: dto.focus,
    location: dto.location,
    status: dto.status,
    sourceWorkoutId: dto.source_workout_id,
    cancelledAt: dto.cancelled_at,
    cancellationReason: dto.cancellation_reason,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    exercises: dto.exercises.map(workoutExerciseDtoToDomain),
    repeatDays: dto.repeat_days ? [...dto.repeat_days] : undefined,
    scheduleTimes: dto.schedule_times ? { ...dto.schedule_times } : undefined
  };
}

export function workoutDomainToDto(workout: Workout): ApiWorkoutDto {
  return {
    id: workout.id,
    owner_id: workout.ownerId,
    client_id: workout.clientId,
    title: workout.title,
    starts_at: workout.startsAt,
    timezone: workout.timezone,
    duration_minutes: workout.durationMinutes,
    focus: workout.focus,
    location: workout.location,
    status: workout.status,
    source_workout_id: workout.sourceWorkoutId,
    cancelled_at: workout.cancelledAt,
    cancellation_reason: workout.cancellationReason,
    created_at: workout.createdAt,
    updated_at: workout.updatedAt,
    exercises: workout.exercises.map(workoutExerciseDomainToDto),
    repeat_days: workout.repeatDays ? [...workout.repeatDays] : undefined,
    schedule_times: workout.scheduleTimes ? { ...workout.scheduleTimes } : undefined
  };
}

export function sessionExerciseDtoToDomain(dto: ApiWorkoutSessionExerciseDto): WorkoutSessionExercise {
  return {
    id: dto.id,
    exerciseId: dto.exercise_id,
    exerciseName: dto.exercise_name,
    exerciseNameSnapshot: dto.exercise_name_snapshot,
    resultTypeSnapshot: dto.result_type_snapshot,
    order: dto.order,
    comment: dto.comment,
    plannedSets: dto.planned_sets,
    plannedRepetitions: dto.planned_repetitions,
    plannedWeight: dto.planned_weight
  };
}

export function sessionExerciseDomainToDto(exercise: WorkoutSessionExercise): ApiWorkoutSessionExerciseDto {
  return {
    id: exercise.id,
    exercise_id: exercise.exerciseId,
    exercise_name: exercise.exerciseName,
    exercise_name_snapshot: exercise.exerciseNameSnapshot,
    result_type_snapshot: exercise.resultTypeSnapshot,
    order: exercise.order,
    comment: exercise.comment,
    planned_sets: exercise.plannedSets,
    planned_repetitions: exercise.plannedRepetitions,
    planned_weight: exercise.plannedWeight
  };
}

export function sessionDtoToDomain(dto: ApiWorkoutSessionDto): WorkoutSession {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    workoutId: dto.workout_id,
    clientId: dto.client_id,
    status: dto.status,
    startedAt: dto.started_at,
    startedTimezone: dto.started_timezone,
    completedAt: dto.completed_at,
    completedTimezone: dto.completed_timezone,
    durationSeconds: dto.duration_seconds,
    workoutTitleSnapshot: dto.workout_title_snapshot,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    exercises: dto.exercises.map(sessionExerciseDtoToDomain)
  };
}

export function sessionDomainToDto(session: WorkoutSession): ApiWorkoutSessionDto {
  return {
    id: session.id,
    owner_id: session.ownerId,
    workout_id: session.workoutId,
    client_id: session.clientId,
    status: session.status,
    started_at: session.startedAt,
    started_timezone: session.startedTimezone,
    completed_at: session.completedAt,
    completed_timezone: session.completedTimezone,
    duration_seconds: session.durationSeconds,
    workout_title_snapshot: session.workoutTitleSnapshot,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    exercises: session.exercises.map(sessionExerciseDomainToDto)
  };
}

export function resultDtoToDomain(dto: ApiWorkoutResultDto): WorkoutResult {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    sessionId: dto.session_id,
    sessionExerciseItemId: dto.session_exercise_item_id,
    exerciseId: dto.exercise_id,
    exerciseNameSnapshot: dto.exercise_name_snapshot,
    resultType: dto.result_type,
    setIndex: dto.set_index,
    setId: dto.set_id,
    values: dto.values,
    weight: dto.weight,
    repetitions: dto.repetitions,
    durationSeconds: dto.duration_seconds,
    distanceMeters: dto.distance_meters,
    unit: dto.unit,
    completed: dto.completed
  };
}

export function resultDomainToDto(result: WorkoutResult): ApiWorkoutResultDto {
  return {
    id: result.id,
    owner_id: result.ownerId,
    session_id: result.sessionId,
    session_exercise_item_id: result.sessionExerciseItemId,
    exercise_id: result.exerciseId,
    exercise_name_snapshot: result.exerciseNameSnapshot,
    result_type: result.resultType,
    set_index: result.setIndex,
    set_id: result.setId,
    values: result.values,
    weight: result.weight,
    repetitions: result.repetitions,
    duration_seconds: result.durationSeconds,
    distance_meters: result.distanceMeters,
    unit: result.unit,
    completed: result.completed
  };
}

export function quickValueDtoToDomain(dto: ApiQuickValueDto): QuickValue {
  return {
    id: dto.id,
    ownerId: dto.owner_id,
    exerciseId: dto.exercise_id,
    clientId: dto.client_id,
    metric: dto.metric,
    values: [...dto.values],
    updatedAt: dto.updated_at
  };
}

export function quickValueDomainToDto(quickValue: QuickValue): ApiQuickValueDto {
  return {
    id: quickValue.id,
    owner_id: quickValue.ownerId,
    exercise_id: quickValue.exerciseId,
    client_id: quickValue.clientId,
    metric: quickValue.metric,
    values: [...quickValue.values],
    updated_at: quickValue.updatedAt
  };
}

export function previousExercisePerformanceDtoToDomain(dto: ApiPreviousExercisePerformanceDto): PreviousExercisePerformance {
  return {
    sessionId: dto.session_id,
    completedAt: dto.completed_at,
    resultType: dto.result_type,
    exerciseName: dto.exercise_name,
    sets: dto.sets.map((set) => ({
      setIndex: set.set_index,
      resultType: set.result_type,
      values: set.values,
      weight: set.weight,
      repetitions: set.repetitions,
      durationSeconds: set.duration_seconds,
      distanceMeters: set.distance_meters,
      unit: set.unit
    }))
  };
}

export function previousExercisePerformanceDomainToDto(performance: PreviousExercisePerformance): ApiPreviousExercisePerformanceDto {
  return {
    session_id: performance.sessionId,
    completed_at: performance.completedAt,
    result_type: performance.resultType,
    exercise_name: performance.exerciseName,
    sets: performance.sets.map((set) => ({
      set_index: set.setIndex,
      result_type: set.resultType,
      values: set.values,
      weight: set.weight,
      repetitions: set.repetitions,
      duration_seconds: set.durationSeconds,
      distance_meters: set.distanceMeters,
      unit: set.unit
    }))
  };
}
