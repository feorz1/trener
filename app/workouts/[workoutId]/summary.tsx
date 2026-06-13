import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Divider, Header, ListItemGym, Navigation, ProgressBar, type WorkoutSetValue } from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { mockWorkouts } from "@/data/mockWorkouts";
import {
  formatResultDuration,
  getCompletedSets,
  getLoggedSets,
  parseWorkoutResult,
  summarizeWorkoutResult,
  type WorkoutResultSnapshot
} from "@/features/workouts/sessionResult";
import { WorkoutSummaryLightRays } from "@/features/workouts/WorkoutSummaryLightRays";
import { workoutSummaryLightRaysDefaultConfig } from "@/features/workouts/WorkoutSummaryLightRaysConfig";
import { theme } from "@/theme";
import type { Workout } from "@/types";

type RouteParams = {
  workoutId?: string | string[];
  snapshot?: string | string[];
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildFallbackSnapshot(workout: Workout): WorkoutResultSnapshot {
  return {
    workoutId: workout.id,
    clientName: mockClients.find((item) => item.id === workout.clientId)?.name ?? "Клиент",
    durationSeconds: workout.durationMinutes * 60,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        index: set.order,
        reps: set.actualReps ?? set.targetReps,
        weight: set.actualWeightKg ?? set.targetWeightKg,
        unit: "кг",
        state: set.completed ? "selected" : "default",
        logged: Boolean(set.actualReps || set.actualWeightKg)
      }))
    }))
  };
}

function formatSetLabel(set: { reps?: number; weight?: number; unit?: string }) {
  return `${set.reps}×${set.weight}${set.unit ?? "кг"}`;
}

export default function WorkoutSummaryScreen() {
  const { workoutId: rawWorkoutId, snapshot: rawSnapshot } = useLocalSearchParams<RouteParams>();
  const workoutId = firstParam(rawWorkoutId);
  const fallbackWorkout = useMemo(() => mockWorkouts.find((item) => item.id === workoutId) ?? mockWorkouts[0], [workoutId]);
  const parsedSnapshot = useMemo(() => parseWorkoutResult(rawSnapshot), [rawSnapshot]);
  const snapshot = parsedSnapshot ?? buildFallbackSnapshot(fallbackWorkout);
  const summary = useMemo(() => summarizeWorkoutResult(snapshot), [snapshot]);
  const resultExercises = useMemo(
    () =>
      snapshot.exercises
        .map((exercise) => ({
          ...exercise,
          completedSets: getCompletedSets(exercise),
          loggedSets: getLoggedSets(exercise)
        }))
        .filter((exercise) => exercise.completedSets.length > 0),
    [snapshot.exercises]
  );
  const hapticPlayedRef = useRef(false);
  const completionIsFull = summary.totalExercises > 0 && summary.completedExercises === summary.totalExercises;

  useEffect(() => {
    if (hapticPlayedRef.current) return;
    hapticPlayedRef.current = true;

    if (completionIsFull) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [completionIsFull, summary.loggedSets]);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <WorkoutSummaryLightRays style={styles.screenLightRays} />
      <Navigation title="Итоги тренировки" backIconName="close" backAccessibilityLabel="Закрыть" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topSection}>
          <View style={styles.topSectionContent}>
            <Header title={snapshot.clientName} showSubtitle={false} size="lg" style={styles.header} />
            <ProgressBar
              completed={summary.completedExercises}
              total={summary.totalExercises}
              label={`${summary.completedExercises} из ${summary.totalExercises} упражнений`}
            />

            <View style={styles.metricsRow}>
              <SummaryMetric value={formatResultDuration(snapshot.durationSeconds)} label="Время тренировки" />
              <SummaryMetric value={summary.calories === null ? "—" : String(summary.calories)} label="Калории" />
            </View>
            {summary.calories === null ? (
              <Text style={styles.calorieNote}>Калории появятся, когда в выполненных подходах будут рабочие вес и повторы.</Text>
            ) : null}
          </View>
        </View>

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.exerciseSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Упражнения</Text>
            <Badge label={String(resultExercises.length)} tone="neutral" size="s" icon={false} />
          </View>

          {resultExercises.length > 0 ? (
            <View style={styles.exerciseList}>
              {resultExercises.map((exercise) => {
                const setValues: WorkoutSetValue[] =
                  exercise.loggedSets.length > 0
                    ? exercise.loggedSets.map((set) => ({
                        id: set.id,
                        label: formatSetLabel(set)
                      }))
                    : [{ id: `${exercise.id}-missing-data`, label: "нет данных" }];

                return (
                  <ListItemGym
                    key={exercise.id}
                    title={exercise.exerciseName}
                    width="fill"
                    showSets
                    setVariant="set"
                    setValues={setValues}
                    trailingSlot={<View style={styles.resultRowTrailing} />}
                    suppressPressedStyle
                  />
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Нет рассчитанных подходов</Text>
              <Text style={styles.emptyCopy}>Отметьте выполненные подходы, чтобы увидеть их в итогах.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Закрыть" type="primary" size="large" width="fill" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

function SummaryMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricCard}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
        {value}
      </Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  screenLightRays: {
    position: "absolute",
    top: theme.spacing[0],
    right: theme.spacing[0],
    left: theme.spacing[0],
    height: workoutSummaryLightRaysDefaultConfig.height
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.sizes.buttonLgHeight + theme.spacing["3xl"]
  },
  topSection: {
    position: "relative"
  },
  topSectionContent: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  header: {
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing.lg
  },
  metricsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg
  },
  metricCard: {
    flex: 1,
    minHeight: theme.sizes.alertCompactMinHeight + theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  metricValue: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  metricLabel: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  calorieNote: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body,
    textAlign: "center"
  },
  exerciseSection: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  sectionHeader: {
    minHeight: theme.sizes.buttonMediumHeight,
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
  exerciseList: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm
  },
  resultRowTrailing: {
    width: theme.spacing[0],
    height: theme.spacing[0]
  },
  emptyState: {
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl
  },
  emptyTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  emptyCopy: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
