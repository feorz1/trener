import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";

export type CalendarDayTemporalState = "past" | "default" | "future";

export type CalendarDayStripItem = {
  key: string;
  weekday: string;
  dayNumber: string;
  temporalState?: CalendarDayTemporalState;
  disabled?: boolean;
};

export type CalendarDayStripProps = {
  items?: CalendarDayStripItem[];
  weeks?: CalendarDayStripItem[][];
  selectedKey?: string;
  defaultSelectedKey?: string;
  todayKey?: string;
  disabled?: boolean;
  width?: number | "full";
  onSelect?: (key: string, item: CalendarDayStripItem) => void;
  onWeekChange?: (weekStartKey: string, weekIndex: number) => void;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_ITEMS: CalendarDayStripItem[] = [
  { key: "2026-05-11", weekday: "Пн", dayNumber: "11", temporalState: "past" },
  { key: "2026-05-12", weekday: "Вт", dayNumber: "12", temporalState: "past" },
  { key: "2026-05-13", weekday: "Ср", dayNumber: "13", temporalState: "default" },
  { key: "2026-05-14", weekday: "Чт", dayNumber: "14", temporalState: "default" },
  { key: "2026-05-15", weekday: "Пт", dayNumber: "15", temporalState: "future" },
  { key: "2026-05-16", weekday: "Сб", dayNumber: "16", temporalState: "future" },
  { key: "2026-05-17", weekday: "Вс", dayNumber: "17", temporalState: "future" }
];

const SELECTION_ANIMATION_DURATION = 180;
const TODAY_DOT_TOP =
  theme.sizes.calendarDayHeight - theme.spacing.sm - theme.sizes.calendarDayDot / 2;

function getBaseColor(item: CalendarDayStripItem) {
  if (item.temporalState === "past") {
    return theme.colors.content.primaryPale;
  }

  return theme.colors.background.canvas;
}

function getWeekPages(items?: CalendarDayStripItem[], weeks?: CalendarDayStripItem[][]) {
  if (weeks?.length) {
    return weeks.map((week) => week.slice(0, 7));
  }

  return [(items?.length ? items : DEFAULT_ITEMS).slice(0, 7)];
}

function CalendarDayCell({
  item,
  selected,
  today,
  disabled,
  width,
  onPress
}: {
  item: CalendarDayStripItem;
  selected: boolean;
  today: boolean;
  disabled: boolean;
  width: number;
  onPress: () => void;
}) {
  const selectedProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selectedProgress, {
      toValue: selected ? 1 : 0,
      duration: SELECTION_ANIMATION_DURATION,
      useNativeDriver: false
    }).start();
  }, [selected, selectedProgress]);

  const textColor = selected ? theme.colors.content.onPrimary : theme.colors.content.ink;
  const captionColor = selected ? theme.colors.content.onPrimary : theme.colors.content.body;
  const dotColor = selected ? theme.colors.content.onPrimary : theme.colors.content.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.weekday}, ${item.dayNumber}${today ? ", today" : ""}${selected ? ", selected" : ""}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.day,
        {
          width,
          backgroundColor: getBaseColor(item),
          opacity: disabled ? 0.48 : pressed ? 0.88 : 1
        }
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.selectedFill,
          {
            opacity: selectedProgress
          }
        ]}
      />
      <Text numberOfLines={1} style={[styles.weekday, { color: captionColor }]}>
        {item.weekday}
      </Text>
      <Text numberOfLines={1} style={[styles.dayNumber, { color: textColor }]}>
        {item.dayNumber}
      </Text>
      {today ? <View style={[styles.todayDot, { backgroundColor: dotColor }]} /> : null}
    </Pressable>
  );
}

export function CalendarDayStrip({
  items,
  weeks,
  selectedKey,
  defaultSelectedKey,
  todayKey,
  disabled = false,
  width = theme.sizes.calendarDayStripWidth,
  onSelect,
  onWeekChange,
  style
}: CalendarDayStripProps) {
  const pages = useMemo(() => getWeekPages(items, weeks), [items, weeks]);
  const fallbackSelectedKey = pages[0]?.[0]?.key ?? "";
  const scrollRef = useRef<ScrollView | null>(null);
  const [internalSelectedKey, setInternalSelectedKey] = useState(defaultSelectedKey ?? selectedKey ?? fallbackSelectedKey);
  const [measuredWidth, setMeasuredWidth] = useState(width === "full" ? theme.sizes.calendarDayStripWidth : width);
  const resolvedSelectedKey = selectedKey ?? internalSelectedKey;
  const rootWidthStyle: ViewStyle = width === "full" ? { alignSelf: "stretch" } : { width };
  const pageWidth = width === "full" ? measuredWidth : width;
  const availableCellWidth = Math.max(pageWidth - theme.spacing.xxs * 2 - theme.spacing.xs * 6, 0);
  const cellWidth = availableCellWidth / 7;
  const hasPaging = pages.length > 1;
  const selectedPageIndex = Math.max(
    pages.findIndex((week) => week.some((item) => item.key === resolvedSelectedKey)),
    0
  );

  useEffect(() => {
    if (!hasPaging) return;

    scrollRef.current?.scrollTo({
      x: selectedPageIndex * pageWidth,
      y: 0,
      animated: false
    });
  }, [hasPaging, pageWidth, selectedPageIndex]);

  const handlePress = (item: CalendarDayStripItem) => {
    setInternalSelectedKey(item.key);
    onSelect?.(item.key, item);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / Math.max(pageWidth, 1));
    const weekStartKey = pages[nextIndex]?.[0]?.key;
    if (weekStartKey) {
      onWeekChange?.(weekStartKey, nextIndex);
    }
  };

  const renderWeekPage = (week: CalendarDayStripItem[], weekIndex: number) => (
    <View key={week[0]?.key ?? String(weekIndex)} style={[styles.weekPage, { width: pageWidth }]}>
      {week.map((item) => (
        <CalendarDayCell
          key={item.key}
          item={item}
          selected={item.key === resolvedSelectedKey}
          today={item.key === todayKey}
          disabled={disabled || Boolean(item.disabled)}
          width={cellWidth}
          onPress={() => handlePress(item)}
        />
      ))}
    </View>
  );

  return (
    <View
      style={[styles.root, rootWidthStyle, style]}
      onLayout={(event) => {
        if (width === "full") {
          setMeasuredWidth(event.nativeEvent.layout.width);
        }
      }}
    >
      {hasPaging ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          snapToInterval={pageWidth}
          snapToAlignment="start"
          style={[styles.scroll, { width: pageWidth }]}
          contentContainerStyle={styles.scrollContent}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!disabled}
          onMomentumScrollEnd={handleMomentumEnd}
        >
          {pages.map(renderWeekPage)}
        </ScrollView>
      ) : (
        renderWeekPage(pages[0] ?? [], 0)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: theme.sizes.calendarDayStripHeight,
    minHeight: theme.sizes.calendarDayStripHeight,
    maxHeight: theme.sizes.calendarDayStripHeight,
    overflow: "hidden"
  },
  scroll: {
    height: theme.sizes.calendarDayStripHeight,
    minHeight: theme.sizes.calendarDayStripHeight,
    maxHeight: theme.sizes.calendarDayStripHeight,
    flexGrow: 0,
    flexShrink: 0,
    overflow: "hidden"
  },
  scrollContent: {
    height: theme.sizes.calendarDayStripHeight,
    alignItems: "center"
  },
  weekPage: {
    height: theme.sizes.calendarDayStripHeight,
    minHeight: theme.sizes.calendarDayStripHeight,
    maxHeight: theme.sizes.calendarDayStripHeight,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.xxs
  },
  day: {
    height: theme.sizes.calendarDayHeight,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xxs,
    overflow: "hidden",
    padding: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    position: "relative",
    flexShrink: 0
  },
  selectedFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.content.primary
  },
  weekday: {
    ...theme.typography.body.smCaption,
    zIndex: 1
  },
  dayNumber: {
    ...theme.typography.body.mdStrong,
    zIndex: 1
  },
  todayDot: {
    position: "absolute",
    top: TODAY_DOT_TOP,
    alignSelf: "center",
    zIndex: 1,
    width: theme.sizes.calendarDayDot,
    height: theme.sizes.calendarDayDot,
    borderRadius: theme.radius.full
  }
});
