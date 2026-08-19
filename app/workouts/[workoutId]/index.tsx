import { useEffect, useMemo, useRef, useState } from "react";
import { Alert as NativeAlert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, AnimatedTopNotification, Badge, Button, Divider, Header, Icon, ListItemGym, Loader, Navigation } from "@/components/ui";
import { isActiveSessionConflictError, useClient, useDataMutation, useSessionActions, useSessions, useWorkout, useWorkoutActions } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const rescheduleNotificationDelay = 320;

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
  const {
    workoutId: rawWorkoutId,
    rescheduleConfirmed: rawRescheduleConfirmed
  } = useLocalSearchParams<{ workoutId?: string | string[]; rescheduleConfirmed?: string | string[] }>();
  const workoutId = firstParam(rawWorkoutId);
  const rescheduleConfirmed = firstParam(rawRescheduleConfirmed) === "true";
  const workoutQuery = useWorkout(workoutId);
  const { workout, notFound } = workoutQuery;
  const clientQuery = useClient(workout?.clientId);
  const { client } = clientQuery;
  const sessionsQuery = useSessions();
  const { sessions } = sessionsQuery;
  const sessionActions = useSessionActions();
  const workouts = useWorkoutActions();
  const { scrollProps } = useConditionalScroll();
  const relatedSessions = useMemo(() => sessions.filter((session) => session.workoutId === workoutId), [sessions, workoutId]);
  const hasActiveSession = relatedSessions.some((session) => session.status === "active");
  const hasCompletedSession = relatedSessions.some((session) => session.status === "completed");
  const canEditPlan = Boolean(workout && workout.status !== "cancelled" && !hasActiveSession && !hasCompletedSession);
  const displayStatus = workout?.status === "cancelled" ? "Отменена" : hasCompletedSession ? "Завершена" : hasActiveSession ? "В процессе" : "Запланирована";
  const isLoading = workoutQuery.isLoading || clientQuery.isLoading || sessionsQuery.isLoading;
  const queryError = workoutQuery.error ?? clientQuery.error ?? sessionsQuery.error;
  const startSessionMutation = useDataMutation(async (id: string) => sessionActions.start(id));
  const editWorkoutMutation = useDataMutation(async (id: string) => workouts.createEditDraft(id));
  const cancelWorkoutMutation = useDataMutation(async (id: string) => workouts.cancel(id));
  const mutationError = startSessionMutation.error ?? editWorkoutMutation.error ?? cancelWorkoutMutation.error;
  const isMutating = startSessionMutation.isSubmitting || editWorkoutMutation.isSubmitting || cancelWorkoutMutation.isSubmitting;
  const [notificationVisible, setNotificationVisible] = useState(false);
  const shownNotificationRef = useRef(false);
  const notificationDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!rescheduleConfirmed) {
      shownNotificationRef.current = false;
      return;
    }
    if (shownNotificationRef.current) return;

    shownNotificationRef.current = true;
    if (notificationDelayTimeoutRef.current) {
      clearTimeout(notificationDelayTimeoutRef.current);
    }
    notificationDelayTimeoutRef.current = setTimeout(() => {
      notificationDelayTimeoutRef.current = null;
      setNotificationVisible(true);
    }, rescheduleNotificationDelay);
    router.setParams({ rescheduleConfirmed: undefined });
  }, [rescheduleConfirmed]);

  useEffect(() => () => {
    if (notificationDelayTimeoutRef.current) {
      clearTimeout(notificationDelayTimeoutRef.current);
    }
  }, []);

  const startSession = async () => {
    if (!workoutId || !workout || workout.status === "cancelled" || isMutating) return;
    try {
      const session = relatedSessions.find((item) => item.status === "active") ?? await startSessionMutation.mutate(workoutId);
      router.push({ pathname: "/sessions/[sessionId]", params: { sessionId: session.id } });
    } catch (error) {
      if (!isActiveSessionConflictError(error)) throw error;
      startSessionMutation.reset();
      router.push({ pathname: "/sessions/[sessionId]", params: { sessionId: error.activeSession.id } });
    }
  };

  const editWorkout = async () => {
    if (!workoutId || !canEditPlan || isMutating) return;
    const draft = await editWorkoutMutation.mutate(workoutId).catch(() => null);
    if (!draft) return;
    router.push({ pathname: "/workouts/new", params: { draftId: draft.id } });
  };

  const cancelWorkout = () => {
    if (!workoutId || !canEditPlan || isMutating) return;
    NativeAlert.alert("Отменить тренировку?", "Тренировка исчезнет из предстоящих, но останется в локальных данных.", [
      { text: "Не отменять", style: "cancel" },
      {
        text: "Отменить тренировку",
        style: "destructive",
        onPress: () => {
          void cancelWorkoutMutation.mutate(workoutId).then(() => {
            router.back();
          }).catch(() => undefined);
        }
      }
    ]);
  };

  if (isLoading) {
    return <WorkoutState title="Загружаем тренировку" loading />;
  }

  if (queryError) {
    return <WorkoutState title="Не удалось загрузить тренировку" description={queryError.message} actionLabel="Повторить" onAction={workoutQuery.retry} />;
  }

  if (notFound || !workout) {
    return <WorkoutState title="Тренировка не найдена" />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.navigationLayer}>
        <Navigation
          title="Тренировка"
          trailingSlot={
            canEditPlan ? (
              <Pressable accessibilityLabel="Отменить тренировку" accessibilityRole="button" accessibilityState={{ disabled: isMutating }} disabled={isMutating} hitSlop={theme.spacing.sm} onPress={cancelWorkout} style={[styles.trashButton, isMutating && styles.iconButtonDisabled]}>
                <Icon name="trash" size={theme.spacing.xl} color={theme.colors.status.negative} />
              </Pressable>
            ) : null
          }
          onBack={() => router.back()}
        />
        <AnimatedTopNotification
          visible={notificationVisible}
          message="Тренировка перенесена"
          topOffset={theme.spacing.xxs}
          respectSafeArea={false}
          onFinish={() => setNotificationVisible(false)}
          testID="workout-reschedule-notification"
        />
      </View>

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
              <Pressable accessibilityLabel="Редактировать тренировку" accessibilityRole="button" accessibilityState={{ disabled: isMutating }} disabled={isMutating} hitSlop={theme.spacing.sm} onPress={editWorkout} style={[styles.editButton, isMutating && styles.iconButtonDisabled]}>
                <Icon name="edit" size={theme.spacing.lg} color={theme.colors.content.ink} />
              </Pressable>
            ) : null}
          </View>
          {mutationError ? (
            <View style={styles.inlineAlert}>
              <Alert
                tone="negative"
                layout="expanded"
                title="Действие не выполнено"
                description={mutationError.message}
                width="fill"
              />
            </View>
          ) : null}
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
        <Button label={hasActiveSession ? "Продолжить" : "Начать"} type="primary" size="large" width="fill" state={startSessionMutation.isSubmitting ? "loading" : workout.status === "cancelled" || hasCompletedSession || isMutating ? "disabled" : "active"} onPress={startSession} />
        <Button label="Перенести" type="secondaryNeutral" size="large" width="fill" state={canEditPlan && !isMutating ? "active" : "disabled"} onPress={() => router.push({ pathname: "/workouts/[workoutId]/reschedule", params: { workoutId: workout.id } })} />
      </View>
    </SafeAreaView>
  );
}

function WorkoutState({
  title,
  description,
  loading = false,
  actionLabel,
  onAction
}: {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Тренировка" onBack={() => router.back()} />
      <View style={styles.state}>
        {loading ? <Loader size="medium" tone="brand" /> : null}
        <Text style={styles.stateTitle}>{title}</Text>
        {description ? <Text style={styles.stateCopy}>{description}</Text> : null}
        {actionLabel && onAction ? <Button label={actionLabel} type="secondary" size="large" width="fill" onPress={onAction} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  navigationLayer: {
    position: "relative",
    zIndex: theme.spacing["3xl"]
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
  inlineAlert: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md
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
  iconButtonDisabled: {
    opacity: 0.48
  },
  emptyTrailing: {
    width: theme.spacing[0],
    height: theme.spacing[0]
  },
  state: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  stateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  stateCopy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  }
});
