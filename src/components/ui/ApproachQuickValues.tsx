import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";

export type ApproachQuickValuesProps = {
  frequentValues?: number[];
  popularValues?: number[];
  style?: StyleProp<ViewStyle>;
  onSelectValue?: (value: number) => void;
};

function formatQuickValue(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function uniqueValues(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

export function ApproachQuickValues({ frequentValues = [], popularValues = [], style, onSelectValue }: ApproachQuickValuesProps) {
  const normalizedFrequentValues = uniqueValues(frequentValues);
  const normalizedPopularValues = uniqueValues(popularValues);

  if (normalizedFrequentValues.length === 0 && normalizedPopularValues.length === 0) {
    return null;
  }

  return (
    <View style={[styles.root, style]}>
      <View pointerEvents="none" style={styles.glassLayer} />
      <ScrollView
        horizontal
        bounces={false}
        keyboardShouldPersistTaps="always"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {normalizedFrequentValues.length > 0 ? <QuickValueGroup title="ЧАСТО ИСПОЛЬЗУЕМЫЕ" values={normalizedFrequentValues} onSelectValue={onSelectValue} /> : null}
        {normalizedPopularValues.length > 0 ? <QuickValueGroup title="ПОПУЛЯРНЫЕ" values={normalizedPopularValues} onSelectValue={onSelectValue} /> : null}
      </ScrollView>
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
    width: theme.sizes.approachWidth,
    maxWidth: "100%",
    height: theme.sizes.approachQuickValuesHeight,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.glass,
    ...theme.shadows.glass
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
