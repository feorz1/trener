import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Badge, Button } from "@/components/ui";
import {
  addMonths,
  buildMonthWeeks,
  freeSlots,
  getDateKey,
  isCalendarSlot,
  parseDateKey,
  type CalendarSlot,
  type DateCell,
  weekdayShort
} from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";
import { formatRuMonth, formatRuSelectDate } from "@/utils/date";

const calendarNavHeight = theme.spacing["3xl"] + theme.spacing.md;
const calendarHeaderHeight = calendarNavHeight + theme.sizes.datePickerWeekdayRowHeight;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutDateSelectSheet() {
  const { clientId, clientName, date, exerciseIds, scheduleDate, scheduleTime, scheduleRepeatDays } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    exerciseIds?: string;
    scheduleDate?: string;
    scheduleTime?: string;
    scheduleRepeatDays?: string;
  }>();
  const initialDate = useMemo(() => parseDateKey(firstParam(scheduleDate) ?? firstParam(date)), [date, scheduleDate]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | undefined>(() => {
    const value = firstParam(scheduleTime);
    return isCalendarSlot(value) ? value : undefined;
  });
  const selectedKey = getDateKey(selectedDate);
  const months = useMemo(() => [selectedDate, addMonths(selectedDate, 1)], [selectedKey]);

  const closeSheet = () => {
    router.back();
  };

  const saveDate = () => {
    if (!selectedSlot) return;

    router.dismissTo({
      pathname: "/workouts/schedule",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        ...(firstParam(exerciseIds) ? { exerciseIds: firstParam(exerciseIds) } : {}),
        scheduleDate: selectedKey,
        scheduleTime: selectedSlot,
        scheduleDateConfirmed: "1",
        scheduleRepeatDays: firstParam(scheduleRepeatDays) ?? ""
      }
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.calendarNav}>
        <Pressable accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={closeSheet} style={styles.closeTextButton}>
          <Text style={styles.closeText}>Закрыть</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.calendarTitle}>
          Дата тренировки
        </Text>
        <View style={styles.closeTextButton} />
      </View>

      <View style={styles.weekdayRow}>
        {weekdayShort.map((weekday, index) => (
          <Text key={weekday} style={[styles.weekdayText, index > 4 && styles.weekendText]}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.calendarContent}>
        {months.map((month) => (
          <MonthSection key={getDateKey(month)} month={month} selectedKey={selectedKey} onSelectDate={setSelectedDate} />
        ))}
      </View>

      <View style={styles.slotAction}>
        <View style={styles.slotContent}>
          <Text style={styles.slotTitle}>Свободное время</Text>
          <View style={styles.slotList}>
            {freeSlots.map((slot) => (
              <Pressable key={slot} accessibilityRole="button" accessibilityState={{ selected: slot === selectedSlot }} onPress={() => setSelectedSlot(slot)}>
                <Badge label={slot} tone={slot === selectedSlot ? "select" : "neutral"} icon={false} />
              </Pressable>
            ))}
          </View>
        </View>
        <Button label="Сохранить" type="primary" size="large" width="fill" state={selectedSlot ? "active" : "disabled"} onPress={saveDate} />
      </View>
    </View>
  );
}

function MonthSection({ month, selectedKey, onSelectDate }: { month: Date; selectedKey: string; onSelectDate: (date: Date) => void }) {
  const weeks = useMemo(() => buildMonthWeeks(month, selectedKey), [month, selectedKey]);

  return (
    <View style={styles.monthSection}>
      <Text style={styles.monthTitle}>{formatRuMonth(month)}</Text>
      <View style={styles.monthGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={`${getDateKey(month)}-${weekIndex}`} style={styles.monthWeek}>
            {week.map((cell, dayIndex) =>
              cell ? (
                <CalendarDateButton key={cell.key} cell={cell} selected={cell.key === selectedKey} onPress={() => onSelectDate(cell.date)} />
              ) : (
                <View key={`empty-${dayIndex}`} style={styles.dateCell} />
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function CalendarDateButton({ cell, selected, onPress }: { cell: DateCell; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatRuSelectDate(cell.date)}
      accessibilityState={{ selected, disabled: cell.disabled }}
      disabled={cell.disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateCell,
        selected && styles.dateCellSelected,
        cell.disabled && styles.dateCellDisabled,
        pressed && !cell.disabled && styles.pressed
      ]}
    >
      <Text style={[styles.dateText, selected && styles.dateTextSelected, cell.disabled && styles.dateTextDisabled]}>{cell.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    position: "relative",
    width: "100%",
    backgroundColor: theme.colors.background.canvas
  },
  calendarNav: {
    position: "absolute",
    top: theme.spacing[0],
    right: theme.spacing[0],
    left: theme.spacing[0],
    zIndex: 2,
    height: calendarNavHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  closeTextButton: {
    width: theme.spacing["3xl"] + theme.spacing.lg,
    justifyContent: "center"
  },
  closeText: {
    ...theme.typography.body.sm,
    color: theme.colors.content.ink
  },
  calendarTitle: {
    ...theme.typography.body.mdStrong,
    flex: 1,
    minWidth: theme.spacing[0],
    color: theme.colors.content.inkDeep,
    textAlign: "center"
  },
  weekdayRow: {
    position: "absolute",
    top: calendarNavHeight,
    right: theme.spacing[0],
    left: theme.spacing[0],
    zIndex: 2,
    height: theme.sizes.datePickerWeekdayRowHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  weekdayText: {
    ...theme.typography.body.smStrong,
    width: theme.sizes.dateCellWidth,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  weekendText: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  calendarContent: {
    marginTop: calendarHeaderHeight,
    paddingBottom: theme.spacing.lg
  },
  monthSection: {
    paddingBottom: theme.spacing.lg
  },
  monthTitle: {
    ...theme.typography.body.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    color: theme.colors.content.inkDeep
  },
  monthGrid: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg
  },
  monthWeek: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dateCell: {
    width: theme.sizes.dateCellWidth,
    height: theme.sizes.dateCellHeight,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.background.canvas
  },
  dateCellSelected: {
    backgroundColor: theme.colors.content.inkDeep
  },
  dateCellDisabled: {
    opacity: 0.5
  },
  dateText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  dateTextSelected: {
    color: theme.colors.content.primary
  },
  dateTextDisabled: {
    color: theme.colors.content.mute
  },
  slotAction: {
    gap: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  slotContent: {
    gap: theme.spacing.sm
  },
  slotTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  slotList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  pressed: {
    opacity: 0.84
  }
});
