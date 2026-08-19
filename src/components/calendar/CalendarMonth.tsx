import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { DateCell } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { addMonths, buildMonthWeeks, getDateKey, parseDateKey, startOfDay } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";
import { formatRuMonth } from "@/utils/date";

export type CalendarMonthProps = {
  selectedKey?: string;
  defaultSelectedKey?: string;
  minDate?: Date;
  width?: "full" | number;
  onSelect?: (key: string, date: Date) => void;
  style?: StyleProp<ViewStyle>;
};

const weekdayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const daysInWeek = 7;
const fixedWeekRowCount = 6;

type CalendarWeek = ReturnType<typeof buildMonthWeeks>[number];

export function CalendarMonth({ selectedKey, defaultSelectedKey, minDate, width = "full", onSelect, style }: CalendarMonthProps) {
  const fallbackSelectedKey = selectedKey ?? defaultSelectedKey ?? getDateKey(startOfDay(new Date()));
  const selectedDate = useMemo(() => parseDateKey(fallbackSelectedKey), [fallbackSelectedKey]);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDate));
  const [internalSelectedKey, setInternalSelectedKey] = useState(fallbackSelectedKey);
  const resolvedSelectedKey = selectedKey ?? internalSelectedKey;
  const resolvedMinDate = useMemo(() => startOfDay(minDate ?? new Date()), [minDate]);
  const weeks = useMemo(() => buildFixedWeekRows(buildMonthWeeks(visibleMonth, resolvedSelectedKey)), [resolvedSelectedKey, visibleMonth]);
  const previousMonth = addMonths(visibleMonth, -1);
  const isPreviousDisabled = isBeforeMonth(previousMonth, resolvedMinDate);
  const rootWidthStyle = width === "full" ? styles.rootFull : { width };

  const handleSelect = (key: string, date: Date) => {
    setInternalSelectedKey(key);
    onSelect?.(key, date);
  };

  return (
    <View style={[styles.root, rootWidthStyle, style]}>
      <View style={styles.header}>
        <Text style={styles.monthTitle}>{formatRuMonth(visibleMonth)}</Text>
        <View style={styles.navigation}>
          <MonthButton
            accessibilityLabel="Предыдущий месяц"
            disabled={isPreviousDisabled}
            iconName="chevron left"
            onPress={() => setVisibleMonth(previousMonth)}
          />
          <MonthButton accessibilityLabel="Следующий месяц" iconName="chevron right" onPress={() => setVisibleMonth(addMonths(visibleMonth, 1))} />
        </View>
      </View>

      <View style={styles.weekdays}>
        {weekdayLabels.map((label, index) => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={[styles.weekday, index > 4 && styles.weekend]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.weeks}>
        {weeks.map((week, weekIndex) => (
          <View key={`${visibleMonth.toISOString()}-${weekIndex}`} style={styles.week}>
            {week.map((cell, dayIndex) => {
              if (!cell) {
                return <View key={`blank-${dayIndex}`} style={styles.emptyCell} />;
              }

              const isDisabled = cell.disabled || cell.date < resolvedMinDate;
              return (
                <DateCell
                  key={cell.key}
                  accessibilityLabel={formatDayLabel(cell.date)}
                  disabled={isDisabled}
                  label={cell.label}
                  state={isDisabled ? "disabled" : cell.key === resolvedSelectedKey ? "select" : "date"}
                  onPress={() => handleSelect(cell.key, cell.date)}
                  style={styles.cell}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function MonthButton({
  accessibilityLabel,
  disabled,
  iconName,
  onPress
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  iconName: "chevron left" | "chevron right";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.monthButton, disabled && styles.monthButtonDisabled, pressed && !disabled && styles.monthButtonPressed]}
    >
      <Icon name={iconName} size={theme.sizes.buttonIconSmall} color={disabled ? theme.colors.content.disabled : theme.colors.content.ink} />
    </Pressable>
  );
}

function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function isBeforeMonth(month: Date, minDate: Date) {
  return month.getFullYear() < minDate.getFullYear() || (month.getFullYear() === minDate.getFullYear() && month.getMonth() < minDate.getMonth());
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

function buildFixedWeekRows(weeks: CalendarWeek[]) {
  if (weeks.length >= fixedWeekRowCount) return weeks;

  return [
    ...weeks,
    ...Array.from({ length: fixedWeekRowCount - weeks.length }, createEmptyWeek)
  ];
}

function createEmptyWeek(): CalendarWeek {
  return Array.from({ length: daysInWeek }, () => null);
}

const styles = StyleSheet.create({
  root: {
    gap: theme.spacing.xs
  },
  rootFull: {
    alignSelf: "stretch"
  },
  header: {
    minHeight: theme.sizes.buttonSmallIconHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg
  },
  monthTitle: {
    ...theme.typography.body.mdStrong,
    flex: 1,
    minWidth: theme.spacing[0],
    color: theme.colors.content.ink
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  monthButton: {
    width: theme.sizes.buttonSmallIconWidth,
    height: theme.sizes.buttonSmallIconHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background.canvasSoft
  },
  monthButtonPressed: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  monthButtonDisabled: {
    opacity: 0.5
  },
  weekdays: {
    minHeight: theme.sizes.datePickerWeekdayRowHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm
  },
  weekdayCell: {
    flex: 1,
    minWidth: theme.spacing[0],
    height: theme.sizes.dateCellHeight - theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full
  },
  weekday: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  weekend: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  weeks: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm
  },
  week: {
    minHeight: theme.sizes.dateCellHeight,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cell: {
    flexShrink: 0
  },
  emptyCell: {
    width: theme.sizes.dateCellWidth,
    height: theme.sizes.dateCellHeight
  }
});
