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
import type { MetricKey, MetricValues, WorkoutResultType } from "@/types";
import { formatMetricInputValue, parseMetricInput, sanitizeMetricInput, type MetricDefinition } from "@/features/workouts/tracking";
import { Icon } from "./Icon";
import { StagedSwipeDelete } from "./StagedSwipeDelete";

export type ApproachCountItem = {
  id: string;
  index: number;
  resultType?: WorkoutResultType;
  values?: MetricValues;
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  unit?: string;
};

export type ApproachMetric = MetricKey;
export type ApproachCountValuePatch = Partial<Pick<ApproachCountItem, "values" | "weight" | "reps" | "durationSeconds" | "distanceMeters">>;

export type ApproachCountProps = {
  item: ApproachCountItem;
  focusedMetric?: ApproachMetric;
  metrics?: MetricDefinition[];
  trailingSlot?: ReactNode;
  onDelete?: () => void;
  onValueChange?: (patch: ApproachCountValuePatch) => void;
  onMetricBlur?: (metric: ApproachMetric) => void;
  onMetricCommit?: (metric: ApproachMetric, value: number | undefined) => void;
  onMetricFocus?: (metric: ApproachMetric) => void;
  style?: StyleProp<ViewStyle>;
};

const defaultMetrics: MetricDefinition[] = [
  { key: "weight", label: "КГ", shortLabel: "КГ", inputType: "decimal", required: true, min: 0 },
  { key: "reps", label: "ПОВТОРОВ", shortLabel: "ПОВТ.", inputType: "integer", required: true, min: 0 }
];

function getMetricValues(item: ApproachCountItem): MetricValues {
  return {
    ...item.values,
    weight: item.values?.weight ?? item.weight,
    reps: item.values?.reps ?? item.reps,
    duration: item.values?.duration ?? item.durationSeconds,
    distance: item.values?.distance ?? item.distanceMeters
  };
}

function getValuePatch(values: MetricValues): ApproachCountValuePatch {
  return {
    values,
    weight: values.weight,
    reps: values.reps,
    durationSeconds: values.duration,
    distanceMeters: values.distance
  };
}

function getTextByMetric(item: ApproachCountItem, metrics: MetricDefinition[]) {
  const values = getMetricValues(item);
  return metrics.reduce<Partial<Record<ApproachMetric, string>>>((result, metric) => {
    result[metric.key] = formatMetricInputValue(values[metric.key], metric);
    return result;
  }, {});
}

function getMetricLabel(metric: MetricDefinition) {
  if (metric.key === "distance") return "МЕТРЫ";
  if (metric.key === "duration" || metric.key === "interval") return "МИН:СЕК";
  if (metric.key === "addedWeight") return "ДОП. КГ";
  if (metric.key === "assistance") return "ПОМОЩЬ, КГ";
  if (metric.key === "speed") return "КМ/Ч";
  if (metric.key === "pace") return "ТЕМП";
  if (metric.key === "incline") return "НАКЛОН, %";
  return metric.label;
}

function formatDurationInputMask(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 5);
  if (!digits) return "0:00";

  const rawValue = Number(digits);
  const minutes = Math.floor(rawValue / 100);
  const seconds = rawValue % 100;
  const normalizedSeconds = seconds % 60;
  const normalizedMinutes = minutes + Math.floor(seconds / 60);

  return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, "0")}`;
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
  metrics = defaultMetrics,
  trailingSlot,
  onDelete,
  onValueChange,
  onMetricBlur,
  onMetricCommit,
  onMetricFocus,
  style
}: ApproachCountProps) {
  const [textByMetric, setTextByMetric] = useState(() => getTextByMetric(item, metrics));
  const dirtyMetricsRef = useRef<Partial<Record<ApproachMetric, boolean>>>({});
  const metricValueKey = metrics.map((metric) => `${metric.key}:${getMetricValues(item)[metric.key] ?? ""}`).join("|");

  useEffect(() => {
    setTextByMetric((current) => {
      const next = getTextByMetric(item, metrics);
      if (focusedMetric) {
        next[focusedMetric] = current[focusedMetric] ?? next[focusedMetric];
      }
      return next;
    });
  }, [focusedMetric, item.id, metricValueKey, metrics]);

  const updateMetric = (metric: MetricDefinition, value: string) => {
    const key = metric.key;
    const nextValue = metric.inputType === "duration" ? formatDurationInputMask(value) : sanitizeMetricInput(value, metric);
    const parsedValue = parseMetricInput(nextValue, metric);
    const nextValues = { ...getMetricValues(item) };
    dirtyMetricsRef.current[key] = true;

    if (parsedValue === undefined) delete nextValues[key];
    else nextValues[key] = parsedValue;

    setTextByMetric((current) => ({ ...current, [key]: nextValue }));
    onValueChange?.(getValuePatch(nextValues));
  };

  const commitMetric = (metric: MetricDefinition, value: string) => {
    const key = metric.key;
    if (!dirtyMetricsRef.current[key]) return;

    dirtyMetricsRef.current[key] = false;
    onMetricCommit?.(key, parseMetricInput(value, metric));
  };

  const content = (
    <View style={[styles.root, style]}>
      <View style={styles.numberPill}>
        <Text style={styles.numberText}>{item.index}</Text>
      </View>

      <View style={styles.metrics}>
        {metrics.map((metric) => {
          const value = textByMetric[metric.key] ?? "";
          const label = getMetricLabel(metric);
          return (
            <Metric
              key={metric.key}
              accessibilityLabel={`${label}, подход ${item.index}`}
              label={label}
              inputType={metric.inputType}
              shouldFocus={focusedMetric === metric.key}
              value={value}
              onBlur={() => {
                commitMetric(metric, value);
                onMetricBlur?.(metric.key);
              }}
              onChange={(value) => updateMetric(metric, value)}
              onFocus={() => onMetricFocus?.(metric.key)}
            />
          );
        })}
      </View>

      {trailingSlot ?? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="move" size={theme.sizes.approachStatusIcon} color={theme.colors.content.body} />
        </View>
      )}
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
  accessibilityLabel,
  shouldFocus,
  value,
  onBlur,
  onChange,
  onFocus,
  inputType
}: {
  label: string;
  accessibilityLabel?: string;
  inputType: MetricDefinition["inputType"];
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

  useEffect(() => {
    if (!focused || inputType !== "duration") return;

    const nextSelection = { start: value.length, end: value.length };
    setSelection(nextSelection);
    requestAnimationFrame(() => {
      inputRef.current?.setNativeProps({ selection: nextSelection });
    });
  }, [focused, inputType, value.length]);

  return (
    <View style={styles.metric}>
      <NativeTextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel ?? label}
        keyboardType={inputType === "integer" || inputType === "duration" ? "number-pad" : "decimal-pad"}
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
