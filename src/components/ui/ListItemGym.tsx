import { useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import Animated from "react-native-reanimated";
import { theme } from "@/theme";
import { Checkbox } from "./Checkbox";
import {
  getGroupedListItemPosition,
  getSelectedGroupedListItemPosition,
  useAnimatedGroupedListItemRadius,
  type GroupedListItemPosition
} from "./groupedListItem";
import { Icon } from "./Icon";
import { Set, type WorkoutSetValue } from "./Set";
import { StagedSwipeDelete } from "./StagedSwipeDelete";

export type ListItemGymMode = "default" | "selected" | "move";
export type ListItemGymGroupPosition = GroupedListItemPosition;

export type ListItemGymProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  mode?: ListItemGymMode;
  groupPosition?: ListItemGymGroupPosition;
  width?: "fixed" | "fill";
  selected?: boolean;
  imageSource?: ImageSourcePropType;
  showSets?: boolean;
  setVariant?: "set" | "new";
  setValues?: WorkoutSetValue[];
  trailingSlot?: ReactNode;
  onAddSetPress?: () => void;
  onSelectedChange?: (selected: boolean) => void;
  onMovePress?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  deleteOpen?: boolean;
  defaultDeleteOpen?: boolean;
  onDeleteCommitStart?: () => void;
  onDeleteOpenChange?: (open: boolean) => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function getListItemGymGroupPosition(index: number, count: number): ListItemGymGroupPosition {
  return getGroupedListItemPosition(index, count);
}

export function getListItemGymSelectedGroupPosition(
  selected: boolean,
  previousSelected: boolean,
  nextSelected: boolean
): ListItemGymGroupPosition {
  return getSelectedGroupedListItemPosition(selected, previousSelected, nextSelected);
}

export function ListItemGym({
  title,
  mode = "default",
  groupPosition = "single",
  width = "fixed",
  selected = mode === "selected",
  imageSource,
  showSets = mode === "move",
  setVariant = "new",
  setValues,
  trailingSlot,
  onAddSetPress,
  onSelectedChange,
  onMovePress,
  deleteOpen,
  defaultDeleteOpen = false,
  onDeleteCommitStart,
  onDeleteOpenChange,
  onDelete,
  style,
  accessibilityLabel,
  ...pressableProps
}: ListItemGymProps) {
  const isSelected = selected || mode === "selected";
  const isDeleteEnabled = Boolean(deleteOpen !== undefined || defaultDeleteOpen || onDeleteOpenChange || onDelete);
  const widthStyle = width === "fill" ? styles.fillWidth : styles.fixedWidth;
  const radiusStyle = useAnimatedGroupedListItemRadius(groupPosition);
  const [deleteCommitting, setDeleteCommitting] = useState(false);
  const [swipePressHeld, setSwipePressHeld] = useState(false);
  const handleDelete = () => {
    onDelete?.();
    requestAnimationFrame(() => {
      setDeleteCommitting(false);
      setSwipePressHeld(false);
    });
  };
  const handleDeleteCommitStart = () => {
    setDeleteCommitting(true);
    onDeleteCommitStart?.();
  };

  const item = (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={pressableProps.onPress ? "button" : undefined}
      style={({ pressed }) => [
        styles.root,
        isSelected && styles.selected,
        (pressed || swipePressHeld || deleteCommitting) && (isSelected ? styles.selectedPressed : styles.pressed)
      ]}
    >
      <ExerciseThumb source={imageSource} />

      <View style={styles.content}>
        <Text numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        {showSets ? <Set variant={setVariant} values={setValues} onAddPress={onAddSetPress} /> : null}
      </View>

      {trailingSlot ??
        (mode === "move" ? (
          <MoveHandle onMovePress={onMovePress} />
        ) : (
          <Checkbox selected={isSelected} showLabel={false} onChange={onSelectedChange} />
        ))}
    </Pressable>
  );

  if (isDeleteEnabled) {
    return (
      <StagedSwipeDelete
        accessibilityLabel="Delete exercise"
        defaultOpen={defaultDeleteOpen}
        deleteWidth={theme.sizes.listItemGymDeleteWidth}
        open={deleteOpen}
        onDelete={handleDelete}
        onDeleteCommitStart={handleDeleteCommitStart}
        onOpenChange={onDeleteOpenChange}
        onSwipePressHoldChange={setSwipePressHeld}
        shapeStyle={radiusStyle}
        style={[styles.swipeRoot, widthStyle, style]}
      >
        {item}
      </StagedSwipeDelete>
    );
  }

  return <Animated.View style={[styles.itemShell, widthStyle, radiusStyle, style]}>{item}</Animated.View>;
}

function ExerciseThumb({ source }: { source?: ImageSourcePropType }) {
  if (source) {
    return <Image source={source} style={styles.thumb} />;
  }

  return (
    <View style={styles.thumbFallback}>
      <Icon name="muscle legs" size={theme.spacing.xl} color={theme.colors.content.inkDeep} />
    </View>
  );
}

function MoveHandle({ onMovePress }: { onMovePress?: () => void }) {
  return (
    <Pressable accessibilityLabel="Move exercise" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onMovePress}>
      <Icon name="move" size={theme.spacing.xl} color={theme.colors.content.mute} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  itemShell: {
    overflow: "hidden"
  },
  swipeRoot: {
    width: theme.sizes.listItemGymWidth,
    minHeight: theme.sizes.listItemGymMinHeight,
    overflow: "hidden"
  },
  fixedWidth: {
    width: theme.sizes.listItemGymWidth
  },
  fillWidth: {
    width: "100%",
    alignSelf: "stretch"
  },
  root: {
    minHeight: theme.sizes.listItemGymMinHeight,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.canvas
  },
  selected: {
    backgroundColor: theme.colors.content.primaryPale
  },
  pressed: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  selectedPressed: {
    opacity: 0.88
  },
  thumb: {
    width: theme.sizes.listItemGymThumb,
    height: theme.sizes.listItemGymThumb,
    borderRadius: theme.radius.md
  },
  thumbFallback: {
    width: theme.sizes.listItemGymThumb,
    height: theme.sizes.listItemGymThumb,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.canvasSoft
  },
  content: {
    flex: 1,
    minWidth: theme.spacing[0],
    gap: theme.spacing.xs
  },
  title: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  }
});
