import { Pressable, StyleSheet, Text, type PressableProps, View } from "react-native";
import { theme } from "@/theme";

export type StateSelectProps = {
  selectedCount?: number;
  label?: string;
  resetLabel?: string;
  width?: "fixed" | "fill";
  disabled?: boolean;
  onReset?: PressableProps["onPress"];
};

export function StateSelect({ selectedCount = 0, label = "Selected", resetLabel = "Reset", width = "fixed", disabled, onReset }: StateSelectProps) {
  const isDisabled = disabled || selectedCount <= 0;

  return (
    <View style={[styles.root, width === "fill" && styles.fillWidth]}>
      <Text style={styles.label}>
        {label}: {selectedCount}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onReset}
        style={({ pressed }) => [styles.resetButton, isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed]}
      >
        <Text style={styles.resetText}>{resetLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.stateSelectWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  fillWidth: {
    width: "100%",
    alignSelf: "stretch"
  },
  label: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  resetButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.canvasSoft
  },
  resetText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.84
  }
});
