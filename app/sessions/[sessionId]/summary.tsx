import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Badge, Button, Divider, ListItemGym, Loader, Navigation, ProgressBar, type WorkoutSetValue } from "@/components/ui";
import { useClient, useSession, useSessionResults, useWorkout } from "@/data";
import {
  defaultWorkoutResultType,
  formatResultDuration,
  getCompletedSets,
  summarizeWorkoutResult,
  type WorkoutResultSnapshot
} from "@/features/workouts/sessionResult";
import { getSessionTotalVolume } from "@/features/workouts/sessionHistory";
import { WorkoutSummaryLightRays } from "@/features/workouts/WorkoutSummaryLightRays";
import { workoutSummaryLightRaysDefaultConfig } from "@/features/workouts/WorkoutSummaryLightRaysConfig";
import { theme } from "@/theme";
import type { WorkoutSession } from "@/types";

type RouteParams = {
  sessionId?: string | string[];
  from?: string | string[];
};

const lightRaysMinOpacity = 0;
const lightRaysFadeDistance = workoutSummaryLightRaysDefaultConfig.height - theme.sizes.navigationHeight;
const lightRaysShiftY = -workoutSummaryLightRaysDefaultConfig.height * 0.2;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function buildSnapshot(session: WorkoutSession, clientName: string, results: ReturnType<typeof useSessionResults>["results"]): WorkoutResultSnapshot {
  return {
    workoutId: session.workoutId,
    clientName,
    durationSeconds: session.durationSeconds ?? Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)),
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseNameSnapshot ?? exercise.exerciseName,
      sets: results
        .filter((result) => (result.sessionExerciseItemId ? result.sessionExerciseItemId === exercise.id : result.exerciseId === exercise.exerciseId))
        .sort((left, right) => left.setIndex - right.setIndex)
        .map((set) => ({
          id: set.setId ?? set.id,
          index: set.setIndex,
          resultType: set.resultType ?? exercise.resultTypeSnapshot ?? defaultWorkoutResultType,
          reps: set.repetitions,
          weight: set.weight,
          durationSeconds: set.durationSeconds,
          distanceMeters: set.distanceMeters,
          unit: set.unit ?? "кг",
          state: set.completed ? "selected" as const : "default" as const,
          logged: Boolean(set.repetitions || set.weight || set.durationSeconds || set.distanceMeters)
        }))
    }))
  };
}

function formatSetLabel(set: { resultType?: string; reps?: number; weight?: number; durationSeconds?: number; distanceMeters?: number; unit?: string }) {
  if (set.resultType === "duration") return Number.isFinite(set.durationSeconds) ? formatResultDuration(set.durationSeconds ?? 0) : "без данных";
  if (set.resultType === "distance_duration") {
    const parts: string[] = [];
    if (Number.isFinite(set.distanceMeters)) parts.push(`${set.distanceMeters} м`);
    if (Number.isFinite(set.durationSeconds)) parts.push(formatResultDuration(set.durationSeconds ?? 0));
    return parts.join(" × ") || "без данных";
  }
  if (set.resultType === "reps") return Number.isFinite(set.reps) ? `${set.reps} повт.` : "без данных";

  const hasReps = Number.isFinite(set.reps);
  const hasWeight = Number.isFinite(set.weight);

  if (hasReps && hasWeight) return `${set.reps}x${set.weight}${set.unit ?? "кг"}`;
  if (hasReps) return `${set.reps} повт.`;
  return "без данных";
}

function formatSummaryDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) return [hours, minutes].map((part) => String(part).padStart(2, "0")).join(":");
  return [minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function formatSummaryTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatSummaryDay(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
}

export default function WorkoutSummaryScreen() {
  const { sessionId: rawSessionId, from: rawFrom } = useLocalSearchParams<RouteParams>();
  const sessionId = firstParam(rawSessionId);
  const openedFrom = firstParam(rawFrom);
  const usesBackNavigation = openedFrom === "client" || openedFrom === "home";
  const sessionQuery = useSession(sessionId);
  const { session } = sessionQuery;
  const workoutQuery = useWorkout(session?.workoutId);
  const { workout } = workoutQuery;
  const clientQuery = useClient(session?.clientId ?? workout?.clientId);
  const { client } = clientQuery;
  const resultsQuery = useSessionResults(sessionId);
  const { results } = resultsQuery;
  const snapshot = useMemo(() => session ? buildSnapshot(session, client?.name ?? "Клиент", results) : null, [client?.name, results, session]);
  const summary = useMemo(
    () =>
      snapshot
        ? summarizeWorkoutResult(snapshot)
        : {
            completedExercises: 0,
            totalExercises: 0,
            loggedExercises: 0,
            loggedSets: 0,
            totalVolumeKg: 0,
            calories: null
          },
    [snapshot]
  );
  const resultExercises = useMemo(
    () =>
      snapshot?.exercises
        .map((exercise) => ({
          ...exercise,
          completedSets: getCompletedSets(exercise)
        })) ?? [],
    [snapshot?.exercises]
  );
  const scrollY = useRef(new Animated.Value(0)).current;
  const hapticPlayedRef = useRef(false);
  const completionIsFull = summary.totalExercises > 0 && summary.completedExercises === summary.totalExercises;
  const totalVolume = getSessionTotalVolume(results);
  const totalWeight = totalVolume ?? summary.totalVolumeKg;
  const backIconName = usesBackNavigation ? "arrow left" : "close";
  const backAccessibilityLabel = usesBackNavigation ? "Назад" : "Закрыть";
  const lightRaysOpacity = scrollY.interpolate({
    inputRange: [theme.spacing[0], lightRaysFadeDistance],
    outputRange: [1, lightRaysMinOpacity],
    extrapolate: "clamp"
  });
  const lightRaysTranslateY = scrollY.interpolate({
    inputRange: [theme.spacing[0], lightRaysFadeDistance],
    outputRange: [theme.spacing[0], lightRaysShiftY],
    extrapolate: "clamp"
  });
  const closeSummary = () => {
    router.dismissTo("/");
  };
  const handleBack = () => {
    if (usesBackNavigation) {
      router.back();
      return;
    }

    closeSummary();
  };
  const isLoading = sessionQuery.isLoading || workoutQuery.isLoading || clientQuery.isLoading || resultsQuery.isLoading;
  const loadError = sessionQuery.error ?? workoutQuery.error ?? clientQuery.error ?? resultsQuery.error;
  const retryLoad = () => {
    sessionQuery.retry();
    workoutQuery.retry();
    clientQuery.retry();
    resultsQuery.retry();
  };

  useEffect(() => {
    if (!snapshot || hapticPlayedRef.current) return;
    hapticPlayedRef.current = true;

    if (completionIsFull) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [completionIsFull, snapshot, summary.loggedSets]);

  if (isLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Итоги тренировки" backIconName={backIconName} backAccessibilityLabel={backAccessibilityLabel} onBack={handleBack} />
        <View style={styles.emptyState}>
          <Loader size="medium" tone="brand" />
          <Text style={styles.emptyTitle}>Загружаем итоги</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Итоги тренировки" backIconName={backIconName} backAccessibilityLabel={backAccessibilityLabel} onBack={handleBack} />
        <View style={styles.emptyState}>
          <Alert tone="negative" layout="action" width="fill" title="Не удалось загрузить итоги" description={loadError.message} actionLabel="Повторить" onAction={retryLoad} />
        </View>
      </SafeAreaView>
    );
  }

  if (!snapshot) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Итоги тренировки" backIconName={backIconName} backAccessibilityLabel={backAccessibilityLabel} onBack={handleBack} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Сессия не найдена</Text>
          <Text style={styles.emptyCopy}>Вернитесь на главный экран и запустите тренировку заново.</Text>
        </View>
      </SafeAreaView>
    );
  }
  const completedSession = session;
  if (!completedSession) return null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.screenLightRays,
          {
            opacity: lightRaysOpacity,
            transform: [{ translateY: lightRaysTranslateY }]
          }
        ]}
      >
        <WorkoutSummaryLightRays style={styles.screenLightRaysFill} />
      </Animated.View>
      <Navigation title="Итоги тренировки" backIconName={backIconName} backAccessibilityLabel={backAccessibilityLabel} onBack={handleBack} />

      <Animated.ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <View style={styles.topSection}>
          <View style={styles.topSectionContent}>
            <Text style={styles.summaryClientName}>{snapshot.clientName}</Text>
            <ProgressBar
              completed={summary.completedExercises}
              total={summary.totalExercises}
              label={`${summary.completedExercises} из ${summary.totalExercises} упражнений`}
              tone="primary"
            />

            <View style={styles.metricsGrid}>
              <View style={styles.metricsRow}>
                <SummaryMetric value={formatSummaryTime(completedSession.startedAt)} label={formatSummaryDay(completedSession.startedAt)} />
                <SummaryMetric value={formatSummaryDuration(snapshot.durationSeconds)} label="Время тренировки" />
              </View>
              <View style={styles.metricsRow}>
                <SummaryMetric value={summary.calories === null ? "0" : String(summary.calories)} label="Калории" />
                <SummaryMetric value={`${Math.round(totalWeight)} кг`} label="Общий вес" />
              </View>
            </View>
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
                  exercise.completedSets.length > 0
                    ? exercise.completedSets.map((set) => ({
                        id: set.id,
                        label: formatSetLabel(set)
                      }))
                    : [{ id: `${exercise.id}-missing-data`, label: "выполненных подходов нет" }];

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
      </Animated.ScrollView>

      <View style={styles.footer}>
        <Button label="Закрыть" type="primary" size="large" width="fill" onPress={closeSummary} />
      </View>
    </SafeAreaView>
  );
}

function SummaryMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricCard}>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text numberOfLines={2} style={styles.metricLabel}>
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
  content: {
    flexGrow: 1,
    paddingBottom: theme.sizes.buttonLgHeight + theme.spacing["3xl"]
  },
  screenLightRays: {
    position: "absolute",
    top: theme.spacing[0],
    right: theme.spacing[0],
    left: theme.spacing[0],
    height: workoutSummaryLightRaysDefaultConfig.height
  },
  screenLightRaysFill: {
    ...StyleSheet.absoluteFillObject
  },
  topSection: {
    position: "relative"
  },
  topSectionContent: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  summaryClientName: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  metricsGrid: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg
  },
  metricsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
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
