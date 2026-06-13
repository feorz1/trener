import { useEffect, useRef } from "react";
import { LiquidGlassView, isLiquidGlassSupported } from "@callstack/liquid-glass";
import { Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
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

const webGlassBlur =
  Platform.OS === "web"
    ? ({
        backdropFilter: "blur(18px) saturate(180%)",
        WebkitBackdropFilter: "blur(18px) saturate(180%)"
      } as ViewStyle & { backdropFilter: string; WebkitBackdropFilter: string })
    : {};

const webTabItemReset =
  Platform.OS === "web"
    ? ({
        outlineStyle: "none"
      } as ViewStyle & { outlineStyle: "none" })
    : {};

export function TabBar({
  items = trainerTabBarItems,
  selectedValue = items[0]?.value,
  accessibilityLabel = "Нижняя навигация",
  style,
  onValueChange
}: TabBarProps) {
  const visibleItems = items.slice(0, 5);
  const hasFixedItems = visibleItems.length <= 3;
  const selectedIndex = visibleItems.findIndex((item) => item.value === selectedValue);
  const hasSelectedItem = selectedIndex >= 0;
  const selectedOffset = hasSelectedItem ? selectedIndex * (theme.sizes.tabBarItemWidth - theme.spacing.sm) : 0;
  const selectionTranslateX = useRef(new Animated.Value(selectedOffset)).current;

  useEffect(() => {
    if (!hasSelectedItem) {
      return;
    }

    Animated.spring(selectionTranslateX, {
      toValue: selectedOffset,
      stiffness: 300,
      damping: 28,
      mass: 0.9,
      useNativeDriver: true
    }).start();
  }, [hasSelectedItem, selectedOffset, selectionTranslateX]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="tablist" style={[styles.root, style]}>
      <View style={styles.shell}>
        <View pointerEvents="none" style={styles.shadowPlate} />
        <LiquidGlassView
          animated
          colorScheme="light"
          effect="regular"
          style={[styles.glassRoot, !isLiquidGlassSupported && styles.fallbackGlassRoot, webGlassBlur]}
          tintColor={theme.colors.background.glass}
        >
          {!isLiquidGlassSupported ? <View pointerEvents="none" style={styles.glassLayer} /> : null}
          <View pointerEvents="none" style={styles.glassHighlight} />
          <View style={styles.items}>
              {hasFixedItems && hasSelectedItem ? (
                <Animated.View pointerEvents="none" style={[styles.selection, { transform: [{ translateX: selectionTranslateX }] }]} />
              ) : null}
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
                  aria-selected={selected}
                  disabled={item.disabled}
                  hitSlop={theme.spacing.xs}
                  onPress={() => onValueChange?.(item.value)}
                  style={({ pressed }) => [
                    styles.item,
                    webTabItemReset,
                    hasFixedItems ? styles.fixedItem : styles.fluidItem,
                    isOverlapped && styles.overlappedItem,
                    pressed && !item.disabled && styles.pressedItem,
                    item.disabled && styles.disabledItem
                  ]}
                  testID={item.testID}
                >
                  {!hasFixedItems && selected ? <View pointerEvents="none" style={styles.staticSelection} /> : null}
                  <View pointerEvents="none" style={styles.itemContent}>
                    <Icon name={item.icon} size={theme.sizes.tabBarIcon} color={contentColor} />
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      numberOfLines={1}
                      style={[styles.label, { color: contentColor }, item.disabled && styles.disabledLabel]}
                    >
                      {item.label}
                    </Text>
                  </View>
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
    backgroundColor: theme.colors.background.glass,
    ...theme.shadows.glass
  },
  glassRoot: {
    maxWidth: "100%",
    borderRadius: theme.radius.pill,
    overflow: "hidden",
    backgroundColor: theme.colors.background.glass
  },
  fallbackGlassRoot: {
    backgroundColor: theme.colors.background.glassOverlay,
    ...theme.shadows.glass
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.glassOverlay
  },
  glassHighlight: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    borderRadius: theme.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.background.glassOverlay
  },
  items: {
    position: "relative",
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: theme.sizes.tabBarItemMinHeight,
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
  itemContent: {
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxs / 2,
    minWidth: "100%"
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
    left: theme.spacing.xxs,
    width: theme.sizes.tabBarItemWidth + theme.spacing.xxs + theme.spacing.xxs,
    zIndex: 0,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.content.primary
  },
  staticSelection: {
    position: "absolute",
    top: theme.spacing[0],
    bottom: theme.spacing[0],
    left: -theme.spacing.xxs,
    right: -theme.spacing.xxs,
    zIndex: 0,
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
