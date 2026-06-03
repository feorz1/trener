import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";

export type DateCellState = "date" | "select" | "disabled";

export type DateCellProps = Omit<PressableProps, "children" | "disabled" | "style"> & {
  label: string;
  state?: DateCellState;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DateCell({ label, state = "date", disabled, style, accessibilityLabel, ...pressableProps }: DateCellProps) {
  const isDisabled = disabled || state === "disabled";
  const isSelected = state === "select";

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={pressableProps.onPress ? "button" : undefined}
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.root,
        isSelected && styles.selected,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style
      ]}
    >
      <Text style={[styles.label, isSelected && styles.selectedLabel, isDisabled && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.dateCellWidth,
    height: theme.sizes.dateCellHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.canvas
  },
  selected: {
    backgroundColor: theme.colors.content.inkDeep
  },
  pressed: {
    backgroundColor: theme.colors.content.primaryPale
  },
  disabled: {
    opacity: 0.5
  },
  label: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  selectedLabel: {
    color: theme.colors.content.primary
  },
  disabledLabel: {
    color: theme.colors.content.mute
  }
});
