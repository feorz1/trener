import { useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Platform,
  Text,
  TextInput as NativeTextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type InputState =
  | "empty"
  | "default"
  | "focus"
  | "error"
  | "positive"
  | "warning"
  | "disabled"
  | "prefixFocus"
  | "valueFocus";

export type InputProps = Omit<TextInputProps, "editable" | "onChange" | "style" | "value"> & {
  label: string;
  value?: string;
  message?: string;
  state?: InputState;
  disabled?: boolean;
  doubleField?: boolean;
  prefixValue?: string;
  showLabel?: boolean;
  showMessage?: boolean;
  showClearButton?: boolean;
  width?: "fixed" | "fill";
  onClear?: () => void;
  onChangePrefixText?: (value: string) => void;
  onChangeText?: (value: string) => void;
};

const stateColor: Record<InputState, string> = {
  empty: theme.colors.content.mute,
  default: theme.colors.content.body,
  focus: theme.colors.content.inkDeep,
  error: theme.colors.status.negative,
  positive: theme.colors.status.positiveDeep,
  warning: theme.colors.status.warningContent,
  disabled: theme.colors.content.mute,
  prefixFocus: theme.colors.content.inkDeep,
  valueFocus: theme.colors.content.inkDeep
} as const;

const stateBorderColor: Record<InputState, string> = {
  empty: theme.colors.background.canvasSoft,
  default: theme.colors.background.canvasSoft,
  focus: theme.colors.content.inkDeep,
  error: theme.colors.status.negative,
  positive: theme.colors.background.canvasSoft,
  warning: theme.colors.background.canvasSoft,
  disabled: theme.colors.background.canvasSoft,
  prefixFocus: theme.colors.content.inkDeep,
  valueFocus: theme.colors.content.inkDeep
} as const;

const statusMessages: Record<"error" | "positive" | "warning", string> = {
  error: "Error message",
  positive: "Positive message",
  warning: "Warning message"
};

export function Input({
  label,
  value,
  message,
  state = value ? "default" : "empty",
  disabled = state === "disabled",
  doubleField = false,
  prefixValue = "+1",
  showLabel = true,
  showMessage = true,
  showClearButton = false,
  width = "fixed",
  onClear,
  onChangePrefixText,
  placeholder = "Value",
  onChangeText,
  ...textInputProps
}: InputProps) {
  const [focusedField, setFocusedField] = useState<"prefix" | "value" | null>(null);
  const resolvedState: InputState = disabled ? "disabled" : focusedField ? "focus" : state;
  const designPrefixFocused = state === "prefixFocus";
  const designValueFocused = state === "valueFocus" || state === "focus";
  const prefixState: InputState = disabled
    ? "disabled"
    : focusedField === "prefix" || (!focusedField && designPrefixFocused)
      ? "focus"
      : state === "error"
        ? "error"
        : "default";
  const valueState: InputState = disabled
    ? "disabled"
    : focusedField === "value" || (!focusedField && designValueFocused)
      ? "focus"
      : state === "error"
        ? "error"
        : "default";
  const statusState = state === "error" || state === "positive" || state === "warning" ? state : null;
  const showStatus = !!statusState && !focusedField;
  const resolvedMessage = message ?? (statusState ? statusMessages[statusState] : "Message");
  const showMessageRow = showMessage && !!resolvedMessage;
  const inputTextColor = disabled
    ? theme.colors.content.mute
    : value
      ? theme.colors.content.ink
      : theme.colors.content.mute;
  const canClearValue = showClearButton && !disabled && state !== "empty" && Boolean(value);
  const handleClearValue = () => {
    onClear?.();
    onChangeText?.("");
  };

  return (
    <View style={[styles.root, width === "fill" && styles.rootFill]}>
      {showLabel ? <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text> : null}

      {doubleField ? (
        <View style={styles.doubleRow}>
          <FieldFrame state={prefixState} style={styles.prefixField}>
            <NativeTextInput
              editable={!disabled}
              onBlur={() => setFocusedField(null)}
              onChangeText={onChangePrefixText}
              onFocus={() => setFocusedField("prefix")}
              placeholder="+1"
              placeholderTextColor={theme.colors.content.mute}
              style={[styles.input, styles.prefixInput, webInputReset, { color: disabled ? theme.colors.content.mute : theme.colors.content.ink }]}
              value={prefixValue}
            />
          </FieldFrame>
          <FieldFrame state={valueState} style={styles.doubleInput}>
            <NativeTextInput
              {...textInputProps}
              editable={!disabled}
              onBlur={(event) => {
                setFocusedField(null);
                textInputProps.onBlur?.(event);
              }}
              onChangeText={onChangeText}
              onFocus={(event) => {
                setFocusedField("value");
                textInputProps.onFocus?.(event);
              }}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.content.mute}
              style={[styles.input, webInputReset, { color: inputTextColor }]}
              value={value}
            />
            {canClearValue ? <ClearButton onPress={handleClearValue} /> : null}
          </FieldFrame>
        </View>
      ) : (
        <FieldFrame state={resolvedState}>
          <NativeTextInput
            {...textInputProps}
            editable={!disabled}
            onBlur={(event) => {
              setFocusedField(null);
              textInputProps.onBlur?.(event);
            }}
            onChangeText={onChangeText}
            onFocus={(event) => {
              setFocusedField("value");
              textInputProps.onFocus?.(event);
            }}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.content.mute}
            style={[styles.input, webInputReset, { color: inputTextColor }]}
            value={value}
          />
          {canClearValue ? <ClearButton onPress={handleClearValue} /> : null}
        </FieldFrame>
      )}

      {showMessageRow ? (
        <View style={styles.messageRow}>
          {showStatus && statusState ? <View style={[styles.statusMarker, { backgroundColor: stateColor[statusState] }]} /> : null}
          <Text style={[styles.message, showStatus && statusState && { color: stateColor[statusState] }, disabled && styles.disabledText]}>
            {resolvedMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ClearButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Clear value" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onPress} style={styles.clearButton}>
      <Icon name="close" size={theme.spacing.lg} color={theme.colors.content.ink} />
    </Pressable>
  );
}

function FieldFrame({ children, state, style }: { children: ReactNode; state: InputState; style?: ViewStyle }) {
  return (
    <View style={[styles.field, getFieldSurfaceStyle(state), style]}>
      {children}
      <View pointerEvents="none" style={[styles.fieldBorder, { borderColor: stateBorderColor[state] }]} />
    </View>
  );
}

const getFieldSurfaceStyle = (state: InputState) => ({
  backgroundColor: theme.colors.background.canvasSoft
});

const webInputReset = Platform.select({
  web: {
    outlineStyle: "none",
    boxShadow: "none"
  } as unknown as TextStyle,
  default: undefined
});

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.inputMdWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm
  },
  rootFill: {
    width: "auto",
    alignSelf: "stretch"
  },
  label: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  field: {
    height: theme.spacing["3xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.md,
    paddingVertical: theme.spacing.md
  },
  input: {
    fontFamily: theme.typography.body.md.fontFamily,
    fontSize: theme.typography.body.md.fontSize,
    fontWeight: theme.typography.body.md.fontWeight,
    letterSpacing: theme.typography.body.md.letterSpacing,
    flex: 1,
    minWidth: theme.spacing[0],
    alignSelf: "stretch",
    height: theme.typography.body.md.lineHeight,
    minHeight: theme.typography.body.md.lineHeight,
    padding: theme.spacing[0],
    margin: theme.spacing[0],
    textAlignVertical: "center"
  },
  prefixInput: {
    textAlign: "center"
  },
  fieldBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: theme.radius.md
  },
  clearButton: {
    width: 32,
    height: 24,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvas
  },
  doubleRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  prefixField: {
    width: 72,
    alignItems: "center",
    justifyContent: "center"
  },
  doubleInput: {
    flex: 1
  },
  messageRow: {
    minHeight: theme.typography.body.sm.lineHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  message: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  statusMarker: {
    width: theme.spacing.md,
    height: theme.spacing.md,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  disabledText: {
    color: theme.colors.content.mute
  }
});
