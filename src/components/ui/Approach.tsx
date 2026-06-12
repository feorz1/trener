import * as Haptics from "expo-haptics";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Image,
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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing as ReanimatedEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue
} from "react-native-reanimated";
import { theme } from "@/theme";
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
  reps?: number;
  weight?: number;
  unit?: string;
  state?: ApproachCountState;
  status?: ApproachSetStatus;
};

export type ApproachProps = {
  title?: string;
  imageSource?: ImageSourcePropType;
  sets?: ApproachSet[];
  note?: string;
  addLabel?: string;
  noteTitle?: string;
  noteSaveLabel?: string;
  showAddAction?: boolean;
  showDeleteAction?: boolean;
  onAddSet?: () => void;
  onDeleteSet?: (id: string) => void;
  onNoteChange?: (note: string) => void;
  onSetStateChange?: (id: string, state: ApproachCountState) => void;
  onSetValueChange?: (id: string, patch: Partial<Pick<ApproachSet, "weight" | "reps">>) => void;
  onSetsReorder?: (sets: ApproachSet[]) => void;
  style?: StyleProp<ViewStyle>;
};

const defaultSets: ApproachSet[] = [
  { id: "one", index: 1, reps: 12, weight: 150, status: "completed" },
  { id: "two", index: 1, reps: 12, weight: 150, status: "completed" },
  { id: "three", index: 1, reps: 12, weight: 150, status: "completed" },
  { id: "four", index: 4, reps: 12, weight: 150, status: "completed" }
];

function getStateById(sets: ApproachSet[]) {
  return sets.reduce<Record<string, ApproachCountState>>((stateById, set) => {
    stateById[set.id] = set.state ?? "default";
    return stateById;
  }, {});
}

function getValueById(sets: ApproachSet[]) {
  return sets.reduce<Record<string, { reps: string; weight: string }>>((valueById, set) => {
    valueById[set.id] = {
      reps: set.reps === undefined ? "" : String(set.reps),
      weight: set.weight === undefined ? "" : String(set.weight)
    };
    return valueById;
  }, {});
}

function parseMetricValue(value: string) {
  const normalizedValue = value.replace(",", ".").trim();
  if (!normalizedValue) return undefined;

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function sanitizeMetricValue(value: string) {
  return value.replace(/[^\d.,]/g, "");
}

const metricInputReset =
  Platform.OS === "web"
    ? ({
        boxShadow: "none",
        outlineStyle: "none"
      } as TextStyle & { boxShadow: "none"; outlineStyle: "none" })
    : undefined;
const ROW_SLOT_HEIGHT = theme.sizes.approachCountRowMinHeight + theme.spacing.xs;
const TIMING_CONFIG = { duration: 180, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) };

type DragState = {
  id: string;
  startIndex: number;
  targetIndex: number;
};

type DragSession = {
  id: string;
  startIndex: number;
  targetIndex: number;
};

type DragBounds = {
  startIndex: number;
  itemCount: number;
  min: number;
  max: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampWorklet(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function roundTranslateWorklet(value: number) {
  "worklet";
  return Math.round(value);
}

function moveItem<T>(items: T[], from: number, to: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(from, 1);
  nextItems.splice(to, 0, item);
  return nextItems;
}

function normalizeSetIndexes(sets: ApproachSet[]) {
  return sets.map((set, index) => ({ ...set, index: index + 1 }));
}

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

function triggerSelection() {
  if (Platform.OS === "web") return;
  void Haptics.selectionAsync().catch(() => undefined);
}

function noop() {}

export function Approach({
  title = "Horizontal leg press machine",
  imageSource,
  sets = defaultSets,
  note,
  addLabel = "Add set",
  noteTitle = "Заметка",
  noteSaveLabel = "Сохранить",
  showAddAction = true,
  showDeleteAction = false,
  onAddSet,
  onDeleteSet,
  onNoteChange,
  onSetStateChange,
  onSetValueChange,
  onSetsReorder,
  style
}: ApproachProps) {
  const initialStateById = useMemo(() => getStateById(sets), [sets]);
  const initialValueById = useMemo(() => getValueById(sets), [sets]);
  const [orderedSets, setOrderedSets] = useState(sets);
  const [stateById, setStateById] = useState(initialStateById);
  const [valueById, setValueById] = useState(initialValueById);
  const [savedNote, setSavedNote] = useState(note ?? "");
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragY = useSharedValue<number>(theme.spacing[0]);
  const dragTargetIndex = useSharedValue<number>(theme.spacing[0]);
  const orderedSetsRef = useRef(sets);
  const dragSession = useRef<DragSession | null>(null);
  const [openDeleteRowId, setOpenDeleteRowId] = useState<string | null>(null);
  const resolvedNote = note ?? savedNote;
  const notePreview = resolvedNote.trim().replace(/\s+/g, " ");
  const draggedSet = dragState ? orderedSets.find((set) => set.id === dragState.id) : undefined;
  const dragOverlayTop = dragState ? dragState.startIndex * ROW_SLOT_HEIGHT : theme.spacing[0];

  useEffect(() => {
    orderedSetsRef.current = sets;
    setOrderedSets(sets);
  }, [sets]);

  useEffect(() => {
    orderedSetsRef.current = orderedSets;
  }, [orderedSets]);

  useEffect(() => {
    setStateById(initialStateById);
  }, [initialStateById]);

  useEffect(() => {
    setValueById(initialValueById);
  }, [initialValueById]);

  useEffect(() => {
    if (note !== undefined) {
      setSavedNote(note);
    }
  }, [note]);

  useEffect(() => {
    if (!noteModalVisible) {
      setDraftNote(resolvedNote);
    }
  }, [noteModalVisible, resolvedNote]);

  const closeOpenRow = useCallback(() => {
    setOpenDeleteRowId(null);
  }, []);

  const handleRowSwipePressHoldChange = useCallback((id: string, pressed: boolean) => {
    if (!pressed) return;
    setOpenDeleteRowId((current) => (current && current !== id ? null : current));
  }, []);

  const handleRowOpenChange = useCallback((id: string, open: boolean) => {
    setOpenDeleteRowId((current) => {
      if (open) return id;
      return current === id ? null : current;
    });
  }, []);

  const handleRowDelete = useCallback(
    (id: string) => {
      setOpenDeleteRowId(null);
      setOrderedSets((current) => normalizeSetIndexes(current.filter((set) => set.id !== id)));
      onDeleteSet?.(id);
    },
    [onDeleteSet]
  );

  const startRowDrag = useCallback(
    (id: string, index: number) => {
      const rowState = stateById[id] ?? orderedSets[index]?.state ?? "default";
      if (rowState !== "move") return;

      closeOpenRow();
      dragY.value = theme.spacing[0];
      dragTargetIndex.value = index;
      dragSession.current = { id, startIndex: index, targetIndex: index };
      setDragState({ id, startIndex: index, targetIndex: index });
      triggerImpact(Haptics.ImpactFeedbackStyle.Light);
    },
    [closeOpenRow, dragTargetIndex, dragY, orderedSets, stateById]
  );

  const updateRowDragTarget = useCallback(
    (targetIndexValue: number) => {
      const session = dragSession.current;
      if (!session) return;

      const targetIndex = clamp(targetIndexValue, 0, orderedSets.length - 1);
      if (targetIndex !== session.targetIndex) {
        session.targetIndex = targetIndex;
        setDragState((current) => (current?.id === session.id ? { ...current, targetIndex } : current));
        triggerSelection();
      }
    },
    [orderedSets.length]
  );

  const finishRowDrag = useCallback(() => {
    const session = dragSession.current;
    if (!session) return;

    dragSession.current = null;

    if (session.targetIndex === session.startIndex) {
      dragY.value = theme.spacing[0];
      setDragState(null);
      return;
    }

    const currentSets = orderedSetsRef.current;
    const currentIndex = currentSets.findIndex((set) => set.id === session.id);
    if (currentIndex < 0) {
      dragY.value = theme.spacing[0];
      setDragState(null);
      return;
    }

    const nextIndex = clamp(session.targetIndex, 0, currentSets.length - 1);
    const nextSets = normalizeSetIndexes(moveItem(currentSets, currentIndex, nextIndex));
    orderedSetsRef.current = nextSets;

    setOrderedSets(nextSets);
    dragY.value = theme.spacing[0];
    setDragState(null);
    onSetsReorder?.(nextSets);
  }, [dragY, onSetsReorder]);

  const toggleSet = (id: string) => {
    closeOpenRow();
    const nextState: ApproachCountState = stateById[id] === "selected" ? "default" : "selected";
    setStateById((current) => ({ ...current, [id]: nextState }));
    onSetStateChange?.(id, nextState);
  };

  const updateSetValue = (id: string, key: "reps" | "weight", value: string) => {
    const nextValue = sanitizeMetricValue(value);
    setValueById((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? { reps: "", weight: "" }),
        [key]: nextValue
      }
    }));
    const parsedValue = parseMetricValue(nextValue);
    const patch: Partial<Pick<ApproachSet, "weight" | "reps">> = key === "weight" ? { weight: parsedValue } : { reps: parsedValue };
    onSetValueChange?.(id, patch);
  };

  const saveNote = () => {
    setSavedNote(draftNote);
    onNoteChange?.(draftNote);
    setNoteModalVisible(false);
  };

  return (
    <View style={[styles.root, style]}>
      <View style={styles.header}>
        <View style={styles.thumbnail}>
          {imageSource ? <Image source={imageSource} resizeMode="cover" style={styles.thumbnailImage} /> : <ThumbnailFallback />}
        </View>
        <View style={styles.headerText}>
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {notePreview ? (
            <Text numberOfLines={1} style={styles.note}>
              {notePreview}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel="Edit note"
          accessibilityRole="button"
          onPress={() => {
            closeOpenRow();
            setNoteModalVisible(true);
          }}
          style={({ pressed }) => [styles.noteButton, pressed && styles.noteButtonPressed]}
        >
          <Icon name="edit" size={theme.sizes.buttonIconSmall} color={theme.colors.content.ink} />
        </Pressable>
      </View>

      <View style={styles.setList}>
        {orderedSets.map((set, index) => {
          const resolvedState = stateById[set.id] ?? set.state ?? "default";
          const isDragging = dragState?.id === set.id;
          const shouldRenderPlaceholderBefore = Boolean(
            dragState && dragState.targetIndex <= dragState.startIndex && dragState.targetIndex === index
          );
          const shouldRenderPlaceholderAfter = Boolean(
            dragState && dragState.targetIndex > dragState.startIndex && dragState.targetIndex === index
          );
          const dragSourceTop = index * ROW_SLOT_HEIGHT;

          return (
            <Fragment key={set.id}>
              {shouldRenderPlaceholderBefore ? <ApproachDragPlaceholder /> : null}
              <ApproachRowLayer isDragging={isDragging} top={dragSourceTop}>
                <ApproachCount
                  set={{ ...set, index: index + 1, state: resolvedState }}
                  values={valueById[set.id] ?? { reps: "", weight: "" }}
                  showDeleteAction={showDeleteAction}
                  deleteOpen={openDeleteRowId === set.id}
                  dragY={dragY}
                  dragBounds={{
                    startIndex: index,
                    itemCount: orderedSets.length,
                    min: -index * ROW_SLOT_HEIGHT,
                    max: (orderedSets.length - 1 - index) * ROW_SLOT_HEIGHT
                  }}
                  dragTargetIndex={dragTargetIndex}
                  onDelete={onDeleteSet ? () => handleRowDelete(set.id) : undefined}
                  onFocus={closeOpenRow}
                  onMetricChange={(key, value) => updateSetValue(set.id, key, value)}
                  onMoveEnd={finishRowDrag}
                  onMoveStart={() => startRowDrag(set.id, index)}
                  onMoveTargetChange={updateRowDragTarget}
                  onSwipePressHoldChange={(pressed) => handleRowSwipePressHoldChange(set.id, pressed)}
                  onDeleteOpenChange={(open) => handleRowOpenChange(set.id, open)}
                  onToggle={() => toggleSet(set.id)}
                />
              </ApproachRowLayer>
              {shouldRenderPlaceholderAfter ? <ApproachDragPlaceholder /> : null}
            </Fragment>
          );
        })}
        {draggedSet ? (
          <DragOverlay dragY={dragY} top={dragOverlayTop}>
            <ApproachCount
              set={{ ...draggedSet, index: dragState!.startIndex + 1, state: stateById[draggedSet.id] ?? draggedSet.state ?? "default" }}
              values={valueById[draggedSet.id] ?? { reps: "", weight: "" }}
              showDeleteAction={false}
              dragY={dragY}
              dragBounds={{
                startIndex: dragState!.startIndex,
                itemCount: orderedSets.length,
                min: -dragState!.startIndex * ROW_SLOT_HEIGHT,
                max: (orderedSets.length - 1 - dragState!.startIndex) * ROW_SLOT_HEIGHT
              }}
              dragTargetIndex={dragTargetIndex}
              onMetricChange={noop}
              onToggle={noop}
            />
          </DragOverlay>
        ) : null}
      </View>

      {showAddAction ? (
        <Button
          icon={<Icon name="add" size={theme.sizes.approachStatusIcon} color={theme.colors.content.ink} />}
          label={addLabel}
          type="secondaryNeutral"
          size="large"
          width="fill"
          onPress={() => {
            closeOpenRow();
            onAddSet?.();
          }}
        />
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

function ThumbnailFallback() {
  return (
    <View style={styles.thumbnailFallbackRoot}>
      <View style={styles.thumbnailFallbackTop} />
      <View style={styles.thumbnailFallbackBottom} />
    </View>
  );
}

function ApproachRowLayer({
  children,
  isDragging,
  top
}: {
  children: ReactNode;
  isDragging: boolean;
  top: number;
}) {
  return (
    <Animated.View
      collapsable={false}
      style={[styles.dragRowLayer, isDragging && styles.dragSourceLayer, isDragging && { top }]}
    >
      {children}
    </Animated.View>
  );
}

function ApproachDragPlaceholder() {
  return <View style={styles.dragPlaceholder} />;
}

function DragOverlay({ children, dragY, top }: { children: ReactNode; dragY: SharedValue<number>; top: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: roundTranslateWorklet(dragY.value) }]
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.dragOverlay, { top }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

function ApproachCount({
  set,
  values,
  showDeleteAction,
  deleteOpen,
  dragY,
  dragBounds,
  dragTargetIndex,
  onDelete,
  onDeleteOpenChange,
  onFocus,
  onMetricChange,
  onMoveEnd,
  onMoveStart,
  onMoveTargetChange,
  onSwipePressHoldChange,
  onToggle
}: {
  set: ApproachSet;
  values: { reps: string; weight: string };
  showDeleteAction: boolean;
  deleteOpen?: boolean;
  dragY: SharedValue<number>;
  dragBounds: DragBounds;
  dragTargetIndex: SharedValue<number>;
  onDelete?: () => void;
  onDeleteOpenChange?: (open: boolean) => void;
  onFocus?: () => void;
  onMetricChange: (key: "reps" | "weight", value: string) => void;
  onMoveEnd?: () => void;
  onMoveStart?: () => void;
  onMoveTargetChange?: (targetIndex: number) => void;
  onSwipePressHoldChange?: (pressed: boolean) => void;
  onToggle: () => void;
}) {
  const isSelected = set.state === "selected";
  const isMuted = set.status === "disabled";
  const isEmpty = set.status === "empty";
  const canDelete = Boolean(showDeleteAction && onDelete);
  const isMove = set.state === "move";
  const isToggleDisabled = isMuted || isEmpty || isMove;
  const gestureTargetIndex = useSharedValue<number>(dragBounds.startIndex);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  const handleSwipePressHoldChange = useCallback(
    (pressed: boolean) => {
      onSwipePressHoldChange?.(pressed);
    },
    [onSwipePressHoldChange]
  );

  const moveGesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(theme.sizes.approachDragLongPressDelay)
        .activeOffsetY([-theme.spacing.xs, theme.spacing.xs])
        .failOffsetX([-theme.spacing["2xl"], theme.spacing["2xl"]])
        .onStart(() => {
          dragY.value = theme.spacing[0];
          gestureTargetIndex.value = dragBounds.startIndex;
          runOnJS(onMoveStart ?? noop)();
        })
        .onUpdate((event) => {
          const nextDragY = clampWorklet(event.translationY, dragBounds.min, dragBounds.max);
          const nextTargetIndex = clampWorklet(Math.round(dragBounds.startIndex + nextDragY / ROW_SLOT_HEIGHT), 0, dragBounds.itemCount - 1);
          dragY.value = roundTranslateWorklet(nextDragY);

          if (nextTargetIndex !== gestureTargetIndex.value) {
            gestureTargetIndex.value = nextTargetIndex;
            dragTargetIndex.value = nextTargetIndex;
            runOnJS(onMoveTargetChange ?? noop)(nextTargetIndex);
          }
        })
        .onFinalize(() => {
          const snapY = clampWorklet((gestureTargetIndex.value - dragBounds.startIndex) * ROW_SLOT_HEIGHT, dragBounds.min, dragBounds.max);
          dragY.value = withTiming(roundTranslateWorklet(snapY), TIMING_CONFIG, () => {
            runOnJS(onMoveEnd ?? noop)();
          });
        }),
    [dragBounds.itemCount, dragBounds.max, dragBounds.min, dragBounds.startIndex, dragTargetIndex, dragY, gestureTargetIndex, onMoveEnd, onMoveStart, onMoveTargetChange]
  );

  const statusControl = isMove ? (
    <GestureDetector gesture={moveGesture}>
      <Animated.View accessibilityLabel="Move set" accessibilityRole="button" style={styles.status}>
        <Icon name="move" size={theme.sizes.approachStatusIcon} color={theme.colors.content.body} />
      </Animated.View>
    </GestureDetector>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled: isToggleDisabled }}
      disabled={isToggleDisabled}
      onPress={onToggle}
      style={styles.status}
    >
      {isEmpty ? (
        <Icon name="chevron right" size={theme.sizes.approachStatusIcon} color={theme.colors.content.primary} />
      ) : (
        <View style={[styles.statusCircle, !isSelected && styles.statusCircleMuted]}>
          <Icon
            name="checkmark"
            size={theme.sizes.buttonIconSmall}
            color={isSelected ? theme.colors.content.primaryPale : theme.colors.background.canvas}
          />
        </View>
      )}
    </Pressable>
  );

  const rowBody = (
    <>
      {isEmpty ? null : (
        <View style={[styles.numberPill, (isSelected || isMove) && styles.numberPillSelected]}>
          <Text style={styles.numberText}>{set.index}</Text>
        </View>
      )}

      <View style={styles.metrics}>
        <Metric
          disabled={isMuted}
          label={set.unit ?? "\u041A\u0413"}
          value={values.weight}
          onChange={(value) => onMetricChange("weight", value)}
          onFocus={onFocus}
        />
        <Metric
          disabled={isMuted}
          label={"\u041F\u041E\u0412\u0422\u041E\u0420\u041E\u0412"}
          value={values.reps}
          onChange={(value) => onMetricChange("reps", value)}
          onFocus={onFocus}
        />
      </View>

      {statusControl}
    </>
  );
  const rowRootStyle = [
    styles.countRoot,
    isMove && styles.countRootMove,
    isSelected && styles.countRootSelected
  ];
  const rowContent = <View style={rowRootStyle}>{rowBody}</View>;

  if (!canDelete) {
    return <View style={styles.countRow}>{rowContent}</View>;
  }

  return (
    <StagedSwipeDelete
      accessibilityLabel="Delete set"
      deleteWidth={theme.sizes.approachDeleteWidth}
      open={deleteOpen}
      onDelete={handleDelete}
      onOpenChange={onDeleteOpenChange}
      onSwipePressHoldChange={handleSwipePressHoldChange}
      style={styles.countRow}
    >
      {rowContent}
    </StagedSwipeDelete>
  );
}

function Metric({
  disabled,
  value,
  label,
  onChange,
  onFocus
}: {
  disabled: boolean;
  value: string;
  label: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const inputRef = useRef<NativeTextInput>(null);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const moveCaretToEnd = useCallback(() => {
    const nextSelection = { start: value.length, end: value.length };

    setSelection(nextSelection);
    requestAnimationFrame(() => {
      if (typeof inputRef.current?.setNativeProps === "function") {
        inputRef.current.setNativeProps({ selection: nextSelection });
      }
    });
  }, [value]);

  useEffect(() => {
    if (!focused) {
      setSelection({ start: value.length, end: value.length });
    }
  }, [focused, value.length]);

  return (
    <View style={styles.metric}>
      <NativeTextInput
        ref={inputRef}
        accessibilityLabel={label}
        editable={!disabled}
        keyboardType="decimal-pad"
        onBlur={() => setFocused(false)}
        onChangeText={onChange}
        onFocus={() => {
          onFocus?.();
          setFocused(true);
          moveCaretToEnd();
        }}
        onSelectionChange={(event: { nativeEvent: TextInputSelectionChangeEventData }) => {
          setSelection(event.nativeEvent.selection);
        }}
        selection={focused ? selection : undefined}
        style={[styles.metricValueInput, disabled && styles.metricDisabledText, metricInputReset]}
        value={value}
      />
      <Text pointerEvents="none" style={styles.metricLabel}>
        {label.toUpperCase()}
      </Text>
      {focused ? <View pointerEvents="none" style={styles.metricFocusBorder} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.approachWidth,
    maxWidth: "100%",
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.background.border,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  header: {
    minHeight: theme.sizes.approachHeaderThumb,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
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
    height: "100%"
  },
  thumbnailFallbackRoot: {
    flex: 1,
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
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  note: {
    ...theme.typography.body.smCaption,
    color: theme.colors.content.mute
  },
  noteButton: {
    width: theme.sizes.buttonSmallIconWidth,
    height: theme.sizes.buttonSmallIconHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvasSoft
  },
  noteButtonPressed: {
    opacity: 0.86
  },
  setList: {
    gap: theme.spacing.xs,
    position: "relative"
  },
  dragRowLayer: {
    position: "relative"
  },
  dragSourceLayer: {
    position: "absolute",
    left: theme.spacing[0],
    right: theme.spacing[0],
    opacity: 0,
    zIndex: 1
  },
  dragOverlay: {
    position: "absolute",
    left: theme.spacing[0],
    right: theme.spacing[0],
    ...(theme.shadows.raised ?? {}),
    zIndex: 2
  },
  dragPlaceholder: {
    minHeight: theme.sizes.approachCountRowMinHeight,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft,
    opacity: 0.5
  },
  countRow: {
    minHeight: theme.sizes.approachCountRowMinHeight,
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  countRoot: {
    width: "100%",
    minHeight: theme.sizes.approachCountRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  countRootSelected: {
    backgroundColor: theme.colors.content.primaryPale
  },
  countRootMove: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  countRootPressed: {
    opacity: 0.92
  },
  swipeableChildren: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
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
  metrics: {
    flex: 1,
    minWidth: theme.spacing[0],
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  metric: {
    flex: 1,
    height: "100%",
    minHeight: theme.sizes.touchTargetComfort,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    overflow: "hidden"
  },
  metricValueInput: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    minHeight: theme.sizes.touchTargetComfort,
    padding: theme.spacing[0],
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xl,
    margin: theme.spacing[0],
    textAlign: "center",
    textAlignVertical: "center",
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink,
    backgroundColor: "transparent"
  },
  metricDisabledText: {
    color: theme.colors.content.mute
  },
  metricLabel: {
    marginTop: theme.spacing.xl,
    ...theme.typography.body.smCaption,
    color: theme.colors.content.mute
  },
  metricFocusBorder: {
    position: "absolute",
    inset: theme.spacing[0],
    borderWidth: 2,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.content.inkDeep
  },
  status: {
    width: theme.sizes.approachStatusIcon,
    height: theme.sizes.approachStatusIcon,
    alignItems: "center",
    justifyContent: "center"
  },
  statusCircle: {
    width: theme.sizes.approachStatusIcon,
    height: theme.sizes.approachStatusIcon,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.status.positiveDeep
  },
  statusCircleMuted: {
    backgroundColor: theme.colors.content.disabled
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
