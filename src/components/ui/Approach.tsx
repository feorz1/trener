import * as Haptics from "expo-haptics";
import { MenuView, type MenuAction } from "@react-native-menu/menu";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert as NativeAlert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextInputSelectionChangeEventData,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";
import type { MetricKey, MetricValues, WorkoutResultType } from "@/types";
import {
  formatDuration,
  formatMetricInputValue,
  formatPreviousSetValue,
  getLegacyValues,
  getTimerDisplaySeconds,
  getTimerElapsedSeconds,
  getTrackingPreset,
  hasAnyMetricValue,
  isSetCompleteAllowed,
  isTimerFinished,
  parseMetricInput,
  pickCompatibleValues,
  sanitizeMetricInput,
  type MetricDefinition,
  type SetTimerState,
  type TrackingPreset
} from "@/features/workouts/tracking";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { StagedSwipeDelete } from "./StagedSwipeDelete";
import { TextArea } from "./TextArea";

export type ApproachCountState = "default" | "selected" | "move";
export type ApproachSetStatus = "empty" | "completed" | "disabled";

export type ApproachSet = {
  id: string;
  index: number;
  resultType?: WorkoutResultType;
  values?: MetricValues;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  unit?: string;
  state?: ApproachCountState;
  status?: ApproachSetStatus;
};

export type ApproachSetMetric = MetricKey | "durationSeconds" | "distanceMeters";
export type ApproachSetValuePatch = Partial<Pick<ApproachSet, "values" | "reps" | "weight" | "durationSeconds" | "distanceMeters">> & {
  replaceValues?: boolean;
};

export type ApproachProps = {
  title?: string;
  imageSource?: ImageSourcePropType;
  sets?: ApproachSet[];
  previousSets?: ApproachSet[];
  trackingPreset?: TrackingPreset;
  resultType?: WorkoutResultType;
  note?: string;
  addLabel?: string;
  noteTitle?: string;
  noteSaveLabel?: string;
  showAddAction?: boolean;
  showDeleteAction?: boolean;
  activeTimer?: SetTimerState | null;
  onAddSet?: () => void;
  onRemoveLastSet?: () => void;
  onDeleteSet?: (id: string) => void;
  onEditExercise?: () => void;
  onDeleteExercise?: () => void;
  onNoteChange?: (note: string) => void;
  onSetStateChange?: (id: string, state: ApproachCountState) => void;
  onSetValueChange?: (id: string, patch: ApproachSetValuePatch) => void;
  onSetsReorder?: (sets: ApproachSet[]) => void;
  onApplyPrevious?: (id: string, values: MetricValues) => void;
  onStartTimer?: (setId: string, metricKey: "duration" | "interval", mode: SetTimerState["mode"], targetSeconds?: number) => void;
  onPauseTimer?: () => void;
  onResumeTimer?: () => void;
  onFinishTimer?: () => void;
  onResetTimer?: () => void;
  style?: StyleProp<ViewStyle>;
};

const defaultSets: ApproachSet[] = [
  { id: "one", index: 1, values: { weight: 25, reps: 12 }, weight: 25, reps: 12, state: "default" },
  { id: "two", index: 2, values: { weight: 25, reps: 12 }, weight: 25, reps: 12, state: "default" },
  { id: "three", index: 3, values: { weight: 25, reps: 12 }, weight: 25, reps: 12, state: "default" },
  { id: "four", index: 4, values: { weight: 25, reps: 12 }, weight: 25, reps: 12, state: "default" }
];

const emptyMetricTextById: Record<string, Record<MetricKey, string>> = {};
const exerciseMenuActions: MenuAction[] = [
  {
    id: "edit-note",
    title: "Редактировать заметку"
  },
  {
    id: "delete-exercise",
    title: "Удалить упражнение",
    attributes: {
      destructive: true
    }
  }
];
const metricInputReset =
  Platform.OS === "web"
    ? ({
        boxShadow: "none",
        outlineStyle: "none"
      } as TextStyle & { boxShadow: "none"; outlineStyle: "none" })
    : undefined;

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

function triggerNotification(type: Haptics.NotificationFeedbackType) {
  if (Platform.OS === "web") return;
  void Haptics.notificationAsync(type).catch(() => undefined);
}

function getUniqueSetIds(sets: ApproachSet[]) {
  const seen = new Set<string>();

  return sets.map((set, index) => {
    const baseId = set.id || `set-${index + 1}`;
    const id = seen.has(baseId) ? `${baseId}-${index + 1}` : baseId;
    seen.add(id);
    return { ...set, id, index: index + 1 };
  });
}

function normalizeSetValues(set: ApproachSet): MetricValues {
  return getLegacyValues({
    values: set.values,
    weight: set.weight,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    distanceMeters: set.distanceMeters
  });
}

function getValuePatch(values: MetricValues): ApproachSetValuePatch {
  return {
    values,
    replaceValues: true,
    weight: values.weight,
    reps: values.reps,
    durationSeconds: values.duration,
    distanceMeters: values.distance
  };
}

function getTextValuesById(sets: ApproachSet[], preset: TrackingPreset) {
  return sets.reduce<Record<string, Record<MetricKey, string>>>((valueById, set) => {
    const values = normalizeSetValues(set);
    valueById[set.id] = { ...emptyMetricTextById[set.id] };
    for (const metric of preset.metrics) {
      valueById[set.id][metric.key] = formatMetricInputValue(values[metric.key], metric);
    }
    return valueById;
  }, {});
}

function mergeTextValuesById(
  current: Record<string, Record<MetricKey, string>>,
  incoming: Record<string, Record<MetricKey, string>>
) {
  return Object.entries(incoming).reduce<Record<string, Record<MetricKey, string>>>((valueById, [setId, values]) => {
    valueById[setId] = { ...values, ...(current[setId] ?? {}) };
    return valueById;
  }, {});
}

function getPreviousSet(previousSets: ApproachSet[] | undefined, index: number, preset: TrackingPreset) {
  const previousSet = previousSets?.[index];
  if (!previousSet) return undefined;
  const values = pickCompatibleValues(normalizeSetValues(previousSet), preset.type);
  return hasAnyMetricValue(values) || preset.type === "completion_only" ? { set: previousSet, values } : undefined;
}

function noop() {}

function dismissKeyboardAndClearFocus() {
  const focusedInput = NativeTextInput.State.currentlyFocusedInput() as { blur?: () => void } | null;
  focusedInput?.blur?.();
  Keyboard.dismiss();
}

export function Approach({
  title = "Horizontal leg press machine",
  imageSource,
  sets = defaultSets,
  previousSets,
  trackingPreset,
  resultType,
  note,
  addLabel = "Добавить подход",
  noteTitle = "Заметка",
  noteSaveLabel = "Сохранить",
  showAddAction = true,
  showDeleteAction = false,
  activeTimer,
  onAddSet,
  onRemoveLastSet,
  onDeleteSet,
  onEditExercise,
  onDeleteExercise,
  onNoteChange,
  onSetStateChange,
  onSetValueChange,
  onApplyPrevious,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onFinishTimer,
  onResetTimer,
  style
}: ApproachProps) {
  const preset = useMemo(() => trackingPreset ?? getTrackingPreset(resultType ?? sets[0]?.resultType), [resultType, sets, trackingPreset]);
  const uniqueSets = useMemo(() => getUniqueSetIds(sets), [sets]);
  const initialTextById = useMemo(() => getTextValuesById(uniqueSets, preset), [preset, uniqueSets]);
  const [orderedSets, setOrderedSets] = useState(uniqueSets);
  const [textById, setTextById] = useState(initialTextById);
  const [savedNote, setSavedNote] = useState(note ?? "");
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [openDeleteRowId, setOpenDeleteRowId] = useState<string | null>(null);
  const resolvedNote = note ?? savedNote;
  const notePreview = resolvedNote.trim().replace(/\s+/g, " ");
  const hasPreviousColumn = Boolean(previousSets?.some((set) => hasAnyMetricValue(pickCompatibleValues(normalizeSetValues(set), preset.type)))) || preset.type === "completion_only";

  useEffect(() => {
    setOrderedSets(uniqueSets);
  }, [uniqueSets]);

  useEffect(() => {
    setTextById((current) => mergeTextValuesById(current, initialTextById));
  }, [initialTextById]);

  useEffect(() => {
    if (note !== undefined) setSavedNote(note);
  }, [note]);

  useEffect(() => {
    if (!noteModalVisible) setDraftNote(resolvedNote);
  }, [noteModalVisible, resolvedNote]);

  useEffect(() => {
    if (!activeTimer || !onFinishTimer) return;

    const interval = setInterval(() => {
      if (isTimerFinished(activeTimer)) onFinishTimer();
    }, 500);

    return () => clearInterval(interval);
  }, [activeTimer, onFinishTimer]);

  const closeOpenRow = useCallback(() => setOpenDeleteRowId(null), []);

  const showAppliedFeedback = useCallback(() => {
    triggerNotification(Haptics.NotificationFeedbackType.Success);
  }, []);

  const updateSetValues = useCallback(
    (setId: string, values: MetricValues) => {
      onSetValueChange?.(setId, getValuePatch(values));
    },
    [onSetValueChange]
  );

  const applyPrevious = useCallback(
    (set: ApproachSet, previousValues: MetricValues) => {
      const currentValues = pickCompatibleValues(normalizeSetValues(set), preset.type);
      const nextValues = { ...currentValues, ...previousValues };
      const commit = () => {
        onApplyPrevious?.(set.id, previousValues);
        updateSetValues(set.id, nextValues);
        setTextById((current) => ({
          ...current,
          [set.id]: preset.metrics.reduce<Record<MetricKey, string>>((result, metric) => {
            result[metric.key] = formatMetricInputValue(nextValues[metric.key], metric);
            return result;
          }, { ...(current[set.id] ?? {}) })
        }));
        showAppliedFeedback();
      };

      closeOpenRow();
      if (!hasAnyMetricValue(currentValues)) {
        commit();
        return;
      }

      NativeAlert.alert("Заменить текущие значения?", "Прошлый результат заменит заполненные поля этого подхода.", [
        { text: "Отмена", style: "cancel" },
        { text: "Заменить", style: "destructive", onPress: commit }
      ]);
    },
    [closeOpenRow, onApplyPrevious, preset.metrics, preset.type, showAppliedFeedback, updateSetValues]
  );

  const toggleSet = useCallback(
    (set: ApproachSet) => {
      dismissKeyboardAndClearFocus();
      closeOpenRow();
      const currentState = set.state ?? "default";
      const nextState: ApproachCountState = currentState === "selected" ? "default" : "selected";
      const values = pickCompatibleValues(normalizeSetValues(set), preset.type);
      if (nextState === "selected" && !isSetCompleteAllowed(preset.type, values)) {
        triggerNotification(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      onSetStateChange?.(set.id, nextState);
    },
    [closeOpenRow, onSetStateChange, preset.type]
  );

  const updateMetric = useCallback(
    (set: ApproachSet, metric: MetricDefinition, rawValue: string) => {
      const nextText = sanitizeMetricInput(rawValue, metric);
      const currentValues = normalizeSetValues(set);
      const parsedValue = parseMetricInput(nextText, metric);
      const nextValues = { ...currentValues };

      if (parsedValue === undefined) {
        delete nextValues[metric.key];
      } else {
        nextValues[metric.key] = parsedValue;
      }

      const currentState = set.state ?? "default";
      if (currentState === "selected" && !isSetCompleteAllowed(preset.type, pickCompatibleValues(nextValues, preset.type))) {
        onSetStateChange?.(set.id, "default");
      }

      setTextById((current) => ({
        ...current,
        [set.id]: {
          ...(current[set.id] ?? {}),
          [metric.key]: nextText
        }
      }));
      onSetValueChange?.(set.id, getValuePatch(nextValues));
    },
    [onSetStateChange, onSetValueChange, preset.type]
  );

  const handleDeleteSet = useCallback(
    (id: string) => {
      setOpenDeleteRowId(null);
      setOrderedSets((current) => getUniqueSetIds(current.filter((set) => set.id !== id)));
      onDeleteSet?.(id);
    },
    [onDeleteSet]
  );

  const removeLastSet = useCallback(() => {
    const lastSet = orderedSets[orderedSets.length - 1];
    if (!lastSet || orderedSets.length <= 1) return;

    const remove = () => {
      closeOpenRow();
      onRemoveLastSet?.();
      if (!onRemoveLastSet) handleDeleteSet(lastSet.id);
    };

    remove();
  }, [closeOpenRow, handleDeleteSet, onRemoveLastSet, orderedSets]);

  const saveNote = () => {
    setSavedNote(draftNote);
    onNoteChange?.(draftNote);
    setNoteModalVisible(false);
  };

  const editNote = useCallback(() => {
    if (onEditExercise) {
      onEditExercise();
      return;
    }
    setNoteModalVisible(true);
  }, [onEditExercise]);

  const deleteExercise = useCallback(() => {
    onDeleteExercise?.();
  }, [onDeleteExercise]);

  const handleEdit = () => {
    closeOpenRow();
    editNote();
  };

  return (
    <View style={[styles.root, style]}>
      <ApproachHeader
        title={title}
        imageSource={imageSource}
        notePreview={notePreview}
        onEdit={handleEdit}
        onDeleteExercise={onDeleteExercise ? deleteExercise : undefined}
      />

      <View style={styles.setList}>
        <ColumnHeader preset={preset} showPrevious={hasPreviousColumn} />
        {orderedSets.map((set, index) => {
          const previous = getPreviousSet(previousSets, index, preset);
          const currentSet = { ...set, index: index + 1, state: set.state ?? "default" };
          const activeTimerForSet = activeTimer?.setId === set.id ? activeTimer : null;

          return (
            <View key={set.id} style={styles.rowStack}>
              <SetRow
                set={currentSet}
                preset={preset}
                textValues={textById[set.id] ?? {}}
                previousLabel={previous ? formatPreviousSetValue(preset.type, previous.values) : "—"}
                previousInteractive={Boolean(previous)}
                showPrevious={hasPreviousColumn}
                showDeleteAction={showDeleteAction}
                deleteOpen={openDeleteRowId === set.id}
                timer={activeTimerForSet}
                onApplyPrevious={previous ? () => applyPrevious(currentSet, previous.values) : undefined}
                onDelete={onDeleteSet ? () => handleDeleteSet(set.id) : undefined}
                onDeleteOpenChange={(open) => setOpenDeleteRowId(open ? set.id : null)}
                onFocus={closeOpenRow}
                onMetricChange={(metric, value) => updateMetric(currentSet, metric, value)}
                onStartTimer={onStartTimer ? (metricKey, mode, targetSeconds) => onStartTimer(set.id, metricKey, mode, targetSeconds) : undefined}
                onToggle={() => toggleSet(currentSet)}
              />
              {activeTimerForSet ? (
                <SetTimerPanel
                  timer={activeTimerForSet}
                  onPause={onPauseTimer}
                  onResume={onResumeTimer}
                  onFinish={onFinishTimer}
                  onReset={onResetTimer}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {showAddAction ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Удалить последний подход"
            accessibilityRole="button"
            accessibilityState={{ disabled: orderedSets.length <= 1 }}
            disabled={orderedSets.length <= 1}
            onPress={removeLastSet}
            style={({ pressed }) => [styles.actionButton, orderedSets.length <= 1 && styles.actionButtonDisabled, pressed && styles.actionButtonPressed]}
          >
            <Icon name="minus" size={theme.sizes.approachStatusIcon} color={orderedSets.length <= 1 ? theme.colors.content.disabled : theme.colors.content.ink} />
          </Pressable>
          <Pressable
            accessibilityLabel="Добавить подход"
            accessibilityRole="button"
            onPress={() => {
              closeOpenRow();
              onAddSet?.();
            }}
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          >
            <Icon name="add" size={theme.sizes.approachStatusIcon} color={theme.colors.content.ink} />
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={noteModalVisible}
        presentation="overlay"
        title={noteTitle}
        showSubline={false}
        showBodyText={false}
        actionLayout="single"
        primaryAction={{ label: noteSaveLabel, onPress: saveNote }}
        onClose={() => setNoteModalVisible(false)}
        bodyStyle={styles.noteModalBody}
        actionStyle={styles.noteModalAction}
      >
        <TextArea
          label={noteTitle}
          showLabel={false}
          showMessage={false}
          width="fill"
          value={draftNote}
          placeholder=""
          style={styles.noteModalTextArea}
          onChangeText={setDraftNote}
        />
      </Modal>
    </View>
  );
}

function ApproachHeader({
  title,
  imageSource,
  notePreview,
  onEdit,
  onDeleteExercise
}: {
  title: string;
  imageSource?: ImageSourcePropType;
  notePreview?: string;
  onEdit: () => void;
  onDeleteExercise?: () => void;
}) {
  const editButton = (
    <Button
      accessibilityLabel="Редактировать упражнение"
      type="secondaryNeutral"
      size="smallIcon"
      icon={<Icon name="edit" size={theme.sizes.buttonIconSmall} color={theme.colors.content.ink} />}
      onPress={onDeleteExercise ? undefined : onEdit}
    />
  );

  const handleMenuAction = ({ nativeEvent }: { nativeEvent: { event: string } }) => {
    if (nativeEvent.event === "edit-note") onEdit();
    if (nativeEvent.event === "delete-exercise") onDeleteExercise?.();
  };

  return (
    <View style={styles.header}>
      <View style={styles.thumbnail}>
        {imageSource ? <Image source={imageSource} resizeMode="cover" style={styles.thumbnailImage} /> : <ThumbnailFallback />}
      </View>
      <View style={styles.headerText}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </Text>
        {notePreview ? (
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.note}>
            {notePreview}
          </Text>
        ) : null}
      </View>
      {onDeleteExercise ? (
        <MenuView
          actions={exerciseMenuActions}
          isAnchoredToRight
          shouldOpenOnLongPress={false}
          themeVariant="light"
          onPressAction={handleMenuAction}
        >
          {editButton}
        </MenuView>
      ) : (
        editButton
      )}
    </View>
  );
}

function ThumbnailFallback() {
  return (
    <View style={styles.thumbnailFallbackRoot}>
      <View style={styles.thumbnailFallbackTop} />
      <View style={styles.thumbnailFallbackBottom} />
    </View>
  );
}

function ColumnHeader({ preset, showPrevious }: { preset: TrackingPreset; showPrevious: boolean }) {
  if (preset.layout === "expanded") return null;

  return (
    <View style={[styles.columnHeader, !showPrevious && styles.columnHeaderNoPrevious]}>
      <View style={styles.numberHeaderSpace} />
      {showPrevious ? <Text style={[styles.columnHeaderText, styles.previousHeaderText]}>ПРОШЛЫЙ</Text> : null}
      <View style={styles.metricsHeaderGroup}>
        {preset.metrics.map((metric) => (
          <Text key={metric.key} style={[styles.columnHeaderText, styles.metricHeaderText]}>
            {metric.shortLabel.toUpperCase()}
          </Text>
        ))}
      </View>
      <View style={styles.statusHeaderSpace} />
    </View>
  );
}

function SetRow({
  set,
  preset,
  textValues,
  previousLabel,
  previousInteractive,
  showPrevious,
  showDeleteAction,
  deleteOpen,
  timer,
  onApplyPrevious,
  onDelete,
  onDeleteOpenChange,
  onFocus,
  onMetricChange,
  onStartTimer,
  onToggle
}: {
  set: ApproachSet;
  preset: TrackingPreset;
  textValues: Partial<Record<MetricKey, string>>;
  previousLabel: string;
  previousInteractive: boolean;
  showPrevious: boolean;
  showDeleteAction: boolean;
  deleteOpen?: boolean;
  timer?: SetTimerState | null;
  onApplyPrevious?: () => void;
  onDelete?: () => void;
  onDeleteOpenChange?: (open: boolean) => void;
  onFocus: () => void;
  onMetricChange: (metric: MetricDefinition, value: string) => void;
  onStartTimer?: (metricKey: "duration" | "interval", mode: SetTimerState["mode"], targetSeconds?: number) => void;
  onToggle: () => void;
}) {
  const isExpanded = preset.layout === "expanded" || preset.metrics.length > 2;
  const selected = set.state === "selected";
  const disabled = set.status === "disabled";
  const values = pickCompatibleValues(normalizeSetValues(set), preset.type);
  const canComplete = isSetCompleteAllowed(preset.type, values);
  const statusControl = (
    <Pressable
      accessibilityLabel={`Завершить подход ${set.index}`}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: disabled || !canComplete }}
      disabled={disabled || !canComplete}
      hitSlop={theme.spacing.sm}
      onPress={onToggle}
      style={styles.statusButton}
    >
      <View style={[styles.statusCircle, selected ? styles.statusCircleSelected : styles.statusCircleMuted, !canComplete && styles.statusCircleDisabled]}>
        <Icon name="checkmark" size={theme.sizes.buttonIconSmall} color={selected ? theme.colors.content.primaryPale : theme.colors.background.canvas} />
      </View>
    </Pressable>
  );

  const rowContent = (
    <View style={[styles.rowRoot, isExpanded && styles.rowRootExpanded, selected && styles.rowRootSelected]}>
      {isExpanded ? (
        <>
          <View style={styles.expandedTop}>
            <SetNumber index={set.index} selected={selected} />
            <PreviousSetValue
              label={previousLabel}
              index={set.index}
              interactive={previousInteractive}
              onPress={onApplyPrevious}
            />
            {statusControl}
          </View>
          <View style={[styles.expandedGrid, preset.metrics.length === 3 && styles.expandedGridThree]}>
            {preset.metrics.map((metric) => (
              <MetricInput
                key={metric.key}
                metric={metric}
                value={textValues[metric.key] ?? ""}
                disabled={disabled}
                timerActive={timer?.metricKey === metric.key}
                timerMode={preset.timer?.metric === metric.key ? preset.timer.mode : undefined}
                selected={selected}
                timerAccessibilityLabel={`Запустить таймер подхода ${set.index}`}
                onChange={(value) => onMetricChange(metric, value)}
                onFocus={onFocus}
                onStartTimer={
                  preset.timer?.metric === metric.key && onStartTimer
                    ? () => onStartTimer(preset.timer!.metric, preset.timer!.mode, values[preset.timer!.metric])
                    : undefined
                }
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <SetNumber index={set.index} selected={selected} />
          {showPrevious ? (
            <PreviousSetValue
              label={previousLabel}
              index={set.index}
              interactive={previousInteractive}
              onPress={onApplyPrevious}
            />
          ) : null}
          <View style={styles.compactMetrics}>
            {preset.metrics.map((metric) => (
              <MetricInput
                key={metric.key}
                metric={metric}
                value={textValues[metric.key] ?? ""}
                disabled={disabled}
                compact
                timerActive={timer?.metricKey === metric.key}
                timerMode={preset.timer?.metric === metric.key ? preset.timer.mode : undefined}
                selected={selected}
                timerAccessibilityLabel={`Запустить таймер подхода ${set.index}`}
                onChange={(value) => onMetricChange(metric, value)}
                onFocus={onFocus}
                onStartTimer={
                  preset.timer?.metric === metric.key && onStartTimer
                    ? () => onStartTimer(preset.timer!.metric, preset.timer!.mode, values[preset.timer!.metric])
                    : undefined
                }
              />
            ))}
          </View>
          {statusControl}
        </>
      )}
    </View>
  );

  if (!showDeleteAction || !onDelete) return rowContent;

  return (
    <StagedSwipeDelete
      accessibilityLabel={`Удалить подход ${set.index}`}
      deleteWidth={theme.sizes.approachDeleteWidth}
      open={deleteOpen}
      onDelete={onDelete}
      onOpenChange={onDeleteOpenChange}
      style={styles.swipeRow}
    >
      {rowContent}
    </StagedSwipeDelete>
  );
}

function SetNumber({ index, selected }: { index: number; selected: boolean }) {
  return (
    <View style={[styles.numberPill, selected && styles.numberPillSelected]}>
      <Text style={styles.numberText}>{index}</Text>
    </View>
  );
}

function PreviousSetValue({
  label,
  index,
  interactive,
  onPress
}: {
  label: string;
  index: number;
  interactive: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={interactive ? `Подставить прошлый результат в подход ${index}` : undefined}
      accessibilityRole={interactive ? "button" : undefined}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [styles.previousValue, pressed && styles.previousValuePressed]}
    >
      <Text style={styles.previousValueText}>{label}</Text>
    </Pressable>
  );
}

function MetricInput({
  metric,
  value,
  disabled,
  compact = false,
  timerActive,
  timerMode,
  selected,
  timerAccessibilityLabel,
  onChange,
  onFocus,
  onStartTimer
}: {
  metric: MetricDefinition;
  value: string;
  disabled: boolean;
  compact?: boolean;
  timerActive?: boolean;
  timerMode?: SetTimerState["mode"];
  selected?: boolean;
  timerAccessibilityLabel?: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onStartTimer?: () => void;
}) {
  const inputRef = useRef<NativeTextInput>(null);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const showTimer = Boolean(onStartTimer && (metric.key === "duration" || metric.key === "interval"));

  useEffect(() => {
    if (!focused) setSelection({ start: value.length, end: value.length });
  }, [focused, value.length]);

  const moveCaretToEnd = useCallback(() => {
    const nextSelection = { start: value.length, end: value.length };
    setSelection(nextSelection);
    requestAnimationFrame(() => {
      if (typeof inputRef.current?.setNativeProps === "function") inputRef.current.setNativeProps({ selection: nextSelection });
    });
  }, [value]);

  return (
    <View style={[styles.metricField, compact && styles.metricFieldCompact, selected && styles.metricFieldSelected]}>
      <NativeTextInput
        ref={inputRef}
        accessibilityLabel={metric.label}
        editable={!disabled}
        keyboardType={metric.inputType === "duration" ? "numbers-and-punctuation" : "decimal-pad"}
        onBlur={() => setFocused(false)}
        onChangeText={onChange}
        onFocus={() => {
          onFocus();
          setFocused(true);
          moveCaretToEnd();
        }}
        onSelectionChange={(event: { nativeEvent: TextInputSelectionChangeEventData }) => setSelection(event.nativeEvent.selection)}
        placeholder={metric.inputType === "duration" ? "0:00" : ""}
        placeholderTextColor={theme.colors.content.disabled}
        selection={focused ? selection : undefined}
        style={[styles.metricInput, showTimer && styles.metricInputWithTimer, disabled && styles.metricDisabledText, metricInputReset]}
        value={value}
      />
      {showTimer ? (
        <Pressable
          accessibilityLabel={timerAccessibilityLabel ?? "Запустить таймер подхода"}
          accessibilityRole="button"
          onPress={() => {
            if (timerMode === "countdown" && !value.trim()) {
              triggerNotification(Haptics.NotificationFeedbackType.Warning);
            }
            onStartTimer?.();
          }}
          style={({ pressed }) => [styles.timerButton, timerActive && styles.timerButtonActive, pressed && styles.actionButtonPressed]}
        >
          <Icon name="clock" size={theme.sizes.buttonIconSmall} color={timerActive ? theme.colors.content.inkDeep : theme.colors.content.body} />
        </Pressable>
      ) : null}
      {focused ? <View pointerEvents="none" style={styles.metricFocusBorder} /> : null}
    </View>
  );
}

function SetTimerPanel({
  timer,
  onPause,
  onResume,
  onFinish,
  onReset
}: {
  timer: SetTimerState;
  onPause?: () => void;
  onResume?: () => void;
  onFinish?: () => void;
  onReset?: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const displaySeconds = getTimerDisplaySeconds(timer, now);
  const elapsedSeconds = getTimerElapsedSeconds(timer, now);
  const isRunning = timer.status === "running";
  const isPaused = timer.status === "paused";

  return (
    <View style={styles.timerPanel}>
      <Text style={styles.timerValue}>{formatDuration(displaySeconds)}</Text>
      <View style={styles.timerActions}>
        {isRunning ? (
          <TimerAction label="Пауза" accessibilityLabel="Поставить таймер на паузу" onPress={onPause} />
        ) : (
          <TimerAction label={isPaused ? "Продолжить" : "Старт"} accessibilityLabel="Продолжить таймер" onPress={onResume} />
        )}
        <TimerAction label="Завершить" accessibilityLabel="Завершить таймер" onPress={onFinish} />
        <TimerAction label="Сбросить" accessibilityLabel="Сбросить таймер" onPress={onReset} />
      </View>
      {timer.mode === "countdown" ? <Text style={styles.timerMeta}>Прошло {formatDuration(elapsedSeconds)}</Text> : null}
    </View>
  );
}

function TimerAction({ label, accessibilityLabel, onPress }: { label: string; accessibilityLabel: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.timerAction, pressed && styles.actionButtonPressed]}>
      <Text style={styles.timerActionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: theme.sizes.approachBorderWidth,
    borderColor: theme.colors.background.border,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  header: {
    minHeight: theme.sizes.approachHeaderThumb,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingRight: theme.spacing.sm,
    overflow: "hidden"
  },
  thumbnail: {
    width: theme.sizes.approachHeaderThumb,
    height: theme.sizes.approachHeaderThumb,
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: theme.radius.lg
  },
  thumbnailFallbackRoot: {
    flex: 1,
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.content.primaryPale
  },
  thumbnailFallbackTop: {
    flex: 1,
    backgroundColor: theme.colors.accent.cyan
  },
  thumbnailFallbackBottom: {
    flex: 1,
    backgroundColor: theme.colors.accent.orange
  },
  headerText: {
    flex: 1,
    minWidth: theme.spacing[0],
    gap: theme.spacing.xxs
  },
  title: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  note: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.mute
  },
  setList: {
    gap: theme.spacing.xs,
    position: "relative"
  },
  columnHeader: {
    minHeight: theme.spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm
  },
  columnHeaderNoPrevious: {
    paddingLeft: theme.spacing.md
  },
  columnHeaderText: {
    minWidth: theme.spacing[0],
    textAlign: "center",
    ...theme.typography.body.smCaption,
    color: theme.colors.content.mute
  },
  previousHeaderText: {
    flex: 1
  },
  metricsHeaderGroup: {
    flex: 2,
    minWidth: theme.spacing[0],
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  metricHeaderText: {
    flex: 1
  },
  numberHeaderSpace: {
    width: theme.sizes.approachCountNumber
  },
  statusHeaderSpace: {
    width: theme.sizes.touchTargetMin
  },
  rowStack: {
    gap: theme.spacing.xs
  },
  swipeRow: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  rowRoot: {
    width: "100%",
    minHeight: theme.sizes.approachCountRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  rowRootExpanded: {
    minHeight: theme.sizes.approachCountRowMinHeight + theme.sizes.touchTargetComfort + theme.spacing.lg,
    alignItems: "stretch",
    flexDirection: "column",
    gap: theme.spacing.md
  },
  rowRootSelected: {
    backgroundColor: theme.colors.content.primaryPale
  },
  expandedTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  expandedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  expandedGridThree: {
    flexWrap: "nowrap"
  },
  numberPill: {
    width: theme.sizes.approachCountNumber,
    height: theme.sizes.approachCountNumber,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background.canvasSoft
  },
  numberPillSelected: {
    backgroundColor: theme.colors.background.canvas
  },
  numberText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.inkDeep
  },
  previousValue: {
    flex: 1,
    minHeight: theme.sizes.touchTargetMin,
    minWidth: theme.spacing[0],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md
  },
  previousValuePressed: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  previousValueText: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  compactMetrics: {
    flex: 2,
    minWidth: theme.spacing[0],
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  metricField: {
    flexGrow: 1,
    flexBasis: "47%",
    minHeight: theme.sizes.touchTargetComfort,
    minWidth: theme.spacing[0],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvasSoft
  },
  metricFieldSelected: {
    backgroundColor: "transparent"
  },
  metricFieldCompact: {
    flex: 1,
    flexBasis: 0
  },
  metricInput: {
    width: "100%",
    minHeight: theme.sizes.touchTargetComfort,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing[0],
    margin: theme.spacing[0],
    textAlign: "center",
    textAlignVertical: "center",
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink,
    backgroundColor: "transparent"
  },
  metricInputWithTimer: {
    paddingRight: theme.sizes.buttonSmallIconWidth
  },
  metricDisabledText: {
    color: theme.colors.content.mute
  },
  metricFocusBorder: {
    position: "absolute",
    inset: theme.spacing[0],
    borderWidth: 2,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.content.inkDeep
  },
  timerButton: {
    position: "absolute",
    right: theme.spacing.xs,
    width: theme.sizes.buttonSmallIconWidth,
    height: theme.sizes.buttonSmallIconHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill
  },
  timerButtonActive: {
    backgroundColor: theme.colors.content.primaryPale
  },
  statusButton: {
    width: theme.sizes.touchTargetMin,
    height: theme.sizes.touchTargetMin,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  statusCircle: {
    width: theme.sizes.approachStatusIcon,
    height: theme.sizes.approachStatusIcon,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  statusCircleSelected: {
    backgroundColor: theme.colors.status.positiveDeep
  },
  statusCircleMuted: {
    backgroundColor: theme.colors.content.disabled
  },
  statusCircleDisabled: {
    opacity: 0.5
  },
  timerPanel: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  timerValue: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  timerActions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  timerAction: {
    flex: 1,
    minHeight: theme.sizes.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.canvas
  },
  timerActionText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  timerMeta: {
    ...theme.typography.body.smCaption,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  actionButton: {
    flex: 1,
    height: theme.sizes.buttonLargeHeight,
    minHeight: theme.sizes.touchTargetMin,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  actionButtonDisabled: {
    opacity: 0.55
  },
  actionButtonPressed: {
    opacity: 0.82
  },
  noteModalBody: {
    paddingHorizontal: theme.spacing[0],
    paddingVertical: theme.spacing.xs
  },
  noteModalTextArea: {
    paddingBottom: theme.spacing.md
  },
  noteModalAction: {
    padding: theme.spacing.lg
  }
});
