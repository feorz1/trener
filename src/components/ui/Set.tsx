import { useId, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { theme } from "@/theme";
import { Badge } from "./Badge";

export type WorkoutSetVariant = "set" | "new";

export type WorkoutSetValue = {
  id: string;
  label: string;
};

export type SetProps = {
  variant?: WorkoutSetVariant;
  values?: WorkoutSetValue[];
  addLabel?: string;
  onAddPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const defaultValues: WorkoutSetValue[] = [
  { id: "one", label: "12x10кг" },
  { id: "two", label: "8x15кг" },
  { id: "three", label: "6x15кг" },
  { id: "four", label: "4x10кг" }
];

export function Set({ variant = "set", values = defaultValues, addLabel = "Добавь подход", onAddPress, style }: SetProps) {
  const fadeId = `setOverflowFade-${useId().replace(/[^A-Za-z0-9_-]/g, "")}`;
  const [containerWidth, setContainerWidth] = useState<number>(theme.spacing[0]);
  const [contentWidth, setContentWidth] = useState<number>(theme.spacing[0]);
  const showOverflowFade = variant === "set" && contentWidth > containerWidth + theme.spacing.xxs;

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setContainerWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
  };

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setContentWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
  };

  return (
    <View style={[styles.root, variant === "new" ? styles.newRoot : styles.valuesRoot, style]} onLayout={handleContainerLayout}>
      {variant === "new" ? (
        onAddPress ? (
          <Pressable accessibilityLabel={addLabel} accessibilityRole="button" hitSlop={theme.spacing.sm} style={styles.newAction} onPress={onAddPress}>
            <Badge label={addLabel} tone="neutral" size="s" icon={false} />
          </Pressable>
        ) : (
          <Badge label={addLabel} tone="neutral" size="s" icon={false} />
        )
      ) : (
        <>
          <View style={styles.valuesRow} onLayout={handleContentLayout}>
            {values.map((value, index) => <Badge key={`${value.id}-${index}`} label={value.label} tone="neutral" size="s" icon={false} />)}
          </View>
          {showOverflowFade ? <SetOverflowFade fadeId={fadeId} /> : null}
        </>
      )}
    </View>
  );
}

function SetOverflowFade({ fadeId }: { fadeId: string }) {
  return (
    <View pointerEvents="none" style={styles.overflowFade}>
      <Svg height="100%" width="100%">
        <Defs>
          <LinearGradient id={fadeId} x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={theme.colors.background.canvas} stopOpacity={0} />
            <Stop offset="1" stopColor={theme.colors.background.canvas} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect fill={`url(#${fadeId})`} height="100%" width="100%" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minWidth: theme.spacing[0],
    maxWidth: "100%",
    overflow: "hidden",
    position: "relative"
  },
  valuesRoot: {
    alignSelf: "stretch"
  },
  newRoot: {
    alignSelf: "flex-start"
  },
  newAction: {
    alignSelf: "flex-start"
  },
  valuesRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  overflowFade: {
    position: "absolute",
    top: theme.spacing[0],
    right: theme.spacing[0],
    bottom: theme.spacing[0],
    width: theme.spacing["3xl"]
  }
});
