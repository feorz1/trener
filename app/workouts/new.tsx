import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing as ReanimatedEasing,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import Sortable, { type SortableGridDragEndParams, type SortableGridRenderItemInfo } from "react-native-sortables";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  Divider,
  Header,
  Icon,
  ListItemCell,
  ListItemGym,
  Modal,
  Navigation,
  Radio,
  Select,
  SuperSet
} from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { mockExercises } from "@/data/mockExercises";
import { theme } from "@/theme";
import type { ApproachCountItem } from "@/components/ui";

type ApproachData = Record<string, ApproachCountItem[]>;
type WorkoutExercise = (typeof mockExercises)[number];
const DRAG_HANDLE_DELAY_MS = 120;
const EXERCISE_REORDER_MS = 160;
const EXERCISE_REMOVE_COLLAPSE_MS = 140;
const EXERCISE_REMOVE_TIMING_CONFIG = {
  duration: EXERCISE_REMOVE_COLLAPSE_MS,
  easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
};
const EXERCISE_LAYOUT_TRANSITION = LinearTransition.duration(EXERCISE_REMOVE_COLLAPSE_MS).easing(
  ReanimatedEasing.out(ReanimatedEasing.cubic)
);

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseIds(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
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

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

export default function NewWorkoutScreen() {
  const { clientId, clientName, date, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const initialClientId = firstParam(clientId);
  const selectedExerciseIds = useMemo(() => parseIds(exerciseIds), [exerciseIds]);
  const selectedSupersetConnectionIds = useMemo(() => parseIds(supersetConnectionIds), [supersetConnectionIds]);
  const selectedApproachData = useMemo(() => parseApproachData(approachData), [approachData]);
  const selectedExerciseKey = selectedExerciseIds.join(",");
  const selectedSupersetConnectionKey = selectedSupersetConnectionIds.join(",");
  const [orderedExerciseIds, setOrderedExerciseIds] = useState<string[]>(selectedExerciseIds);
  const [localSupersetConnectionIds, setLocalSupersetConnectionIds] = useState<string[]>(selectedSupersetConnectionIds);
  const [localApproachData, setLocalApproachData] = useState<ApproachData>(selectedApproachData);
  const [exerciseRowHeights, setExerciseRowHeights] = useState<Record<string, number>>({});
  const [deleteCommitExerciseIds, setDeleteCommitExerciseIds] = useState<string[]>([]);
  const [collapsingExerciseIds, setCollapsingExerciseIds] = useState<string[]>([]);
  const orderedExerciseIdsRef = useRef(selectedExerciseIds);
  const selectedExercises = useMemo(
    () => orderedExerciseIds.flatMap((id) => mockExercises.find((exercise) => exercise.id === id) ?? []),
    [orderedExerciseIds]
  );
  const collapsingExerciseIdSet = useMemo(() => new Set(collapsingExerciseIds), [collapsingExerciseIds]);
  const visibleExercises = useMemo(
    () => selectedExercises.filter((exercise) => !collapsingExerciseIdSet.has(exercise.id)),
    [collapsingExerciseIdSet, selectedExercises]
  );
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialClientId);
  const [pendingClientId, setPendingClientId] = useState<string | undefined>(initialClientId);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const selectedClient = mockClients.find((client) => client.id === selectedClientId);
  const selectedClientName = selectedClient?.name ?? firstParam(clientName);
  const hasExercises = selectedExercises.length > 0;
  const isExerciseRemovalActive = deleteCommitExerciseIds.length > 0 || collapsingExerciseIds.length > 0;
  const supersetConnections = useMemo(
    () =>
      visibleExercises.slice(0, -1).map((exercise, index) => {
        const nextExercise = visibleExercises[index + 1];
        const id = `${exercise.id}:${nextExercise.id}`;

        return { id, selected: localSupersetConnectionIds.includes(id) };
      }),
    [localSupersetConnectionIds, visibleExercises]
  );

  useEffect(() => {
    setOrderedExerciseIds(selectedExerciseIds);
    setDeleteCommitExerciseIds([]);
    setCollapsingExerciseIds([]);
    setLocalSupersetConnectionIds((current) => {
      const validIds = getAdjacentConnectionIds(selectedExerciseIds);
      const sourceIds = selectedSupersetConnectionIds.length > 0 ? selectedSupersetConnectionIds : current;

      return sourceIds.filter((id) => validIds.includes(id));
    });
    setLocalApproachData(selectedApproachData);
  }, [selectedApproachData, selectedExerciseKey, selectedSupersetConnectionKey]);

  useEffect(() => {
    orderedExerciseIdsRef.current = orderedExerciseIds;
  }, [orderedExerciseIds]);

  const openClientModal = () => {
    setPendingClientId(selectedClientId);
    setClientModalVisible(true);
  };

  const closeClientModal = () => {
    setClientModalVisible(false);
  };

  const saveClientSelection = () => {
    if (!pendingClientId) return;

    setSelectedClientId(pendingClientId);
    router.setParams({ clientId: pendingClientId });
    setClientModalVisible(false);
  };

  const openNewClient = useCallback(() => {
    const serializedApproachData = serializeApproachData(localApproachData);

    setClientModalVisible(false);
    router.push({
      pathname: "/clients/new",
      params: {
        returnTo: "/workouts/new",
        ...(date ? { date } : {}),
        ...(orderedExerciseIds.length > 0 ? { exerciseIds: orderedExerciseIds.join(",") } : {}),
        ...(localSupersetConnectionIds.length > 0 ? { supersetConnectionIds: localSupersetConnectionIds.join(",") } : {}),
        ...(serializedApproachData ? { approachData: serializedApproachData } : {})
      }
    });
  }, [date, localApproachData, localSupersetConnectionIds, orderedExerciseIds]);

  const openExerciseSelection = useCallback(() => {
    const serializedApproachData = serializeApproachData(localApproachData);

    router.push({
      pathname: "/workouts/exercises",
      params: {
        ...(selectedClientId ? { clientId: selectedClientId } : {}),
        ...(selectedClientName ? { clientName: selectedClientName } : {}),
        ...(date ? { date } : {}),
        ...(orderedExerciseIds.length > 0 ? { exerciseIds: orderedExerciseIds.join(",") } : {}),
        ...(localSupersetConnectionIds.length > 0 ? { supersetConnectionIds: localSupersetConnectionIds.join(",") } : {}),
        ...(serializedApproachData ? { approachData: serializedApproachData } : {})
      }
    });
  }, [date, localApproachData, localSupersetConnectionIds, orderedExerciseIds, selectedClientId, selectedClientName]);

  const openSchedule = useCallback(() => {
    const serializedApproachData = serializeApproachData(localApproachData);

    router.push({
      pathname: "/workouts/schedule",
      params: {
        ...(selectedClientId ? { clientId: selectedClientId } : {}),
        ...(selectedClientName ? { clientName: selectedClientName } : {}),
        ...(date ? { date } : {}),
        ...(orderedExerciseIds.length > 0 ? { exerciseIds: orderedExerciseIds.join(",") } : {}),
        ...(serializedApproachData ? { approachData: serializedApproachData } : {})
      }
    });
  }, [date, localApproachData, orderedExerciseIds, selectedClientId, selectedClientName]);

  const openExerciseApproach = useCallback(
    (exerciseId: string) => {
      const serializedApproachData = serializeApproachData(localApproachData);

      router.push({
        pathname: "/workouts/[exerciseId]/approach",
        params: {
          exerciseId,
          ...(selectedClientId ? { clientId: selectedClientId } : {}),
          ...(selectedClientName ? { clientName: selectedClientName } : {}),
          ...(date ? { date } : {}),
          ...(orderedExerciseIds.length > 0 ? { exerciseIds: orderedExerciseIds.join(",") } : {}),
          ...(localSupersetConnectionIds.length > 0 ? { supersetConnectionIds: localSupersetConnectionIds.join(",") } : {}),
          ...(serializedApproachData ? { approachData: serializedApproachData } : {})
        }
      });
    },
    [date, localApproachData, localSupersetConnectionIds, orderedExerciseIds, selectedClientId, selectedClientName]
  );

  const startExerciseDeleteCommit = useCallback((exerciseId: string) => {
    setDeleteCommitExerciseIds((current) => (current.includes(exerciseId) ? current : [...current, exerciseId]));
    setCollapsingExerciseIds((current) => (current.includes(exerciseId) ? current : [...current, exerciseId]));
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setOrderedExerciseIds((currentIds) => {
      const nextIds = currentIds.filter((id) => id !== exerciseId);
      orderedExerciseIdsRef.current = nextIds;

      setLocalSupersetConnectionIds((currentConnectionIds) => {
        const validConnectionIds = getAdjacentConnectionIds(nextIds);
        return currentConnectionIds.filter((id) => validConnectionIds.includes(id));
      });
      setLocalApproachData((current) => {
        const { [exerciseId]: _removed, ...rest } = current;
        return rest;
      });

      return nextIds;
    });
    setExerciseRowHeights((current) => {
      const { [exerciseId]: _removed, ...rest } = current;
      return rest;
    });
    setDeleteCommitExerciseIds((current) => current.filter((id) => id !== exerciseId));
    setCollapsingExerciseIds((current) => current.filter((id) => id !== exerciseId));
  }, []);

  const toggleSupersetConnection = useCallback((id: string) => {
    setLocalSupersetConnectionIds((current) => (current.includes(id) ? current.filter((connectionId) => connectionId !== id) : [...current, id]));
  }, []);

  const updateExerciseRowHeight = useCallback((exerciseId: string, height: number) => {
    setExerciseRowHeights((current) => {
      if (current[exerciseId] === height) return current;
      return { ...current, [exerciseId]: height };
    });
  }, []);

  const commitExerciseOrder = useCallback(({ data }: SortableGridDragEndParams<WorkoutExercise>) => {
    const currentIds = orderedExerciseIdsRef.current;
    const nextIds = data.map((exercise) => exercise.id);

    if (nextIds.every((id, index) => id === currentIds[index])) return;

    orderedExerciseIdsRef.current = nextIds;
    setOrderedExerciseIds(nextIds);
    setLocalSupersetConnectionIds((current) => preserveSupersetConnectionsAfterReorder(currentIds, nextIds, current));
  }, []);

  const startExerciseDrag = useCallback(() => {
    triggerImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderExercise = useCallback(
    ({ item }: SortableGridRenderItemInfo<WorkoutExercise>) => (
      <CollapsingExerciseRow
        exerciseId={item.id}
        isCollapsing={collapsingExerciseIdSet.has(item.id)}
        onCollapseEnd={removeExercise}
        onHeightChange={updateExerciseRowHeight}
      >
        <ListItemGym
          title={item.name}
          mode="move"
          width="fill"
          setVariant={localApproachData[item.id]?.length > 0 ? "set" : "new"}
          setValues={localApproachData[item.id] ? formatSetValues(localApproachData[item.id]) : undefined}
          onPress={localApproachData[item.id]?.length > 0 ? () => openExerciseApproach(item.id) : undefined}
          onAddSetPress={() => openExerciseApproach(item.id)}
          onDelete={() => removeExercise(item.id)}
          onDeleteCommitStart={() => startExerciseDeleteCommit(item.id)}
          trailingSlot={
            <Sortable.Handle style={styles.dragHandle}>
              <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.mute} />
            </Sortable.Handle>
          }
        />
      </CollapsingExerciseRow>
    ),
    [
      collapsingExerciseIdSet,
      localApproachData,
      openExerciseApproach,
      removeExercise,
      startExerciseDeleteCommit,
      updateExerciseRowHeight
    ]
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Создание тренировки" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Select
            label="Клиент"
            value={selectedClientName}
            placeholder="Выберите клиента"
            width="fill"
            showMessage={false}
            onPress={openClientModal}
          />
        </View>

        {hasExercises ? (
          <View style={styles.exerciseSection}>
            <Divider width="fill" tone="canvasSoft" />
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseHeaderTitle}>Упражнения</Text>
              <Badge label={String(visibleExercises.length)} tone="neutral" size="s" icon={false} />
            </View>
            <Animated.View layout={EXERCISE_LAYOUT_TRANSITION} style={styles.selectedBody}>
              {visibleExercises.length >= 2 ? (
                <SuperSet
                  itemCount={visibleExercises.length}
                  rowHeights={visibleExercises.map((exercise) => exerciseRowHeights[exercise.id] ?? theme.sizes.listItemGymMinHeight)}
                  rowGap={theme.spacing.xxs}
                  segments={supersetConnections}
                  onSegmentPress={toggleSupersetConnection}
                />
              ) : null}
              <Animated.View layout={EXERCISE_LAYOUT_TRANSITION} style={styles.selectedList}>
                <Sortable.Grid
                  activationAnimationDuration={EXERCISE_REORDER_MS}
                  activeItemScale={1}
                  columns={1}
                  customHandle
                  data={selectedExercises}
                  dropAnimationDuration={EXERCISE_REORDER_MS}
                  dragActivationDelay={DRAG_HANDLE_DELAY_MS}
                  dimensionsAnimationType="none"
                  enableActiveItemSnap={false}
                  inactiveItemOpacity={1}
                  inactiveItemScale={1}
                  itemEntering={null}
                  itemExiting={null}
                  itemsLayoutTransitionMode="reorder"
                  keyExtractor={(item) => item.id}
                  overDrag="vertical"
                  reorderTriggerOrigin="touch"
                  rowGap={theme.spacing.xxs}
                  sortEnabled={!isExerciseRemovalActive}
                  strategy="insert"
                  onDragEnd={commitExerciseOrder}
                  onDragStart={startExerciseDrag}
                  renderItem={renderExercise}
                />
              </Animated.View>
            </Animated.View>
            <Animated.View layout={EXERCISE_LAYOUT_TRANSITION} style={styles.addAction}>
              <Button
                label="Добавить"
                type="secondaryNeutral"
                width="fill"
                onPress={openExerciseSelection}
              />
            </Animated.View>
          </View>
        ) : (
          <View style={styles.exercises}>
            <Divider width="fill" tone="canvasSoft" />
            <Header title="Упражнения" size="lg" showSubtitle={false} style={styles.sectionHeader} />
            <View style={styles.emptyState}>
              <Icon name="muscle arms" size={theme.sizes.approachHeaderThumb + theme.spacing["3xl"]} color={theme.colors.status.negativeDarkest} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>Упражнений ещё нет</Text>
                <Text style={styles.emptyDescription}>Добавьте новое, чтобы создать тренировку</Text>
              </View>
              <Button label="Добавить" type="secondaryNeutral" size="small" onPress={openExerciseSelection} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Сохранить и запланировать"
          type="primary"
          width="fill"
          state={hasExercises ? "active" : "disabled"}
          onPress={openSchedule}
        />
      </View>

      <Modal
        visible={clientModalVisible}
        presentation="overlay"
        title="Выбор клиента"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="stacked"
        primaryAction={{ label: "Сохранить", type: "primary", disabled: !pendingClientId, onPress: saveClientSelection }}
        secondaryAction={{ label: "Создать нового клиента", type: "secondaryNeutral", onPress: openNewClient }}
        onClose={closeClientModal}
        bodyStyle={styles.modalBody}
      >
        {mockClients.map((client) => {
          const selected = client.id === pendingClientId;

          return (
            <ListItemCell
              key={client.id}
              title={client.name}
              leading="avatar"
              avatarType="initials"
              avatarInitials={client.avatarInitials}
              trailingSlot={<Radio selected={selected} showLabel={false} onChange={() => setPendingClientId(client.id)} />}
              selected={selected}
              onPress={() => setPendingClientId(client.id)}
            />
          );
        })}
      </Modal>
    </SafeAreaView>
  );
}

function CollapsingExerciseRow({
  children,
  exerciseId,
  isCollapsing,
  onCollapseEnd,
  onHeightChange
}: {
  children: ReactNode;
  exerciseId: string;
  isCollapsing: boolean;
  onCollapseEnd: (exerciseId: string) => void;
  onHeightChange: (exerciseId: string, height: number) => void;
}) {
  const measuredHeight = useSharedValue<number>(theme.sizes.listItemGymSwipeMinHeight);
  const collapseProgress = useSharedValue(0);

  useEffect(() => {
    if (!isCollapsing) {
      collapseProgress.value = 0;
      return;
    }

    collapseProgress.value = withTiming(1, EXERCISE_REMOVE_TIMING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(onCollapseEnd)(exerciseId);
      }
    });
  }, [collapseProgress, exerciseId, isCollapsing, onCollapseEnd]);

  const animatedStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.value;

    return {
      height: progress === 0 ? undefined : measuredHeight.value * (1 - progress),
      opacity: 1 - progress
    };
  });

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (isCollapsing) return;

      const height = event.nativeEvent.layout.height;
      measuredHeight.value = height || theme.sizes.listItemGymSwipeMinHeight;
      onHeightChange(exerciseId, measuredHeight.value);
    },
    [exerciseId, isCollapsing, measuredHeight, onHeightChange]
  );

  return (
    <Animated.View
      collapsable={false}
      layout={EXERCISE_LAYOUT_TRANSITION}
      onLayout={handleLayout}
      pointerEvents={isCollapsing ? "none" : "auto"}
      style={[styles.exerciseRow, animatedStyle]}
    >
      {children}
    </Animated.View>
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
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: theme.spacing.sm
  },
  selectedList: {
    flex: 1,
    minWidth: theme.spacing[0],
    paddingRight: theme.spacing.sm
  },
  exerciseRow: {
    width: "100%",
    overflow: "hidden"
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
