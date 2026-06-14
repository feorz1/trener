import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type StyleProp,
  type TextInputSelectionChangeEventData,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";
import { StagedSwipeDelete } from "./StagedSwipeDelete";

export type ApproachCountItem = {
  id: string;
  index: number;
  reps?: number;
  weight?: number;
  unit?: string;
};

export type ApproachMetric = "weight" | "reps";

export type ApproachCountProps = {
  item: ApproachCountItem;
  focusedMetric?: ApproachMetric;
  trailingSlot?: ReactNode;
  onDelete?: () => void;
  onValueChange?: (patch: Partial<Pick<ApproachCountItem, "weight" | "reps">>) => void;
  onMetricBlur?: (metric: ApproachMetric) => void;
  onMetricCommit?: (metric: ApproachMetric, value: number | undefined) => void;
  onMetricFocus?: (metric: ApproachMetric) => void;
  style?: StyleProp<ViewStyle>;
};

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

export function ApproachCount({
  item,
  focusedMetric,
  trailingSlot,
  onDelete,
  onValueChange,
  onMetricBlur,
  onMetricCommit,
  onMetricFocus,
  style
}: ApproachCountProps) {
  const [weight, setWeight] = useState(item.weight === undefined ? "" : String(item.weight));
  const [reps, setReps] = useState(item.reps === undefined ? "" : String(item.reps));
  const dirtyMetricsRef = useRef<Partial<Record<ApproachMetric, boolean>>>({});

  useEffect(() => {
    setWeight(item.weight === undefined ? "" : String(item.weight));
  }, [item.weight]);

  useEffect(() => {
    setReps(item.reps === undefined ? "" : String(item.reps));
  }, [item.reps]);

  const updateMetric = (key: ApproachMetric, value: string) => {
    const nextValue = sanitizeMetricValue(value);
    dirtyMetricsRef.current[key] = true;

    if (key === "weight") {
      setWeight(nextValue);
      onValueChange?.({ weight: parseMetricValue(nextValue) });
      return;
    }

    setReps(nextValue);
    onValueChange?.({ reps: parseMetricValue(nextValue) });
  };

  const commitMetric = (key: ApproachMetric, value: string) => {
    if (!dirtyMetricsRef.current[key]) return;

    dirtyMetricsRef.current[key] = false;
    onMetricCommit?.(key, parseMetricValue(value));
  };

  const content = (
    <View style={[styles.root, style]}>
      <View style={styles.numberPill}>
        <Text style={styles.numberText}>{item.index}</Text>
      </View>

      <View style={styles.metrics}>
        <Metric
          label={item.unit ?? "КГ"}
          shouldFocus={focusedMetric === "weight"}
          value={weight}
          onBlur={() => {
            commitMetric("weight", weight);
            onMetricBlur?.("weight");
          }}
          onChange={(value) => updateMetric("weight", value)}
          onFocus={() => onMetricFocus?.("weight")}
        />
        <Metric
          label="ПОВТОРОВ"
          shouldFocus={focusedMetric === "reps"}
          value={reps}
          onBlur={() => {
            commitMetric("reps", reps);
            onMetricBlur?.("reps");
          }}
          onChange={(value) => updateMetric("reps", value)}
          onFocus={() => onMetricFocus?.("reps")}
        />
      </View>

      {trailingSlot ?? <Icon name="move" size={theme.sizes.approachStatusIcon} color={theme.colors.content.body} />}
    </View>
  );

  if (!onDelete) {
    return content;
  }

  return (
    <StagedSwipeDelete accessibilityLabel="Удалить подход" deleteWidth={theme.sizes.approachDeleteWidth} onDelete={onDelete} style={styles.swipeRoot}>
      {content}
    </StagedSwipeDelete>
  );
}

function Metric({
  label,
  shouldFocus,
  value,
  onBlur,
  onChange,
  onFocus
}: {
  label: string;
  shouldFocus?: boolean;
  value: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onFocus?: () => void;
}) {
  const inputRef = useRef<NativeTextInput>(null);
  const wasRequestedToFocusRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  const moveCaretToEnd = useCallback(() => {
    const nextSelection = { start: value.length, end: value.length };

    setSelection(nextSelection);
    requestAnimationFrame(() => {
      inputRef.current?.setNativeProps({ selection: nextSelection });
    });
  }, [value]);

  useEffect(() => {
    const shouldRequestFocus = Boolean(shouldFocus) && !wasRequestedToFocusRef.current;
    wasRequestedToFocusRef.current = Boolean(shouldFocus);

    if (!shouldRequestFocus) return;

    if (focused) {
      moveCaretToEnd();
      return;
    }

    inputRef.current?.focus();
    moveCaretToEnd();
  }, [focused, moveCaretToEnd, shouldFocus]);

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
        keyboardType="decimal-pad"
        showSoftInputOnFocus
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        onChangeText={onChange}
        onFocus={() => {
          setFocused(true);
          moveCaretToEnd();
          onFocus?.();
        }}
        onSelectionChange={(event: { nativeEvent: TextInputSelectionChangeEventData }) => {
          setSelection(event.nativeEvent.selection);
        }}
        selection={focused ? selection : undefined}
        style={[styles.metricValueInput, metricInputReset]}
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
    width: "100%",
    alignSelf: "stretch",
    minHeight: theme.sizes.approachCountRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  swipeRoot: {
    width: "100%",
    alignSelf: "stretch"
  },
  numberPill: {
    width: theme.sizes.approachCountNumber,
    height: theme.sizes.approachCountNumber,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.sm,
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
  }
});
