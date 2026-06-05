import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Easing, useAnimatedStyle, useSharedValue, withTiming, type AnimatedStyle } from "react-native-reanimated";
import { theme } from "@/theme";

export type GroupedListItemPosition = "single" | "first" | "middle" | "last";
export type GroupedListItemShapeStyle = StyleProp<ViewStyle> | AnimatedStyle<ViewStyle>;

const GROUP_RADIUS_TIMING_CONFIG = {
  duration: 140,
  easing: Easing.out(Easing.cubic)
};

export function getGroupedListItemPosition(index: number, count: number): GroupedListItemPosition {
  if (count <= 1) return "single";
  if (index <= 0) return "first";
  if (index >= count - 1) return "last";
  return "middle";
}

export function getSelectedGroupedListItemPosition(
  selected: boolean,
  previousSelected: boolean,
  nextSelected: boolean
): GroupedListItemPosition {
  if (!selected) return "single";
  if (previousSelected && nextSelected) return "middle";
  if (previousSelected) return "last";
  if (nextSelected) return "first";
  return "single";
}

export function useAnimatedGroupedListItemRadius(position: GroupedListItemPosition) {
  const initialRadii = getGroupedListItemRadii(position);
  const topLeft = useSharedValue(initialRadii.topLeft);
  const topRight = useSharedValue(initialRadii.topRight);
  const bottomRight = useSharedValue(initialRadii.bottomRight);
  const bottomLeft = useSharedValue(initialRadii.bottomLeft);

  useEffect(() => {
    const radii = getGroupedListItemRadii(position);
    topLeft.value = withTiming(radii.topLeft, GROUP_RADIUS_TIMING_CONFIG);
    topRight.value = withTiming(radii.topRight, GROUP_RADIUS_TIMING_CONFIG);
    bottomRight.value = withTiming(radii.bottomRight, GROUP_RADIUS_TIMING_CONFIG);
    bottomLeft.value = withTiming(radii.bottomLeft, GROUP_RADIUS_TIMING_CONFIG);
  }, [bottomLeft, bottomRight, position, topLeft, topRight]);

  return useAnimatedStyle(() => ({
    borderTopLeftRadius: topLeft.value,
    borderTopRightRadius: topRight.value,
    borderBottomRightRadius: bottomRight.value,
    borderBottomLeftRadius: bottomLeft.value
  }));
}

function getGroupedListItemRadii(position: GroupedListItemPosition) {
  switch (position) {
    case "first":
      return {
        topLeft: theme.radius.lg,
        topRight: theme.radius.lg,
        bottomRight: theme.radius.s,
        bottomLeft: theme.radius.s
      };
    case "middle":
      return {
        topLeft: theme.radius.s,
        topRight: theme.radius.s,
        bottomRight: theme.radius.s,
        bottomLeft: theme.radius.s
      };
    case "last":
      return {
        topLeft: theme.radius.s,
        topRight: theme.radius.s,
        bottomRight: theme.radius.lg,
        bottomLeft: theme.radius.lg
      };
    case "single":
    default:
      return {
        topLeft: theme.radius.lg,
        topRight: theme.radius.lg,
        bottomRight: theme.radius.lg,
        bottomLeft: theme.radius.lg
      };
  }
}
