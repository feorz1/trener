import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing as ReanimatedEasing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { theme } from "@/theme";
import type { GroupedListItemShapeStyle } from "./groupedListItem";
import { Icon } from "./Icon";

export type StagedSwipeDeleteProps = {
  children: ReactNode;
  deleteWidth?: number;
  defaultOpen?: boolean;
  open?: boolean;
  accessibilityLabel?: string;
  onDelete: () => void;
  onDeleteCommitStart?: () => void;
  onOpenChange?: (open: boolean) => void;
  onSwipePressHoldChange?: (pressed: boolean) => void;
  shapeStyle?: GroupedListItemShapeStyle;
  style?: StyleProp<ViewStyle>;
};

const SWIPE_REVEAL_THRESHOLD = theme.spacing.xl;
const SWIPE_COMMIT_RATIO = 0.72;
const SWIPE_VELOCITY_THRESHOLD = 0.35;
const SWIPE_COMMIT_VELOCITY = 0.85;
const TIMING_CONFIG = { duration: 140, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) };
const DELETE_COMMIT_FADE_CONFIG = { duration: 40, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) };

function clampWorklet(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === "web") return;
  void Haptics.impactAsync(style).catch(() => undefined);
}

export function StagedSwipeDelete({
  children,
  deleteWidth = theme.sizes.approachDeleteWidth,
  defaultOpen = false,
  open,
  accessibilityLabel = "Delete",
  onDelete,
  onDeleteCommitStart,
  onOpenChange,
  onSwipePressHoldChange,
  shapeStyle,
  style
}: StagedSwipeDeleteProps) {
  const controlledOpen = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [deleteOpen, setDeleteOpen] = useState(open ?? defaultOpen);
  const resolvedOpen = controlledOpen ? open : internalOpen;
  const translateX = useSharedValue<number>(resolvedOpen ? -deleteWidth : theme.spacing[0]);
  const deleteActionVisibility = useSharedValue<number>(1);
  const gestureStartTranslate = useSharedValue<number>(theme.spacing[0]);
  const gestureSettling = useSharedValue<boolean>(false);
  const commitHapticFired = useSharedValue<boolean>(false);
  const rowWidth = useSharedValue<number>(theme.sizes.approachWidth);

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (!controlledOpen) {
        setInternalOpen(nextOpen);
      }
      setDeleteOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, onOpenChange]
  );

  const animateOpenState = useCallback(
    (nextOpen: boolean) => {
      deleteActionVisibility.value = 1;
      setOpenState(nextOpen);
      translateX.value = withTiming(nextOpen ? -deleteWidth : theme.spacing[0], TIMING_CONFIG);
    },
    [deleteActionVisibility, deleteWidth, setOpenState, translateX]
  );

  useEffect(() => {
    deleteActionVisibility.value = 1;
    setDeleteOpen(resolvedOpen);
    translateX.value = withTiming(resolvedOpen ? -deleteWidth : theme.spacing[0], TIMING_CONFIG);
  }, [deleteActionVisibility, deleteWidth, resolvedOpen, translateX]);

  const deleteAfterCommit = useCallback(() => {
    onDelete();
  }, [onDelete]);

  const notifyDeleteCommitStart = useCallback(() => {
    onDeleteCommitStart?.();
  }, [onDeleteCommitStart]);

  const setSwipePressHold = useCallback(
    (pressed: boolean) => {
      onSwipePressHoldChange?.(pressed);
    },
    [onSwipePressHoldChange]
  );

  const commitDelete = useCallback(() => {
    triggerImpact(Haptics.ImpactFeedbackStyle.Medium);
    setSwipePressHold(true);
    notifyDeleteCommitStart();
    setDeleteOpen(false);
    translateX.value = withTiming(-rowWidth.value, TIMING_CONFIG, (finished) => {
      if (finished) {
        deleteActionVisibility.value = withTiming(theme.spacing[0], DELETE_COMMIT_FADE_CONFIG, (fadeFinished) => {
          if (fadeFinished) {
            runOnJS(deleteAfterCommit)();
          }
        });
      }
    });
  }, [deleteActionVisibility, deleteAfterCommit, notifyDeleteCommitStart, rowWidth, setSwipePressHold, translateX]);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-theme.spacing.sm, theme.spacing.sm])
        .failOffsetY([-theme.spacing.lg, theme.spacing.lg])
        .onBegin(() => {
          gestureSettling.value = false;
          runOnJS(setSwipePressHold)(true);
          gestureStartTranslate.value = translateX.value;
        })
        .onUpdate((event) => {
          const fullTranslate = -rowWidth.value;
          const commitTranslate = fullTranslate * SWIPE_COMMIT_RATIO;
          const nextTranslate = clampWorklet(gestureStartTranslate.value + event.translationX, fullTranslate, theme.spacing[0]);
          translateX.value = nextTranslate;

          if (nextTranslate <= commitTranslate && !commitHapticFired.value) {
            commitHapticFired.value = true;
            runOnJS(triggerImpact)(Haptics.ImpactFeedbackStyle.Medium);
          } else if (nextTranslate > commitTranslate) {
            commitHapticFired.value = false;
          }
        })
        .onEnd((event) => {
          const fullTranslate = -rowWidth.value;
          const commitTranslate = fullTranslate * SWIPE_COMMIT_RATIO;
          const shouldCommit = translateX.value <= commitTranslate || (event.velocityX < -SWIPE_COMMIT_VELOCITY && translateX.value < -deleteWidth);

          if (shouldCommit) {
            gestureSettling.value = true;
            runOnJS(notifyDeleteCommitStart)();
            translateX.value = withTiming(fullTranslate, TIMING_CONFIG, (finished) => {
              if (finished) {
                deleteActionVisibility.value = withTiming(theme.spacing[0], DELETE_COMMIT_FADE_CONFIG, (fadeFinished) => {
                  if (fadeFinished) {
                    runOnJS(deleteAfterCommit)();
                  }
                });
              }
            });
            return;
          }

          const shouldOpen = translateX.value <= -SWIPE_REVEAL_THRESHOLD || (event.velocityX < -SWIPE_VELOCITY_THRESHOLD && translateX.value < theme.spacing[0]);
          if (shouldOpen) {
            gestureSettling.value = true;
            translateX.value = withTiming(-deleteWidth, TIMING_CONFIG, (finished) => {
              if (finished) {
                gestureSettling.value = false;
                runOnJS(setOpenState)(true);
                runOnJS(setSwipePressHold)(false);
              }
            });
            return;
          }

          gestureSettling.value = true;
          translateX.value = withTiming(theme.spacing[0], TIMING_CONFIG, (finished) => {
            if (finished) {
              gestureSettling.value = false;
              runOnJS(setOpenState)(false);
              runOnJS(setSwipePressHold)(false);
            }
          });
        })
        .onFinalize(() => {
          commitHapticFired.value = false;
          if (!gestureSettling.value) {
            runOnJS(setSwipePressHold)(false);
          }
        }),
    [
      commitHapticFired,
      deleteActionVisibility,
      deleteAfterCommit,
      deleteWidth,
      gestureStartTranslate,
      gestureSettling,
      notifyDeleteCommitStart,
      rowWidth,
      setOpenState,
      setSwipePressHold,
      translateX
    ]
  );

  const deleteActionStyle = useAnimatedStyle(() => {
    const exposedWidth = Math.max(theme.spacing[0], -translateX.value);

    return {
      width: exposedWidth,
      opacity: interpolate(exposedWidth, [theme.spacing[0], theme.spacing.xs], [0, 1], Extrapolation.CLAMP) * deleteActionVisibility.value
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const fullTranslate = -rowWidth.value;
    const commitTranslate = fullTranslate * SWIPE_COMMIT_RATIO;
    return {
      opacity: interpolate(translateX.value, [fullTranslate, commitTranslate, theme.spacing[0]], [0, 1, 1], Extrapolation.CLAMP),
      transform: [{ translateX: translateX.value }]
    };
  });

  return (
    <Animated.View
      style={[styles.root, style, shapeStyle]}
      onLayout={(event) => {
        rowWidth.value = event.nativeEvent.layout.width || theme.sizes.approachWidth;
      }}
    >
      <Animated.View style={[styles.deleteActionFill, shapeStyle, deleteActionStyle]} pointerEvents="box-none">
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={commitDelete}
          pointerEvents={deleteOpen ? "auto" : "none"}
          style={styles.deletePressable}
        >
          <View style={styles.deleteIconLayer}>
            <Icon name="trash" size={theme.sizes.approachStatusIcon} color={theme.colors.background.canvas} />
          </View>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.swipeableChildren, shapeStyle, contentStyle]}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: theme.sizes.approachCountRowMinHeight,
    position: "relative",
    overflow: "hidden",
    borderRadius: theme.radius.lg
  },
  deleteActionFill: {
    position: "absolute",
    top: theme.spacing[0],
    right: theme.spacing[0],
    bottom: theme.spacing[0],
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.status.negative
  },
  deletePressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  deleteIconLayer: {
    flex: 1,
    minWidth: theme.sizes.approachDeleteWidth,
    alignItems: "center",
    justifyContent: "center"
  },
  swipeableChildren: {
    overflow: "hidden",
    borderRadius: theme.radius.lg
  }
});
