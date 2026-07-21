import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type SetStateAction } from "react";
import { Alert as NativeAlert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Approach, Badge, Button, Divider, Header, Loader, Navigation, ProgressBar, type ApproachSet, type ApproachSetValuePatch } from "@/components/ui";
import { useClient, useDataContext, useDataMutation, usePreviousExercisePerformance, useResultActions, useSession, useSessionActions, useSessionResults, useWorkout } from "@/data";
import { getSessionSetKey, mergeSessionExercises, normalizeSessionSetIndexes, type SessionExercise } from "@/features/workouts/sessionExerciseMerge";
import { defaultWorkoutResultType, formatTimerDuration, type SessionResultSet } from "@/features/workouts/sessionResult";
import {
  getLegacyValues,
  getTimerElapsedSeconds,
  getTrackingPreset,
  hasAnyMetricValue,
  normalizeTrackingType,
  pickCompatibleValues,
  valuesToLegacyFields,
  type SetTimerState
} from "@/features/workouts/tracking";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { theme } from "@/theme";
import type { Workout, WorkoutSessionExercise } from "@/types";

const kgUnit = "кг";

type RouteParams = {
  sessionId?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildSessionExerciseSets(workoutSets: Workout["exercises"][number]["sets"], resultType = defaultWorkoutResultType) {
  return normalizeSessionSetIndexes(
    [...workoutSets]
      .sort((left, right) => left.order - right.order)
      .map((set) => ({
        id: set.id,
        index: set.order,
        resultType,
        values: getLegacyValues({
          values: set.values,
          weight: set.actualWeightKg ?? set.targetWeightKg,
          reps: set.actualReps ?? set.targetReps,
          durationSeconds: set.actualDurationSeconds ?? set.targetDurationSeconds,
          distanceMeters: set.actualDistanceMeters ?? set.targetDistanceMeters
        }),
        reps: set.actualReps ?? set.targetReps,
        weight: set.actualWeightKg ?? set.targetWeightKg,
        durationSeconds: set.actualDurationSeconds ?? set.targetDurationSeconds,
        distanceMeters: set.actualDistanceMeters ?? set.targetDistanceMeters,
        unit: kgUnit,
        state: set.completed ? "selected" as const : "default" as const,
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
  const { sessionTimerPersistence } = useDataContext();
  const sessionQuery = useSession(sessionId);
  const { session } = sessionQuery;
  const workoutQuery = useWorkout(session?.workoutId);
  const { workout } = workoutQuery;
  const clientQuery = useClient(session?.clientId ?? workout?.clientId);
  const { client } = clientQuery;
  const resultsQuery = useSessionResults(sessionId);
  const { results } = resultsQuery;
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
        const workoutSets = buildSessionExerciseSets(workoutExercise?.sets ?? [], resultType);
        const highestResultSetIndex = exerciseResults.reduce((highest, result) => Math.max(highest, result.setIndex), 0);
        const plannedSetCount = Math.max(1, exercise.plannedSets ?? workoutSets.length, highestResultSetIndex);
        const plannedSets: SessionResultSet[] = Array.from({ length: plannedSetCount }, (_, index) => {
          const setIndex = index + 1;
          return workoutSets.find((set) => set.index === setIndex) ?? {
            id: `${exercise.id}-planned-set-${setIndex}`,
            index: setIndex,
            resultType,
            unit: kgUnit,
            state: "default" as const,
            logged: false
          };
        });
        const resultSets: SessionResultSet[] = exerciseResults.map((result) => ({
              id: result.setId ?? result.id,
              index: result.setIndex,
              resultType: result.resultType ?? resultType,
              values: getLegacyValues({
                values: result.values,
                weight: result.weight,
                repetitions: result.repetitions,
                durationSeconds: result.durationSeconds,
                distanceMeters: result.distanceMeters
              }),
              reps: result.repetitions,
              weight: result.weight,
              durationSeconds: result.durationSeconds,
              distanceMeters: result.distanceMeters,
              unit: result.unit ?? kgUnit,
              state: result.completed ? "selected" as const : "default" as const,
              logged: Boolean(result.repetitions || result.weight || result.durationSeconds || result.distanceMeters)
            }));
        const sets = normalizeSessionSetIndexes([...plannedSets, ...resultSets]);

        return {
          id: exercise.id,
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseNameSnapshot ?? exercise.exerciseName,
          resultType,
          comment: exercise.comment,
          sets: normalizeSessionSetIndexes(sets.length > 0 ? sets : [{ id: `${exercise.id}-set-1`, index: 1, resultType, unit: kgUnit, state: "default", logged: false }])
        };
      });
    },
    [results, session, workout?.exercises]
  );
  const { scrollProps } = useConditionalScroll();
  const keyboardInset = useKeyboardInset();
  const [sessionExercises, setSessionExercises] = useState(initialSessionExercises);
  const [activeTimer, setActiveTimerState] = useState<SetTimerState | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const activeTimerRef = useRef<SetTimerState | null>(null);
  const timerHydrationGenerationRef = useRef(0);
  const sessionStartedAtRef = useRef(session?.startedAt ? new Date(session.startedAt).getTime() : Date.now());
  const nextSetId = useRef(1);
  const finishingRef = useRef(false);
  const pendingSetSavesRef = useRef(new Set<Promise<void>>());
  const pendingSetKeysRef = useRef(new Set<string>());
  const deletedSetIndexesByExerciseRef = useRef(new Map<string, Set<number>>());
  const setSaveErrorsRef = useRef(new Map<string, Error>());
  const setSaveSequenceRef = useRef(new Map<string, number>());
  const completeSessionMutation = useDataMutation(async (id: string) => sessionActions.complete(id));
  const isLoading = sessionQuery.isLoading || workoutQuery.isLoading || clientQuery.isLoading || resultsQuery.isLoading;
  const queryError = sessionQuery.error ?? workoutQuery.error ?? clientQuery.error ?? resultsQuery.error;
  const isCompleting = isFinishing || completeSessionMutation.isSubmitting;

  useEffect(() => {
    const generation = timerHydrationGenerationRef.current + 1;
    timerHydrationGenerationRef.current = generation;
    activeTimerRef.current = null;
    setActiveTimerState(null);
    if (!sessionId) return;

    void sessionTimerPersistence.load(sessionId).then((timer) => {
      if (timerHydrationGenerationRef.current !== generation) return;
      activeTimerRef.current = timer;
      setActiveTimerState(timer);
    }).catch(() => undefined);

    return () => {
      timerHydrationGenerationRef.current += 1;
    };
  }, [sessionId, sessionTimerPersistence]);

  const setActiveTimer = useCallback((action: SetStateAction<SetTimerState | null>) => {
    timerHydrationGenerationRef.current += 1;
    const current = activeTimerRef.current;
    const next = typeof action === "function" ? action(current) : action;
    activeTimerRef.current = next;
    setActiveTimerState(next);
    if (sessionId) {
      void sessionTimerPersistence.save(sessionId, next).catch(() => undefined);
    }
  }, [sessionId, sessionTimerPersistence]);

  useEffect(() => {
    setSessionExercises((current) => mergeSessionExercises(current, initialSessionExercises, {
      preserveLocalSetKeys: pendingSetKeysRef.current,
      deletedSetIndexesByExercise: deletedSetIndexesByExerciseRef.current
    }));
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
      current.map((exercise) => (exercise.id === exerciseId ? { ...exercise, sets: normalizeSessionSetIndexes(nextSets) } : exercise))
    );
  }, []);

  const persistSet = useCallback(
    (exercise: SessionExercise, set: SessionResultSet) => {
      if (!sessionId) return;

      const saveKey = getSessionSetKey(exercise.id, set.id);
      const sequence = (setSaveSequenceRef.current.get(saveKey) ?? 0) + 1;
      setSaveSequenceRef.current.set(saveKey, sequence);
      pendingSetKeysRef.current.add(saveKey);
      const save = resultActions.upsertSetResult({
        sessionId,
        sessionExerciseItemId: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseNameSnapshot: exercise.exerciseName,
        resultType: exercise.resultType ?? defaultWorkoutResultType,
        setIndex: set.index,
        setId: set.id,
        values: set.values,
        weight: set.values?.weight ?? set.weight,
        repetitions: set.values?.reps ?? set.reps,
        durationSeconds: set.values?.duration ?? set.durationSeconds,
        distanceMeters: set.values?.distance ?? set.distanceMeters,
        unit: set.unit,
        completed: set.state === "selected"
      }).then(
        () => {
          if (setSaveSequenceRef.current.get(saveKey) === sequence) {
            setSaveErrorsRef.current.delete(saveKey);
          }
        },
        (error: unknown) => {
          const saveError = error instanceof Error ? error : new Error("Не удалось сохранить результат подхода");
          if (setSaveSequenceRef.current.get(saveKey) === sequence) {
            setSaveErrorsRef.current.set(saveKey, saveError);
          }
          throw saveError;
        }
      );
      pendingSetSavesRef.current.add(save);
      void save
        .finally(() => {
          pendingSetSavesRef.current.delete(save);
        })
        .catch(() => undefined);
      return save;
    },
    [resultActions, sessionId]
  );

  const handleSetStateChange = useCallback(
    (exerciseId: string, setId: string, state: ApproachSet["state"]) => {
      const exercise = sessionExercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      const nextSets = normalizeSessionSetIndexes(exercise.sets.map((set) => (set.id === setId ? { ...set, state } : set)));
      const changedSet = nextSets.find((set) => set.id === setId);
      setSessionExercises((current) =>
        current.map((item) => (item.id === exerciseId ? { ...item, sets: nextSets } : item))
      );
      if (changedSet) persistSet(exercise, changedSet);
    },
    [persistSet, sessionExercises]
  );

  const handleSetValueChange = useCallback(
    (exerciseId: string, setId: string, patch: ApproachSetValuePatch) => {
      const exercise = sessionExercises.find((item) => item.id === exerciseId);
      if (!exercise) return;
      const nextSets = normalizeSessionSetIndexes(exercise.sets.map((set) => {
        if (set.id !== setId) return set;
        const { replaceValues, ...setPatch } = patch;
        const currentValues = getLegacyValues({
          values: set.values,
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.durationSeconds,
          distanceMeters: set.distanceMeters
        });
        const values = patch.values
          ? replaceValues
            ? { ...patch.values }
            : { ...currentValues, ...patch.values }
          : currentValues;
        const legacy = valuesToLegacyFields(values, exercise.resultType ?? defaultWorkoutResultType);
        return {
          ...set,
          ...setPatch,
          values,
          weight: legacy.weight,
          reps: legacy.repetitions,
          durationSeconds: legacy.durationSeconds,
          distanceMeters: legacy.distanceMeters,
          logged: true
        };
      }));
      const changedSet = nextSets.find((set) => set.id === setId);
      setSessionExercises((current) =>
        current.map((item) => (item.id === exerciseId ? { ...item, sets: nextSets } : item))
      );
      if (changedSet) persistSet(exercise, changedSet);
    },
    [persistSet, sessionExercises]
  );

  const handleSetReorder = useCallback(
    (exerciseId: string, nextSets: ApproachSet[]) => {
      updateExerciseSets(exerciseId, nextSets);
    },
    [updateExerciseSets]
  );

  const persistSessionExercisePatch = useCallback((exerciseId: string, patch: Partial<WorkoutSessionExercise>) => {
    if (!sessionId || !session) return Promise.resolve();
    const exercises = session.exercises.map((exercise) => exercise.id === exerciseId ? { ...exercise, ...patch } : exercise);
    return sessionActions.update(sessionId, { exercises }).then(() => undefined).catch(() => undefined);
  }, [session, sessionActions, sessionId]);

  const handleNoteChange = useCallback((exerciseId: string, nextNote: string) => {
    setSessionExercises((current) =>
      current.map((exercise) => (exercise.id === exerciseId ? { ...exercise, comment: nextNote } : exercise))
    );
    persistSessionExercisePatch(exerciseId, { comment: nextNote });
  }, [persistSessionExercisePatch]);

  const handleDeleteSet = useCallback((exerciseId: string, setId: string) => {
    const exercise = sessionExercises.find((item) => item.id === exerciseId);
    const deletedSet = exercise?.sets.find((set) => set.id === setId);
    const saveKey = getSessionSetKey(exerciseId, setId);
    setSaveErrorsRef.current.delete(saveKey);
    setSaveSequenceRef.current.delete(saveKey);
    pendingSetKeysRef.current.delete(saveKey);
    if (deletedSet) {
      const deletedIndexes = deletedSetIndexesByExerciseRef.current.get(exerciseId) ?? new Set<number>();
      deletedIndexes.add(deletedSet.index);
      deletedSetIndexesByExerciseRef.current.set(exerciseId, deletedIndexes);
    }
    const result = results.find((item) => {
      if (item.setId === setId || item.id === setId) return true;
      if (!exercise || !deletedSet || item.setIndex !== deletedSet.index) return false;
      if (item.sessionExerciseItemId) return item.sessionExerciseItemId === exerciseId;
      return item.exerciseId === exercise.exerciseId;
    });
    const resultRemoval = result ? resultActions.remove(result.id) : Promise.resolve();

    const nextSets = normalizeSessionSetIndexes(exercise?.sets.filter((set) => set.id !== setId) ?? []);
    setSessionExercises((current) =>
      current.map((item) => item.id !== exerciseId ? item : { ...item, sets: nextSets })
    );
    const plannedSetsUpdate = persistSessionExercisePatch(exerciseId, { plannedSets: nextSets.length });
    void Promise.allSettled([resultRemoval, plannedSetsUpdate]);
  }, [persistSessionExercisePatch, resultActions, results, sessionExercises]);

  const handleRemoveLastSet = useCallback((exerciseId: string) => {
    const exercise = sessionExercises.find((item) => item.id === exerciseId);
    const lastSet = exercise?.sets[exercise.sets.length - 1];
    if (!lastSet || exercise.sets.length <= 1) return;
    handleDeleteSet(exerciseId, lastSet.id);
  }, [handleDeleteSet, sessionExercises]);

  const handleDeleteExercise = useCallback((exerciseItemId: string) => {
    const exercise = sessionExercises.find((item) => item.id === exerciseItemId);
    if (!exercise || !sessionId) return;

    const saveKeyPrefix = `${exerciseItemId}:`;
    for (const saveKey of setSaveSequenceRef.current.keys()) {
      if (!saveKey.startsWith(saveKeyPrefix)) continue;
      setSaveSequenceRef.current.delete(saveKey);
      setSaveErrorsRef.current.delete(saveKey);
    }
    setActiveTimer((current) => (current?.exerciseId === exerciseItemId ? null : current));
    setSessionExercises((current) => current.filter((item) => item.id !== exerciseItemId));

    results
      .filter((result) =>
        result.sessionId === sessionId &&
        (result.sessionExerciseItemId ? result.sessionExerciseItemId === exerciseItemId : result.exerciseId === exercise.exerciseId)
      )
      .forEach((result) => {
        void resultActions.remove(result.id).catch(() => undefined);
      });

    void sessionActions.removeExercise(sessionId, exercise.exerciseId).catch(() => undefined);
  }, [resultActions, results, sessionActions, sessionExercises, sessionId, setActiveTimer]);

  const handleAddSet = useCallback((exerciseId: string) => {
    const exercise = sessionExercises.find((item) => item.id === exerciseId);
    if (!exercise) return;
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const copiedValues = getLegacyValues({
      values: lastSet?.values,
      weight: lastSet?.weight,
      reps: lastSet?.reps,
      durationSeconds: lastSet?.durationSeconds,
      distanceMeters: lastSet?.distanceMeters
    });
    const legacy = valuesToLegacyFields(copiedValues, exercise.resultType ?? defaultWorkoutResultType);
    const nextSet: SessionResultSet = {
      id: `${exercise.id}-set-${Date.now()}-${nextSetId.current++}`,
      index: exercise.sets.length + 1,
      state: "default",
      resultType: exercise.resultType ?? defaultWorkoutResultType,
      unit: kgUnit,
      values: copiedValues,
      weight: legacy.weight,
      reps: legacy.repetitions,
      durationSeconds: legacy.durationSeconds,
      distanceMeters: legacy.distanceMeters
    };
    const nextSets = normalizeSessionSetIndexes([...exercise.sets, nextSet]);
    setSessionExercises((current) =>
      current.map((item) => (item.id === exerciseId ? { ...item, sets: nextSets } : item))
    );
    persistSet({ ...exercise, sets: nextSets }, nextSet);
    persistSessionExercisePatch(exerciseId, { plannedSets: nextSets.length });
  }, [persistSessionExercisePatch, persistSet, sessionExercises]);

  const updateTimerSetValue = useCallback(
    (timer: SetTimerState, seconds: number) => {
      handleSetValueChange(timer.exerciseId, timer.setId, { values: { [timer.metricKey]: seconds } });
    },
    [handleSetValueChange]
  );

  const handleStartTimer = useCallback(
    (exerciseId: string, setId: string, metricKey: "duration" | "interval", mode: SetTimerState["mode"], targetSeconds?: number) => {
      if (activeTimer && activeTimer.status === "running" && (activeTimer.exerciseId !== exerciseId || activeTimer.setId !== setId || activeTimer.metricKey !== metricKey)) {
        NativeAlert.alert("Уже запущен другой таймер", "Сначала завершите или сбросьте активный таймер.", [{ text: "Понятно", style: "cancel" }]);
        return;
      }

      if (mode === "countdown" && !Number.isFinite(targetSeconds)) {
        NativeAlert.alert("Введите время", "Чтобы запустить обратный отсчёт, сначала заполните поле времени.");
        return;
      }

      const now = Date.now();
      setActiveTimer({
        workoutId: session?.workoutId ?? "",
        exerciseId,
        setId,
        metricKey,
        mode,
        status: "running",
        targetSeconds: mode === "countdown" ? targetSeconds : undefined,
        startedAt: now,
        endsAt: mode === "countdown" && targetSeconds ? now + targetSeconds * 1000 : undefined,
        accumulatedSeconds: 0
      });
    },
    [activeTimer, session?.workoutId, setActiveTimer]
  );

  const pauseTimer = useCallback(() => {
    setActiveTimer((current) => current ? { ...current, status: "paused", accumulatedSeconds: getTimerElapsedSeconds(current), startedAt: undefined, endsAt: undefined } : current);
  }, [setActiveTimer]);

  const resumeTimer = useCallback(() => {
    setActiveTimer((current) => {
      if (!current) return current;
      const now = Date.now();
      const remaining = Math.max(0, (current.targetSeconds ?? 0) - current.accumulatedSeconds);
      return {
        ...current,
        status: "running",
        startedAt: now,
        endsAt: current.mode === "countdown" ? now + remaining * 1000 : undefined
      };
    });
  }, [setActiveTimer]);

  const finishTimer = useCallback(() => {
    setActiveTimer((current) => {
      if (!current) return current;
      const elapsed = current.mode === "countdown"
        ? Math.min(current.targetSeconds ?? getTimerElapsedSeconds(current), getTimerElapsedSeconds(current))
        : getTimerElapsedSeconds(current);
      updateTimerSetValue(current, elapsed);
      return null;
    });
  }, [setActiveTimer, updateTimerSetValue]);

  const resetTimer = useCallback(() => {
    setActiveTimer(null);
  }, [setActiveTimer]);

  const completeSession = useCallback(async () => {
    if (!sessionId || finishingRef.current || completeSessionMutation.isSubmitting) return;

    finishingRef.current = true;
    setIsFinishing(true);
    try {
      while (pendingSetSavesRef.current.size > 0) {
        await Promise.allSettled(Array.from(pendingSetSavesRef.current));
      }

      const saveError = setSaveErrorsRef.current.values().next().value;
      if (saveError) {
        NativeAlert.alert("Подходы не сохранены", saveError.message);
        return;
      }

      const completedSession = await completeSessionMutation.mutate(sessionId).catch(() => null);
      if (!completedSession) return;
      setActiveTimer(null);

      router.replace({
        pathname: "/sessions/[sessionId]/summary",
        params: {
          sessionId
        }
      });
    } finally {
      finishingRef.current = false;
      setIsFinishing(false);
    }
  }, [completeSessionMutation, sessionId, setActiveTimer]);

  const finishSession = useCallback(() => {
    const hasLoggedIncompleteSets = sessionExercises.some((exercise) => exercise.sets.some(isLoggedIncompleteSet));

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

  if (isLoading) {
    return <SessionState title="Загружаем тренировку" loading onBack={() => router.back()} />;
  }

  if (queryError) {
    return <SessionState title="Не удалось загрузить тренировку" description={queryError.message} actionLabel="Повторить" onAction={sessionQuery.retry} onBack={() => router.back()} />;
  }

  if (sessionQuery.notFound || !session) {
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
                  onDeleteExercise={() => handleDeleteExercise(exercise.id)}
                  onRemoveLastSet={() => handleRemoveLastSet(exercise.id)}
                  onNoteChange={(nextNote) => handleNoteChange(exercise.id, nextNote)}
                  onSetStateChange={(id, state) => handleSetStateChange(exercise.id, id, state)}
                  onSetValueChange={(id, patch) => handleSetValueChange(exercise.id, id, patch)}
                  onSetsReorder={(nextSets) => handleSetReorder(exercise.id, nextSets)}
                  activeTimer={activeTimer?.exerciseId === exercise.id ? activeTimer : null}
                  onStartTimer={(setId, metricKey, mode, targetSeconds) => handleStartTimer(exercise.id, setId, metricKey, mode, targetSeconds)}
                  onPauseTimer={pauseTimer}
                  onResumeTimer={resumeTimer}
                  onFinishTimer={finishTimer}
                  onResetTimer={resetTimer}
                />
              );
            })}
          </View>
          {completeSessionMutation.error ? (
            <View style={styles.inlineAlert}>
              <Alert
                tone="negative"
                layout="expanded"
                title="Тренировка не завершена"
                description={completeSessionMutation.error.message}
                width="fill"
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <Button label="Добавить упражнение" type="secondaryNeutral" size="large" width="fill" state={isCompleting ? "disabled" : "active"} onPress={addExercise} />
        <Button label={finishLabel} type="primary" size="large" width="fill" state={isCompleting ? "loading" : "active"} onPress={finishSession} />
      </View>
    </SafeAreaView>
  );
}

function SessionState({
  title,
  description,
  loading = false,
  actionLabel,
  onAction,
  onBack
}: {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onBack: () => void;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Тренировка" onBack={onBack} />
      <View style={styles.emptyState}>
        {loading ? <Loader size="medium" tone="brand" /> : null}
        <Text style={styles.emptyTitle}>{title}</Text>
        {description ? <Text style={styles.copy}>{description}</Text> : null}
        {actionLabel && onAction ? <Button label={actionLabel} type="secondary" size="large" width="fill" onPress={onAction} /> : null}
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
  onDeleteExercise,
  onRemoveLastSet,
  onNoteChange,
  onSetStateChange,
  onSetValueChange,
  onSetsReorder,
  activeTimer,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onFinishTimer,
  onResetTimer
}: {
  clientId?: string;
  currentSessionId: string;
  before: string;
  exercise: SessionExercise;
  onAddSet: () => void;
  onDeleteSet: (setId: string) => void;
  onDeleteExercise: () => void;
  onRemoveLastSet: () => void;
  onNoteChange: (nextNote: string) => void;
  onSetStateChange: (id: string, state: ApproachSet["state"]) => void;
  onSetValueChange: (id: string, patch: ApproachSetValuePatch) => void;
  onSetsReorder: (nextSets: ApproachSet[]) => void;
  activeTimer?: SetTimerState | null;
  onStartTimer: (setId: string, metricKey: "duration" | "interval", mode: SetTimerState["mode"], targetSeconds?: number) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onFinishTimer: () => void;
  onResetTimer: () => void;
}) {
  const trackingPreset = getTrackingPreset(exercise.resultType ?? defaultWorkoutResultType);
  const previousPerformanceInput = {
    clientId,
    exerciseId: exercise.exerciseId,
    resultType: normalizeTrackingType(exercise.resultType ?? defaultWorkoutResultType),
    before,
    excludeSessionId: currentSessionId
  };
  const { previousPerformance } = usePreviousExercisePerformance(previousPerformanceInput);
  const previousSets = useMemo<ApproachSet[]>(
    () =>
      previousPerformance?.sets.map((set) => ({
        id: `${previousPerformance.sessionId}-${set.setIndex}`,
        index: set.setIndex,
        resultType: set.resultType,
        values: pickCompatibleValues(getLegacyValues({
          values: set.values,
          weight: set.weight,
          repetitions: set.repetitions,
          durationSeconds: set.durationSeconds,
          distanceMeters: set.distanceMeters
        }), trackingPreset.type),
        weight: set.weight,
        reps: set.repetitions,
        durationSeconds: set.durationSeconds,
        distanceMeters: set.distanceMeters,
        unit: set.unit
      })).filter((set) => hasAnyMetricValue(set.values) || trackingPreset.type === "completion_only") ?? [],
    [previousPerformance, trackingPreset.type]
  );

  return (
    <View style={styles.exerciseWrapper}>
      <Approach
        title={exercise.exerciseName}
        note={exercise.comment}
        previousSets={previousSets}
        trackingPreset={trackingPreset}
        noteTitle="Заметка"
        noteSaveLabel="Сохранить"
        addLabel="Добавить подход"
        sets={exercise.sets}
        activeTimer={activeTimer}
        showDeleteAction
        style={styles.exerciseCard}
        onAddSet={onAddSet}
        onRemoveLastSet={onRemoveLastSet}
        onDeleteSet={onDeleteSet}
        onDeleteExercise={onDeleteExercise}
        onNoteChange={onNoteChange}
        onSetStateChange={onSetStateChange}
        onSetValueChange={onSetValueChange}
        onSetsReorder={onSetsReorder}
        onStartTimer={onStartTimer}
        onPauseTimer={onPauseTimer}
        onResumeTimer={onResumeTimer}
        onFinishTimer={onFinishTimer}
        onResetTimer={onResetTimer}
      />
    </View>
  );
}

function isLoggedIncompleteSet(set: SessionResultSet) {
  if (set.state === "selected") return false;
  return hasAnyMetricValue(getLegacyValues({
    values: set.values,
    weight: set.weight,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    distanceMeters: set.distanceMeters
  }));
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
  inlineAlert: {
    paddingTop: theme.spacing.md
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
  emptyTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  copy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body
  }
});
