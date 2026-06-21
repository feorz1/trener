import { useMemo, useState } from "react";
import { Alert as NativeAlert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Divider, Header, Icon, ListItemGym, Navigation } from "@/components/ui";
import { useClient, useSessionActions, useSessions, useWorkout, useWorkoutActions } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatWorkoutBadgeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date).replace(",", " в");
}

export default function WorkoutDetailsScreen() {
  const { workoutId: rawWorkoutId } = useLocalSearchParams<{ workoutId?: string | string[] }>();
  const workoutId = firstParam(rawWorkoutId);
  const { workout, notFound } = useWorkout(workoutId);
  const { client } = useClient(workout?.clientId);
  const { sessions } = useSessions();
  const sessionActions = useSessionActions();
  const workouts = useWorkoutActions();
  const { scrollProps } = useConditionalScroll();
  const [busy, setBusy] = useState(false);
  const relatedSessions = useMemo(() => sessions.filter((session) => session.workoutId === workoutId), [sessions, workoutId]);
  const hasActiveSession = relatedSessions.some((session) => session.status === "active");
  const hasCompletedSession = relatedSessions.some((session) => session.status === "completed");
  const canEditPlan = Boolean(workout && workout.status !== "cancelled" && !hasActiveSession && !hasCompletedSession);
  const displayStatus = workout?.status === "cancelled" ? "Отменена" : hasCompletedSession ? "Завершена" : hasActiveSession ? "В процессе" : "Запланирована";

  const startSession = async () => {
    if (!workoutId || !workout || workout.status === "cancelled") return;
    const session = relatedSessions.find((item) => item.status === "active") ?? await sessionActions.start(workoutId);
    router.push({ pathname: "/sessions/[sessionId]", params: { sessionId: session.id } });
  };

  const editWorkout = async () => {
    if (!workoutId || !canEditPlan || busy) return;
    setBusy(true);
    try {
      const draft = await workouts.createEditDraft(workoutId);
      router.push({ pathname: "/workouts/new", params: { draftId: draft.id } });
    } finally {
      setBusy(false);
    }
  };

  const cancelWorkout = () => {
    if (!workoutId || !canEditPlan || busy) return;
    NativeAlert.alert("Отменить тренировку?", "Тренировка исчезнет из предстоящих, но останется в локальных данных.", [
      { text: "Не отменять", style: "cancel" },
      {
        text: "Отменить тренировку",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          void workouts.cancel(workoutId).finally(() => {
            setBusy(false);
            router.back();
          });
        }
      }
    ]);
  };

  if (notFound || !workout) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Тренировка" onBack={() => router.back()} />
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Тренировка не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation
        title="Тренировка"
        trailingSlot={
          canEditPlan ? (
            <Pressable accessibilityLabel="Отменить тренировку" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={cancelWorkout} style={styles.trashButton}>
              <Icon name="trash" size={theme.spacing.xl} color={theme.colors.status.negative} />
            </Pressable>
          ) : null
        }
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        <View style={styles.headerBlock}>
          <Header title={client?.name ?? "Клиент"} subtitle={workout.title} size="lg" style={styles.header} />
          <View style={styles.badges}>
            <Badge label={displayStatus} tone="neutral" size="md" icon={false} />
            <Badge label={formatWorkoutBadgeDate(workout.startsAt)} tone="neutral" size="md" icon={false} />
          </View>
        </View>

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Упражнения</Text>
              <Badge label={String(workout.exercises.length)} tone="neutral" size="sm" icon={false} />
            </View>
            {canEditPlan ? (
              <Pressable accessibilityLabel="Редактировать тренировку" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={editWorkout} style={styles.editButton}>
                <Icon name="edit" size={theme.spacing.lg} color={theme.colors.content.ink} />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.listGroup}>
            {workout.exercises.map((exercise, index) => (
              <ListItemGym
                key={`${exercise.id}-${index}`}
                title={exercise.exerciseName}
                width="fill"
                trailingSlot={<View style={styles.emptyTrailing} />}
                suppressPressedStyle
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button label={hasActiveSession ? "Продолжить" : "Начать"} type="primary" size="large" width="fill" state={workout.status === "cancelled" || hasCompletedSession ? "disabled" : "active"} onPress={startSession} />
        <Button label="Перенести" type="secondaryNeutral" size="large" width="fill" state={canEditPlan ? "active" : "disabled"} onPress={() => router.push({ pathname: "/workouts/[workoutId]/reschedule", params: { workoutId: workout.id } })} />
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
    paddingBottom: theme.spacing.lg
  },
  headerBlock: {
    gap: theme.spacing.xxs,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg
  },
  section: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm
  },
  sectionTitleRow: {
    flex: 1,
    minWidth: theme.spacing[0],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  listGroup: {
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm
  },
  actions: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  trashButton: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  editButton: {
    width: theme.spacing["2xl"],
    height: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvasSoft
  },
  emptyTrailing: {
    width: theme.spacing[0],
    height: theme.spacing[0]
  },
  state: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  stateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  }
});
