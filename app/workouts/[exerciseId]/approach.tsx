import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Sortable, { type SortableFlexDragEndParams } from "react-native-sortables";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApproachCount, ApproachQuickValues, Badge, Button, Divider, Icon, Navigation, TextArea, type ApproachCountItem, type ApproachCountValuePatch, type ApproachMetric } from "@/components/ui";
import { useExercise, useQuickValue, useQuickValueActions, useWorkoutActions, useWorkoutDraft } from "@/data";
import { defaultWorkoutResultType } from "@/features/workouts/sessionResult";
import { formatDuration, getLegacyValues, getTrackingPreset, pickCompatibleValues, valuesToLegacyFields, type MetricDefinition } from "@/features/workouts/tracking";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";
import type { MetricValues, Workout, WorkoutResultType } from "@/types";

const DRAG_HANDLE_DELAY_MS = 120;
const MAX_FREQUENT_VALUE_COUNT = 5;
const ACTIVE_METRIC_BLUR_DELAY_MS = 80;
const QUICK_VALUES_KEYBOARD_OFFSET = theme.sizes.approachQuickValuesHeight + theme.spacing.md + theme.spacing["2xl"];
const defaultPopularValues: Partial<Record<ApproachMetric, number[]>> = {
  weight: [6, 8, 12, 15, 18, 20, 25, 30],
  addedWeight: [0, 2.5, 5, 7.5, 10, 15, 20],
  assistance: [5, 10, 15, 20, 25, 30, 40, 50],
  reps: [5, 6, 8, 10, 12, 15, 20],
  duration: [15, 30, 45, 60, 90, 120],
  interval: [15, 30, 45, 60, 90, 120],
  distance: [100, 200, 400, 800, 1000, 1500, 2000, 5000],
  calories: [50, 100, 150, 200, 300, 500],
  rpe: [6, 7, 8, 8.5, 9, 9.5],
  rounds: [1, 2, 3, 4, 5, 6],
  extraReps: [0, 1, 2, 3, 5, 10],
  leftReps: [5, 8, 10, 12, 15, 20],
  rightReps: [5, 8, 10, 12, 15, 20],
  speed: [6, 8, 10, 12, 14, 16],
  pace: [240, 300, 360, 420, 480, 600],
  incline: [0, 2, 5, 8, 10, 12],
  resistance: [1, 3, 5, 7, 10, 15]
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
type WorkoutSet = Workout["exercises"][number]["sets"][number];

function getSetListMinHeight(itemCount: number) {
  if (itemCount === 0) return theme.spacing[0];
  return itemCount * theme.sizes.approachCountRowMinHeight + (itemCount - 1) * theme.spacing.sm;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeMetricHistory(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is number => Number.isFinite(item)).slice(0, MAX_FREQUENT_VALUE_COUNT) : [];
}

function getPopularMetricValues(exerciseId: string | undefined, metric: ApproachMetric | undefined) {
  if (!metric) return [];

  if (metric === "weight" && exerciseId) {
    return popularWeightValuesByExerciseId[exerciseId] ?? defaultPopularValues.weight;
  }

  if (metric === "reps" && exerciseId) {
    return popularRepValuesByExerciseId[exerciseId] ?? defaultPopularValues.reps;
  }

  return defaultPopularValues[metric] ?? [];
}

function formatQuickMetricValue(metric: MetricDefinition | undefined, value: number) {
  if (!metric) return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
  if (metric.inputType === "duration") return formatDuration(value);
  if (metric.key === "distance") return value >= 1000 ? `${Number.isInteger(value / 1000) ? value / 1000 : String(value / 1000).replace(".", ",")} км` : `${value} м`;
  if (metric.key === "addedWeight") return value === 0 ? "0" : `+${String(value).replace(".", ",")}`;
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function getNextMetric(metrics: MetricDefinition[], currentMetric: ApproachMetric) {
  const currentIndex = metrics.findIndex((metric) => metric.key === currentMetric);
  return currentIndex >= 0 ? metrics[currentIndex + 1]?.key : undefined;
}

function getDefaultValues(resultType: WorkoutResultType): MetricValues {
  const preset = getTrackingPreset(resultType);
  return preset.metrics.reduce<MetricValues>((values, metric) => {
    if (metric.key === "weight") values.weight = 150;
    else if (metric.key === "reps") values.reps = 12;
    else if (metric.key === "addedWeight") values.addedWeight = 0;
    else if (metric.key === "assistance") values.assistance = 0;
    else if (metric.key === "duration") values.duration = 30;
    else if (metric.key === "interval") values.interval = 30;
    else if (metric.key === "distance") values.distance = 1000;
    else if (metric.key === "calories") values.calories = 0;
    else if (metric.key === "rpe") values.rpe = 7;
    else if (metric.key === "rounds") values.rounds = 1;
    else if (metric.key === "extraReps") values.extraReps = 0;
    else if (metric.key === "leftReps") values.leftReps = 12;
    else if (metric.key === "rightReps") values.rightReps = 12;
    else if (metric.key === "speed") values.speed = 0;
    else if (metric.key === "pace") values.pace = 0;
    else if (metric.key === "incline") values.incline = 0;
    else if (metric.key === "resistance") values.resistance = 0;
    return values;
  }, {});
}

function getSetValues(set: ApproachCountItem): MetricValues {
  return {
    ...set.values,
    weight: set.values?.weight ?? set.weight,
    reps: set.values?.reps ?? set.reps,
    duration: set.values?.duration ?? set.durationSeconds,
    distance: set.values?.distance ?? set.distanceMeters
  };
}

function getApproachSetValuePatch(values: MetricValues): ApproachCountValuePatch {
  return {
    values,
    weight: values.weight,
    reps: values.reps,
    durationSeconds: values.duration,
    distanceMeters: values.distance
  };
}

function buildApproachSet(set: WorkoutSet, index: number, resultType: WorkoutResultType): ApproachCountItem {
  const values = pickCompatibleValues(
    getLegacyValues({
      values: set.values,
      weight: set.targetWeightKg,
      reps: set.targetReps,
      durationSeconds: set.targetDurationSeconds,
      distanceMeters: set.targetDistanceMeters
    }),
    resultType
  );
  const legacy = valuesToLegacyFields(values, resultType);
  return {
    id: set.id,
    index: index + 1,
    resultType,
    values,
    weight: legacy.weight,
    reps: legacy.repetitions,
    durationSeconds: legacy.durationSeconds,
    distanceMeters: legacy.distanceMeters
  };
}

function rememberMetricValue(values: number[], value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return values;

  return [value, ...values.filter((item) => item !== value)].slice(0, MAX_FREQUENT_VALUE_COUNT);
}

function ensureUniqueApproachSets(items: ApproachCountItem[], scope = "set") {
  const seen = new Set<string>();

  return items.map((item, index) => {
    const baseId = item.id || `${scope}-${index + 1}`;
    const id = seen.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    seen.add(id);
    return { ...item, id, index: index + 1 };
  });
}

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

function createInitialSet(resultType: WorkoutResultType): ApproachCountItem {
  const values = getDefaultValues(resultType);
  return {
    id: "set-1",
    index: 1,
    resultType,
    ...getApproachSetValuePatch(values)
  };
}

function createAddedSet(index: number, resultType: WorkoutResultType, template?: ApproachCountItem): ApproachCountItem {
  const id = `set-${Date.now()}-${index}`;

  if (!template) {
    return { ...createInitialSet(resultType), id, index };
  }

  const values = pickCompatibleValues(getSetValues(template), resultType);
  return {
    id,
    index,
    resultType,
    ...getApproachSetValuePatch(values),
    unit: template.unit
  };
}

export default function ExerciseApproachScreen() {
  const { exerciseId, draftId, exerciseItemId } = useLocalSearchParams<{
    exerciseId?: string;
    draftId?: string;
    exerciseItemId?: string;
  }>();
  const currentExerciseId = firstParam(exerciseId);
  const draftIdValue = firstParam(draftId);
  const exerciseItemIdValue = firstParam(exerciseItemId);
  const { exercise } = useExercise(currentExerciseId);
  const { draft } = useWorkoutDraft(draftIdValue);
  const workoutActions = useWorkoutActions();
  const quickValueActions = useQuickValueActions();
  const draftExercise = useMemo(() => draft?.exercises.find((item) => item.id === exerciseItemIdValue), [draft?.exercises, exerciseItemIdValue]);
  const resultType = draftExercise?.resultType ?? exercise?.resultType ?? defaultWorkoutResultType;
  const trackingPreset = useMemo(() => getTrackingPreset(resultType), [resultType]);
  const initialExerciseSets = useMemo(
    () =>
      ensureUniqueApproachSets(
        draftExercise?.sets.map((set, index) => buildApproachSet(set, index, resultType)) ?? [createInitialSet(resultType)],
        exerciseItemIdValue ?? currentExerciseId ?? "set"
      ),
    [currentExerciseId, draftExercise?.sets, exerciseItemIdValue, resultType]
  );
  const initialExerciseSetsKey = useMemo(
    () =>
      `${draftIdValue ?? ""}:${exerciseItemIdValue ?? ""}:${currentExerciseId ?? ""}:${draftExercise?.comment ?? ""}:${resultType}:${initialExerciseSets
        .map((set) => `${set.id}:${JSON.stringify(set.values ?? {})}`)
        .join("|")}`,
    [currentExerciseId, draftExercise?.comment, draftIdValue, exerciseItemIdValue, initialExerciseSets, resultType]
  );
  const [note, setNote] = useState(draftExercise?.comment ?? "");
  const [sets, setSets] = useState(initialExerciseSets);
  const [activeSetId, setActiveSetId] = useState<string | undefined>();
  const [activeMetric, setActiveMetric] = useState<ActiveMetric | undefined>();
  const { quickValue: activeQuickValue } = useQuickValue(currentExerciseId, activeMetric?.metric);
  const [frequentValues, setFrequentValues] = useState<Partial<Record<ApproachMetric, number[]>>>({});
  const [setListWidth, setSetListWidth] = useState<number | undefined>();
  const [setDragging, setSetDragging] = useState(false);
  const { scrollProps } = useConditionalScroll({ disabled: setDragging });
  const activeMetricBlurTokenRef = useRef(0);
  const setsRef = useRef(initialExerciseSets);
  const loadedExerciseKeyRef = useRef<string | undefined>(initialExerciseSetsKey);
  const frequentValuesRef = useRef<Partial<Record<ApproachMetric, number[]>>>({});
  const latestEditedSetRef = useRef<ApproachCountItem | undefined>(undefined);
  const setListStyle = useMemo(() => [styles.setList, { minHeight: getSetListMinHeight(sets.length) }], [sets.length]);
  const activePopularValues = useMemo(() => getPopularMetricValues(currentExerciseId, activeMetric?.metric), [activeMetric?.metric, currentExerciseId]);
  const activeMetricDefinition = useMemo(() => trackingPreset.metrics.find((metric) => metric.key === activeMetric?.metric), [activeMetric?.metric, trackingPreset.metrics]);
  const activeFrequentValues = activeMetric ? frequentValues[activeMetric.metric] ?? [] : [];
  const keyboardAwareOffset = activeMetric ? QUICK_VALUES_KEYBOARD_OFFSET : theme.spacing[0];
  const contentStyle = useMemo(
    () => [
      styles.content,
      activeMetric
        ? {
            paddingBottom: theme.sizes.approachQuickValuesHeight + theme.spacing.xl
          }
        : undefined
    ],
    [activeMetric]
  );

  useEffect(() => {
    const metric = activeMetric?.metric;
    if (!metric) return;

    const nextValues = normalizeMetricHistory(activeQuickValue?.values);
    frequentValuesRef.current = { ...frequentValuesRef.current, [metric]: nextValues };
    setFrequentValues((current) => ({ ...current, [metric]: nextValues }));
  }, [activeMetric?.metric, activeQuickValue?.values]);

  const syncSets = useCallback((nextSets: ApproachCountItem[]) => {
    const normalizedSets = ensureUniqueApproachSets(nextSets, exerciseItemIdValue ?? currentExerciseId ?? "set");
    setsRef.current = normalizedSets;
    setSets(normalizedSets);
  }, [currentExerciseId, exerciseItemIdValue]);

  useEffect(() => {
    if (loadedExerciseKeyRef.current === initialExerciseSetsKey) return;

    loadedExerciseKeyRef.current = initialExerciseSetsKey;
    setNote(draftExercise?.comment ?? "");
    syncSets(initialExerciseSets);
  }, [draftExercise?.comment, initialExerciseSets, initialExerciseSetsKey, syncSets]);

  const saveSets = async () => {
    if (!draftIdValue || !exerciseItemIdValue) {
      router.back();
      return;
    }

    await workoutActions.updateDraftExercise(draftIdValue, exerciseItemIdValue, {
      comment: note,
      resultType,
      sets: setsRef.current.map((set, index) => ({
        id: set.id,
        order: index + 1,
        values: pickCompatibleValues(getSetValues(set), resultType),
        targetWeightKg: set.values?.weight ?? set.weight,
        targetReps: set.values?.reps ?? set.reps,
        targetDurationSeconds: set.values?.duration ?? set.durationSeconds,
        targetDistanceMeters: set.values?.distance ?? set.distanceMeters,
        completed: false
      }))
    });
    router.back();
  };

  const addSet = () => {
    const nextIndex = setsRef.current.length + 1;
    const template = latestEditedSetRef.current ?? setsRef.current[setsRef.current.length - 1];
    syncSets([...setsRef.current, createAddedSet(nextIndex, resultType, template)]);
  };

  const clearActiveMetric = useCallback(() => {
    activeMetricBlurTokenRef.current += 1;
    setActiveMetric(undefined);
  }, []);

  const focusMetric = useCallback((metric: ActiveMetric) => {
    activeMetricBlurTokenRef.current += 1;
    setActiveMetric(metric);
  }, []);

  const blurMetric = useCallback((metric: ActiveMetric) => {
    const blurToken = activeMetricBlurTokenRef.current;

    setTimeout(() => {
      if (activeMetricBlurTokenRef.current !== blurToken) return;
      setActiveMetric((current) => (current?.setId === metric.setId && current.metric === metric.metric ? undefined : current));
    }, ACTIVE_METRIC_BLUR_DELAY_MS);
  }, []);

  const deleteSet = useCallback((setId: string) => {
    setActiveMetric((current) => (current?.setId === setId ? undefined : current));
    syncSets(setsRef.current.filter((set) => set.id !== setId));
  }, [syncSets]);

  const updateSet = useCallback(
    (setId: string, patch: ApproachCountValuePatch) => {
      syncSets(
        setsRef.current.map((set) => {
          if (set.id !== setId) return set;

          const nextValues = pickCompatibleValues(patch.values ?? getSetValues(set), resultType);
      const legacy = valuesToLegacyFields(nextValues, resultType);
          const nextSet = {
            ...set,
            ...patch,
            resultType,
            values: nextValues,
            weight: legacy.weight,
            reps: legacy.repetitions,
            durationSeconds: legacy.durationSeconds,
            distanceMeters: legacy.distanceMeters
          };
          latestEditedSetRef.current = nextSet;
          return nextSet;
        })
      );
    },
    [resultType, syncSets]
  );

  const rememberFrequentValue = useCallback(
    (metric: ApproachMetric, value: number | undefined) => {
      const current = frequentValuesRef.current;
      const nextValues = rememberMetricValue(current[metric] ?? [], value);
      if (nextValues === current[metric]) return;

      const nextHistory = { ...current, [metric]: nextValues };
      frequentValuesRef.current = nextHistory;
      setFrequentValues(nextHistory);

      if (currentExerciseId) {
        void quickValueActions.upsert({ exerciseId: currentExerciseId, metric, values: nextValues }).catch(() => undefined);
      }
    },
    [currentExerciseId, quickValueActions]
  );

  const selectQuickValue = useCallback(
    (value: number) => {
      if (!activeMetric) return;

      const currentSet = setsRef.current.find((set) => set.id === activeMetric.setId);
      const nextValues = {
        ...(currentSet ? getSetValues(currentSet) : {}),
        [activeMetric.metric]: value
      };
      updateSet(activeMetric.setId, getApproachSetValuePatch(nextValues));
      rememberFrequentValue(activeMetric.metric, value);
      const nextMetric = getNextMetric(trackingPreset.metrics, activeMetric.metric);
      if (nextMetric) {
        focusMetric({ setId: activeMetric.setId, metric: nextMetric });
        return;
      }

      Keyboard.dismiss();
      clearActiveMetric();
    },
    [activeMetric, clearActiveMetric, focusMetric, rememberFrequentValue, trackingPreset.metrics, updateSet]
  );

  const handleSetListLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;

    setSetListWidth(Math.round(width));
  }, []);

  const deleteExercise = () => {
    if (!draftIdValue || !exerciseItemIdValue) {
      router.back();
      return;
    }

    void workoutActions.removeDraftExercise(draftIdValue, exerciseItemIdValue).then(() => router.back());
  };

  const commitSetOrder = useCallback(
    ({ order }: SortableFlexDragEndParams) => {
      setActiveSetId(undefined);
      clearActiveMetric();
      setSetDragging(false);
      const currentSets = setsRef.current;
      const nextSets = order(currentSets);

      if (nextSets.length !== currentSets.length) return;
      if (nextSets.every((set, index) => set.id === currentSets[index]?.id)) return;

      syncSets(nextSets);
    },
    [clearActiveMetric, syncSets]
  );

  const handleSetDrop = useCallback(() => {
    setActiveSetId(undefined);
    clearActiveMetric();
    setSetDragging(false);
  }, [clearActiveMetric]);

  const handleSetDragStart = useCallback(({ key }: { key: string }) => {
    setActiveSetId(key);
    clearActiveMetric();
    setSetDragging(true);
    triggerImpact(Haptics.ImpactFeedbackStyle.Light);
  }, [clearActiveMetric]);

  const renderSet = useCallback(
    (item: ApproachCountItem, index: number) => (
      <View style={[styles.sortableSetItem, activeSetId === item.id && styles.activeSetItem]}>
        <ApproachCount
          focusedMetric={activeMetric?.setId === item.id ? activeMetric.metric : undefined}
          item={{ ...item, index: index + 1 }}
          metrics={trackingPreset.metrics}
          onDelete={() => deleteSet(item.id)}
          onMetricBlur={(metric) => blurMetric({ setId: item.id, metric })}
          onMetricCommit={rememberFrequentValue}
          onMetricFocus={(metric) => focusMetric({ setId: item.id, metric })}
          onValueChange={(patch) => updateSet(item.id, patch)}
          trailingSlot={
            <Sortable.Handle style={styles.dragHandle}>
              <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.body} />
            </Sortable.Handle>
          }
        />
      </View>
    ),
    [activeMetric, activeSetId, blurMetric, deleteSet, focusMetric, rememberFrequentValue, trackingPreset.metrics, updateSet]
  );

  const quickValues = activeMetric ? (
    <ApproachQuickValues
      frequentValues={activeFrequentValues}
      popularValues={activePopularValues}
      resetKey={`${activeMetric.setId}:${activeMetric.metric}`}
      formatValue={(value) => formatQuickMetricValue(activeMetricDefinition, value)}
      style={styles.quickValuesOverlay}
      onSelectValue={selectQuickValue}
    />
  ) : null;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title={exercise?.name ?? "Упражнение"} onBack={() => router.back()} />

      <KeyboardAwareScrollView
        bottomOffset={keyboardAwareOffset}
        contentContainerStyle={contentStyle}
        extraKeyboardSpace={keyboardAwareOffset}
        keyboardShouldPersistTaps="handled"
        mode="insets"
        {...scrollProps}
        bounces={activeMetric ? false : scrollProps.bounces}
        scrollEnabled={activeMetric ? true : scrollProps.scrollEnabled}
        showsVerticalScrollIndicator={activeMetric ? true : scrollProps.showsVerticalScrollIndicator}
      >
        <TextArea label="Заметки" value={note} width="fill" showMessage={false} onFocus={clearActiveMetric} onChangeText={setNote} />

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

          {activeMetric ? null : (
            <View style={styles.addAction}>
              <Button label="Добавить" type="secondaryNeutral" size="large" width="fill" onPress={addSet} />
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {activeMetric ? null : (
        <View style={styles.footer}>
          <Button label="Сохранить" type="primary" size="large" width="fill" onPress={saveSets} />
          <Button label="Удалить упражнение" type="secondaryNeutral" size="large" width="fill" onPress={deleteExercise} />
        </View>
      )}

      {activeMetric ? (
        <KeyboardStickyView offset={{ closed: QUICK_VALUES_KEYBOARD_OFFSET, opened: -theme.spacing.sm }} style={styles.quickValuesKeyboardLayer}>
          {quickValues}
        </KeyboardStickyView>
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
    paddingBottom: theme.spacing.lg
  },
  approachSection: {
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
  quickValuesKeyboardLayer: {
    position: "absolute",
    right: theme.spacing[0],
    bottom: theme.spacing[0],
    left: theme.spacing[0],
    zIndex: 10
  },
  quickValuesOverlay: {
    marginHorizontal: theme.spacing.sm
  }
});
