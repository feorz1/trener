import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Button, type ButtonState, type ButtonType } from "./Button";

export type ActionLayout = "single" | "stacked" | "inline" | "triple";

export type ActionButtonConfig = {
  label?: string;
  type?: ButtonType;
  state?: ButtonState;
  disabled?: boolean;
  onTouchStart?: () => void;
  onPressIn?: () => void;
  onPress?: () => void;
};

export type ActionProps = {
  layout?: ActionLayout;
  children?: ReactNode;
  primary?: ActionButtonConfig;
  secondary?: ActionButtonConfig;
  tertiary?: ActionButtonConfig;
  style?: StyleProp<ViewStyle>;
};

const defaultActions: Required<Pick<ActionButtonConfig, "label" | "type">>[] = [
  { label: "Button", type: "primary" },
  { label: "Button", type: "secondary" },
  { label: "Button", type: "secondaryNeutral" }
];

export function Action({ layout = "single", children, primary, secondary, tertiary, style }: ActionProps) {
  const actions = [
    { ...defaultActions[0], ...primary },
    { ...defaultActions[1], ...secondary },
    { ...defaultActions[2], ...tertiary }
  ];
  const visibleActions = layout === "single" ? actions.slice(0, 1) : layout === "triple" ? actions : actions.slice(0, 2);
  const isInline = layout === "inline" || layout === "triple";

  return (
    <View style={[styles.root, isInline ? styles.inlineRoot : styles.stackedRoot, layout === "single" && styles.singleRoot, style]}>
      {children ? <View style={styles.slot}>{children}</View> : null}
      <View style={isInline ? styles.inlineButtons : styles.stackedButtons}>
        {visibleActions.map((action, index) => (
          <View key={`${action.type}-${index}`} style={isInline ? styles.inlineItem : styles.stackedItem}>
            <Button
              label={action.label}
              type={action.type}
              size="large"
              width="fill"
              state={action.state}
              disabled={action.disabled}
              onTouchStart={action.onTouchStart}
              onPressIn={action.onPressIn}
              onPress={action.onPress}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.canvas
  },
  stackedRoot: {
    gap: theme.spacing.md
  },
  singleRoot: {
    gap: theme.spacing.lg
  },
  inlineRoot: {
    gap: theme.spacing.md
  },
  slot: {
    alignSelf: "stretch"
  },
  stackedButtons: {
    gap: theme.spacing.md
  },
  inlineButtons: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  stackedItem: {
    alignSelf: "stretch"
  },
  inlineItem: {
    flex: 1,
    minWidth: theme.spacing[0]
  }
});
