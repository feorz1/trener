import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollView } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable, { type SortableFlexDragEndParams } from "react-native-sortables";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApproachCount, Badge, Button, Divider, Icon, Navigation, TextArea, type ApproachCountItem } from "@/components/ui";
import { mockExercises } from "@/data/mockExercises";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

const DRAG_HANDLE_DELAY_MS = 120;

type ApproachData = Record<string, ApproachCountItem[]>;

function getSetListMinHeight(itemCount: number) {
  if (itemCount === 0) return theme.spacing[0];
  return itemCount * theme.sizes.approachCountRowMinHeight + (itemCount - 1) * theme.spacing.sm;
}

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

function buildWorkoutParams(
  clientId: string | undefined,
  clientName: string | undefined,
  date: string | undefined,
  exerciseIds: string[],
  supersetConnectionIds: string[],
  approachData?: ApproachData
) {
  const serializedApproachData = approachData ? serializeApproachData(approachData) : undefined;

  return {
    ...(clientId ? { clientId } : {}),
    ...(clientName ? { clientName } : {}),
    ...(date ? { date } : {}),
    ...(exerciseIds.length > 0 ? { exerciseIds: exerciseIds.join(",") } : {}),
    ...(supersetConnectionIds.length > 0 ? { supersetConnectionIds: supersetConnectionIds.join(",") } : {}),
    ...(serializedApproachData ? { approachData: serializedApproachData } : {})
  };
}

const initialSets: ApproachCountItem[] = [
  { id: "set-1", index: 1, weight: 150, reps: 12 }
];

function createAddedSet(index: number, template?: ApproachCountItem): ApproachCountItem {
  const id = `set-${Date.now()}-${index}`;

  if (!template) {
    return { id, index, weight: 150, reps: 12 };
  }

  return {
    id,
    index,
    weight: template.weight,
    reps: template.reps,
    unit: template.unit
  };
}

export default function ExerciseApproachScreen() {
  const { exerciseId, clientId, clientName, date, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    exerciseId?: string;
    clientId?: string;
    clientName?: string;
    date?: string;
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
  const [activeSetId, setActiveSetId] = useState<string | undefined>();
  const [setListWidth, setSetListWidth] = useState<number | undefined>();
  const [setDragging, setSetDragging] = useState(false);
  const { scrollProps } = useConditionalScroll({ disabled: setDragging });
  const scrollableRef = useAnimatedRef<ScrollView>();
  const setsRef = useRef(initialExerciseSets);
  const latestEditedSetRef = useRef<ApproachCountItem | undefined>(undefined);
  const setListStyle = useMemo(() => [styles.setList, { minHeight: getSetListMinHeight(sets.length) }], [sets.length]);

  const syncSets = useCallback((nextSets: ApproachCountItem[]) => {
    const normalizedSets = nextSets.map((set, index) => ({ ...set, index: index + 1 }));
    setsRef.current = normalizedSets;
    setSets(normalizedSets);
  }, []);

  const goBackToWorkout = useCallback(
    (nextExerciseIds = selectedExerciseIds, nextSupersetConnectionIds = selectedSupersetConnectionIds, nextApproachData = currentApproachData) => {
      router.replace({
        pathname: "/workouts/new",
        params: buildWorkoutParams(firstParam(clientId), firstParam(clientName), firstParam(date), nextExerciseIds, nextSupersetConnectionIds, nextApproachData)
      });
    },
    [clientId, clientName, currentApproachData, date, selectedExerciseIds, selectedSupersetConnectionIds]
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
    const template = latestEditedSetRef.current ?? setsRef.current[setsRef.current.length - 1];
    syncSets([...setsRef.current, createAddedSet(nextIndex, template)]);
  };

  const deleteSet = useCallback((setId: string) => {
    syncSets(setsRef.current.filter((set) => set.id !== setId));
  }, [syncSets]);

  const updateSet = useCallback(
    (setId: string, patch: Partial<Pick<ApproachCountItem, "weight" | "reps">>) => {
      syncSets(
        setsRef.current.map((set) => {
          if (set.id !== setId) return set;

          const nextSet = { ...set, ...patch };
          latestEditedSetRef.current = nextSet;
          return nextSet;
        })
      );
    },
    [syncSets]
  );

  const handleSetListLayout = useCallback((event: LayoutChangeEvent) => {
    setSetListWidth(Math.round(event.nativeEvent.layout.width));
  }, []);

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
    ({ order }: SortableFlexDragEndParams) => {
      setActiveSetId(undefined);
      setSetDragging(false);
      const currentSets = setsRef.current;
      const nextSets = order(currentSets);

      if (nextSets.length !== currentSets.length) return;
      if (nextSets.every((set, index) => set.id === currentSets[index]?.id)) return;

      syncSets(nextSets);
    },
    [syncSets]
  );

  const handleSetDrop = useCallback(() => {
    setActiveSetId(undefined);
    setSetDragging(false);
  }, []);

  const handleSetDragStart = useCallback(({ key }: { key: string }) => {
    setActiveSetId(key);
    setSetDragging(true);
    triggerImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderSet = useCallback(
    (item: ApproachCountItem, index: number) => (
      <View style={[styles.sortableSetItem, activeSetId === item.id && styles.activeSetItem]}>
        <ApproachCount
          item={{ ...item, index: index + 1 }}
          onDelete={() => deleteSet(item.id)}
          onValueChange={(patch) => updateSet(item.id, patch)}
          trailingSlot={
            <Sortable.Handle style={styles.dragHandle}>
              <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.body} />
            </Sortable.Handle>
          }
        />
      </View>
    ),
    [activeSetId, deleteSet, updateSet]
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title={exercise?.name ?? "Упражнение"} onBack={() => router.back()} />

      <Animated.ScrollView ref={scrollableRef as never} contentContainerStyle={styles.content} {...scrollProps}>
        <TextArea label="Заметки" value={note} width="fill" showMessage={false} onChangeText={setNote} />

        <View style={styles.approachSection}>
          <Divider width="fill" tone="canvasSoft" />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Подходы</Text>
            <Badge label={String(sets.length)} tone="neutral" size="s" icon={false} />
          </View>

          <View style={setListStyle}>
            <View onLayout={handleSetListLayout} style={styles.setListClip}>
              <Sortable.Flex
                activationAnimationDuration={80}
                activeItemScale={1}
                activeItemShadowOpacity={0.12}
                customHandle
                dropAnimationDuration={100}
                dragActivationDelay={DRAG_HANDLE_DELAY_MS}
                dragActivationFailOffset={theme.spacing.lg}
                flexDirection="column"
                gap={theme.spacing.sm}
                inactiveItemOpacity={1}
                inactiveItemScale={1}
                itemEntering={null}
                itemExiting={null}
                itemsLayoutTransitionMode="reorder"
                maxWidth={setListWidth}
                minWidth={setListWidth ?? theme.spacing[0]}
                overDrag="vertical"
                overflow="hidden"
                scrollableRef={scrollableRef}
                strategy="insert"
                width={setListWidth ?? "fill"}
                onDragEnd={commitSetOrder}
                onActiveItemDropped={handleSetDrop}
                onDragStart={handleSetDragStart}
              >
                {sets.map((item, index) => (
                  <View key={item.id} style={[styles.sortableSetSlot, setListWidth ? { width: setListWidth } : undefined]}>
                    {renderSet(item, index)}
                  </View>
                ))}
              </Sortable.Flex>
            </View>
          </View>

          <View style={styles.addAction}>
            <Button label="Добавить" type="secondaryNeutral" size="large" width="fill" onPress={addSet} />
          </View>
        </View>
      </Animated.ScrollView>

      <View style={styles.footer}>
        <Button label="Сохранить" type="primary" size="large" width="fill" onPress={saveSets} />
        <Button label="Удалить упражнение" type="secondaryNeutral" size="large" width="fill" onPress={deleteExercise} />
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
  setList: {
    flex: 0,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.background.canvas
  },
  setListClip: {
    width: "100%",
    minWidth: theme.spacing[0],
    alignSelf: "stretch",
    overflow: "hidden"
  },
  sortableSetItem: {
    width: "100%",
    minWidth: theme.spacing[0],
    alignSelf: "stretch",
    minHeight: theme.sizes.approachCountRowMinHeight
  },
  sortableSetSlot: {
    width: "100%",
    alignSelf: "stretch"
  },
  activeSetItem: {
    ...theme.shadows.raised
  },
  dragHandle: {
    width: theme.sizes.approachStatusIcon,
    height: theme.sizes.approachStatusIcon,
    alignItems: "center",
    justifyContent: "center"
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
