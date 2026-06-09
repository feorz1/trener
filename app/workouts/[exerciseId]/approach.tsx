import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollView } from "react-native";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import Sortable, { type SortableFlexDragEndParams } from "react-native-sortables";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApproachCount, ApproachQuickValues, Badge, Button, Divider, Icon, Navigation, TextArea, type ApproachCountItem, type ApproachMetric } from "@/components/ui";
import { mockExercises } from "@/data/mockExercises";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { theme } from "@/theme";

const DRAG_HANDLE_DELAY_MS = 120;
const MAX_FREQUENT_VALUE_COUNT = 6;
const defaultFrequentValues: Record<ApproachMetric, number[]> = {
  weight: [],
  reps: []
};
const defaultPopularValues: Record<ApproachMetric, number[]> = {
  weight: [6, 8, 12, 15, 18, 20, 25, 30],
  reps: [5, 6, 8, 10, 12, 15, 20]
};
const popularWeightValuesByExerciseId: Record<string, number[]> = {
  "ex-1": [6, 8, 12, 15, 18, 20, 25, 30],
  "ex-2": [5, 8, 10, 12, 15, 20, 25],
  "ex-3": [0, 2.5, 5, 7.5, 10, 15, 20],
  "ex-4": [20, 30, 40, 50, 60, 70, 80],
  "ex-5": [0, 5, 10, 15, 20, 25],
  "ex-6": [40, 50, 60, 70, 80, 100, 120],
  "ex-7": [20, 30, 40, 50, 60, 80, 100],
  "ex-8": [20, 30, 40, 50, 60, 70]
};
const popularRepValuesByExerciseId: Record<string, number[]> = {
  "ex-1": [5, 6, 8, 10, 12, 15],
  "ex-2": [6, 8, 10, 12, 15],
  "ex-3": [3, 5, 6, 8, 10, 12],
  "ex-4": [3, 5, 6, 8, 10, 12],
  "ex-5": [5, 6, 8, 10, 12, 15],
  "ex-6": [3, 5, 6, 8, 10],
  "ex-7": [5, 6, 8, 10, 12],
  "ex-8": [6, 8, 10, 12, 15]
};

type ApproachData = Record<string, ApproachCountItem[]>;
type ActiveMetric = {
  setId: string;
  metric: ApproachMetric;
};

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

function normalizeMetricHistory(value: unknown): Record<ApproachMetric, number[]> {
  if (!value || typeof value !== "object") return defaultFrequentValues;

  const history = value as Partial<Record<ApproachMetric, unknown>>;
  return {
    weight: Array.isArray(history.weight) ? history.weight.filter((item): item is number => Number.isFinite(item)).slice(0, MAX_FREQUENT_VALUE_COUNT) : [],
    reps: Array.isArray(history.reps) ? history.reps.filter((item): item is number => Number.isFinite(item)).slice(0, MAX_FREQUENT_VALUE_COUNT) : []
  };
}

function getPopularMetricValues(exerciseId: string | undefined, metric: ApproachMetric | undefined) {
  if (!metric) return [];
  if (!exerciseId) return defaultPopularValues[metric];

  if (metric === "weight") {
    return popularWeightValuesByExerciseId[exerciseId] ?? defaultPopularValues.weight;
  }

  return popularRepValuesByExerciseId[exerciseId] ?? defaultPopularValues.reps;
}

function rememberMetricValue(values: number[], value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return values;

  return [value, ...values.filter((item) => item !== value)].slice(0, MAX_FREQUENT_VALUE_COUNT);
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
  const [activeMetric, setActiveMetric] = useState<ActiveMetric | undefined>();
  const [frequentValues, setFrequentValues] = useState<Record<ApproachMetric, number[]>>(defaultFrequentValues);
  const [setListWidth, setSetListWidth] = useState<number | undefined>();
  const [setDragging, setSetDragging] = useState(false);
  const { scrollProps } = useConditionalScroll({ disabled: setDragging });
  const keyboardInset = useKeyboardInset();
  const scrollableRef = useAnimatedRef<ScrollView>();
  const setsRef = useRef(initialExerciseSets);
  const latestEditedSetRef = useRef<ApproachCountItem | undefined>(undefined);
  const setListStyle = useMemo(() => [styles.setList, { minHeight: getSetListMinHeight(sets.length) }], [sets.length]);
  const metricHistoryKey = useMemo(() => `approachMetricHistory:${currentExerciseId ?? "global"}`, [currentExerciseId]);
  const activePopularValues = useMemo(() => getPopularMetricValues(currentExerciseId, activeMetric?.metric), [activeMetric?.metric, currentExerciseId]);
  const activeFrequentValues = activeMetric ? frequentValues[activeMetric.metric] : [];
  const contentStyle = useMemo(
    () => [
      styles.content,
      activeMetric
        ? {
            paddingBottom: theme.spacing["3xl"] * 3 + keyboardInset + theme.sizes.approachQuickValuesHeight + theme.spacing.md
          }
        : undefined
    ],
    [activeMetric, keyboardInset]
  );

  useEffect(() => {
    let mounted = true;

    void AsyncStorage.getItem(metricHistoryKey)
      .then((value) => {
        if (!mounted || !value) return;
        setFrequentValues(normalizeMetricHistory(JSON.parse(value)));
      })
      .catch(() => {
        if (mounted) {
          setFrequentValues(defaultFrequentValues);
        }
      });

    return () => {
      mounted = false;
    };
  }, [metricHistoryKey]);

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
    setActiveMetric((current) => (current?.setId === setId ? undefined : current));
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

  const rememberFrequentValue = useCallback(
    (metric: ApproachMetric, value: number | undefined) => {
      setFrequentValues((current) => {
        const nextValues = rememberMetricValue(current[metric], value);
        if (nextValues === current[metric]) return current;

        const nextHistory = { ...current, [metric]: nextValues };
        void AsyncStorage.setItem(metricHistoryKey, JSON.stringify(nextHistory)).catch(() => undefined);
        return nextHistory;
      });
    },
    [metricHistoryKey]
  );

  const selectQuickValue = useCallback(
    (value: number) => {
      if (!activeMetric) return;

      updateSet(activeMetric.setId, { [activeMetric.metric]: value });
      if (activeMetric.metric === "weight") {
        setActiveMetric({ setId: activeMetric.setId, metric: "reps" });
      }
    },
    [activeMetric, updateSet]
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
      setActiveMetric(undefined);
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
    setActiveMetric(undefined);
    setSetDragging(false);
  }, []);

  const handleSetDragStart = useCallback(({ key }: { key: string }) => {
    setActiveSetId(key);
    setActiveMetric(undefined);
    setSetDragging(true);
    triggerImpact(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderSet = useCallback(
    (item: ApproachCountItem, index: number) => (
      <View style={[styles.sortableSetItem, activeSetId === item.id && styles.activeSetItem]}>
        <ApproachCount
          focusedMetric={activeMetric?.setId === item.id ? activeMetric.metric : undefined}
          item={{ ...item, index: index + 1 }}
          onDelete={() => deleteSet(item.id)}
          onMetricBlur={(metric) => {
            setTimeout(() => {
              setActiveMetric((current) => (current?.setId === item.id && current.metric === metric ? undefined : current));
            }, 80);
          }}
          onMetricCommit={rememberFrequentValue}
          onMetricFocus={(metric) => setActiveMetric({ setId: item.id, metric })}
          onValueChange={(patch) => updateSet(item.id, patch)}
          trailingSlot={
            <Sortable.Handle style={styles.dragHandle}>
              <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.body} />
            </Sortable.Handle>
          }
        />
      </View>
    ),
    [activeMetric, activeSetId, deleteSet, rememberFrequentValue, updateSet]
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title={exercise?.name ?? "Упражнение"} onBack={() => router.back()} />

      <Animated.ScrollView
        ref={scrollableRef as never}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
        {...scrollProps}
      >
        <TextArea label="Заметки" value={note} width="fill" showMessage={false} onFocus={() => setActiveMetric(undefined)} onChangeText={setNote} />

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

      {activeMetric ? (
        <ApproachQuickValues
          frequentValues={activeFrequentValues}
          popularValues={activePopularValues}
          style={[styles.quickValues, { bottom: keyboardInset + theme.spacing.sm }]}
          onSelectValue={selectQuickValue}
        />
      ) : null}
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
  },
  quickValues: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 10
  }
});
