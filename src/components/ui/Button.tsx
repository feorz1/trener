import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";
import { Loader, type LoaderTone } from "./Loader";

export type ButtonType = "primary" | "secondary" | "secondaryNeutral" | "destructive" | "tertiary";
export type ButtonSize = "large" | "medium" | "small" | "mediumIcon" | "smallIcon";
export type ButtonState = "active" | "disabled" | "loading";
export type ButtonWidth = "hug" | "fill";

const BUTTON_PRESSED_SCALE = 0.96;

export type ButtonProps = Omit<PressableProps, "children" | "disabled" | "style"> & {
  label?: string;
  type?: ButtonType;
  size?: ButtonSize;
  state?: ButtonState;
  width?: ButtonWidth;
  disabled?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const typeStyles: Record<ButtonType, { backgroundColor: string; color: string }> = {
  primary: {
    backgroundColor: theme.colors.content.controlAccent,
    color: theme.colors.content.primary
  },
  secondary: {
    backgroundColor: theme.colors.content.primary,
    color: theme.colors.content.inkDeep
  },
  secondaryNeutral: {
    backgroundColor: theme.colors.background.canvasSoft,
    color: theme.colors.content.ink
  },
  destructive: {
    backgroundColor: theme.colors.status.negative,
    color: theme.colors.status.onNegative
  },
  tertiary: {
    backgroundColor: theme.colors.background.canvas,
    color: theme.colors.content.inkDeep
  }
};

const defaultLabels: Record<Exclude<ButtonSize, "mediumIcon" | "smallIcon">, string> = {
  large: "Действие",
  medium: "Действие",
  small: "Действие"
};

export function Button({
  label,
  type = "primary",
  size = "large",
  state = "active",
  width = "hug",
  disabled,
  icon,
  style,
  accessibilityLabel,
  hitSlop,
  ...pressableProps
}: ButtonProps) {
  const isIconOnly = size === "mediumIcon" || size === "smallIcon";
  const isDisabled = disabled || state === "disabled";
  const isLoading = state === "loading";
  const visual = typeStyles[type];
  const resolvedLabel = label ?? (isIconOnly ? undefined : defaultLabels[size]);
  const resolvedHitSlop = hitSlop ?? getDefaultHitSlop(size);

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? resolvedLabel}
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      disabled={isDisabled || isLoading}
      hitSlop={resolvedHitSlop}
      style={({ pressed }) => [
        styles.root,
        getRadiusStyle(size),
        sizeStyles[size],
        width === "fill" && styles.fill,
        Platform.OS === "web" && styles.webMotion,
        { backgroundColor: visual.backgroundColor },
        isDisabled && styles.disabled,
        pressed && !isDisabled && !isLoading && styles.pressed,
        style
      ]}
    >
      {isLoading ? (
        <Loader tone={loaderToneByType[type]} size={size === "large" || size === "medium" ? "medium" : "small"} />
      ) : isIconOnly ? (
        icon ?? (
          <Icon
            name="chevron down"
            size={size === "mediumIcon" ? theme.sizes.buttonIconMedium : theme.sizes.buttonIconSmall}
            color={visual.color}
          />
        )
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, size === "small" && styles.smallLabel, { color: visual.color }]}>{resolvedLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm
  },
  fill: {
    alignSelf: "stretch",
    width: "100%"
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    transform: [{ scale: BUTTON_PRESSED_SCALE }]
  },
  webMotion: {
    transitionDuration: "170ms",
    transitionProperty: "transform",
    transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)"
  },
  label: {
    ...theme.typography.button.md
  },
  smallLabel: {
    ...theme.typography.body.smStrong
  }
});

function getRadiusStyle(size: ButtonSize) {
  if (size === "mediumIcon" || size === "smallIcon") {
    return radiusStyles.pill;
  }

  if (size === "small") {
    return radiusStyles.md;
  }

  return radiusStyles.lg;
}

function getDefaultHitSlop(size: ButtonSize): PressableProps["hitSlop"] {
  if (size === "small") {
    const verticalInset = (theme.sizes.touchTargetMin - theme.sizes.buttonSmallHeight) / 2;
    return { top: verticalInset, bottom: verticalInset, left: theme.spacing[0], right: theme.spacing[0] };
  }

  if (size === "smallIcon") {
    const verticalInset = (theme.sizes.touchTargetMin - theme.sizes.buttonSmallIconHeight) / 2;
    const horizontalInset = (theme.sizes.touchTargetMin - theme.sizes.buttonSmallIconWidth) / 2;
    return { top: verticalInset, bottom: verticalInset, left: horizontalInset, right: horizontalInset };
  }

  return undefined;
}

const radiusStyles = StyleSheet.create({
  lg: {
    borderRadius: theme.radius.lg
  },
  md: {
    borderRadius: theme.radius.md
  },
  pill: {
    borderRadius: theme.radius.pill
  }
});

const loaderToneByType: Record<ButtonType, LoaderTone> = {
  primary: "inverse",
  secondary: "brand",
  secondaryNeutral: "neutral",
  destructive: "canvas",
  tertiary: "brand"
};

const sizeStyles = StyleSheet.create({
  large: {
    minHeight: theme.sizes.buttonMdHeight,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md
  },
  medium: {
    minHeight: theme.sizes.buttonMediumHeight,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  small: {
    minHeight: theme.sizes.buttonSmallHeight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs
  },
  mediumIcon: {
    width: theme.sizes.buttonMediumIcon,
    height: theme.sizes.buttonMediumIcon,
    padding: theme.spacing.sm
  },
  smallIcon: {
    width: theme.sizes.buttonSmallIconWidth,
    height: theme.sizes.buttonSmallIconHeight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  }
});
