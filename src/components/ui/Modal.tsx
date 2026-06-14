import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  LayoutAnimation,
  Modal as NativeModal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  useWindowDimensions,
  View,
  type KeyboardEvent,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";
import { Action, type ActionButtonConfig, type ActionLayout } from "./Action";
import { Button } from "./Button";
import { Icon } from "./Icon";

const KEYBOARD_HIDE_OFFSET_RESET_DELAY_MS = 260;
const MODAL_OPEN_DURATION_MS = 300;
const MODAL_CLOSE_DURATION_MS = 280;
const MODAL_LAYOUT_DURATION_MS = 240;
const isFabricEnabled = Boolean((globalThis as { nativeFabricUIManager?: unknown }).nativeFabricUIManager);

if (Platform.OS === "android" && !isFabricEnabled) {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export type ModalPresentation = "inline" | "overlay";

export type ModalBodyProps = {
  subheader?: string;
  description?: string;
  showBodyText?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export type ModalProps = {
  visible?: boolean;
  presentation?: ModalPresentation;
  title?: string;
  subline?: string;
  showSubline?: boolean;
  subheader?: string;
  description?: string;
  showBodyText?: boolean;
  children?: ReactNode;
  actionLayout?: ActionLayout;
  primaryAction?: ActionButtonConfig;
  secondaryAction?: ActionButtonConfig;
  tertiaryAction?: ActionButtonConfig;
  showActions?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  actionStyle?: StyleProp<ViewStyle>;
};

export function ModalBody({
  subheader = "This is a subheader",
  description = "This is the body of the modal.",
  showBodyText = true,
  children,
  style
}: ModalBodyProps) {
  const hasBodyText = showBodyText && Boolean(subheader || description);

  return (
    <View style={[styles.body, style]}>
      {hasBodyText ? (
        <View style={styles.textBlock}>
          {subheader ? <Text style={styles.subheader}>{subheader}</Text> : null}
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Modal({
  visible = true,
  presentation = "inline",
  title = "This is the header",
  subline = "Subline",
  showSubline = true,
  subheader,
  description,
  showBodyText = true,
  children,
  actionLayout = "single",
  primaryAction,
  secondaryAction,
  tertiaryAction,
  showActions = true,
  showCloseButton = true,
  onClose,
  style,
  bodyStyle,
  actionStyle
}: ModalProps) {
  const immediatePressHandled = useRef(false);
  const immediatePressResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (immediatePressResetTimer.current) {
        clearTimeout(immediatePressResetTimer.current);
      }
    },
    []
  );

  const resetImmediatePress = useCallback(() => {
    if (immediatePressResetTimer.current) {
      clearTimeout(immediatePressResetTimer.current);
      immediatePressResetTimer.current = null;
    }
    immediatePressHandled.current = false;
  }, []);

  const runImmediatePress = useCallback(
    (handler: () => void) => {
      if (immediatePressHandled.current) return;

      immediatePressHandled.current = true;
      if (immediatePressResetTimer.current) {
        clearTimeout(immediatePressResetTimer.current);
      }
      immediatePressResetTimer.current = setTimeout(resetImmediatePress, 500);
      handler();
    },
    [resetImmediatePress]
  );

  const getOverlayPressHandlers = useCallback(
    (handler?: () => void) => {
      if (presentation !== "overlay" || !handler) {
        return { onPress: handler };
      }

      return {
        onTouchStart: () => runImmediatePress(handler),
        onPressIn: () => runImmediatePress(handler),
        onPress: () => {
          if (immediatePressHandled.current) {
            resetImmediatePress();
            return;
          }

          handler();
        }
      };
    },
    [presentation, resetImmediatePress, runImmediatePress]
  );
  const closePressHandlers = getOverlayPressHandlers(onClose);
  const primaryActionConfig = getOverlayActionConfig(primaryAction, getOverlayPressHandlers);
  const secondaryActionConfig = getOverlayActionConfig(secondaryAction, getOverlayPressHandlers);
  const tertiaryActionConfig = getOverlayActionConfig(tertiaryAction, getOverlayPressHandlers);

  if (!visible && presentation === "inline") return null;

  const modalCard = (
    <View style={[styles.root, presentation === "overlay" && styles.overlayRootCard, style]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {showSubline ? <Text style={styles.subline}>{subline}</Text> : null}
        </View>
        {showCloseButton ? (
          <Button
            type="secondaryNeutral"
            size="mediumIcon"
            accessibilityLabel="Close modal"
            {...closePressHandlers}
            icon={<Icon name="close" size={theme.sizes.buttonIconMedium} color={theme.colors.content.ink} />}
          />
        ) : null}
      </View>

      <ModalBody subheader={subheader} description={description} showBodyText={showBodyText} style={bodyStyle}>
        {children}
      </ModalBody>

      {showActions ? (
        <Action layout={actionLayout} primary={primaryActionConfig} secondary={secondaryActionConfig} tertiary={tertiaryActionConfig} style={actionStyle} />
      ) : null}
    </View>
  );

  if (presentation === "overlay") {
    return (
      <ModalOverlay visible={visible} onClose={onClose}>
        {modalCard}
      </ModalOverlay>
    );
  }

  return modalCard;
}

function getOverlayActionConfig(
  action: ActionButtonConfig | undefined,
  getPressHandlers: (handler?: () => void) => { onPress?: () => void; onPressIn?: () => void; onTouchStart?: () => void }
) {
  if (!action) return undefined;
  return { ...action, ...getPressHandlers(action.onPress) };
}

function ModalOverlay({ visible, onClose, children }: { visible: boolean; onClose?: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(visible);
  const [renderedChildren, setRenderedChildren] = useState(children);
  const { height: windowHeight } = useWindowDimensions();
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const keyboardHideResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    configureModalLayoutAnimation();
    setRenderedChildren(children);
  }, [children, visible]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      keyboardOffset.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: MODAL_OPEN_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
      return;
    }

    Animated.timing(progress, {
      toValue: 0,
      duration: MODAL_CLOSE_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progress, visible]);

  useEffect(() => {
    if (!mounted) {
      if (keyboardHideResetTimer.current) {
        clearTimeout(keyboardHideResetTimer.current);
        keyboardHideResetTimer.current = null;
      }
      keyboardOffset.setValue(0);
      return;
    }

    const animateKeyboardOffset = (toValue: number, event?: KeyboardEvent) => {
      if (keyboardHideResetTimer.current) {
        clearTimeout(keyboardHideResetTimer.current);
        keyboardHideResetTimer.current = null;
      }
      Animated.timing(keyboardOffset, {
        toValue,
        duration: event?.duration ?? 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    };

    const handleKeyboardShow = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates.screenY;
      animateKeyboardOffset(Math.max(0, windowHeight - keyboardTop), event);
    };

    const handleKeyboardHide = (event?: KeyboardEvent) => {
      keyboardHideResetTimer.current = setTimeout(() => {
        animateKeyboardOffset(0, event);
      }, KEYBOARD_HIDE_OFFSET_RESET_DELAY_MS);
    };

    const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      if (keyboardHideResetTimer.current) {
        clearTimeout(keyboardHideResetTimer.current);
        keyboardHideResetTimer.current = null;
      }
      keyboardOffset.setValue(0);
    };
  }, [keyboardOffset, mounted, windowHeight]);

  if (!mounted) return null;

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5]
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.sizes.modalOverlayTranslateY, 0]
  });
  const sheetTranslateY = Animated.add(translateY, Animated.multiply(keyboardOffset, -1));

  return (
    <NativeModal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlayBackdrop, { opacity: backdropOpacity }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close modal overlay" style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.overlaySheet, { bottom: theme.spacing.xl, transform: [{ translateY: sheetTranslateY }] }]}>
          {renderedChildren}
        </Animated.View>
      </View>
    </NativeModal>
  );
}

function configureModalLayoutAnimation() {
  LayoutAnimation.configureNext({
    duration: MODAL_LAYOUT_DURATION_MS,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity
    },
    update: {
      type: LayoutAnimation.Types.easeInEaseOut
    },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity
    }
  });
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.modalWidth,
    maxWidth: "100%",
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  overlayRootCard: {
    width: "100%"
  },
  header: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingRight: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    paddingLeft: theme.spacing.xl
  },
  headerText: {
    flex: 1,
    minWidth: theme.spacing[0],
    gap: theme.spacing.xs
  },
  title: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink
  },
  subline: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink
  },
  body: {
    alignSelf: "stretch",
    gap: theme.spacing[0],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm
  },
  textBlock: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg
  },
  subheader: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  description: {
    ...theme.typography.body.md,
    color: theme.colors.content.ink
  },
  overlay: {
    flex: 1
  },
  overlayBackdrop: {
    backgroundColor: theme.colors.content.ink
  },
  overlaySheet: {
    position: "absolute",
    left: theme.spacing.sm,
    right: theme.spacing.sm
  }
});
