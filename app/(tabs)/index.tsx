import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiquidGlassView, isLiquidGlassSupported } from "@callstack/liquid-glass";
import { router, useLocalSearchParams } from "expo-router";
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarDayStrip, type CalendarDayStripItem } from "@/components/calendar/CalendarDayStrip";
import { Button, Card, Header, Icon } from "@/components/ui";
import { isActiveSessionConflictError, useClients, useResults, useSessionActions, useSessions, useWorkoutActions, useWorkouts } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";
import type { Client, Workout, WorkoutResult, WorkoutSession, WorkoutStatus } from "@/types";
import { formatRuDayMonth } from "@/utils/date";

type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type TodayWorkout = {
  id: string;
  workoutId?: string;
  sessionId?: string;
  clientName: string;
  time: string;
  title: string;
  exercisesCount: number;
  completedExercises: number;
  status: Extract<WorkoutStatus, "planned" | "inProgress" | "completed">;
};

const weekdayShort = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const repeatDayByNativeWeekday: Record<number, RepeatDay> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};
const repeatDayKeys = new Set<RepeatDay>(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const FAB_SCROLL_REVEAL_DELAY = 140;
const FAB_HIT_SLOP = theme.spacing.xxs;
const FLOATING_ADD_SIZE = theme.sizes.buttonLgHeight;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseRepeatDays(value?: string) {
  if (!value) return [];

  return value
    .split(",")
    .filter((day): day is RepeatDay => repeatDayKeys.has(day as RepeatDay));
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value?: string) {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return startOfDay(new Date(year, month - 1, day));
}

function getWeekStart(date: Date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(value, mondayOffset);
}

function getWeekItems(today: Date): CalendarDayStripItem[] {
  const todayStart = startOfDay(today);
  const weekStart = getWeekStart(todayStart);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateStart = startOfDay(date);
    const temporalState = dateStart < todayStart ? "past" : dateStart > todayStart ? "future" : "default";

    return {
      key: getDateKey(dateStart),
      weekday: weekdayShort[dateStart.getDay()],
      dayNumber: String(dateStart.getDate()),
      temporalState
    };
  });
}

function getWeekPages(anchorDate: Date, today: Date): CalendarDayStripItem[][] {
  const anchorWeekStart = getWeekStart(anchorDate);

  return Array.from({ length: 5 }, (_, weekIndex) => {
    const weekStart = addDays(anchorWeekStart, (weekIndex - 2) * 7);
    return getWeekItems(weekStart);
  }).map((week) =>
    week.map((item) => {
      const date = parseDateKey(item.key) ?? today;
      const todayStart = startOfDay(today);
      const temporalState = date < todayStart ? "past" : date > todayStart ? "future" : "default";

      return {
        ...item,
        temporalState
      };
    })
  );
}

function getWorkoutDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;

  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

function getNextWorkoutMeta(workouts: TodayWorkout[], selectedDate: Date, now: Date) {
  const nextWorkoutDate = workouts
    .flatMap((workout) => {
      const workoutDate = getWorkoutDateTime(selectedDate, workout.time);
      return workoutDate && workoutDate > now ? [workoutDate] : [];
    })
    .sort((left, right) => left.getTime() - right.getTime())[0];

  if (!nextWorkoutDate) return "";

  const totalMinutes = Math.max(1, Math.ceil((nextWorkoutDate.getTime() - now.getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `Следующая через ${minutes} мин`;
  if (minutes === 0) return `Следующая через ${hours} ч`;
  return `Следующая через ${hours} ч ${minutes} мин`;
}

function getTimeLabel(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getCompletedExerciseCount(workout: Workout) {
  return workout.exercises.filter((exercise) => exercise.sets.length > 0 && exercise.sets.every((set) => set.completed)).length;
}

function getSessionProgress(session: WorkoutSession, results: WorkoutResult[]) {
  const sessionResults = results.filter((result) => result.sessionId === session.id);
  const completedExercises = session.exercises.filter((exercise) => {
    const exerciseResults = sessionResults.filter((result) => result.exerciseId === exercise.exerciseId);
    return exerciseResults.length > 0 && exerciseResults.every((result) => result.completed);
  }).length;

  return {
    completedExercises,
    totalExercises: session.exercises.length
  };
}

function getLatestSession(workoutId: string, sessions: WorkoutSession[]) {
  return sessions
    .filter((session) => session.workoutId === workoutId)
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];
}

function buildTodayWorkout(workout: Workout, clients: Client[], sessions: WorkoutSession[], results: WorkoutResult[]): TodayWorkout | undefined {
  if (workout.status !== "planned" && workout.status !== "active" && workout.status !== "inProgress" && workout.status !== "completed") return undefined;

  const client = clients.find((item) => item.id === workout.clientId);
  const session = getLatestSession(workout.id, sessions);
  const sessionProgress = session ? getSessionProgress(session, results) : null;
  const status = session?.status === "active" || workout.status === "active" ? "inProgress" : session?.status === "completed" ? "completed" : workout.status;

  return {
    id: workout.id,
    workoutId: workout.id,
    sessionId: session?.id,
    clientName: client?.name ?? "Клиент",
    time: getTimeLabel(workout.startsAt),
    title: workout.title,
    exercisesCount: sessionProgress?.totalExercises ?? workout.exercises.length,
    completedExercises: sessionProgress?.completedExercises ?? getCompletedExerciseCount(workout),
    status
  };
}

function getStoreWorkouts(workouts: Workout[], clients: Client[], sessions: WorkoutSession[], results: WorkoutResult[]): Record<string, TodayWorkout[]> {
  return workouts.reduce<Record<string, TodayWorkout[]>>((workoutsByDay, workout) => {
    const startsAt = new Date(workout.startsAt);
    if (Number.isNaN(startsAt.getTime())) return workoutsByDay;

    const todayWorkout = buildTodayWorkout(workout, clients, sessions, results);
    if (!todayWorkout) return workoutsByDay;

    addWorkoutToDay(workoutsByDay, getDateKey(startsAt), todayWorkout);
    return workoutsByDay;
  }, {});
}

function getPlanCount(workoutsCount: number) {
  if (workoutsCount === 0) return "Тренировок нет";
  if (workoutsCount === 1) return "1 тренировка";
  if (workoutsCount >= 2 && workoutsCount <= 4) return `${workoutsCount} тренировки`;
  return `${workoutsCount} тренировок`;
}

function addWorkoutToDay(workoutsByDay: Record<string, TodayWorkout[]>, dayKey: string, workout: TodayWorkout) {
  workoutsByDay[dayKey] = [workout, ...(workoutsByDay[dayKey] ?? [])].sort((left, right) => left.time.localeCompare(right.time));
}

export default function IndexScreen() {
  const { workouts } = useWorkouts();
  const { clients } = useClients();
  const { sessions: workoutSessions } = useSessions();
  const { results } = useResults();
  const sessions = useSessionActions();
  const workoutActions = useWorkoutActions();
  const {
    plannedDate
  } = useLocalSearchParams<{
    plannedDate?: string;
  }>();
  const insets = useSafeAreaInsets();
  const today = useMemo(() => startOfDay(new Date()), []);
  const plannedDateKey = firstParam(plannedDate);
  const plannedAnchorDate = useMemo(() => parseDateKey(plannedDateKey), [plannedDateKey]);
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => plannedAnchorDate ?? today);
  const weekPages = useMemo(() => getWeekPages(weekAnchorDate, today), [today, weekAnchorDate]);
  const weekItems = useMemo(() => weekPages.flat(), [weekPages]);
  const todayKey = useMemo(() => getDateKey(today), [today]);
  const workoutsByDay = useMemo(() => {
    return getStoreWorkouts(workouts, clients, workoutSessions, results);
  }, [
    clients,
    results,
    workoutSessions,
    workouts
  ]);
  const [selectedDayKey, setSelectedDayKey] = useState(plannedDateKey ?? todayKey);
  const [now, setNow] = useState(() => new Date());
  const [fabHidden, setFabHidden] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const fabProgress = useRef(new Animated.Value(1)).current;
  const fabRevealTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { scrollProps } = useConditionalScroll();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const floatingAddBottom = Math.max(insets.bottom, theme.spacing.xl) + theme.sizes.tabBarItemMinHeight + theme.spacing.lg;

  useEffect(() => {
    if (plannedDateKey) {
      setSelectedDayKey((currentDayKey) => (currentDayKey === plannedDateKey ? currentDayKey : plannedDateKey));
      setWeekAnchorDate((currentAnchorDate) => {
        const nextAnchorDate = plannedAnchorDate ?? today;
        return getDateKey(currentAnchorDate) === getDateKey(nextAnchorDate) ? currentAnchorDate : nextAnchorDate;
      });
    }
  }, [plannedAnchorDate, plannedDateKey, today]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotionEnabled);

    return () => subscription.remove();
  }, []);

  const selectedDate = useMemo(() => {
    const parsedDate = parseDateKey(selectedDayKey);
    if (parsedDate) return parsedDate;

    const index = weekItems.findIndex((item) => item.key === selectedDayKey);
    return index >= 0 ? addDays(getWeekStart(weekAnchorDate), index) : today;
  }, [selectedDayKey, today, weekAnchorDate, weekItems]);

  const isToday = selectedDayKey === todayKey;
  const isPast = startOfDay(selectedDate) < today;
  const originalWorkoutsCount = workoutsByDay[selectedDayKey]?.length ?? 0;
  const selectedWorkouts = useMemo(() => {
    const dayWorkouts = workoutsByDay[selectedDayKey] ?? [];
    return isPast ? dayWorkouts.filter((workout) => workout.status !== "planned" || workout.id.startsWith("workout-new-planned")) : dayWorkouts;
  }, [isPast, selectedDayKey, workoutsByDay]);
  const hasVisibleWorkouts = selectedWorkouts.length > 0;
  const shouldShowDayPlan = isToday || originalWorkoutsCount === 0;
  const shouldShowAddWorkout = !isPast && originalWorkoutsCount > 0;
  const shouldShowFloatingAddWorkout = shouldShowAddWorkout;
  const nextWorkoutMeta = useMemo(
    () => getNextWorkoutMeta(workoutsByDay[selectedDayKey] ?? [], selectedDate, now),
    [now, selectedDate, selectedDayKey, workoutsByDay]
  );

  const setFloatingAddVisible = useCallback(
    (visible: boolean) => {
      if (fabRevealTimer.current) {
        clearTimeout(fabRevealTimer.current);
        fabRevealTimer.current = undefined;
      }

      setFabHidden(!visible);
      Animated.timing(fabProgress, {
        toValue: visible ? 1 : 0,
        duration: reduceMotionEnabled ? 0 : 160,
        useNativeDriver: true
      }).start();
    },
    [fabProgress, reduceMotionEnabled]
  );

  const revealFloatingAddAfterScroll = useCallback(
    (delay = FAB_SCROLL_REVEAL_DELAY) => {
      if (!shouldShowFloatingAddWorkout) return;

      if (fabRevealTimer.current) {
        clearTimeout(fabRevealTimer.current);
      }

      fabRevealTimer.current = setTimeout(() => setFloatingAddVisible(true), delay);
    },
    [setFloatingAddVisible, shouldShowFloatingAddWorkout]
  );

  const hideFloatingAddForScroll = useCallback(() => {
    if (!shouldShowFloatingAddWorkout) return;
    setFloatingAddVisible(false);
  }, [setFloatingAddVisible, shouldShowFloatingAddWorkout]);

  useEffect(() => {
    if (!shouldShowFloatingAddWorkout) {
      setFloatingAddVisible(false);
      return;
    }

    setFloatingAddVisible(true);
  }, [setFloatingAddVisible, shouldShowFloatingAddWorkout]);

  useEffect(
    () => () => {
      if (fabRevealTimer.current) {
        clearTimeout(fabRevealTimer.current);
      }
    },
    []
  );

  const openWorkoutSession = async (workoutId: string) => {
    try {
      const session = await sessions.start(workoutId);

      router.push({
        pathname: "/sessions/[sessionId]",
        params: {
          sessionId: session.id
        }
      });
    } catch (error) {
      if (!isActiveSessionConflictError(error)) throw error;

      router.push({
        pathname: "/sessions/[sessionId]",
        params: {
          sessionId: error.activeSession.id
        }
      });
    }
  };

  const openExistingWorkoutSession = (workoutId?: string) => {
    if (!workoutId) return;
    void openWorkoutSession(workoutId);
  };

  const openWorkoutCard = (workout: TodayWorkout) => {
    if (workout.status === "completed" && workout.sessionId) {
      router.push({
        pathname: "/sessions/[sessionId]/summary",
        params: {
          sessionId: workout.sessionId,
          from: "home"
        }
      });
      return;
    }

    if (!workout.workoutId) return;
    router.push({ pathname: "/workouts/[workoutId]", params: { workoutId: workout.workoutId } });
  };

  const openPlanningChoice = async () => {
    const draft = await workoutActions.createDraft({
      startsAt: parseDateKey(selectedDayKey)?.toISOString()
    });

    router.push({
      pathname: "/workouts/client-select",
      params: { draftId: draft.id }
    });
  };

  const selectDay = (key: string) => {
    const nextDate = parseDateKey(key);
    if (nextDate) {
      setWeekAnchorDate(nextDate);
    }
    setSelectedDayKey(key);
  };

  const selectToday = () => {
    setWeekAnchorDate(today);
    setSelectedDayKey(todayKey);
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onMomentumScrollBegin={hideFloatingAddForScroll}
        onMomentumScrollEnd={() => revealFloatingAddAfterScroll(0)}
        onScrollBeginDrag={hideFloatingAddForScroll}
        onScrollEndDrag={() => revealFloatingAddAfterScroll()}
        {...scrollProps}
      >
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Header title="Тренировки" showSubtitle={false} size="xl" style={styles.header} />
            {!isToday ? (
              <Button label="Сегодня" type="secondaryNeutral" size="medium" style={styles.todayButton} onPress={selectToday} accessibilityLabel="Показать сегодняшний день" />
            ) : null}
          </View>

          <CalendarDayStrip weeks={weekPages} selectedKey={selectedDayKey} todayKey={todayKey} width="full" style={styles.calendarStrip} onSelect={selectDay} />

          <View style={styles.cards}>
            {shouldShowDayPlan ? (
              <Card
                variant="dayPlan"
                dayPlanState={originalWorkoutsCount === 0 && !isPast ? "planNext" : "plan"}
                dayTitle={`План ${formatRuDayMonth(selectedDate)}`}
                dayCount={getPlanCount(originalWorkoutsCount)}
                dayMeta={originalWorkoutsCount > 0 ? nextWorkoutMeta : ""}
                onAddWorkout={openPlanningChoice}
              />
            ) : null}

            {hasVisibleWorkouts
              ? selectedWorkouts.map((workout) => (
                  <Card
                    key={workout.id}
                    variant="workout"
                    workoutStatus={workout.status}
                    muscleGroup={workout.title}
                    clientName={workout.clientName}
                    workoutTime={workout.time}
                    exerciseCount={workout.exercisesCount}
                    completedExercises={workout.completedExercises}
                    totalExercises={workout.exercisesCount}
                    showAction={!isPast && workout.status !== "completed" && Boolean(workout.workoutId)}
                    showMenu={false}
                    onPress={() => openWorkoutCard(workout)}
                    onStart={() => openExistingWorkoutSession(workout.workoutId)}
                    onContinue={() => openExistingWorkoutSession(workout.workoutId)}
                  />
                ))
              : null}
          </View>
        </View>
      </ScrollView>

      {shouldShowFloatingAddWorkout ? (
        <Animated.View
          accessibilityElementsHidden={fabHidden}
          importantForAccessibility={fabHidden ? "no-hide-descendants" : "auto"}
          style={[
            styles.floatingAdd,
            {
              bottom: floatingAddBottom,
              opacity: fabProgress,
              pointerEvents: fabHidden ? "none" : "auto",
              transform: reduceMotionEnabled
                ? []
                : [
                    {
                      translateY: fabProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [theme.spacing.xl, 0]
                      })
                    },
                    {
                      scale: fabProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1]
                      })
                    }
                  ]
            }
          ]}
        >
          <FloatingAddWorkoutButton onPress={openPlanningChoice} />
        </Animated.View>
      ) : null}

    </View>
  );
}

function FloatingAddWorkoutButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityHint="Открывает планирование тренировки"
      accessibilityLabel="Добавить тренировку"
      accessibilityRole="button"
      hitSlop={FAB_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [styles.floatingAddButton, pressed && styles.floatingAddButtonPressed]}
    >
      <View pointerEvents="none" style={styles.floatingAddShadow} />
      <LiquidGlassView
        animated
        colorScheme="light"
        effect="regular"
        style={[styles.floatingAddGlass, !isLiquidGlassSupported && styles.floatingAddFallback]}
        tintColor={theme.colors.background.glass}
      >
        {!isLiquidGlassSupported ? <View style={styles.floatingAddOverlay} /> : null}
        <Icon name="add" size={theme.sizes.cardAddWorkoutIcon} color={theme.colors.content.ink} />
      </LiquidGlassView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.sizes.tabBarItemMinHeight + FLOATING_ADD_SIZE + theme.spacing["2xl"]
  },
  body: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  headerRow: {
    minHeight: theme.sizes.buttonSmHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  header: {
    flex: 1,
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing[0],
    paddingBottom: theme.spacing[0]
  },
  todayButton: {
    height: theme.sizes.buttonSmHeight,
    minHeight: theme.sizes.buttonSmHeight
  },
  cards: {
    gap: theme.spacing.md
  },
  calendarStrip: {
    alignSelf: "stretch"
  },
  floatingAdd: {
    position: "absolute",
    right: theme.spacing.lg,
    zIndex: 50
  },
  floatingAddButton: {
    position: "relative",
    width: FLOATING_ADD_SIZE,
    height: FLOATING_ADD_SIZE,
    borderRadius: theme.radius.pill,
    overflow: "visible",
    backgroundColor: theme.colors.background.canvasSoft
  },
  floatingAddShadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvasSoft,
    ...theme.shadows.glassAction
  },
  floatingAddButtonPressed: {
    opacity: 0.86
  },
  floatingAddGlass: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: theme.radius.pill
  },
  floatingAddFallback: {
    backgroundColor: theme.colors.background.glass
  },
  floatingAddOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.glassOverlay
  }
});
