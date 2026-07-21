import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing as ReanimatedEasing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, useAppTheme, withResolvedShadowColor } from "@/theme";
import { Icon } from "./Icon";

type AnimatedTopNotificationPhase = "idle" | "entering" | "shown" | "exiting";

export type AnimatedTopNotificationType = "success" | "error" | "info";

export type AnimatedTopNotificationProps = {
  visible: boolean;
  message: string;
  type?: AnimatedTopNotificationType;
  duration?: number;
  animationSpeed?: number;
  topOffset?: number;
  offsetX?: number;
  respectSafeArea?: boolean;
  onFinish?: () => void;
  testID?: string;
};

const enterDuration = 520;
const exitDuration = 420;
const defaultVisibleDuration = 2000;
const defaultAnimationSpeed = 1.1;

export function AnimatedTopNotification({
  visible,
  message,
  type = "success",
  duration = defaultVisibleDuration,
  animationSpeed = defaultAnimationSpeed,
  topOffset = theme.spacing.lg,
  offsetX = theme.spacing[0],
  respectSafeArea = true,
  onFinish,
  testID
}: AnimatedTopNotificationProps) {
  const { resolvedColorScheme, resolvedColors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [phase, setPhase] = useState<AnimatedTopNotificationPhase>(visible ? "shown" : "idle");
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const progress = useSharedValue(visible ? 1 : 0);
  const mountedRef = useRef(visible);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizedMessage = message.replace(/\s+/g, " ").trim() || "Тренировка перенесена";
  const top = (respectSafeArea ? insets.top : theme.spacing[0]) + topOffset;
  const finalWidth = measuredWidth || theme.sizes.notificationAnimatedFallbackWidth;
  const safeAnimationSpeed = Math.max(0.25, animationSpeed);
  const enterTimingDuration = Math.round(enterDuration / safeAnimationSpeed);
  const exitTimingDuration = Math.round(exitDuration / safeAnimationSpeed);
  const iconColor =
    type === "success"
      ? resolvedColors.status.positive
      : type === "error"
        ? resolvedColors.status.negative
        : resolvedColors.content.body;
  const notificationShadowStyle = withResolvedShadowColor(theme.shadows.notification, resolvedColors.background.shadow);
  const notificationBackgroundColor =
    resolvedColorScheme === "dark" ? resolvedColors.background.canvasSoft : resolvedColors.background.canvas;

  const clearHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const finishExit = useCallback(() => {
    mountedRef.current = false;
    setMounted(false);
    setPhase("idle");
    onFinish?.();
  }, [onFinish]);

  const playExit = useCallback(() => {
    if (!mountedRef.current) {
      return;
    }

    clearHideTimer();
    setPhase("exiting");
    progress.value = withTiming(
      0,
      {
        duration: exitTimingDuration,
        easing: ReanimatedEasing.in(ReanimatedEasing.cubic)
      },
      (finished) => {
        if (finished) {
          runOnJS(finishExit)();
        }
      }
    );
  }, [clearHideTimer, exitTimingDuration, finishExit, progress]);

  const markShown = useCallback(() => {
    setPhase("shown");
  }, []);

  const playEnter = useCallback(() => {
    clearHideTimer();
    mountedRef.current = true;
    setMounted(true);
    setPhase("entering");
    progress.value = 0;
    progress.value = withTiming(
      1,
      {
        duration: enterTimingDuration,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic)
      },
      (finished) => {
        if (finished) {
          runOnJS(markShown)();
        }
      }
    );
    hideTimeoutRef.current = setTimeout(playExit, enterTimingDuration + duration);
  }, [clearHideTimer, duration, enterTimingDuration, markShown, playExit, progress]);

  useEffect(() => {
    if (visible) {
      playEnter();
      return;
    }

    playExit();
  }, [message, playEnter, playExit, visible]);

  useEffect(() => clearHideTimer, [clearHideTimer]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 1], [0.96, 1, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: offsetX },
      { translateY: interpolate(progress.value, [0, 1], [-theme.spacing["2xl"], theme.spacing[0]], Extrapolation.CLAMP) }
    ]
  }));

  const shellStyle = useAnimatedStyle(() => ({
    width: interpolate(
      progress.value,
      [0, 0.16, 0.4, 0.72, 1],
      [
        theme.sizes.notificationAnimatedMinHeight,
        theme.sizes.notificationAnimatedStageTwoWidth,
        theme.sizes.notificationAnimatedStageThreeWidth,
        theme.sizes.notificationAnimatedStageFourWidth,
        finalWidth
      ],
      Extrapolation.CLAMP
    )
  }));

  const contentStyle = useAnimatedStyle(() => ({
    width: finalWidth,
    opacity: interpolate(progress.value, [0, 0.18, 1], [0.44, 0.7, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateX:
          (interpolate(
            progress.value,
            [0, 0.16, 0.4, 0.72, 1],
            [
              theme.sizes.notificationAnimatedMinHeight,
              theme.sizes.notificationAnimatedStageTwoWidth,
              theme.sizes.notificationAnimatedStageThreeWidth,
              theme.sizes.notificationAnimatedStageFourWidth,
              finalWidth
            ],
            Extrapolation.CLAMP
          ) -
            finalWidth) /
          2
      }
    ]
  }));

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View pointerEvents="box-none" style={[styles.overlay, { top }, overlayStyle]}>
      <Animated.View
        style={[styles.shell, notificationShadowStyle, shellStyle]}
        accessibilityState={{ busy: phase === "entering" || phase === "exiting" }}
        testID={testID}
      >
        <Animated.View style={[styles.clip, { backgroundColor: notificationBackgroundColor }]}>
          <Animated.View style={[styles.content, contentStyle]}>
            <NotificationContent iconColor={iconColor} message={normalizedMessage} type={type} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
      <View pointerEvents="none" style={styles.measure} onLayout={(event) => setMeasuredWidth(Math.ceil(event.nativeEvent.layout.width))}>
        <Icon name={type === "error" ? "close filled" : type === "info" ? "information" : "check filled"} size={theme.sizes.notificationAnimatedIcon} color={iconColor} />
        <Text numberOfLines={1} style={styles.label}>
          {normalizedMessage}
        </Text>
      </View>
    </Animated.View>
  );
}

function NotificationContent({ iconColor, message, type }: { iconColor: string; message: string; type: AnimatedTopNotificationType }) {
  return (
    <>
      <Icon name={type === "error" ? "close filled" : type === "info" ? "information" : "check filled"} size={theme.sizes.notificationAnimatedIcon} color={iconColor} />
      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.label}>
        {message}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: theme.spacing["3xl"],
    alignItems: "center"
  },
  shell: {
    minHeight: theme.sizes.notificationAnimatedMinHeight,
    height: theme.sizes.notificationAnimatedMinHeight,
    maxWidth: "100%",
    justifyContent: "center",
    borderRadius: theme.radius.xl,
    overflow: "visible"
  },
  clip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.xl,
    overflow: "hidden"
  },
  content: {
    position: "absolute",
    top: theme.spacing[0],
    left: theme.spacing[0],
    height: theme.sizes.notificationAnimatedMinHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  measure: {
    position: "absolute",
    opacity: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  label: {
    ...theme.typography.body.md,
    flexShrink: 1,
    color: theme.colors.content.ink
  }
});
