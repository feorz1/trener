import { LiquidGlassView, isLiquidGlassSupported } from "@callstack/liquid-glass";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon, type IconName } from "./Icon";

export type TabBarItem = {
  value: string;
  label: string;
  icon: IconName;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
};

export type TabBarProps = {
  items?: TabBarItem[];
  selectedValue?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  onValueChange?: (value: string) => void;
};

export const trainerTabBarItems: TabBarItem[] = [
  { value: "home", label: "Главная", icon: "home" },
  { value: "clients", label: "Клиенты", icon: "multiple users" },
  { value: "settings", label: "Настройки", icon: "settings" }
];

export function TabBar({
  items = trainerTabBarItems,
  selectedValue = items[0]?.value,
  accessibilityLabel = "Нижняя навигация",
  style,
  onValueChange
}: TabBarProps) {
  if (items.length === 0) {
    return null;
  }

  const visibleItems = items.slice(0, 5);
  const hasFixedItems = visibleItems.length <= 3;

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="tablist" style={[styles.root, style]}>
      <View style={styles.shell}>
        <View pointerEvents="none" style={styles.shadowPlate} />
        <LiquidGlassView
          animated
          colorScheme="light"
          effect="regular"
          style={[styles.glassRoot, !isLiquidGlassSupported && styles.fallbackGlassRoot]}
          tintColor={theme.colors.background.glass}
        >
          {!isLiquidGlassSupported ? <View pointerEvents="none" style={styles.glassLayer} /> : null}
          <View style={styles.items}>
            {visibleItems.map((item, index) => {
              const selected = item.value === selectedValue;
              const isOverlapped = index < visibleItems.length - 1;
              const contentColor = item.disabled ? theme.colors.content.disabled : theme.colors.content.inkDeep;

              return (
                <Pressable
                  key={item.value}
                  accessibilityLabel={item.accessibilityLabel ?? item.label}
                  accessibilityRole="tab"
                  accessibilityState={{ selected, disabled: item.disabled }}
                  disabled={item.disabled}
                  hitSlop={theme.spacing.xs}
                  onPress={() => onValueChange?.(item.value)}
                  style={({ pressed }) => [
                    styles.item,
                    hasFixedItems ? styles.fixedItem : styles.fluidItem,
                    isOverlapped && styles.overlappedItem,
                    pressed && !item.disabled && styles.pressedItem,
                    item.disabled && styles.disabledItem
                  ]}
                  testID={item.testID}
                >
                  {selected ? <View pointerEvents="none" style={styles.selection} /> : null}
                  <Icon name={item.icon} size={theme.sizes.tabBarIcon} color={contentColor} />
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    numberOfLines={1}
                    style={[styles.label, { color: contentColor }, item.disabled && styles.disabledLabel]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </LiquidGlassView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl
  },
  shell: {
    position: "relative",
    maxWidth: "100%",
    overflow: "visible"
  },
  shadowPlate: {
    position: "absolute",
    top: -theme.spacing.xs,
    right: -theme.spacing.xs,
    bottom: -theme.spacing.xs,
    left: -theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvas,
    ...theme.shadows.glass
  },
  glassRoot: {
    maxWidth: "100%",
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    backgroundColor: theme.colors.background.glass
  },
  fallbackGlassRoot: {
    backgroundColor: theme.colors.background.glass
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.glassOverlay
  },
  items: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xxs
  },
  item: {
    minHeight: theme.sizes.tabBarItemMinHeight,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxs / 2,
    paddingTop: theme.spacing.xs + theme.spacing.xxs,
    paddingBottom: theme.spacing.sm - theme.spacing.xxs / 2,
    paddingHorizontal: theme.spacing.sm
  },
  fixedItem: {
    width: theme.sizes.tabBarItemWidth
  },
  fluidItem: {
    flex: 1,
    minWidth: theme.spacing[0]
  },
  overlappedItem: {
    marginRight: -theme.spacing.sm
  },
  selection: {
    position: "absolute",
    top: theme.spacing[0],
    bottom: theme.spacing[0],
    left: -theme.spacing.xxs,
    right: -theme.spacing.xxs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.content.primary
  },
  label: {
    ...theme.typography.captionStrong,
    lineHeight: theme.spacing.md,
    minWidth: "100%",
    textAlign: "center"
  },
  pressedItem: {
    opacity: 0.82
  },
  disabledItem: {
    opacity: 0.45
  },
  disabledLabel: {
    color: theme.colors.content.disabled
  }
});
