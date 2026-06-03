import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, type PressableProps } from "react-native";
import { theme } from "@/theme";

export type SwitchProps = Omit<PressableProps, "onPress" | "style"> & {
  selected?: boolean;
  disabled?: boolean;
  size?: "md";
  onChange?: (selected: boolean) => void;
};

const thumbTravel = theme.sizes.switchWidth - theme.spacing.xxs * 2 - theme.sizes.switchThumb;

export function Switch({ selected = false, disabled = false, size = "md", onChange, accessibilityLabel, ...pressableProps }: SwitchProps) {
  const translateX = useRef(new Animated.Value(selected ? thumbTravel : theme.spacing[0])).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: selected ? thumbTravel : theme.spacing[0],
      duration: 160,
      useNativeDriver: true
    }).start();
  }, [selected, translateX]);

  const trackBackgroundColor = selected && !disabled ? theme.colors.content.inkDeep : theme.colors.background.canvasSoft;
  const thumbBackgroundColor = disabled ? theme.colors.content.mute : theme.colors.background.canvas;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={() => onChange?.(!selected)}
      style={({ pressed }) => [
        styles.track,
        size === "md" && styles.trackMd,
        { backgroundColor: pressed && selected && !disabled ? theme.colors.content.ink : trackBackgroundColor }
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          !disabled && theme.shadows.switchThumb,
          {
            backgroundColor: thumbBackgroundColor,
            transform: [{ translateX }]
          }
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    padding: theme.spacing.xxs,
    borderRadius: theme.radius.pill,
    justifyContent: "center"
  },
  trackMd: {
    width: theme.sizes.switchWidth,
    height: theme.sizes.switchHeight
  },
  thumb: {
    width: theme.sizes.switchThumb,
    height: theme.sizes.switchThumb,
    borderRadius: theme.radius.full
  }
});
