import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";

export type TextAreaState = "empty" | "default" | "focus" | "error" | "disabled";

export type TextAreaProps = Omit<TextInputProps, "editable" | "multiline" | "onChange" | "style" | "value"> & {
  label: string;
  value?: string;
  message?: string;
  state?: TextAreaState;
  disabled?: boolean;
  showLabel?: boolean;
  showMessage?: boolean;
  width?: "fixed" | "fill";
  style?: StyleProp<ViewStyle>;
  onChangeText?: (value: string) => void;
};

const stateBorderColor: Record<TextAreaState, string> = {
  empty: theme.colors.background.canvasSoft,
  default: theme.colors.background.canvasSoft,
  focus: theme.colors.content.inkDeep,
  error: theme.colors.status.negative,
  disabled: theme.colors.background.canvasSoft
};

export function TextArea({
  label,
  value,
  message,
  state = value ? "default" : "empty",
  disabled = state === "disabled",
  showLabel = true,
  showMessage = true,
  width = "fixed",
  style,
  placeholder = "Value",
  onChangeText,
  ...textInputProps
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const resolvedState: TextAreaState = disabled ? "disabled" : isFocused && state !== "error" ? "focus" : state;
  const inputTextColor =
    disabled || !value
      ? theme.colors.content.mute
      : theme.colors.content.ink;
  const messageColor =
    resolvedState === "error"
      ? theme.colors.status.negative
      : disabled
        ? theme.colors.content.mute
        : theme.colors.content.body;
  const labelColor =
    resolvedState === "error"
      ? theme.colors.content.ink
      : disabled
        ? theme.colors.content.mute
        : theme.colors.content.ink;
  const resolvedMessage = message ?? (resolvedState === "error" ? "Error message" : "Message");

  return (
    <View style={[styles.root, width === "fill" && styles.rootFill, style]}>
      {showLabel ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}

      <View style={[styles.field, disabled && styles.disabledField]}>
        <NativeTextInput
          {...textInputProps}
          editable={!disabled}
          multiline
          onBlur={(event) => {
            setIsFocused(false);
            textInputProps.onBlur?.(event);
          }}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setIsFocused(true);
            textInputProps.onFocus?.(event);
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.content.mute}
          rejectResponderTermination={false}
          style={[styles.input, webInputReset, { color: inputTextColor }]}
          value={value}
        />
        <View
          pointerEvents="none"
          style={[
            styles.fieldBorder,
            { borderColor: stateBorderColor[resolvedState] }
          ]}
        />
      </View>

      {showMessage ? <Text style={[styles.message, { color: messageColor }]}>{resolvedMessage}</Text> : null}
    </View>
  );
}

const webInputReset = Platform.select({
  web: {
    outlineStyle: "none",
    boxShadow: "none"
  } as unknown as TextStyle,
  default: undefined
});

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.textAreaMdWidth,
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
  message: {
    ...theme.typography.body.sm
  },
  field: {
    minHeight: theme.sizes.textAreaFieldMinHeight,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.canvasSoft
  },
  disabledField: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  input: {
    fontFamily: theme.typography.body.md.fontFamily,
    fontSize: theme.typography.body.md.fontSize,
    fontWeight: theme.typography.body.md.fontWeight,
    lineHeight: theme.typography.body.mdStrong.lineHeight,
    letterSpacing: theme.typography.body.md.letterSpacing,
    minHeight: theme.sizes.textAreaFieldMinHeight - theme.spacing.md * 2,
    padding: theme.spacing[0],
    margin: theme.spacing[0],
    textAlignVertical: "top"
  },
  fieldBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: theme.radius.md
  }
});
