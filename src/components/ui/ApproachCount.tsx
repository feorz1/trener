import { useState, type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type StyleProp,
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

export type ApproachCountProps = {
  item: ApproachCountItem;
  trailingSlot?: ReactNode;
  onDelete?: () => void;
  onValueChange?: (patch: Partial<Pick<ApproachCountItem, "weight" | "reps">>) => void;
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

export function ApproachCount({ item, trailingSlot, onDelete, onValueChange, style }: ApproachCountProps) {
  const [weight, setWeight] = useState(item.weight === undefined ? "" : String(item.weight));
  const [reps, setReps] = useState(item.reps === undefined ? "" : String(item.reps));

  const updateMetric = (key: "weight" | "reps", value: string) => {
    const nextValue = sanitizeMetricValue(value);
    if (key === "weight") {
      setWeight(nextValue);
      onValueChange?.({ weight: parseMetricValue(nextValue) });
      return;
    }

    setReps(nextValue);
    onValueChange?.({ reps: parseMetricValue(nextValue) });
  };

  const content = (
    <View style={[styles.root, style]}>
      <View style={styles.numberPill}>
        <Text style={styles.numberText}>{item.index}</Text>
      </View>

      <View style={styles.metrics}>
        <Metric label={item.unit ?? "КГ"} value={weight} onChange={(value) => updateMetric("weight", value)} />
        <Metric label="ПОВТОРОВ" value={reps} onChange={(value) => updateMetric("reps", value)} />
      </View>

      {trailingSlot ?? <Icon name="move" size={theme.sizes.approachStatusIcon} color={theme.colors.content.body} />}
    </View>
  );

  if (!onDelete) {
    return content;
  }

  return (
    <StagedSwipeDelete accessibilityLabel="Удалить подход" deleteWidth={theme.sizes.approachDeleteWidth} onDelete={onDelete}>
      {content}
    </StagedSwipeDelete>
  );
}

function Metric({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.metric}>
      <NativeTextInput
        accessibilityLabel={label}
        keyboardType="decimal-pad"
        onBlur={() => setFocused(false)}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        selectTextOnFocus
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
    minHeight: theme.sizes.approachCountRowMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
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
    ...theme.typography.body.smCaption,
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
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink,
    backgroundColor: "transparent"
  },
  metricLabel: {
    marginTop: theme.spacing.xl,
    ...theme.typography.body.caption,
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
