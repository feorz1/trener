import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "planned"
  | "inProgress"
  | "completed"
  | "cancelled"
  | "moved"
  | "positive"
  | "negative"
  | "negativeSoft"
  | "negativeSolid"
  | "warningDeepSoft"
  | "warningDeep"
  | "primary"
  | "select";

type Props = {
  label: string;
  tone?: BadgeTone;
  size?: "md" | "sm" | "s";
  icon?: boolean;
  style?: StyleProp<ViewStyle>;
};

const toneStyles: Record<BadgeTone, { backgroundColor: string; color: string; iconColor: string }> = {
  error: {
    backgroundColor: theme.colors.status.negativeBg,
    color: theme.colors.background.canvas,
    iconColor: theme.colors.status.negative
  },
  info: {
    backgroundColor: theme.colors.accent.cyan,
    color: theme.colors.content.ink,
    iconColor: theme.colors.content.ink
  },
  success: {
    backgroundColor: theme.colors.content.primaryPale,
    color: theme.colors.status.positiveDeep,
    iconColor: theme.colors.status.positive
  },
  warning: {
    backgroundColor: theme.colors.status.warning,
    color: theme.colors.status.warningContent,
    iconColor: theme.colors.status.warningContent
  },
  neutral: {
    backgroundColor: theme.colors.background.canvasSoft,
    color: theme.colors.content.body,
    iconColor: theme.colors.content.body
  },
  planned: {
    backgroundColor: theme.colors.content.primaryPale,
    color: theme.colors.content.primary,
    iconColor: theme.colors.content.primary
  },
  inProgress: {
    backgroundColor: theme.colors.status.warning,
    color: theme.colors.status.warningContent,
    iconColor: theme.colors.status.warningContent
  },
  completed: {
    backgroundColor: theme.colors.content.primaryPale,
    color: theme.colors.status.positiveDeep,
    iconColor: theme.colors.status.positive
  },
  cancelled: {
    backgroundColor: theme.colors.status.negativeBg,
    color: theme.colors.background.canvas,
    iconColor: theme.colors.status.negative
  },
  moved: {
    backgroundColor: theme.colors.background.canvasSoft,
    color: theme.colors.content.body,
    iconColor: theme.colors.content.body
  },
  positive: {
    backgroundColor: theme.colors.content.primaryPale,
    color: theme.colors.status.positiveDeep,
    iconColor: theme.colors.status.positive
  },
  negative: {
    backgroundColor: theme.colors.status.negativeBg,
    color: theme.colors.background.canvas,
    iconColor: theme.colors.status.negative
  },
  negativeSoft: {
    backgroundColor: theme.colors.status.negativeSoft,
    color: theme.colors.status.negativeDarkest,
    iconColor: theme.colors.status.negativeDarkest
  },
  negativeSolid: {
    backgroundColor: theme.colors.status.negative,
    color: theme.colors.background.canvas,
    iconColor: theme.colors.background.canvas
  },
  warningDeepSoft: {
    backgroundColor: theme.colors.status.warningDeepSoft,
    color: theme.colors.status.warningDarkest,
    iconColor: theme.colors.status.warningDarkest
  },
  warningDeep: {
    backgroundColor: theme.colors.status.warningDeep,
    color: theme.colors.background.canvas,
    iconColor: theme.colors.background.canvas
  },
  primary: {
    backgroundColor: theme.colors.content.primary,
    color: theme.colors.content.inkDeep,
    iconColor: theme.colors.content.inkDeep
  },
  select: {
    backgroundColor: theme.colors.content.inkDeep,
    color: theme.colors.content.primary,
    iconColor: theme.colors.content.primary
  }
};

export function Badge({ label, tone = "neutral", size = "md", icon = tone !== "neutral", style }: Props) {
  const stylesForTone = toneStyles[tone];

  return (
    <View style={[styles.badge, sizeStyles[size], { backgroundColor: stylesForTone.backgroundColor }, style]}>
      {icon ? <View style={[styles.icon, iconSizeStyles[size], { backgroundColor: stylesForTone.iconColor }]} /> : null}
      <Text style={[size === "s" ? styles.labelTiny : styles.label, { color: stylesForTone.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: theme.spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill
  },
  icon: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.radius.pill
  },
  label: {
    ...theme.typography.body.smStrong
  },
  labelTiny: {
    ...theme.typography.body.smCaption
  }
});

const sizeStyles = StyleSheet.create({
  md: {
    minHeight: theme.spacing["2xl"],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  sm: {
    minHeight: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs
  },
  s: {
    minHeight: theme.typography.body.smCaption.lineHeight + theme.spacing.xxs + theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs
  }
});

const iconSizeStyles = StyleSheet.create({
  md: {
    width: theme.spacing.sm,
    height: theme.spacing.sm
  },
  sm: {
    width: theme.spacing.xs,
    height: theme.spacing.xs
  },
  s: {
    width: theme.spacing.xs,
    height: theme.spacing.xs
  }
});
