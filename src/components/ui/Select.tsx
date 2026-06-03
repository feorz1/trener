import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type SelectState = "empty" | "default" | "focus" | "error" | "positive" | "warning" | "disabled";

export type SelectProps = Omit<PressableProps, "children" | "disabled" | "style"> & {
  label: string;
  value?: string;
  placeholder?: string;
  message?: string;
  state?: SelectState;
  disabled?: boolean;
  showLabel?: boolean;
  showMessage?: boolean;
  width?: "fixed" | "fill";
};

const stateColor: Record<SelectState, string> = {
  empty: theme.colors.content.mute,
  default: theme.colors.content.body,
  focus: theme.colors.content.inkDeep,
  error: theme.colors.status.negative,
  positive: theme.colors.status.positiveDeep,
  warning: theme.colors.status.warningContent,
  disabled: theme.colors.content.mute
};

const stateBorderColor: Record<SelectState, string> = {
  empty: theme.colors.background.canvasSoft,
  default: theme.colors.background.canvasSoft,
  focus: theme.colors.content.inkDeep,
  error: theme.colors.status.negative,
  positive: theme.colors.background.canvasSoft,
  warning: theme.colors.background.canvasSoft,
  disabled: theme.colors.background.canvasSoft
};

const statusMessages: Record<"error" | "positive" | "warning", string> = {
  error: "Error message",
  positive: "Positive message",
  warning: "Warning message"
};

export function Select({
  label,
  value,
  placeholder = "Value",
  message,
  state = value ? "default" : "empty",
  disabled = state === "disabled",
  showLabel = true,
  showMessage = true,
  width = "fixed",
  accessibilityLabel,
  onBlur,
  onFocus,
  ...pressableProps
}: SelectProps) {
  const [isFocused, setIsFocused] = useState(false);
  const resolvedState: SelectState = disabled ? "disabled" : isFocused ? "focus" : state;
  const statusState = state === "error" || state === "positive" || state === "warning" ? state : null;
  const resolvedMessage = message ?? (statusState ? statusMessages[statusState] : "Message");
  const showStatus = !!statusState && !isFocused;
  const hasValue = Boolean(value);
  const labelColor = disabled ? theme.colors.content.mute : theme.colors.content.ink;
  const valueColor = disabled || !hasValue ? theme.colors.content.mute : theme.colors.content.ink;

  return (
    <View style={[styles.root, width === "fill" && styles.rootFill]}>
      {showLabel ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}

      <Pressable
        {...pressableProps}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: resolvedState === "focus" }}
        disabled={disabled}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        style={({ pressed }) => [styles.field, pressed && !disabled && styles.fieldPressed]}
      >
        <Text numberOfLines={1} style={[styles.value, { color: valueColor }]}>
          {hasValue ? value : placeholder}
        </Text>
        <Icon name="chevron down" size={theme.spacing.lg} color={disabled ? theme.colors.content.mute : theme.colors.content.body} />
        <View pointerEvents="none" style={[styles.fieldBorder, { borderColor: stateBorderColor[resolvedState] }]} />
      </Pressable>

      {showMessage ? (
        <View style={styles.messageRow}>
          {showStatus && statusState ? <View style={[styles.statusMarker, { backgroundColor: stateColor[statusState] }]} /> : null}
          <Text style={[styles.message, { color: showStatus && statusState ? stateColor[statusState] : stateColor[disabled ? "disabled" : "default"] }]}>
            {resolvedMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.selectMdWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  rootFill: {
    width: "auto",
    alignSelf: "stretch"
  },
  label: {
    ...theme.typography.body.smStrong
  },
  field: {
    height: theme.spacing["3xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.md,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvasSoft
  },
  fieldPressed: {
    opacity: 0.86
  },
  fieldBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: theme.radius.md
  },
  value: {
    ...theme.typography.body.md,
    flex: 1,
    minWidth: theme.spacing[0]
  },
  messageRow: {
    minHeight: theme.typography.body.sm.lineHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  message: {
    ...theme.typography.body.sm,
    flex: 1,
    minWidth: theme.spacing[0]
  },
  statusMarker: {
    width: theme.spacing.md,
    height: theme.spacing.md,
    borderRadius: theme.radius.pill
  }
});
