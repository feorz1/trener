import { useEffect, useMemo, useRef } from "react";
import { LiquidGlassView, isLiquidGlassSupported } from "@callstack/liquid-glass";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";

export type ApproachQuickValuesProps = {
  frequentValues?: number[];
  popularValues?: number[];
  resetKey?: string;
  style?: StyleProp<ViewStyle>;
  onSelectValue?: (value: number) => void;
};

function formatQuickValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function uniqueValues(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

type QuickValueSection = {
  id: "frequent" | "popular";
  title: string;
  values: number[];
};

export function ApproachQuickValues({ frequentValues = [], popularValues = [], resetKey, style, onSelectValue }: ApproachQuickValuesProps) {
  const scrollRef = useRef<ScrollView>(null);
  const normalizedFrequentValues = useMemo(() => uniqueValues(frequentValues), [frequentValues]);
  const normalizedPopularValues = useMemo(() => uniqueValues(popularValues), [popularValues]);
  const sections = useMemo(
    () =>
      [
        { id: "frequent", title: "ЧАСТО ИСПОЛЬЗУЕМЫЕ", values: normalizedFrequentValues },
        { id: "popular", title: "ПОПУЛЯРНЫЕ", values: normalizedPopularValues }
      ].filter((section) => section.values.length > 0) as QuickValueSection[],
    [normalizedFrequentValues, normalizedPopularValues]
  );

  useEffect(() => {
    if (!resetKey) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: 0, animated: true });
    });
  }, [resetKey]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={[styles.root, style]}>
      <LiquidGlassView
        animated
        colorScheme="light"
        effect="regular"
        style={[styles.glassRoot, !isLiquidGlassSupported && styles.fallbackGlassRoot]}
        tintColor={theme.colors.background.glass}
      >
        {!isLiquidGlassSupported ? <View pointerEvents="none" style={styles.glassLayer} /> : null}
        <ScrollView
          ref={scrollRef}
          horizontal
          bounces={false}
          keyboardShouldPersistTaps="always"
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {sections.map((section) => (
            <QuickValueGroup key={section.id} title={section.title} values={section.values} onSelectValue={onSelectValue} />
          ))}
        </ScrollView>
      </LiquidGlassView>
    </View>
  );
}

function QuickValueGroup({ title, values, onSelectValue }: { title: string; values: number[]; onSelectValue?: (value: number) => void }) {
  return (
    <View style={styles.group}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chipRow}>
        {values.map((value) => (
          <Pressable key={value} accessibilityRole="button" onPress={() => onSelectValue?.(value)} style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
            <Text style={styles.chipText}>{formatQuickValue(value)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    maxWidth: "100%",
    height: theme.sizes.approachQuickValuesHeight,
    alignSelf: "center",
    borderRadius: theme.radius.lg,
    ...theme.shadows.glass
  },
  glassRoot: {
    flex: 1,
    alignItems: "stretch",
    overflow: "hidden",
    borderRadius: theme.radius.lg
  },
  fallbackGlassRoot: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.glassOverlay
  },
  content: {
    minHeight: theme.sizes.approachQuickValuesHeight,
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.md
  },
  group: {
    flexShrink: 0,
    gap: theme.spacing.xs
  },
  title: {
    ...theme.typography.body.smCaption,
    color: theme.colors.content.mute
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  chip: {
    minWidth: theme.sizes.approachQuickValuesChipMinWidth,
    height: theme.sizes.approachQuickValuesChipHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  chipPressed: {
    backgroundColor: theme.colors.content.primaryPale
  },
  chipText: {
    ...theme.typography.button.md,
    color: theme.colors.content.inkDeep
  }
});
