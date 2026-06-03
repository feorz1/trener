import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type CheckboxState = "default" | "error" | "disabled";

export type CheckboxProps = Omit<PressableProps, "onPress" | "style"> & {
  selected?: boolean;
  disabled?: boolean;
  label?: string;
  showLabel?: boolean;
  size?: "md";
  state?: CheckboxState;
  onChange?: (selected: boolean) => void;
};

export function Checkbox({
  selected = false,
  disabled,
  label = "Text",
  showLabel = true,
  size = "md",
  state = "default",
  onChange,
  accessibilityLabel,
  ...pressableProps
}: CheckboxProps) {
  const isDisabled = disabled || state === "disabled";
  const isError = state === "error";
  const boxBackgroundColor = selected
    ? isDisabled
      ? theme.colors.background.canvasSoft
      : isError
        ? theme.colors.status.negative
        : theme.colors.content.inkDeep
    : theme.colors.background.canvas;
  const boxBorderColor = isError ? theme.colors.status.negative : theme.colors.content.mute;
  const checkColor = isDisabled ? theme.colors.content.mute : theme.colors.background.canvas;
  const labelColor = isDisabled ? theme.colors.content.mute : theme.colors.content.ink;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => onChange?.(!selected)}
      style={({ pressed }) => [styles.root, pressed && !isDisabled && styles.pressed]}
    >
      <View
        style={[
          styles.box,
          size === "md" && styles.boxMd,
          {
            backgroundColor: boxBackgroundColor,
            borderColor: selected ? boxBackgroundColor : boxBorderColor
          }
        ]}
      >
        {selected ? <Icon name="checkmark" size={theme.spacing.xl} color={checkColor} /> : null}
      </View>
      {showLabel && label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg
  },
  pressed: {
    opacity: 0.82
  },
  box: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: theme.radius.sm
  },
  boxMd: {
    width: theme.sizes.checkboxMd,
    height: theme.sizes.checkboxMd
  },
  label: {
    ...theme.typography.body.md
  }
});
