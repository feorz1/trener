import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { theme } from "@/theme";

export type RadioState = "default" | "error" | "disabled";

export type RadioProps = Omit<PressableProps, "onPress" | "style"> & {
  selected?: boolean;
  disabled?: boolean;
  label?: string;
  showLabel?: boolean;
  size?: "md";
  state?: RadioState;
  onChange?: (selected: boolean) => void;
};

export function Radio({
  selected = false,
  disabled,
  label = "Text",
  showLabel = true,
  size = "md",
  state = "default",
  onChange,
  accessibilityLabel,
  ...pressableProps
}: RadioProps) {
  const isDisabled = disabled || state === "disabled";
  const isError = state === "error";
  const controlBorderColor = isError ? theme.colors.status.negative : selected ? theme.colors.content.inkDeep : theme.colors.content.mute;
  const dotColor = isDisabled ? theme.colors.content.mute : isError ? theme.colors.status.negative : theme.colors.content.inkDeep;
  const labelColor = isDisabled ? theme.colors.content.mute : theme.colors.content.ink;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => onChange?.(!selected)}
      style={({ pressed }) => [styles.root, pressed && !isDisabled && styles.pressed]}
    >
      <View
        style={[
          styles.control,
          size === "md" && styles.controlMd,
          {
            backgroundColor: isDisabled && selected ? theme.colors.background.canvasSoft : theme.colors.background.canvas,
            borderColor: isDisabled ? theme.colors.content.mute : controlBorderColor
          }
        ]}
      >
        {selected ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
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
  control: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: theme.radius.full
  },
  controlMd: {
    width: theme.sizes.radioMd,
    height: theme.sizes.radioMd
  },
  dot: {
    width: theme.sizes.radioDot,
    height: theme.sizes.radioDot,
    borderRadius: theme.radius.full
  },
  label: {
    ...theme.typography.body.md
  }
});
