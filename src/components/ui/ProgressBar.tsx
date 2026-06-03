import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Badge, type BadgeTone } from "./Badge";

export type ProgressBarProps = {
  completed: number;
  total: number;
  label?: string;
  showBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getTone(percent: number): { fill: string; badgeTone: BadgeTone } {
  if (percent >= 100) {
    return { fill: theme.colors.content.primary, badgeTone: "primary" };
  }

  if (percent >= 50) {
    return { fill: theme.colors.status.warningDeep, badgeTone: "warningDeep" };
  }

  return { fill: theme.colors.status.negative, badgeTone: "negativeSolid" };
}

export function ProgressBar({ completed, total, label, showBadge = true, style }: ProgressBarProps) {
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.max(0, Math.min(completed, safeTotal));
  const percent = safeTotal > 0 ? clampPercent((safeCompleted / safeTotal) * 100) : 0;
  const roundedPercent = Math.round(percent);
  const tone = getTone(percent);
  const showFillSeparator = roundedPercent > 0 && roundedPercent < 100;
  const resolvedLabel = label ?? `${safeCompleted} of ${safeTotal} exercises`;

  return (
    <View style={[styles.root, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>{resolvedLabel}</Text>
        {showBadge ? <Badge label={`${roundedPercent}%`} tone={tone.badgeTone} size="sm" icon={false} /> : null}
      </View>
      <View style={styles.track}>
        {roundedPercent > 0 ? (
          <View style={[styles.fill, { width: `${roundedPercent}%`, backgroundColor: tone.fill }]}>
            {showFillSeparator ? <View style={styles.fillSeparator} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    gap: theme.spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  label: {
    flex: 1,
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  track: {
    height: theme.spacing.xs,
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.content.disabled
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.xl
  },
  fillSeparator: {
    position: "absolute",
    top: 0,
    right: -theme.spacing.xxs,
    width: theme.spacing.xxs,
    height: "100%",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background.canvas
  }
});
