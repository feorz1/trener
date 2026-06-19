import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollView } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable, { type SortableFlexDragEndParams } from "react-native-sortables";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  Divider,
  Header,
  Icon,
  ListItemGym,
  Navigation,
  Select,
  SuperSet,
  Variant
} from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { mockExercises } from "@/data/mockExercises";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";
import type { ApproachCountItem } from "@/components/ui";

type ApproachData = Record<string, ApproachCountItem[]>;
type WorkoutExercise = (typeof mockExercises)[number];
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

function parseIds(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

function parseDays(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return [];
  const daySet = new Set(repeatDays);
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is RepeatDay => daySet.has(item as RepeatDay));
}

function parseDayExerciseIds(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([day, ids]) => {
        if (!repeatDays.includes(day as RepeatDay) || !Array.isArray(ids)) return [];
        return [[day, ids.filter((id): id is string => typeof id === "string")]];
      })
    ) as DayExerciseIds;
  } catch {
    return {};
  }
}

function serializeDayExerciseIds(data: DayExerciseIds) {
  const entries = Object.entries(data).filter(([, ids]) => Array.isArray(ids) && ids.length > 0);
  if (entries.length === 0) return undefined;
  return encodeURIComponent(JSON.stringify(Object.fromEntries(entries)));
}

function parseScheduleTimes(value?: string | string[]): ScheduleTimes {
  const raw = firstParam(value);
  if (!raw) return {};

  try {
    return JSON.parse(decodeURIComponent(raw)) as ScheduleTimes;
  } catch {
    return {};
  }
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

function getApproachDataKey(day: RepeatDay, exerciseId: string) {
  return `${day}:${exerciseId}`;
}

function parseApproachData(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return {};

  try {
    return JSON.parse(decodeURIComponent(raw)) as ApproachData;
  } catch {
    try {
      return JSON.parse(raw) as ApproachData;
    } catch {
      return {};
    }
  }
}

function serializeApproachData(data: ApproachData) {
  const entries = Object.entries(data).filter(([, sets]) => sets.length > 0);
  if (entries.length === 0) return undefined;
  return encodeURIComponent(JSON.stringify(Object.fromEntries(entries)));
}

function formatSetValues(sets: ApproachCountItem[]) {
  return sets.map((set, index) => ({
    id: set.id,
    label: `${set.reps ?? 0}×${set.weight ?? 0}${(set.unit ?? "кг").toLowerCase()}`
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
  const { clientId, clientName, date, selectedDays, scheduleTimes, activeDay, dayExerciseIds, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    selectedDays?: string;
    scheduleTimes?: string;
    activeDay?: string;
    dayExerciseIds?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const clientIdValue = firstParam(clientId);
  const clientNameValue = firstParam(clientName);
  const dateValue = firstParam(date);
  const selectedDaysValue = firstParam(selectedDays);
  const scheduleTimesValue = firstParam(scheduleTimes);
  const activeDayValue = firstParam(activeDay);
  const dayExerciseIdsValue = firstParam(dayExerciseIds);
  const exerciseIdsValue = firstParam(exerciseIds);
  const supersetConnectionIdsValue = firstParam(supersetConnectionIds);
  const approachDataValue = firstParam(approachData);
  const initialClientId = clientIdValue;
  const selectedExerciseIds = useMemo(() => parseIds(exerciseIdsValue), [exerciseIdsValue]);
  const selectedWorkoutDays = useMemo<RepeatDay[]>(() => {
    const parsedDays = parseDays(selectedDaysValue);
    return parsedDays.length > 0 ? parsedDays : ["monday"];
  }, [selectedDaysValue]);
  const selectedWorkoutDaysKey = selectedWorkoutDays.join(",");
  const selectedScheduleTimes = useMemo(() => parseScheduleTimes(scheduleTimesValue), [scheduleTimesValue]);
  const dayExerciseIdsFromParams = useMemo(() => parseDayExerciseIds(dayExerciseIdsValue), [dayExerciseIdsValue]);
  const initialActiveDay = repeatDays.includes(activeDayValue as RepeatDay) ? (activeDayValue as RepeatDay) : selectedWorkoutDays[0];
  const [activeWorkoutDay, setActiveWorkoutDay] = useState<RepeatDay>(initialActiveDay);
  const [localDayExerciseIds, setLocalDayExerciseIds] = useState<DayExerciseIds>(() => ({
    ...dayExerciseIdsFromParams,
    [initialActiveDay]: dayExerciseIdsFromParams[initialActiveDay] ?? selectedExerciseIds
  }));
  const activeDayExerciseIds = localDayExerciseIds[activeWorkoutDay] ?? EMPTY_EXERCISE_IDS;
  const selectedSupersetConnectionIds = useMemo(() => parseIds(supersetConnectionIdsValue), [supersetConnectionIdsValue]);
  const selectedApproachData = useMemo(() => parseApproachData(approachDataValue), [approachDataValue]);
  const selectedExerciseKey = activeDayExerciseIds.join(",");
  const selectedSupersetConnectionKey = selectedSupersetConnectionIds.join(",");
  const [orderedExerciseIds, setOrderedExerciseIds] = useState<string[]>(activeDayExerciseIds);
  const [localSupersetConnectionIds, setLocalSupersetConnectionIds] = useState<string[]>(selectedSupersetConnectionIds);
  const [localApproachData, setLocalApproachData] = useState<ApproachData>(selectedApproachData);
  const [exerciseRowHeights, setExerciseRowHeights] = useState<Record<string, number>>({});
  const [exerciseListWidth, setExerciseListWidth] = useState<number | undefined>();
  const [exerciseDragging, setExerciseDragging] = useState(false);
  const { scrollProps } = useConditionalScroll({ disabled: exerciseDragging });
  const scrollableRef = useAnimatedRef<ScrollView>();
  const selectedExercises = useMemo(
    () => orderedExerciseIds.flatMap((id) => mockExercises.find((exercise) => exercise.id === id) ?? []),
    [orderedExerciseIds]
  );
  const exerciseLayout = useMemo(() => getExerciseLayoutRows(selectedExercises, exerciseRowHeights), [exerciseRowHeights, selectedExercises]);
  const exerciseItemHeights = useMemo(() => exerciseLayout.rows.map((row) => row.height), [exerciseLayout.rows]);
  const selectedClientId = initialClientId;
  const selectedClient = mockClients.find((client) => client.id === selectedClientId);
  const selectedClientName = selectedClient?.name ?? clientNameValue;
  const hasExercises = selectedExercises.length > 0;
  const activeDayHasTime = Boolean(selectedScheduleTimes[activeWorkoutDay]);
  const allSelectedDaysHaveTimes = selectedWorkoutDays.every((day) => Boolean(selectedScheduleTimes[day]));
  const allSelectedDaysHaveExercises = selectedWorkoutDays.every((day) => {
    const exerciseIdsForDay = day === activeWorkoutDay ? orderedExerciseIds : (localDayExerciseIds[day] ?? EMPTY_EXERCISE_IDS);
    return exerciseIdsForDay.length > 0;
  });
  const selectedDayItems = useMemo(() => selectedWorkoutDays.map((day) => ({ key: day, label: dayLabels[day] })), [selectedWorkoutDays]);
  const activeDayIndex = selectedWorkoutDays.indexOf(activeWorkoutDay);
  const nextWorkoutDay = activeDayIndex >= 0 ? selectedWorkoutDays[activeDayIndex + 1] : undefined;
  const canUseFooterAction = nextWorkoutDay ? hasExercises && activeDayHasTime : allSelectedDaysHaveExercises && allSelectedDaysHaveTimes;
  const supersetConnections = useMemo(
    () =>
      selectedExercises.slice(0, -1).map((exercise, index) => {
        const nextExercise = selectedExercises[index + 1];
        const id = `${exercise.id}:${nextExercise.id}`;

        return { id, selected: localSupersetConnectionIds.includes(id) };
      }),
    [localSupersetConnectionIds, selectedExercises]
  );

  useEffect(() => {
    const nextActiveDay = repeatDays.includes(activeDayValue as RepeatDay) && selectedWorkoutDays.includes(activeDayValue as RepeatDay)
      ? (activeDayValue as RepeatDay)
      : selectedWorkoutDays[0];

    setActiveWorkoutDay((current) => (selectedWorkoutDays.includes(current) ? nextActiveDay : selectedWorkoutDays[0]));
    setLocalDayExerciseIds((current) => {
      const merged = { ...current, ...dayExerciseIdsFromParams };
      return Object.fromEntries(Object.entries(merged).filter(([day]) => selectedWorkoutDays.includes(day as RepeatDay))) as DayExerciseIds;
    });
  }, [activeDayValue, dayExerciseIdsFromParams, selectedWorkoutDays, selectedWorkoutDaysKey]);

  useEffect(() => {
    setOrderedExerciseIds(activeDayExerciseIds);
    setExerciseRowHeights({});
    setLocalSupersetConnectionIds((current) => {
      const validIds = getAdjacentConnectionIds(activeDayExerciseIds);
      const sourceIds = selectedSupersetConnectionIds.length > 0 ? selectedSupersetConnectionIds : current;

      return sourceIds.filter((id) => validIds.includes(id));
    });
    setLocalApproachData(selectedApproachData);
  }, [activeDayExerciseIds, selectedApproachData, selectedExerciseKey, selectedSupersetConnectionKey]);

  const getSyncedDayExerciseIds = useCallback(
    (nextExerciseIds = orderedExerciseIds) => ({
      ...localDayExerciseIds,
      [activeWorkoutDay]: nextExerciseIds
    }),
    [activeWorkoutDay, localDayExerciseIds, orderedExerciseIds]
  );

  const getSharedParams = useCallback(
    (nextExerciseIds = orderedExerciseIds, nextDayExerciseIds = getSyncedDayExerciseIds(nextExerciseIds)) => {
      const serializedApproachData = serializeApproachData(localApproachData);
      const serializedDayExerciseIds = serializeDayExerciseIds(nextDayExerciseIds);

      return {
        ...(selectedClientId ? { clientId: selectedClientId } : {}),
        ...(selectedClientName ? { clientName: selectedClientName } : {}),
        ...(dateValue ? { date: dateValue } : {}),
        selectedDays: selectedWorkoutDays.join(","),
        ...(scheduleTimesValue ? { scheduleTimes: scheduleTimesValue } : {}),
        activeDay: activeWorkoutDay,
        ...(nextExerciseIds.length > 0 ? { exerciseIds: nextExerciseIds.join(",") } : {}),
        ...(serializedDayExerciseIds ? { dayExerciseIds: serializedDayExerciseIds } : {}),
        ...(localSupersetConnectionIds.length > 0 ? { supersetConnectionIds: localSupersetConnectionIds.join(",") } : {}),
        ...(serializedApproachData ? { approachData: serializedApproachData } : {})
      };
    },
    [
      activeWorkoutDay,
      dateValue,
      getSyncedDayExerciseIds,
      localApproachData,
      localSupersetConnectionIds,
      orderedExerciseIds,
      scheduleTimesValue,
      selectedClientId,
      selectedClientName,
      selectedWorkoutDays
    ]
  );

  const openExerciseSelection = useCallback(() => {
    router.push({
      pathname: "/workouts/exercises",
      params: {
        mode: "workout-draft",
        ...getSharedParams()
      }
    });
  }, [getSharedParams]);

  const openDayEdit = useCallback(() => {
    router.push({
      pathname: "/workouts/day-edit",
      params: getSharedParams()
    });
  }, [getSharedParams]);

  const openSlotSelection = useCallback(
    (day: RepeatDay) => {
      router.push({
        pathname: "/workouts/slot-select",
        params: {
          ...getSharedParams(),
          returnTo: "workout-new",
          slotDay: day
        }
      });
    },
    [getSharedParams]
  );

  const openExerciseApproach = useCallback(
    (exerciseId: string) => {
      const serializedApproachData = serializeApproachData(localApproachData);

      router.push({
        pathname: "/workouts/[exerciseId]/approach",
        params: {
          exerciseId,
          ...getSharedParams(),
          ...(serializedApproachData ? { approachData: serializedApproachData } : {})
        }
      });
    },
    [getSharedParams, localApproachData]
  );

  const removeExercise = useCallback((exerciseId: string) => {
    setOrderedExerciseIds((currentIds) => {
      const nextIds = currentIds.filter((id) => id !== exerciseId);

      setLocalDayExerciseIds((current) => ({ ...current, [activeWorkoutDay]: nextIds }));
      setLocalSupersetConnectionIds((currentConnectionIds) => {
        const validConnectionIds = getAdjacentConnectionIds(nextIds);
        return currentConnectionIds.filter((id) => validConnectionIds.includes(id));
      });
      setLocalApproachData((current) => {
        const { [getApproachDataKey(activeWorkoutDay, exerciseId)]: _removed, ...rest } = current;
        return rest;
      });

      return nextIds;
    });
    setExerciseRowHeights((current) => {
      const { [exerciseId]: _removed, ...rest } = current;
      return rest;
    });
  }, [activeWorkoutDay]);

  const toggleSupersetConnection = useCallback((id: string) => {
    setLocalSupersetConnectionIds((current) => (current.includes(id) ? current.filter((connectionId) => connectionId !== id) : [...current, id]));
  }, []);

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

  const handleExerciseDragEnd = useCallback(({ order }: SortableFlexDragEndParams) => {
    setExerciseDragging(false);
    setOrderedExerciseIds((currentIds) => {
      const nextIds = order(currentIds);
      setLocalSupersetConnectionIds((current) => preserveSupersetConnectionsAfterReorder(currentIds, nextIds, current));
      setLocalDayExerciseIds((current) => ({ ...current, [activeWorkoutDay]: nextIds }));
      return nextIds;
    });
  }, [activeWorkoutDay]);

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

    const nextDayExerciseIds = getSyncedDayExerciseIds();
    setLocalDayExerciseIds(nextDayExerciseIds);
    setActiveWorkoutDay(nextWorkoutDay);
    setOrderedExerciseIds(nextDayExerciseIds[nextWorkoutDay] ?? []);
    setExerciseRowHeights({});
    router.setParams({
      activeDay: nextWorkoutDay,
      dayExerciseIds: serializeDayExerciseIds(nextDayExerciseIds)
    });
  }, [getSyncedDayExerciseIds, nextWorkoutDay]);

  const saveWorkout = useCallback(() => {
    const nextDayExerciseIds = getSyncedDayExerciseIds();
    const plannedAnchorDate = parseDateKey(dateValue);
    const firstPlannedDate = getFirstPlannedDateKey(plannedAnchorDate, selectedWorkoutDays);
    const plannedExerciseCounts = Object.fromEntries(selectedWorkoutDays.map((day) => [day, nextDayExerciseIds[day]?.length ?? 0]));
    const plannedExerciseCount = Math.max(...Object.values(plannedExerciseCounts), orderedExerciseIds.length, 0);
    const firstScheduledTime = selectedWorkoutDays.map((day) => selectedScheduleTimes[day]).find(Boolean);

    router.dismissTo({
      pathname: "/",
      params: {
        plannedWorkout: "1",
        plannedDate: firstPlannedDate,
        plannedClientName: selectedClientName ?? "Константин",
        plannedExerciseCount: String(plannedExerciseCount || 1),
        plannedExerciseCounts: encodeURIComponent(JSON.stringify(plannedExerciseCounts)),
        plannedRepeatDays: selectedWorkoutDays.join(","),
        ...(firstScheduledTime ? { plannedTime: firstScheduledTime } : {}),
        plannedScheduleTimes: encodeURIComponent(JSON.stringify(selectedScheduleTimes))
      }
    });
  }, [dateValue, getSyncedDayExerciseIds, orderedExerciseIds.length, selectedClientName, selectedScheduleTimes, selectedWorkoutDays]);

  const handleFooterPress = () => {
    if (nextWorkoutDay) {
      goToNextDay();
      return;
    }

    saveWorkout();
  };

  const renderExercise = useCallback(
    (item: WorkoutExercise) => {
      const approachDataKey = getApproachDataKey(activeWorkoutDay, item.id);
      const itemApproachData = localApproachData[approachDataKey];

      return (
        <MeasuredExerciseRow
          exerciseId={item.id}
          onHeightChange={updateExerciseRowHeight}
        >
        <ListItemGym
          title={item.name}
          mode="move"
          width="fill"
          setVariant={itemApproachData?.length > 0 ? "set" : "new"}
          setValues={itemApproachData ? formatSetValues(itemApproachData) : undefined}
          onPress={itemApproachData?.length > 0 ? () => openExerciseApproach(item.id) : undefined}
          suppressPressedStyle
          onAddSetPress={() => openExerciseApproach(item.id)}
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
    [activeWorkoutDay, localApproachData, openExerciseApproach, removeExercise, updateExerciseRowHeight]
  );

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
            onPress={openDayEdit}
          />
        </View>
        <Variant<RepeatDay>
          label="Дни тренировок"
          items={selectedDayItems}
          value={activeWorkoutDay}
          columns={selectedWorkoutDays.length}
          width="fill"
          showLabel={false}
          onChange={(day) => {
            const nextDayExerciseIds = getSyncedDayExerciseIds();
            setLocalDayExerciseIds(nextDayExerciseIds);
            setActiveWorkoutDay(day);
            setOrderedExerciseIds(nextDayExerciseIds[day] ?? []);
            setExerciseRowHeights({});
            router.setParams({
              activeDay: day,
              dayExerciseIds: serializeDayExerciseIds(nextDayExerciseIds)
            });
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
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseHeaderTitle}>Упражнения</Text>
              <Badge label={String(selectedExercises.length)} tone="neutral" size="s" icon={false} />
            </View>
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
          <View style={styles.exercises}>
            <Header title="Упражнения" size="lg" showSubtitle={false} style={styles.sectionHeader} />
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
      </Animated.ScrollView>

      <View style={styles.footer}>
        <Button
          label={nextWorkoutDay ? "Следующий день" : "Сохранить и запланировать"}
          type="primary"
          size="large"
          width="fill"
          state={canUseFooterAction ? "active" : "disabled"}
          onPress={handleFooterPress}
        />
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
  timeFallback: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  exercises: {
    flex: 1,
    alignItems: "center",
    paddingBottom: theme.spacing["3xl"]
  },
  sectionHeader: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
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
  modalBody: {
    gap: theme.spacing[0]
  }
});
