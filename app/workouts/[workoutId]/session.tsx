import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Approach, Badge, Button, Divider, Header, Navigation, ProgressBar, type ApproachSet } from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { mockWorkouts } from "@/data/mockWorkouts";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { theme } from "@/theme";
import type { Workout } from "@/types";

const kgUnit = "кг";

type RouteParams = {
  workoutId?: string | string[];
};

type SessionExercise = Omit<Workout["exercises"][number], "sets"> & {
  sets: ApproachSet[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSetIndexes(sets: ApproachSet[]) {
  return sets.map((set, index) => ({ ...set, index: index + 1 }));
}

function buildSessionExerciseSets(workoutSets: Workout["exercises"][number]["sets"]) {
  return normalizeSetIndexes(
    [...workoutSets]
      .sort((left, right) => left.order - right.order)
      .map((set) => ({
        id: set.id,
        index: set.order,
        reps: set.actualReps ?? set.targetReps,
        weight: set.actualWeightKg ?? set.targetWeightKg,
        unit: kgUnit,
        state: set.completed ? "selected" : "default"
      }))
  );
}

function buildSessionWorkout(workout?: Workout) {
  if (!workout) return [];
  return workout.exercises.map<SessionExercise>(({ sets, ...exercise }) => ({
    ...exercise,
    sets: buildSessionExerciseSets(sets)
  }));
}

export default function WorkoutSessionScreen() {
  const { workoutId: rawWorkoutId } = useLocalSearchParams<RouteParams>();
  const workoutId = firstParam(rawWorkoutId);
  const workout = useMemo(() => mockWorkouts.find((item) => item.id === workoutId) ?? mockWorkouts[0], [workoutId]);
  const clientName = useMemo(() => mockClients.find((item) => item.id === workout?.clientId)?.name ?? "Клиент", [workout?.clientId]);
  const initialSessionExercises = useMemo(() => buildSessionWorkout(workout), [workout]);
  const { scrollProps } = useConditionalScroll();
  const keyboardInset = useKeyboardInset();
  const [sessionExercises, setSessionExercises] = useState(initialSessionExercises);
  const nextSetId = useRef(1);

  useEffect(() => {
    setSessionExercises(initialSessionExercises);
    nextSetId.current = 1;
  }, [initialSessionExercises]);

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

  const handleSetStateChange = useCallback(
    (exerciseId: string, setId: string, state: ApproachSet["state"]) => {
      setSessionExercises((current) =>
        current.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;
          return {
            ...exercise,
            sets: normalizeSetIndexes(
              exercise.sets.map((set) => (set.id === setId ? { ...set, state } : set))
            )
          };
        })
      );
    },
    []
  );

  const handleSetValueChange = useCallback(
    (exerciseId: string, setId: string, patch: Partial<Pick<ApproachSet, "weight" | "reps">>) => {
      setSessionExercises((current) =>
        current.map((exercise) => {
          if (exercise.id !== exerciseId) return exercise;
          return {
            ...exercise,
            sets: normalizeSetIndexes(
              exercise.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set))
            )
          };
        })
      );
    },
    []
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
    setSessionExercises((current) =>
      current.map((exercise) =>
        exercise.id !== exerciseId ? exercise : { ...exercise, sets: normalizeSetIndexes(exercise.sets.filter((set) => set.id !== setId)) }
      )
    );
  }, []);

  const handleAddSet = useCallback((exerciseId: string) => {
    setSessionExercises((current) =>
      current.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        const templateSet = exercise.sets[exercise.sets.length - 1];
        const nextSet: ApproachSet = {
          id: `${exercise.id}-set-${nextSetId.current++}`,
          index: exercise.sets.length + 1,
          state: "default",
          unit: kgUnit,
          weight: templateSet?.weight,
          reps: templateSet?.reps
        };

        return {
          ...exercise,
          sets: normalizeSetIndexes([...exercise.sets, nextSet])
        };
      })
    );
  }, []);

  const finishSession = useCallback(() => {
    router.back();
  }, []);

  const addExercise = useCallback(() => {
    router.push("/workouts/exercises");
  }, []);

  if (!workout) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Тренировка" onBack={() => router.back()} />
        <View style={styles.emptyState}>
          <Text style={styles.copy}>Тренировка не найдена.</Text>
          <Button label="Назад" type="secondary" size="large" width="fill" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Тренировка" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(theme.spacing["3xl"], footerPaddingBottom + theme.spacing.md) }]}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        <View style={styles.topSection}>
          <Header title={clientName} showSubtitle={false} size="lg" style={styles.header} />
          <View style={styles.status}>
            <ProgressBar completed={completedExercises} total={exerciseCount} label={progressLabel} style={styles.progressBar} />
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
                <View key={exercise.id} style={styles.exerciseWrapper}>
                  <Approach
                    title={exercise.exerciseName}
                    note={exercise.comment}
                    noteTitle="Заметка"
                    noteSaveLabel="Сохранить"
                    addLabel="Добавить подход"
                    sets={exercise.sets}
                    showDeleteAction
                    style={styles.exerciseCard}
                    onAddSet={() => handleAddSet(exercise.id)}
                    onDeleteSet={(setId) => handleDeleteSet(exercise.id, setId)}
                    onNoteChange={(nextNote) => handleNoteChange(exercise.id, nextNote)}
                    onSetStateChange={(id, state) => handleSetStateChange(exercise.id, id, state)}
                    onSetValueChange={(id, patch) => handleSetValueChange(exercise.id, id, patch)}
                    onSetsReorder={(nextSets) => handleSetReorder(exercise.id, nextSets)}
                  />
                </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1,
    paddingTop: theme.spacing[0]
  },
  topSection: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.sm + theme.spacing.xxs,
    paddingHorizontal: theme.spacing.lg
  },
  header: {
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing.lg
  },
  status: {
    gap: theme.spacing.md
  },
  progressBar: {
    paddingBottom: theme.spacing.sm
  },
  exerciseSection: {
    backgroundColor: theme.colors.background.canvas
  },
  sectionHeader: {
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
