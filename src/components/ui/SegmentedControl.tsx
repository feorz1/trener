import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { theme } from "@/theme";

export type SegmentedControlItem<T extends string> = {
  label: string;
  key?: T;
  value?: T;
  disabled?: boolean;
};

type Props<T extends string> = {
  items: SegmentedControlItem<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "md";
  width?: number | "full";
};

const getItemValue = <T extends string>(item: SegmentedControlItem<T>) => {
  const itemValue = item.value ?? item.key;
  if (!itemValue) {
    throw new Error("SegmentedControl item must provide key or value.");
  }
  return itemValue;
};

export function SegmentedControl<T extends string>({ items, value, onChange, width }: Props<T>) {
  const resolvedWidth = width ?? (items.length > 2 ? theme.sizes.segmentedControlThreeWidth : theme.sizes.segmentedControlTwoWidth);
  const widthStyle: ViewStyle = resolvedWidth === "full" ? { alignSelf: "stretch" } : { width: resolvedWidth };

  return (
    <View style={[styles.wrapper, widthStyle]}>
      {items.map((item) => {
        const itemValue = getItemValue(item);
        const active = itemValue === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: item.disabled }}
            disabled={item.disabled}
            key={itemValue}
            onPress={() => onChange(itemValue)}
            style={({ pressed }) => [
              styles.tab,
              active && styles.tabActive,
              pressed && !item.disabled && styles.tabPressed,
              item.disabled && styles.tabDisabled
            ]}
          >
            <Text numberOfLines={1} style={[styles.label, active && styles.labelActive, item.disabled && styles.labelDisabled]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    padding: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvasSoft,
    gap: theme.spacing.xs
  },
  tab: {
    flex: 1,
    minHeight: theme.spacing["3xl"],
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvas,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: theme.colors.content.primary
  },
  tabPressed: {
    backgroundColor: theme.colors.content.primaryActive
  },
  tabDisabled: {
    opacity: 0.48
  },
  label: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.body
  },
  labelActive: {
    color: theme.colors.content.onPrimary
  },
  labelDisabled: {
    color: theme.colors.content.mute
  }
});
