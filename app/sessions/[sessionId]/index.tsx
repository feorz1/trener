import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Alert as NativeAlert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Approach, Badge, Button, Divider, Header, Navigation, ProgressBar, type ApproachSet } from "@/components/ui";
import { useClient, usePreviousExercisePerformance, useResultActions, useSession, useSessionActions, useSessionResults, useWorkout } from "@/data";
import { formatSessionDate } from "@/features/workouts/sessionHistory";
import { defaultWorkoutResultType, formatResultDuration, formatTimerDuration, type SessionResultSet } from "@/features/workouts/sessionResult";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { theme } from "@/theme";
import type { Workout } from "@/types";

const kgUnit = "кг";

type RouteParams = {
  sessionId?: string | string[];
};

type SessionExercise = Omit<Workout["exercises"][number], "sets"> & {
  sets: SessionResultSet[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSetIndexes<T extends ApproachSet>(sets: T[]) {
  return sets.map((set, index) => ({ ...set, index: index + 1 }));
}

function buildSessionExerciseSets(workoutSets: Workout["exercises"][number]["sets"], resultType = defaultWorkoutResultType) {
  return normalizeSetIndexes(
    [...workoutSets]
      .sort((left, right) => left.order - right.order)
      .map((set) => ({
        id: set.id,
        index: set.order,
        resultType,
        reps: set.actualReps ?? set.targetReps,
        weight: set.actualWeightKg ?? set.targetWeightKg,
        durationSeconds: set.actualDurationSeconds ?? set.targetDurationSeconds,
        distanceMeters: set.actualDistanceMeters ?? set.targetDistanceMeters,
        unit: kgUnit,
        state: set.completed ? "selected" : "default",
        logged: Boolean(set.actualReps || set.actualWeightKg || set.actualDurationSeconds || set.actualDistanceMeters)
      }))
  );
}

function buildSessionWorkout(workout?: Workout) {
  if (!workout) return [];
  return workout.exercises.map<SessionExercise>(({ sets, ...exercise }) => ({
    ...exercise,
    sets: buildSessionExerciseSets(sets, exercise.resultType ?? defaultWorkoutResultType)
  }));
}

export default function WorkoutSessionScreen() {
  const { sessionId: rawSessionId } = useLocalSearchParams<RouteParams>();
  const sessionId = firstParam(rawSessionId);
  const { session } = useSession(sessionId);
  const { workout } = useWorkout(session?.workoutId);
  const { client } = useClient(session?.clientId ?? workout?.clientId);
  const { results } = useSessionResults(sessionId);
  const resultActions = useResultActions();
  const sessionActions = useSessionActions();
  const clientName = client?.name ?? "Клиент";
  const initialSessionExercises = useMemo<SessionExercise[]>(
    () => {
      if (!session) return [];

      return session.exercises.map((exercise) => {
        const exerciseResults = results
          .filter((result) => (result.sessionExerciseItemId ? result.sessionExerciseItemId === exercise.id : result.exerciseId === exercise.exerciseId))
          .sort((left, right) => left.setIndex - right.setIndex);
        const workoutExercise = workout?.exercises.find((item) => item.exerciseId === exercise.exerciseId);
        const resultType = exercise.resultTypeSnapshot ?? workoutExercise?.resultType ?? defaultWorkoutResultType;
        const sets: SessionResultSet[] = exerciseResults.length > 0
          ? exerciseResults.map((result) => ({
              id: result.setId ?? result.id,
              index: result.setIndex,
              resultType: result.resultType ?? resultType,
              reps: result.repetitions,
              weight: result.weight,
              durationSeconds: result.durationSeconds,
              distanceMeters: result.distanceMeters,
              unit: result.unit ?? kgUnit,
              state: result.completed ? "selected" as const : "default" as const,
              logged: Boolean(result.repetitions || result.weight || result.durationSeconds || result.distanceMeters)
            }))
          : buildSessionExerciseSets(workoutExercise?.sets ?? [], resultType);

        return {
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseNameSnapshot ?? exercise.exerciseName,
          resultType,
          comment: exercise.comment,
          sets: normalizeSetIndexes(sets.length > 0 ? sets : [{ id: `${exercise.id}-set-1`, index: 1, resultType, unit: kgUnit, state: "default", logged: false }])
        };
      });
    },
    [results, session, workout?.exercises]
  );
  const { scrollProps } = useConditionalScroll();
  const keyboardInset = useKeyboardInset();
  const [sessionExercises, setSessionExercises] = useState(initialSessionExercises);
  const sessionStartedAtRef = useRef(session?.startedAt ? new Date(session.startedAt).getTime() : Date.now());
  const nextSetId = useRef(1);

  useEffect(() => {
    setSessionExercises(initialSessionExercises);
    sessionStartedAtRef.current = session?.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    nextSetId.current = 1;
  }, [initialSessionExercises, session?.startedAt]);

  const completedExercises = useMemo(
    () => sessionExercises.filter((exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.state === "selected")).length,
    [sessionExercises]
  );
  const exerciseCount = sessionExercises.length;
  const progressLabel = useMemo(() => `${completedExercises} из ${exerciseCount} упражнений`, [completedExercises, exerciseCount]);
  const finishLabel = "Завершить тренировку";
  const footerPaddingBottom = Math.max(theme.spacing.md, theme.spacing.md + keyboardInset);

  const updateExerciseSets = useCallback((exerciseId: string, nextSets: ApproachSet[]) => {
    setSessionExercises((current) =>
      current.map((exercise) => (exercise.id === exerciseId ? { ...exercise, sets: normalizeSetIndexes(nextSets) } : exercise))
    );
  }, []);

  const persistSet = useCallback(
    (exercise: SessionExercise, set: SessionResultSet) => {
      if (!sessionId) return;

      void resultActions.upsertSetResult({
        sessionId,
        sessionExerciseItemId: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseNameSnapshot: exercise.exerciseName,
        resultType: exercise.resultType ?? defaultWorkoutResultType,
        setIndex: set.index,
        setId: set.id,
        weight: set.weight,
        repetitions: set.reps,
        durationSeconds: set.durationSeconds,
        distanceMeters: set.distanceMeters,
        unit: set.unit,
        completed: set.state === "selected"
      }).catch(() => undefined);
    },
    [resultActions, sessionId]
  );

  const handleSetStateChange = useCallback(
    (exerciseId: string, setId: string, state: ApproachSet["state"]) => {
      setSessionExercises((current) =>
        current.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;
          const nextSets = normalizeSetIndexes(exercise.sets.map((set) => (set.id === setId ? { ...set, state } : set)));
          const changedSet = nextSets.find((set) => set.id === setId);
          if (changedSet) persistSet(exercise, changedSet);
          return {
            ...exercise,
            sets: nextSets
          };
        })
      );
    },
    [persistSet]
  );

  const handleSetValueChange = useCallback(
    (exerciseId: string, setId: string, patch: Partial<Pick<ApproachSet, "weight" | "reps">>) => {
      setSessionExercises((current) =>
        current.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;
          const nextSets = normalizeSetIndexes(exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch, logged: true } : set)));
          const changedSet = nextSets.find((set) => set.id === setId);
          if (changedSet) persistSet(exercise, changedSet);
          return {
            ...exercise,
            sets: nextSets
          };
        })
      );
    },
    [persistSet]
  );

  const handleSetReorder = useCallback(
    (exerciseId: string, nextSets: ApproachSet[]) => {
      updateExerciseSets(exerciseId, nextSets);
    },
    [updateExerciseSets]
  );

  const handleNoteChange = useCallback((exerciseId: string, nextNote: string) => {
    setSessionExercises((current) =>
      current.map((exercise) => (exercise.id === exerciseId ? { ...exercise, comment: nextNote } : exercise))
    );
  }, []);

  const handleDeleteSet = useCallback((exerciseId: string, setId: string) => {
    const result = results.find((item) => item.setId === setId || item.id === setId);
    if (result) {
      void resultActions.remove(result.id).catch(() => undefined);
    }

    setSessionExercises((current) =>
      current.map((exercise) =>
        exercise.id !== exerciseId ? exercise : { ...exercise, sets: normalizeSetIndexes(exercise.sets.filter((set) => set.id !== setId)) }
      )
    );
  }, [resultActions, results]);

  const handleAddSet = useCallback((exerciseId: string) => {
    setSessionExercises((current) =>
      current.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const templateSet = exercise.sets[exercise.sets.length - 1];
        const nextSet: SessionResultSet = {
          id: `${exercise.id}-set-${Date.now()}-${nextSetId.current++}`,
          index: exercise.sets.length + 1,
          state: "default",
          resultType: exercise.resultType ?? defaultWorkoutResultType,
          unit: kgUnit,
          weight: templateSet?.weight,
          reps: templateSet?.reps
        };

        const nextExercise = {
          ...exercise,
          sets: normalizeSetIndexes([...exercise.sets, nextSet])
        };
        persistSet(nextExercise, nextSet);
        return nextExercise;
      })
    );
  }, [persistSet]);

  const completeSession = useCallback(async () => {
    if (!sessionId) return;

    await sessionActions.complete(sessionId);

    router.replace({
      pathname: "/sessions/[sessionId]/summary",
      params: {
        sessionId
      }
    });
  }, [sessionActions, sessionId]);

  const finishSession = useCallback(() => {
    const hasLoggedIncompleteSets = sessionExercises.some((exercise) =>
      exercise.sets.some((set) => set.state !== "selected" && (Number.isFinite(set.weight) || Number.isFinite(set.reps)))
    );

    if (!hasLoggedIncompleteSets) {
      void completeSession();
      return;
    }

    NativeAlert.alert("Есть незавершённые подходы", "Завершить тренировку без них?", [
      { text: "Вернуться", style: "cancel" },
      { text: "Завершить", style: "destructive", onPress: () => void completeSession() }
    ]);
  }, [completeSession, sessionExercises]);

  const addExercise = useCallback(() => {
    if (!sessionId) return;

    router.push({
      pathname: "/workouts/exercises",
      params: {
        sessionId
      }
    });
  }, [sessionId]);

  const closeActiveSession = useCallback(() => {
    router.dismissTo("/");
  }, []);

  if (!session) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Тренировка" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Text style={styles.copy}>Тренировка не найдена.</Text>
          <Button label="На главный экран" type="secondary" size="large" width="fill" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Тренировка" onBack={closeActiveSession} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        <View style={styles.topSection}>
          <Header title={clientName} showSubtitle={false} size="lg" style={styles.header} trailingSlot={<WorkoutTimerBadge startedAtRef={sessionStartedAtRef} />} />
          <View style={styles.status}>
            <ProgressBar completed={completedExercises} total={exerciseCount} label={progressLabel} />
          </View>
        </View>

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.exerciseSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Упражнения</Text>
            <Badge label={String(exerciseCount)} tone="neutral" size="s" icon={false} />
          </View>

          <View style={styles.exerciseList}>
            {sessionExercises.map((exercise) => {
              return (
                <SessionExerciseCard
                  key={exercise.id}
                  clientId={session.clientId}
                  currentSessionId={session.id}
                  before={session.startedAt}
                  exercise={exercise}
                  onAddSet={() => handleAddSet(exercise.id)}
                  onDeleteSet={(setId) => handleDeleteSet(exercise.id, setId)}
                  onNoteChange={(nextNote) => handleNoteChange(exercise.id, nextNote)}
                  onSetStateChange={(id, state) => handleSetStateChange(exercise.id, id, state)}
                  onSetValueChange={(id, patch) => handleSetValueChange(exercise.id, id, patch)}
                  onSetsReorder={(nextSets) => handleSetReorder(exercise.id, nextSets)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <Button label="Добавить упражнение" type="secondaryNeutral" size="large" width="fill" onPress={addExercise} />
        <Button label={finishLabel} type="primary" size="large" width="fill" onPress={finishSession} />
      </View>
    </SafeAreaView>
  );
}

function SessionExerciseCard({
  clientId,
  currentSessionId,
  before,
  exercise,
  onAddSet,
  onDeleteSet,
  onNoteChange,
  onSetStateChange,
  onSetValueChange,
  onSetsReorder
}: {
  clientId?: string;
  currentSessionId: string;
  before: string;
  exercise: SessionExercise;
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  onNoteChange: (nextNote: string) => void;
  onSetStateChange: (id: string, state: ApproachSet["state"]) => void;
  onSetValueChange: (id: string, patch: Partial<Pick<ApproachSet, "weight" | "reps">>) => void;
  onSetsReorder: (nextSets: ApproachSet[]) => void;
}) {
  const previousPerformanceInput = {
    clientId,
    exerciseId: exercise.exerciseId,
    resultType: exercise.resultType ?? defaultWorkoutResultType,
    before,
    excludeSessionId: currentSessionId
  };
  const { previousPerformance } = usePreviousExercisePerformance(previousPerformanceInput);

  return (
    <View style={styles.exerciseWrapper}>
      <View style={styles.previousResult}>
        <Text style={styles.previousTitle}>Предыдущий результат</Text>
        {previousPerformance ? (
          <View style={styles.previousBody}>
            <Text style={styles.previousDate}>{formatSessionDate(previousPerformance.completedAt)}</Text>
            {previousPerformance.sets.map((set, index) => (
              <Text key={`${previousPerformance.sessionId}-${set.setIndex}-${index}`} style={styles.previousSet}>
                {set.setIndex}. {formatPreviousSet(set)}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.previousEmpty}>Ранее не выполнялось</Text>
        )}
      </View>
      <Approach
        title={exercise.exerciseName}
        note={exercise.comment}
        noteTitle="Заметка"
        noteSaveLabel="Сохранить"
        addLabel="Добавить подход"
        sets={exercise.sets}
        showDeleteAction
        style={styles.exerciseCard}
        onAddSet={onAddSet}
        onDeleteSet={onDeleteSet}
        onNoteChange={onNoteChange}
        onSetStateChange={onSetStateChange}
        onSetValueChange={onSetValueChange}
        onSetsReorder={onSetsReorder}
      />
    </View>
  );
}

function formatPreviousSet(set: { resultType?: string; weight?: number; repetitions?: number; durationSeconds?: number; distanceMeters?: number; unit?: string }) {
  if (set.resultType === "duration") return Number.isFinite(set.durationSeconds) ? formatResultDuration(set.durationSeconds ?? 0) : "без данных";
  if (set.resultType === "distance_duration") {
    const parts: string[] = [];
    if (Number.isFinite(set.distanceMeters)) parts.push(`${set.distanceMeters} м`);
    if (Number.isFinite(set.durationSeconds)) parts.push(formatResultDuration(set.durationSeconds ?? 0));
    return parts.join(" × ") || "без данных";
  }
  if (set.resultType === "reps") return Number.isFinite(set.repetitions) ? `${set.repetitions} повт.` : "без данных";
  if (Number.isFinite(set.weight) && Number.isFinite(set.repetitions)) return `${set.weight} ${set.unit ?? "кг"} × ${set.repetitions}`;
  if (Number.isFinite(set.repetitions)) return `${set.repetitions} повт.`;
  if (Number.isFinite(set.weight)) return `${set.weight} ${set.unit ?? "кг"}`;
  return "без данных";
}

function WorkoutTimerBadge({ startedAtRef }: { startedAtRef: MutableRefObject<number> }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAtRef]);

  return <Badge label={formatTimerDuration(elapsedSeconds)} tone="neutral" size="sm" icon={false} style={styles.timerBadge} />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1,
    paddingTop: theme.spacing[0],
    paddingBottom: theme.spacing.md
  },
  topSection: {
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  header: {
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing.lg
  },
  status: {
    gap: theme.spacing.md
  },
  timerBadge: {
    width: theme.sizes.workoutTimerBadgeWidth,
    justifyContent: "center"
  },
  exerciseSection: {
    backgroundColor: theme.colors.background.canvas
  },
  sectionHeader: {
    height: theme.sizes.buttonMediumHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  exerciseWrapper: {
    gap: theme.spacing.sm
  },
  previousResult: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  previousTitle: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  previousBody: {
    gap: theme.spacing.xxs
  },
  previousDate: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  previousSet: {
    ...theme.typography.body.sm,
    color: theme.colors.content.ink
  },
  previousEmpty: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  exerciseCard: {
    width: "100%"
  },
  exerciseList: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm
  },
  footer: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  emptyState: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  copy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body
  }
});
