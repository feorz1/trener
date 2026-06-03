import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type ChipState = "default" | "selected" | "dropdown" | "disabled";

export type ChipProps = Omit<PressableProps, "children" | "disabled" | "style"> & {
  label: string;
  state?: ChipState;
  selected?: boolean;
  disabled?: boolean;
  dropdown?: boolean;
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  state = "default",
  selected = state === "selected",
  disabled = state === "disabled",
  dropdown = state === "dropdown",
  onRemove,
  style,
  accessibilityLabel,
  ...pressableProps
}: ChipProps) {
  const isSelected = selected && !disabled;
  const backgroundColor = isSelected ? theme.colors.content.inkDeep : theme.colors.background.canvasSoft;
  const color = disabled ? theme.colors.content.mute : isSelected ? theme.colors.content.primary : theme.colors.content.body;
  const iconColor = isSelected ? theme.colors.content.primary : theme.colors.content.body;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: isSelected }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.root,
        dropdown && styles.dropdown,
        { backgroundColor },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {label}
      </Text>
      {isSelected ? (
        <Pressable accessibilityLabel="Remove chip" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onRemove}>
          <Icon name="close filled" size={theme.sizes.chipIcon} color={iconColor} />
        </Pressable>
      ) : dropdown ? (
        <Icon name="chevron down" size={theme.sizes.chipChevron} color={iconColor} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: theme.spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill
  },
  dropdown: {
    paddingRight: theme.spacing.sm
  },
  pressed: {
    opacity: 0.84
  },
  disabled: {
    opacity: 0.45
  },
  label: {
    ...theme.typography.body.smStrong,
    minWidth: theme.spacing[0]
  }
});
