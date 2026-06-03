import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";
import { Loader, type LoaderTone } from "./Loader";

export type ButtonType = "primary" | "secondary" | "secondaryNeutral" | "destructive" | "tertiary";
export type ButtonSize = "large" | "medium" | "small" | "mediumIcon" | "smallIcon";
export type ButtonState = "active" | "disabled" | "loading";
export type ButtonWidth = "hug" | "fill";

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
    backgroundColor: theme.colors.content.inkDeep,
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
    color: theme.colors.background.canvas
  },
  tertiary: {
    backgroundColor: theme.colors.background.canvas,
    color: theme.colors.content.inkDeep
  }
};

const defaultLabels: Record<Exclude<ButtonSize, "mediumIcon" | "smallIcon">, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small"
};

export function Button({
  label,
  type = "primary",
  size = "medium",
  state = "active",
  width = "hug",
  disabled,
  icon,
  style,
  accessibilityLabel,
  ...pressableProps
}: ButtonProps) {
  const isIconOnly = size === "mediumIcon" || size === "smallIcon";
  const isDisabled = disabled || state === "disabled";
  const isLoading = state === "loading";
  const visual = typeStyles[type];
  const resolvedLabel = label ?? (isIconOnly ? undefined : defaultLabels[size]);

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? resolvedLabel}
      accessibilityState={{ busy: isLoading, disabled: isDisabled }}
      disabled={isDisabled || isLoading}
      style={({ pressed }) => [
        styles.root,
        getRadiusStyle(size),
        sizeStyles[size],
        width === "fill" && styles.fill,
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
    opacity: 0.86
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
