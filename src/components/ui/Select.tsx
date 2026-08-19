import { useState } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { theme, useAppTheme, type ThemeColors } from "@/theme";
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
  inset?: "default" | "none";
};

const stateColor: Record<SelectState, string> = {
  empty: theme.colors.content.mute,
  default: theme.colors.content.body,
  focus: theme.colors.content.controlAccent,
  error: theme.colors.status.negative,
  positive: theme.colors.status.positiveDeep,
  warning: theme.colors.status.warningText,
  disabled: theme.colors.content.mute
};

function resolveSelectBorderColor(state: SelectState, resolvedColors: ThemeColors) {
  if (state === "focus") return resolvedColors.content.controlAccent;
  if (state === "error") return resolvedColors.status.negative;
  return resolvedColors.background.canvasSoft;
}

const statusMessages: Record<"error" | "positive" | "warning", string> = {
  error: "Проверьте значение",
  positive: "Значение принято",
  warning: "Проверьте детали"
};

export function Select({
  label,
  value,
  placeholder = "Выберите значение",
  message,
  state = value ? "default" : "empty",
  disabled = state === "disabled",
  showLabel = true,
  showMessage = true,
  width = "fixed",
  inset = "default",
  accessibilityHint,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessibilityValue,
  onBlur,
  onFocus,
  ...pressableProps
}: SelectProps) {
  const { resolvedColors } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const resolvedState: SelectState = disabled ? "disabled" : isFocused ? "focus" : state;
  const statusState = state === "error" || state === "positive" || state === "warning" ? state : null;
  const resolvedMessage = message ?? (statusState ? statusMessages[statusState] : "Подсказка");
  const showStatus = !!statusState && !isFocused;
  const hasValue = Boolean(value);
  const labelColor = disabled ? theme.colors.content.mute : theme.colors.content.ink;
  const valueColor = disabled || !hasValue ? theme.colors.content.mute : theme.colors.content.ink;
  const resolvedAccessibilityHint = accessibilityHint ?? (statusState ? `${resolvedMessage}. Открывает список вариантов` : "Открывает список вариантов");

  return (
    <View style={[styles.root, inset === "none" && styles.rootNoInset, width === "fill" && styles.rootFill]}>
      {showLabel ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}

      <Pressable
        {...pressableProps}
        accessibilityHint={resolvedAccessibilityHint}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole={accessibilityRole ?? "button"}
        accessibilityState={{ ...accessibilityState, disabled }}
        accessibilityValue={accessibilityValue ?? { text: hasValue ? value : placeholder }}
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
        <View pointerEvents="none" style={[styles.fieldBorder, { borderColor: resolveSelectBorderColor(resolvedState, resolvedColors) }]} />
      </Pressable>

      {showMessage ? (
        <View style={styles.messageRow}>
          {showStatus && statusState ? <View style={[styles.statusMarker, { backgroundColor: stateColor[statusState] }]} /> : null}
          <Text
            accessibilityLiveRegion={showStatus ? "polite" : "none"}
            accessibilityRole={showStatus ? "alert" : undefined}
            style={[styles.message, { color: showStatus && statusState ? stateColor[statusState] : stateColor[disabled ? "disabled" : "default"] }]}
          >
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
  rootNoInset: {
    paddingHorizontal: theme.spacing[0],
    paddingBottom: theme.spacing[0]
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
