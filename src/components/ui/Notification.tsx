import { LiquidGlassView, isLiquidGlassSupported } from "@callstack/liquid-glass";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme, useAppTheme } from "@/theme";
import { Icon, type IconName } from "./Icon";

export type NotificationVariant = "default" | "plain";
export type NotificationEffect = "regular" | "clear" | "none";

export type NotificationProps = {
  text?: string;
  variant?: NotificationVariant;
  iconName?: IconName;
  showIcon?: boolean;
  effect?: NotificationEffect;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Notification({
  text = "Тренировка перенесена",
  variant = "default",
  iconName = "check filled",
  showIcon,
  effect = "regular",
  interactive = false,
  style,
  contentStyle,
  testID
}: NotificationProps) {
  const { resolvedColorScheme } = useAppTheme();
  const shouldShowIcon = showIcon ?? variant === "default";
  const normalizedText = text.replace(/\s+/g, " ").trim();

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={[styles.halo, styles.haloFar]} />
      <View pointerEvents="none" style={[styles.halo, styles.haloNear]} />
      <LiquidGlassView
        animated
        colorScheme={resolvedColorScheme}
        effect={effect}
        interactive={interactive}
        tintColor={theme.colors.background.canvas}
        testID={testID}
        style={[styles.surface, !isLiquidGlassSupported && styles.fallbackSurface]}
      >
        <View style={[styles.content, shouldShowIcon ? styles.contentWithIcon : styles.contentPlain, contentStyle]}>
          {shouldShowIcon ? <Icon name={iconName} size={theme.sizes.notificationIcon} color={theme.colors.status.positive} /> : null}
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.label}>
            {normalizedText}
          </Text>
        </View>
      </LiquidGlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    maxWidth: "100%",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas,
    ...theme.shadows.notification
  },
  halo: {
    position: "absolute",
    borderRadius: theme.radius.xl
  },
  haloFar: {
    top: -theme.spacing.sm,
    right: -theme.spacing.lg,
    bottom: -theme.spacing.lg,
    left: -theme.spacing.lg,
    opacity: 0.72,
    backgroundColor: theme.colors.background.notificationHaloSoft,
    ...theme.shadows.notificationHalo
  },
  haloNear: {
    top: -theme.spacing.xs,
    right: -theme.spacing.sm,
    bottom: -theme.spacing.md,
    left: -theme.spacing.sm,
    opacity: 0.84,
    backgroundColor: theme.colors.background.notificationHalo
  },
  surface: {
    minHeight: theme.sizes.notificationMinHeight,
    borderRadius: theme.radius.xl,
    overflow: "hidden"
  },
  fallbackSurface: {
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    minHeight: theme.sizes.notificationMinHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs
  },
  contentWithIcon: {
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.lg
  },
  contentPlain: {
    paddingHorizontal: theme.spacing.lg
  },
  label: {
    ...theme.typography.body.md,
    flexShrink: 1,
    color: theme.colors.content.ink
  }
});
