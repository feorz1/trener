import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type SuperSetSegment = {
  id: string;
  selected?: boolean;
};

export type SuperSetProps = {
  segments?: SuperSetSegment[];
  itemCount?: number;
  rowHeight?: number;
  rowHeights?: number[];
  rowGap?: number;
  onSegmentPress?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
};

const defaultSegments: SuperSetSegment[] = [
  { id: "one" },
  { id: "two" }
];

export function SuperSet({
  segments = defaultSegments,
  itemCount,
  rowHeight = theme.sizes.listItemGymMinHeight,
  rowHeights,
  rowGap = theme.spacing[0],
  onSegmentPress,
  style
}: SuperSetProps) {
  const resolvedSegments = segments.length > 0 ? segments : defaultSegments;
  const resolvedItemCount = Math.max(itemCount ?? resolvedSegments.length + 1, 2);
  const resolvedRowHeights = Array.from({ length: resolvedItemCount }, (_, index) => rowHeights?.[index] ?? rowHeight);
  const rowOffsets = resolvedRowHeights.reduce<number[]>((offsets, currentHeight, index) => {
    const previousOffset = offsets[index] ?? theme.spacing[0];
    offsets[index + 1] = previousOffset + currentHeight + (index < resolvedItemCount - 1 ? rowGap : theme.spacing[0]);
    return offsets;
  }, [theme.spacing[0]]);
  const railHeight = rowOffsets[resolvedItemCount] ?? resolvedItemCount * rowHeight;
  const buttonClearance = theme.sizes.superSetButton / 2 + theme.spacing.xs;
  const rowLines = resolvedRowHeights.map((height, index) => {
    const avatarInset = Math.max(theme.spacing[0], (height - theme.sizes.listItemGymThumb) / 2);
    const edgeTrim = avatarInset + theme.spacing.xxs;
    const topTrim = index > 0 ? buttonClearance : edgeTrim;
    const bottomTrim = index < resolvedItemCount - 1 ? buttonClearance : edgeTrim;
    const selected = Boolean(resolvedSegments[index - 1]?.selected || resolvedSegments[index]?.selected);

    return {
      id: `row-${index}`,
      selected,
      top: (rowOffsets[index] ?? theme.spacing[0]) + topTrim,
      height: Math.max(theme.spacing[0], height - topTrim - bottomTrim)
    };
  });
  const buttons = resolvedSegments.map((segment, index) => {
    const rowBottom = (rowOffsets[index + 1] ?? theme.spacing[0]) - rowGap;

    return {
      segment,
      center: rowBottom + rowGap / 2
    };
  });

  return (
    <View style={[styles.root, { height: railHeight }, style]}>
      {rowLines.map((line) => (
        <SuperSetLine key={line.id} selected={line.selected} top={line.top} height={line.height} />
      ))}
      {buttons.map(({ segment, center }) => (
        <SuperSetButton key={segment.id} id={segment.id} selected={segment.selected} center={center} onPress={onSegmentPress} />
      ))}
    </View>
  );
}

function SuperSetLine({ selected, top, height }: { selected?: boolean; top: number; height: number }) {
  const backgroundColor = selected ? theme.colors.content.inkDeep : theme.colors.background.canvasSoft;

  return <View style={[styles.line, { top, height, backgroundColor }]} />;
}

function SuperSetButton({
  id,
  selected,
  center,
  onPress
}: {
  id: string;
  selected?: boolean;
  center: number;
  onPress?: (id: string) => void;
}) {
  const backgroundColor = selected ? theme.colors.content.inkDeep : theme.colors.background.canvasSoft;
  const iconColor = selected ? theme.colors.background.canvas : theme.colors.content.inkDeep;

  return (
    <Pressable
      accessibilityLabel="Toggle superset connection"
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      hitSlop={theme.spacing.sm}
      onPress={() => onPress?.(id)}
      style={[styles.buttonHitArea, { top: center - theme.sizes.touchTargetComfort / 2 }]}
    >
      <View style={[styles.button, { backgroundColor }]}>
        <Icon name="add" size={theme.sizes.superSetIcon} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.superSetWidth,
    alignItems: "center",
    position: "relative"
  },
  line: {
    position: "absolute",
    left: (theme.sizes.superSetWidth - theme.sizes.superSetLineWidth) / 2,
    width: theme.sizes.superSetLineWidth,
    borderRadius: theme.radius.xl
  },
  buttonHitArea: {
    position: "absolute",
    left: theme.spacing[0],
    width: theme.sizes.superSetWidth,
    height: theme.sizes.touchTargetComfort,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1
  },
  button: {
    width: theme.sizes.superSetButton,
    height: theme.sizes.superSetButton,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full
  }
});
