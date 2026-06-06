import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Sortable, { type SortableFlexDragEndParams } from "react-native-sortables";
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
const EXERCISE_ROW_GAP = theme.spacing.xxs;
const EXERCISE_ROW_HEIGHT = theme.sizes.listItemGymSwipeMinHeight - EXERCISE_ROW_GAP;
const EXERCISE_SLOT_HEIGHT = theme.sizes.listItemGymSwipeMinHeight;

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
  const [exerciseListWidth, setExerciseListWidth] = useState<number | undefined>();
  const selectedExercises = useMemo(
    () => orderedExerciseIds.flatMap((id) => mockExercises.find((exercise) => exercise.id === id) ?? []),
    [orderedExerciseIds]
  );
  const exerciseLayout = useMemo(() => getExerciseLayoutRows(selectedExercises, exerciseRowHeights), [exerciseRowHeights, selectedExercises]);
  const exerciseItemHeights = useMemo(() => exerciseLayout.rows.map((row) => row.height), [exerciseLayout.rows]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(initialClientId);
  const [pendingClientId, setPendingClientId] = useState<string | undefined>(initialClientId);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const selectedClient = mockClients.find((client) => client.id === selectedClientId);
  const selectedClientName = selectedClient?.name ?? firstParam(clientName);
  const hasExercises = selectedExercises.length > 0;
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
    setOrderedExerciseIds(selectedExerciseIds);
    setExerciseRowHeights({});
    setLocalSupersetConnectionIds((current) => {
      const validIds = getAdjacentConnectionIds(selectedExerciseIds);
      const sourceIds = selectedSupersetConnectionIds.length > 0 ? selectedSupersetConnectionIds : current;

      return sourceIds.filter((id) => validIds.includes(id));
    });
    setLocalApproachData(selectedApproachData);
  }, [selectedApproachData, selectedExerciseKey, selectedSupersetConnectionKey]);

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

  const removeExercise = useCallback((exerciseId: string) => {
    setOrderedExerciseIds((currentIds) => {
      const nextIds = currentIds.filter((id) => id !== exerciseId);

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
  }, []);

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
    setOrderedExerciseIds((currentIds) => {
      const nextIds = order(currentIds);
      setLocalSupersetConnectionIds((current) => preserveSupersetConnectionsAfterReorder(currentIds, nextIds, current));
      return nextIds;
    });
  }, []);

  const renderExercise = useCallback(
    (item: WorkoutExercise) => (
      <MeasuredExerciseRow
        exerciseId={item.id}
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
          style={styles.exerciseCard}
          trailingSlot={
            <Sortable.Handle>
              <View accessibilityLabel="Move exercise" accessibilityRole="button" style={styles.dragHandle}>
                <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.mute} />
              </View>
            </Sortable.Handle>
          }
        />
      </MeasuredExerciseRow>
    ),
    [localApproachData, openExerciseApproach, removeExercise, updateExerciseRowHeight]
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
                    hapticsEnabled
                    inactiveItemOpacity={1}
                    inactiveItemScale={1}
                    itemEntering={null}
                    itemExiting={null}
                    itemsLayoutTransitionMode="reorder"
                    maxWidth={exerciseListWidth}
                    minWidth={exerciseListWidth ?? theme.spacing[0]}
                    overDrag="none"
                    overflow="hidden"
                    strategy="insert"
                    width={exerciseListWidth ?? "fill"}
                    onDragEnd={handleExerciseDragEnd}
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
                width="fill"
                onPress={openExerciseSelection}
              />
            </View>
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
