import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, type ListRenderItemInfo } from "react-native";
import { DraxHandle, DraxList, type SortableReorderEvent } from "react-native-drax";
import { SafeAreaView } from "react-native-safe-area-context";
import { DraxStaticList } from "@/components/DraxStaticList";
import { ApproachCount, Badge, Button, Divider, Icon, Navigation, TextArea, type ApproachCountItem } from "@/components/ui";
import { mockExercises } from "@/data/mockExercises";
import { theme } from "@/theme";

const ROW_SLOT_HEIGHT = theme.sizes.approachCountRowMinHeight + theme.spacing.sm;
const DRAG_HANDLE_DELAY_MS = 120;

type ApproachData = Record<string, ApproachCountItem[]>;

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

function getAdjacentConnectionIds(ids: string[]) {
  return ids.slice(0, -1).map((id, index) => `${id}:${ids[index + 1]}`);
}

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

function buildWorkoutParams(clientId: string | undefined, exerciseIds: string[], supersetConnectionIds: string[], approachData?: ApproachData) {
  const serializedApproachData = approachData ? serializeApproachData(approachData) : undefined;

  return {
    ...(clientId ? { clientId } : {}),
    ...(exerciseIds.length > 0 ? { exerciseIds: exerciseIds.join(",") } : {}),
    ...(supersetConnectionIds.length > 0 ? { supersetConnectionIds: supersetConnectionIds.join(",") } : {}),
    ...(serializedApproachData ? { approachData: serializedApproachData } : {})
  };
}

const initialSets: ApproachCountItem[] = [
  { id: "set-1", index: 1, weight: 150, reps: 12 },
  { id: "set-2", index: 2, weight: 150, reps: 12 },
  { id: "set-3", index: 3, weight: 150, reps: 12 }
];

export default function ExerciseApproachScreen() {
  const { exerciseId, clientId, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    exerciseId?: string;
    clientId?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const currentExerciseId = firstParam(exerciseId);
  const selectedExerciseIds = useMemo(() => parseIds(exerciseIds), [exerciseIds]);
  const selectedSupersetConnectionIds = useMemo(() => parseIds(supersetConnectionIds), [supersetConnectionIds]);
  const currentApproachData = useMemo(() => parseApproachData(approachData), [approachData]);
  const initialExerciseSets = currentExerciseId && currentApproachData[currentExerciseId] ? currentApproachData[currentExerciseId] : initialSets;
  const exercise = mockExercises.find((item) => item.id === currentExerciseId);
  const [note, setNote] = useState("Слева - 6\nСправа - 5,6\nНожка - 4");
  const [sets, setSets] = useState(initialExerciseSets);
  const setsRef = useRef(initialExerciseSets);
  const setListHeight = Math.max(theme.spacing[0], sets.length * ROW_SLOT_HEIGHT + theme.spacing.sm);

  const syncSets = useCallback((nextSets: ApproachCountItem[]) => {
    const normalizedSets = nextSets.map((set, index) => ({ ...set, index: index + 1 }));
    setsRef.current = normalizedSets;
    setSets(normalizedSets);
  }, []);

  const goBackToWorkout = useCallback(
    (nextExerciseIds = selectedExerciseIds, nextSupersetConnectionIds = selectedSupersetConnectionIds, nextApproachData = currentApproachData) => {
      router.replace({
        pathname: "/workouts/new",
        params: buildWorkoutParams(firstParam(clientId), nextExerciseIds, nextSupersetConnectionIds, nextApproachData)
      });
    },
    [clientId, currentApproachData, selectedExerciseIds, selectedSupersetConnectionIds]
  );

  const saveSets = () => {
    if (!currentExerciseId) {
      goBackToWorkout();
      return;
    }

    goBackToWorkout(selectedExerciseIds, selectedSupersetConnectionIds, {
      ...currentApproachData,
      [currentExerciseId]: setsRef.current
    });
  };

  const addSet = () => {
    const nextIndex = setsRef.current.length + 1;
    syncSets([...setsRef.current, { id: `set-${Date.now()}`, index: nextIndex, weight: 150, reps: 12 }]);
  };

  const deleteSet = (setId: string) => {
    syncSets(setsRef.current.filter((set) => set.id !== setId));
  };

  const updateSet = (setId: string, patch: Partial<Pick<ApproachCountItem, "weight" | "reps">>) => {
    syncSets(setsRef.current.map((set) => (set.id === setId ? { ...set, ...patch } : set)));
  };

  const deleteExercise = () => {
    if (!currentExerciseId) {
      goBackToWorkout();
      return;
    }

    const nextExerciseIds = selectedExerciseIds.filter((id) => id !== currentExerciseId);
    const validConnectionIds = getAdjacentConnectionIds(nextExerciseIds);
    const nextConnectionIds = selectedSupersetConnectionIds.filter((id) => validConnectionIds.includes(id));
    const { [currentExerciseId]: _removed, ...nextApproachData } = currentApproachData;
    goBackToWorkout(nextExerciseIds, nextConnectionIds, nextApproachData);
  };

  const commitSetOrder = useCallback(
    ({ data }: SortableReorderEvent<ApproachCountItem>) => {
      const currentSets = setsRef.current;
      const nextSets = data;

      if (nextSets.length !== currentSets.length) return;
      if (nextSets.every((set, index) => set.id === currentSets[index]?.id)) return;

      syncSets(nextSets);
    },
    [syncSets]
  );

  const renderSet = useCallback(
    ({ item }: ListRenderItemInfo<ApproachCountItem>) => (
      <View style={styles.sortableSetItem}>
        <ApproachCount
          item={item}
          onDelete={() => deleteSet(item.id)}
          onValueChange={(patch) => updateSet(item.id, patch)}
          trailingSlot={
            <DraxHandle style={styles.dragHandle}>
              <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.body} />
            </DraxHandle>
          }
        />
      </View>
    ),
    []
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title={exercise?.name ?? "Упражнение"} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TextArea label="Заметки" value={note} width="fill" showMessage={false} onChangeText={setNote} />

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.approachSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Подходы</Text>
            <Badge label={String(sets.length)} tone="neutral" size="s" icon={false} />
          </View>

          <DraxList
            animationConfig="snappy"
            component={DraxStaticList}
            containerStyle={[styles.setListContainer, { height: setListHeight }]}
            data={sets}
            itemDraxViewProps={{
              dragHandle: true,
              hoverStyle: styles.dragHover
            }}
            keyExtractor={(item) => item.id}
            lockToMainAxis
            longPressDelay={DRAG_HANDLE_DELAY_MS}
            onDragStart={() => triggerImpact(Haptics.ImpactFeedbackStyle.Light)}
            onReorder={commitSetOrder}
            renderItem={renderSet}
            style={styles.setList}
          />

          <View style={styles.addAction}>
            <Button label="Добавить" type="secondaryNeutral" width="fill" onPress={addSet} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Сохранить" type="primary" width="fill" onPress={saveSets} />
        <Button label="Удалить упражнение" type="secondaryNeutral" width="fill" onPress={deleteExercise} />
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
    paddingBottom: theme.spacing["3xl"] * 3
  },
  approachSection: {
    flex: 1,
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
  setListContainer: {
    flex: 0,
    backgroundColor: theme.colors.background.canvas
  },
  setList: {
    flex: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.background.canvas
  },
  sortableSetItem: {
    height: ROW_SLOT_HEIGHT,
    paddingBottom: theme.spacing.sm
  },
  dragHandle: {
    width: theme.sizes.approachStatusIcon,
    height: theme.sizes.approachStatusIcon,
    alignItems: "center",
    justifyContent: "center"
  },
  dragHover: {
    ...(theme.shadows.raised ?? {})
  },
  addAction: {
    padding: theme.spacing.lg
  },
  footer: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
