import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollView } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable, { type SortableFlexDragEndParams } from "react-native-sortables";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Badge,
  Button,
  Divider,
  Icon,
  Loader,
  ListItemGym,
  Navigation,
  Select,
  SuperSet,
  Variant
} from "@/components/ui";
import { useClient, useExercises, useDataMutation, useWorkoutActions, useWorkoutDraft } from "@/data";
import { defaultWorkoutResultType } from "@/features/workouts/sessionResult";
import { formatPreviousSetValue, getLegacyValues } from "@/features/workouts/tracking";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";
import type { ApproachCountItem } from "@/components/ui";
import type { Workout } from "@/types";

type ApproachData = Record<string, ApproachCountItem[]>;
type WorkoutExercise = Workout["exercises"][number];
type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type DayExerciseIds = Partial<Record<RepeatDay, string[]>>;
type ScheduleTimes = Partial<Record<RepeatDay, string>>;
const EXERCISE_ROW_GAP = theme.spacing.xxs;
const EXERCISE_ROW_HEIGHT = theme.sizes.listItemGymSwipeMinHeight - EXERCISE_ROW_GAP;
const EXERCISE_SLOT_HEIGHT = theme.sizes.listItemGymSwipeMinHeight;
const EMPTY_EXERCISE_IDS: string[] = [];
const repeatDays: RepeatDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels: Record<RepeatDay, string> = {
  monday: "Пн",
  tuesday: "Вт",
  wednesday: "Ср",
  thursday: "Чт",
  friday: "Пт",
  saturday: "Сб",
  sunday: "Вс"
};
const repeatDayByNativeWeekday: Record<number, RepeatDay> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};
function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
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

function parseDateKey(value?: string) {
  if (!value) return startOfDay(new Date());

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(new Date());

  return startOfDay(new Date(year, month - 1, day));
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date) {
  const value = startOfDay(date);
  const nativeDay = value.getDay();
  const mondayOffset = nativeDay === 0 ? -6 : 1 - nativeDay;
  return addDays(value, mondayOffset);
}

function getFirstPlannedDateKey(anchorDate: Date, selectedDays: RepeatDay[]) {
  if (selectedDays.length === 0) return getDateKey(anchorDate);

  for (let offset = 0; offset < repeatDays.length; offset += 1) {
    const candidateDate = addDays(anchorDate, offset);
    const candidateDay = repeatDayByNativeWeekday[candidateDate.getDay()];
    if (selectedDays.includes(candidateDay)) return getDateKey(candidateDate);
  }

  return getDateKey(anchorDate);
}

function formatSetValues(sets: ApproachCountItem[]) {
  return sets.map((set, index) => ({
    id: set.id,
    label: `${set.reps ?? 0}×${set.weight ?? 0}${(set.unit ?? "кг").toLowerCase()}`
  }));
}

function formatWorkoutSetValues(exercise: Workout["exercises"][number]) {
  const resultType = exercise.resultType ?? defaultWorkoutResultType;
  return exercise.sets.map((set, index) => ({
    id: set.id,
    label: formatPreviousSetValue(resultType, getLegacyValues({
      values: set.values,
      weight: set.targetWeightKg,
      reps: set.targetReps,
      durationSeconds: set.targetDurationSeconds,
      distanceMeters: set.targetDistanceMeters
    })),
    index: index + 1
  }));
}

function getAdjacentConnectionIds(ids: string[]) {
  return ids.slice(0, -1).map((id, index) => `${id}:${ids[index + 1]}`);
}

function getSupersetGroupByExercise(ids: string[], connectionIds: string[]) {
  const connectionSet = new Set(connectionIds);
  const groupByExercise: Record<string, number> = {};
  let activeGroup: string[] = [];
  let groupIndex = 0;

  ids.forEach((id, index) => {
    const nextId = ids[index + 1];
    const hasNextConnection = Boolean(nextId && connectionSet.has(`${id}:${nextId}`));

    if (activeGroup.length === 0) {
      activeGroup = [id];
    }

    if (hasNextConnection && nextId) {
      activeGroup.push(nextId);
      return;
    }

    if (activeGroup.length > 1) {
      activeGroup.forEach((exerciseId) => {
        groupByExercise[exerciseId] = groupIndex;
      });
      groupIndex += 1;
    }

    activeGroup = [];
  });

  return groupByExercise;
}

function preserveSupersetConnectionsAfterReorder(currentIds: string[], nextIds: string[], connectionIds: string[]) {
  const groupByExercise = getSupersetGroupByExercise(currentIds, connectionIds);

  return nextIds.slice(0, -1).flatMap((id, index) => {
    const nextId = nextIds[index + 1];
    if (!nextId) return [];

    const group = groupByExercise[id];
    return group !== undefined && group === groupByExercise[nextId] ? [`${id}:${nextId}`] : [];
  });
}

function getMeasuredExerciseHeight(exerciseId: string, rowHeights: Record<string, number>) {
  return rowHeights[exerciseId] ?? EXERCISE_SLOT_HEIGHT;
}

function getExerciseLayoutRows(exercises: WorkoutExercise[], rowHeights: Record<string, number>) {
  let top = theme.spacing[0];

  const rows = exercises.map((exercise, index) => {
    const height = getMeasuredExerciseHeight(exercise.id, rowHeights);
    const row = {
      id: exercise.id,
      height,
      top,
      center: top + height / 2
    };
    top += height + (index < exercises.length - 1 ? EXERCISE_ROW_GAP : theme.spacing[0]);
    return row;
  });

  return { rows, height: top };
}

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

function triggerSelection() {
  if (Platform.OS === "web") return;
  void Haptics.selectionAsync().catch(() => undefined);
}

export default function NewWorkoutScreen() {
  const { draftId, activeDay } = useLocalSearchParams<{
    draftId?: string;
    activeDay?: string;
  }>();
  const draftIdValue = firstParam(draftId);
  const activeDayValue = firstParam(activeDay);
  const draftQuery = useWorkoutDraft(draftIdValue);
  const { draft } = draftQuery;
  const workouts = useWorkoutActions();
  const { client: selectedClient } = useClient(draft?.clientId);
  const selectedWorkoutDays = useMemo<RepeatDay[]>(() => (draft?.repeatDays && draft.repeatDays.length > 0 ? draft.repeatDays : ["monday"]), [draft?.repeatDays]);
  const selectedScheduleTimes = useMemo(() => draft?.scheduleTimes ?? {}, [draft?.scheduleTimes]);
  const initialActiveDay = repeatDays.includes(activeDayValue as RepeatDay) ? (activeDayValue as RepeatDay) : selectedWorkoutDays[0];
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<RepeatDay>(initialActiveDay);
  const [exerciseRowHeights, setExerciseRowHeights] = useState<Record<string, number>>({});
  const [exerciseListWidth, setExerciseListWidth] = useState<number | undefined>();
  const [exerciseDragging, setExerciseDragging] = useState(false);
  const { scrollProps } = useConditionalScroll({ disabled: exerciseDragging });
  const scrollableRef = useAnimatedRef<ScrollView>();
  const selectedExercises = useMemo(
    () =>
      (draft?.exercises ?? [])
        .filter((exercise) => exercise.day === activeWorkoutDay)
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    [activeWorkoutDay, draft?.exercises]
  );
  const exerciseLayout = useMemo(() => getExerciseLayoutRows(selectedExercises, exerciseRowHeights), [exerciseRowHeights, selectedExercises]);
  const exerciseItemHeights = useMemo(() => exerciseLayout.rows.map((row) => row.height), [exerciseLayout.rows]);
  const hasExercises = selectedExercises.length > 0;
  const activeDayHasTime = Boolean(selectedScheduleTimes[activeWorkoutDay]);
  const allSelectedDaysHaveTimes = selectedWorkoutDays.every((day) => Boolean(selectedScheduleTimes[day]));
  const allSelectedDaysHaveExercises = selectedWorkoutDays.every((day) => (draft?.exercises.filter((exercise) => exercise.day === day).length ?? 0) > 0);
  const selectedDayItems = useMemo(() => selectedWorkoutDays.map((day) => ({ key: day, label: dayLabels[day] })), [selectedWorkoutDays]);
  const activeDayIndex = selectedWorkoutDays.indexOf(activeWorkoutDay);
  const nextWorkoutDay = activeDayIndex >= 0 ? selectedWorkoutDays[activeDayIndex + 1] : undefined;
  const canUseFooterAction = nextWorkoutDay ? hasExercises && activeDayHasTime : allSelectedDaysHaveExercises && allSelectedDaysHaveTimes;
  const saveWorkoutAction = useCallback(async () => {
    if (!draftIdValue) return null;

    await workouts.updateDraft(draftIdValue, {
      clientId: draft?.clientId,
      repeatDays: selectedWorkoutDays,
      scheduleTimes: selectedScheduleTimes
    });
    return workouts.publishDraft(draftIdValue);
  }, [draft?.clientId, draftIdValue, selectedScheduleTimes, selectedWorkoutDays, workouts]);
  const saveWorkoutMutation = useDataMutation(saveWorkoutAction);
  const supersetConnections = useMemo(
    () =>
      selectedExercises.slice(0, -1).map((exercise, index) => ({
        id: `${exercise.id}:${selectedExercises[index + 1].id}`,
        selected: Boolean(exercise.supersetWithNext)
      })),
    [selectedExercises]
  );

  const toggleSupersetConnection = useCallback(
    (id: string) => {
      if (!draftIdValue) return;

      const [itemId] = id.split(":");
      const item = selectedExercises.find((exercise) => exercise.id === itemId);
      if (!item) return;

      void workouts.updateDraftExercise(draftIdValue, item.id, {
        supersetWithNext: !item.supersetWithNext
      });
    },
    [draftIdValue, selectedExercises, workouts]
  );

  useEffect(() => {
    const nextActiveDay = repeatDays.includes(activeDayValue as RepeatDay) && selectedWorkoutDays.includes(activeDayValue as RepeatDay)
      ? (activeDayValue as RepeatDay)
      : selectedWorkoutDays[0];

    setActiveWorkoutDay((current) => (selectedWorkoutDays.includes(current) ? current : nextActiveDay));
  }, [activeDayValue, selectedWorkoutDays]);

  useEffect(() => {
    setExerciseRowHeights({});
  }, [activeWorkoutDay]);

  const openExerciseSelection = useCallback(() => {
    if (!draftIdValue) return;

    router.push({
      pathname: "/workouts/exercises",
      params: {
        draftId: draftIdValue,
        day: activeWorkoutDay
      }
    });
  }, [activeWorkoutDay, draftIdValue]);

  const openScheduleEdit = useCallback(() => {
    if (!draftIdValue) return;

    router.push({
      pathname: "/workouts/schedule",
      params: {
        draftId: draftIdValue,
        returnTo: "workout-new"
      }
    });
  }, [draftIdValue]);

  const openSlotSelection = useCallback(
    (day: RepeatDay) => {
      if (!draftIdValue) return;

      router.push({
        pathname: "/workouts/slot-select",
        params: {
          draftId: draftIdValue,
          returnTo: "workout-new",
          slotDay: day
        }
      });
    },
    [draftIdValue]
  );

  const openExerciseApproach = useCallback(
    (item: WorkoutExercise) => {
      if (!draftIdValue) return;

      router.push({
        pathname: "/workouts/[exerciseId]/approach",
        params: {
          exerciseId: item.exerciseId,
          draftId: draftIdValue,
          exerciseItemId: item.id
        }
      });
    },
    [draftIdValue]
  );

  const removeExercise = useCallback(
    (itemId: string) => {
      if (draftIdValue) {
        void workouts.removeDraftExercise(draftIdValue, itemId);
      }
      setExerciseRowHeights((current) => {
        const { [itemId]: _removed, ...rest } = current;
        return rest;
      });
    },
    [draftIdValue, workouts]
  );

  const updateExerciseRowHeight = useCallback((exerciseId: string, height: number) => {
    const measuredHeight = Math.max(EXERCISE_ROW_HEIGHT, Math.round(height));

    setExerciseRowHeights((current) => {
      if (current[exerciseId] === measuredHeight) return current;
      return { ...current, [exerciseId]: measuredHeight };
    });
  }, []);

  const handleExerciseListLayout = useCallback((event: LayoutChangeEvent) => {
    setExerciseListWidth(Math.round(event.nativeEvent.layout.width));
  }, []);

  const handleExerciseDragEnd = useCallback(
    ({ order }: SortableFlexDragEndParams) => {
      setExerciseDragging(false);
      if (!draftIdValue) return;

      const nextExercises = order(selectedExercises);
      void workouts.reorderDraftExercises(draftIdValue, nextExercises.map((exercise) => exercise.id));
    },
    [draftIdValue, selectedExercises, workouts]
  );

  const handleExerciseDragStart = useCallback(() => {
    setExerciseDragging(true);
    triggerImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleExerciseOrderChange = useCallback(() => {
    triggerSelection();
  }, []);

  const handleExerciseDrop = useCallback(() => {
    setExerciseDragging(false);
    triggerImpact(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const goToNextDay = useCallback(() => {
    if (!nextWorkoutDay) return;

    setActiveWorkoutDay(nextWorkoutDay);
    setExerciseRowHeights({});
    router.setParams({ activeDay: nextWorkoutDay });
  }, [nextWorkoutDay]);

  const saveWorkout = useCallback(async () => {
    if (!draftIdValue || saveWorkoutMutation.isSubmitting) return;

    const savedWorkout = await saveWorkoutMutation.mutate().catch(() => null);
    if (!savedWorkout) return;
    router.dismissTo("/");
  }, [draftIdValue, saveWorkoutMutation]);

  const handleFooterPress = () => {
    if (nextWorkoutDay) {
      goToNextDay();
      return;
    }

    saveWorkout();
  };

  const renderExercise = useCallback(
    (item: WorkoutExercise) => {
      const itemSetValues = formatWorkoutSetValues(item);

      return (
        <MeasuredExerciseRow
          exerciseId={item.id}
          onHeightChange={updateExerciseRowHeight}
        >
        <ListItemGym
          title={item.exerciseName}
          mode="move"
          width="fill"
          setVariant={item.sets.length > 0 ? "set" : "new"}
          setValues={item.sets.length > 0 ? itemSetValues : undefined}
          onPress={item.sets.length > 0 ? () => openExerciseApproach(item) : undefined}
          suppressPressedStyle
          onAddSetPress={() => openExerciseApproach(item)}
          onDelete={() => removeExercise(item.id)}
          style={styles.exerciseCard}
          trailingSlot={
            <Sortable.Handle>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dragHandle}>
                <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.mute} />
              </View>
            </Sortable.Handle>
          }
        />
        </MeasuredExerciseRow>
      );
    },
    [openExerciseApproach, removeExercise, updateExerciseRowHeight]
  );

  if (draftQuery.isLoading) {
    return <WorkoutDraftState title="Загружаем черновик" loading />;
  }

  if (draftQuery.error) {
    return <WorkoutDraftState title="Не удалось загрузить черновик" description={draftQuery.error.message} actionLabel="Повторить" onAction={draftQuery.retry} />;
  }

  if (!draftIdValue || draftQuery.notFound || !draft) {
    return <WorkoutDraftState title="Черновик не найден" description="Вернитесь к планированию и создайте тренировку заново." />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Создание тренировки" onBack={() => router.back()} />

      <View style={styles.daySelectorHeader}>
        <View style={styles.daySelectorTitleRow}>
          <Text style={styles.daySelectorTitle}>Дни тренировок</Text>
          <Button
            type="secondaryNeutral"
            size="smallIcon"
            accessibilityLabel="Редактировать дни тренировок"
            icon={<Icon name="edit" size={theme.sizes.buttonIconSmall} color={theme.colors.content.ink} />}
            onPress={openScheduleEdit}
          />
        </View>
        <Variant<RepeatDay>
          label="Дни тренировок"
          items={selectedDayItems}
          value={activeWorkoutDay}
          columns={selectedWorkoutDays.length}
          width="fill"
          showLabel={false}
          style={styles.daySelectorVariant}
          onChange={(day) => {
            setActiveWorkoutDay(day);
            setExerciseRowHeights({});
            router.setParams({ activeDay: day });
          }}
        />
        {!activeDayHasTime ? (
          <View style={styles.timeFallback}>
            <Select
              label="Время"
              placeholder="Выбери время"
              value={selectedScheduleTimes[activeWorkoutDay]}
              width="fill"
              showMessage={false}
              inset="none"
              onPress={() => openSlotSelection(activeWorkoutDay)}
            />
          </View>
        ) : null}
      </View>

      <Divider width="fill" tone="canvasSoft" />
      <Animated.ScrollView
        ref={scrollableRef as never}
        contentContainerStyle={styles.content}
        {...scrollProps}
      >
        {hasExercises ? (
          <View style={styles.exerciseSection}>
            <ExerciseSectionHeader count={selectedExercises.length} />
            <View style={styles.selectedBody}>
              {selectedExercises.length >= 2 ? (
                <SuperSet
                  itemCount={selectedExercises.length}
                  rowHeights={exerciseItemHeights}
                  rowGap={EXERCISE_ROW_GAP}
                  segments={supersetConnections}
                  style={styles.superSetOverlay}
                  onSegmentPress={toggleSupersetConnection}
                />
              ) : null}
              <View style={styles.selectedList}>
                <View onLayout={handleExerciseListLayout} style={styles.selectedListClip}>
                  <Sortable.Flex
                    activationAnimationDuration={80}
                    activeItemScale={1}
                    activeItemShadowOpacity={0.12}
                    customHandle
                    dropAnimationDuration={100}
                    flexDirection="column"
                    gap={EXERCISE_ROW_GAP}
                    inactiveItemOpacity={1}
                    inactiveItemScale={1}
                    itemEntering={null}
                    itemExiting={null}
                    itemsLayoutTransitionMode="reorder"
                    maxWidth={exerciseListWidth}
                    minWidth={exerciseListWidth ?? theme.spacing[0]}
                    overDrag="none"
                    overflow="hidden"
                    scrollableRef={scrollableRef}
                    strategy="insert"
                    width={exerciseListWidth ?? "fill"}
                    onActiveItemDropped={handleExerciseDrop}
                    onDragEnd={handleExerciseDragEnd}
                    onDragStart={handleExerciseDragStart}
                    onOrderChange={handleExerciseOrderChange}
                  >
                    {selectedExercises.map((item) => (
                      <View key={item.id} style={[styles.sortableRowSlot, exerciseListWidth ? { width: exerciseListWidth } : undefined]}>
                        {renderExercise(item)}
                      </View>
                    ))}
                  </Sortable.Flex>
                </View>
              </View>
            </View>
            <View style={styles.addAction}>
              <Button
                label="Добавить"
                type="secondaryNeutral"
                size="large"
                width="fill"
                onPress={openExerciseSelection}
              />
            </View>
          </View>
        ) : (
          <View style={styles.exerciseSection}>
            <ExerciseSectionHeader count={selectedExercises.length} />
            <View style={styles.emptyState}>
              <Icon name="muscle arms" size={theme.sizes.approachHeaderThumb + theme.spacing["3xl"]} color={theme.colors.status.negativeDarkest} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Упражнений ещё нет</Text>
                <Text style={styles.emptyDescription}>Добавьте новое, чтобы создать тренировку</Text>
              </View>
              <Button label="Добавить" type="secondaryNeutral" size="large" onPress={openExerciseSelection} />
            </View>
          </View>
        )}
        {saveWorkoutMutation.error ? (
          <View style={styles.inlineAlert}>
            <Alert
              tone="negative"
              layout="expanded"
              title="Тренировка не сохранена"
              description={saveWorkoutMutation.error.message}
              width="fill"
            />
          </View>
        ) : null}
      </Animated.ScrollView>

      <View style={styles.footer}>
        <Button
          label={nextWorkoutDay ? "Следующий день" : "Сохранить и запланировать"}
          type="primary"
          size="large"
          width="fill"
          state={saveWorkoutMutation.isSubmitting ? "loading" : canUseFooterAction ? "active" : "disabled"}
          onPress={handleFooterPress}
        />
      </View>
    </SafeAreaView>
  );
}

function ExerciseSectionHeader({ count }: { count: number }) {
  return (
    <View style={styles.exerciseHeader}>
      <Text style={styles.exerciseHeaderTitle}>Упражнения</Text>
      {count > 0 ? <Badge label={String(count)} tone="neutral" size="s" icon={false} /> : null}
    </View>
  );
}

function WorkoutDraftState({
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
      <Navigation title="Создание тренировки" onBack={() => router.back()} />
      <View style={styles.screenState}>
        {loading ? <Loader size="medium" tone="brand" /> : null}
        <Text style={styles.screenStateTitle}>{title}</Text>
        {description ? <Text style={styles.screenStateCopy}>{description}</Text> : null}
        {actionLabel && onAction ? <Button label={actionLabel} type="secondary" size="large" width="fill" onPress={onAction} /> : null}
      </View>
    </SafeAreaView>
  );
}

function MeasuredExerciseRow({
  children,
  exerciseId,
  onHeightChange
}: {
  children: ReactNode;
  exerciseId: string;
  onHeightChange: (exerciseId: string, height: number) => void;
}) {
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeightChange(exerciseId, event.nativeEvent.layout.height || theme.sizes.listItemGymSwipeMinHeight);
    },
    [exerciseId, onHeightChange]
  );

  return (
    <View collapsable={false} onLayout={handleLayout} style={styles.exerciseRow}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1
  },
  daySelectorHeader: {
    backgroundColor: theme.colors.background.canvas
  },
  daySelectorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm
  },
  daySelectorTitle: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  daySelectorVariant: {
    paddingBottom: theme.spacing.lg
  },
  timeFallback: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  emptyState: {
    flex: 1,
    minHeight: theme.spacing["3xl"] * 6,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg
  },
  emptyCopy: {
    gap: theme.spacing.xs,
    alignItems: "center"
  },
  emptyTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  emptyDescription: {
    ...theme.typography.body.md,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  exerciseSection: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  exerciseHeaderTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  selectedBody: {
    position: "relative",
    paddingLeft: theme.spacing.sm,
    overflow: "hidden"
  },
  superSetOverlay: {
    position: "absolute",
    top: theme.spacing[0],
    left: theme.spacing.sm,
    zIndex: 1
  },
  selectedList: {
    minWidth: theme.spacing[0],
    marginLeft: theme.sizes.superSetWidth,
    paddingRight: theme.spacing.sm,
    alignSelf: "stretch"
  },
  selectedListClip: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden"
  },
  sortableRowSlot: {
    width: "100%",
    alignSelf: "stretch"
  },
  exerciseRow: {
    width: "100%",
    minHeight: EXERCISE_ROW_HEIGHT,
    overflow: "hidden"
  },
  exerciseCard: {
    minHeight: EXERCISE_ROW_HEIGHT
  },
  dragHandle: {
    width: theme.spacing.xl,
    height: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center"
  },
  addAction: {
    padding: theme.spacing.lg
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  inlineAlert: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg
  },
  screenState: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  screenStateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  screenStateCopy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  },
  modalBody: {
    gap: theme.spacing[0]
  }
});
