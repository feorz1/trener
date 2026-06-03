import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View
} from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type SearchState = "empty" | "default" | "focus";

export type SearchProps = Omit<TextInputProps, "style" | "value" | "onChange"> & {
  value?: string;
  state?: SearchState;
  width?: "fixed" | "fill";
  showClearButton?: boolean;
  onClear?: () => void;
  onChangeText?: (value: string) => void;
};

export function Search({
  value,
  state = value ? "default" : "empty",
  width = "fixed",
  showClearButton = true,
  placeholder = "Search...",
  onClear,
  onChangeText,
  onBlur,
  onFocus,
  ...textInputProps
}: SearchProps) {
  const [focused, setFocused] = useState(false);
  const resolvedState: SearchState = focused || state === "focus" ? "focus" : value ? "default" : state;
  const hasValue = Boolean(value);
  const textColor = hasValue ? theme.colors.content.ink : theme.colors.content.mute;

  const handleClear = () => {
    onClear?.();
    onChangeText?.("");
  };

  return (
    <View style={[styles.root, width === "fill" && styles.rootFill, resolvedState === "focus" && styles.rootFocus]}>
      <Icon name="search" size={theme.spacing.xl} color={theme.colors.content.mute} />
      <TextInput
        {...textInputProps}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.content.mute}
        style={[styles.input, nativeInputReset, webInputReset, { color: textColor }]}
        value={value}
      />
      {showClearButton && hasValue ? (
        <Pressable accessibilityLabel="Clear search" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={handleClear} style={styles.clearButton}>
          <Icon name="close" size={theme.spacing.lg} color={theme.colors.content.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const webInputReset = Platform.select({
  web: {
    outlineStyle: "none",
    boxShadow: "none",
    lineHeight: theme.typography.body.md.lineHeight
  } as unknown as TextStyle,
  default: undefined
});

const nativeInputReset = Platform.select({
  web: undefined,
  default: {
    textAlignVertical: "center"
  } as TextStyle
});

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.searchMdWidth,
    minHeight: theme.spacing["3xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: theme.spacing.xxs,
    borderColor: theme.colors.background.canvasSoft,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  rootFill: {
    width: "auto",
    alignSelf: "stretch"
  },
  rootFocus: {
    borderColor: theme.colors.content.inkDeep
  },
  input: {
    fontFamily: theme.typography.body.md.fontFamily,
    fontSize: theme.typography.body.md.fontSize,
    fontWeight: theme.typography.body.md.fontWeight,
    letterSpacing: theme.typography.body.md.letterSpacing,
    flex: 1,
    minWidth: theme.spacing[0],
    height: theme.typography.body.md.lineHeight,
    minHeight: theme.typography.body.md.lineHeight,
    padding: theme.spacing[0],
    margin: theme.spacing[0]
  },
  clearButton: {
    width: theme.sizes.searchClearWidth,
    height: theme.sizes.searchClearHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvas
  }
});
