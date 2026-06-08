import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal as NativeModal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  getListItemCellSelectedGroupPosition,
  ListItemCell,
  Modal,
  Navigation,
  Select
} from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

type DateCell = {
  date: Date;
  key: string;
  label: string;
  disabled?: boolean;
};

type CalendarSlot = "15:00" | "16:00" | "17:00" | "18:00";
type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const freeSlots: CalendarSlot[] = ["15:00", "16:00", "17:00", "18:00"];
const repeatOptions: { key: RepeatDay; label: string }[] = [
  { key: "monday", label: "Каждый понедельник" },
  { key: "tuesday", label: "Каждый вторник" },
  { key: "wednesday", label: "Каждую среду" },
  { key: "thursday", label: "Каждый четверг" },
  { key: "friday", label: "Каждую пятницу" },
  { key: "saturday", label: "Каждую субботу" },
  { key: "sunday", label: "Каждое воскресенье" }
];
const repeatDayLabels: Record<RepeatDay, string> = {
  monday: "понедельник",
  tuesday: "вторник",
  wednesday: "среда",
  thursday: "четверг",
  friday: "пятница",
  saturday: "суббота",
  sunday: "воскресенье"
};
const weekdayShort = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addMonths(date: Date, months: number) {
  const value = new Date(date);
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  return value;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value?: string) {
  if (!value) return startOfDay(new Date());

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(new Date());

  return startOfDay(new Date(year, month - 1, day));
}

function capitalize(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function formatSelectDate(date: Date) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const dayMonth = [day, month].filter(Boolean).join(" ");

  return [capitalize(weekday), dayMonth].filter(Boolean).join(", ");
}

function formatMonth(date: Date) {
  return capitalize(
    new Intl.DateTimeFormat("ru-RU", {
      month: "long"
    }).format(date)
  );
}

function buildMonthWeeks(monthDate: Date, selectedKey?: string): (DateCell | null)[][] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const days: (DateCell | null)[] = Array.from({ length: leadingBlanks }, () => null);
  const today = startOfDay(new Date());

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = startOfDay(new Date(year, month, day));
    const key = getDateKey(date);

    days.push({
      date,
      key,
      label: String(day),
      disabled: date < today && key !== selectedKey
    });
  }

  const trailingBlanks = (7 - (days.length % 7)) % 7;
  days.push(...Array.from({ length: trailingBlanks }, () => null));

  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
}

function getRepeatValue(selectedDays: RepeatDay[]) {
  if (selectedDays.length === 0) return undefined;
  if (selectedDays.length === 1) return repeatOptions.find((option) => option.key === selectedDays[0])?.label;

  const orderedLabels = repeatOptions
    .filter((option) => selectedDays.includes(option.key))
    .map((option) => repeatDayLabels[option.key]);
  const formattedLabels = orderedLabels.map((label, index) => (index === 0 ? capitalize(label) : label));

  if (formattedLabels.length === 2) {
    return `${formattedLabels[0]} и ${formattedLabels[1]}`;
  }

  return `${formattedLabels.slice(0, -1).join(", ")} и ${formattedLabels[formattedLabels.length - 1]}`;
}

export default function ScheduleWorkoutScreen() {
  const { clientId, clientName: clientNameParam, date, exerciseIds } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    exerciseIds?: string;
  }>();
  const selectedClient = mockClients.find((client) => client.id === firstParam(clientId));
  const initialDate = useMemo(() => parseDateKey(firstParam(date)), [date]);
  const [scheduledDate, setScheduledDate] = useState(initialDate);
  const [scheduledTime, setScheduledTime] = useState<CalendarSlot | undefined>();
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [repeatVisible, setRepeatVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState(initialDate);
  const [pendingSlot, setPendingSlot] = useState<CalendarSlot | undefined>();
  const [repeatDays, setRepeatDays] = useState<RepeatDay[]>([]);
  const [pendingRepeatDays, setPendingRepeatDays] = useState<RepeatDay[]>([]);
  const selectedExerciseCount = firstParam(exerciseIds)?.split(",").filter(Boolean).length || 6;
  const clientName = selectedClient?.name ?? firstParam(clientNameParam) ?? "Константин";
  const repeatValue = getRepeatValue(repeatDays);
  const { scrollProps } = useConditionalScroll();

  const openCalendar = () => {
    setPendingDate(scheduledDate);
    setPendingSlot(dateConfirmed ? scheduledTime : undefined);
    setCalendarVisible(true);
  };

  const saveCalendar = () => {
    if (!pendingSlot) return;

    setScheduledDate(pendingDate);
    setScheduledTime(pendingSlot);
    setDateConfirmed(true);
    setCalendarVisible(false);
  };

  const openRepeat = () => {
    setPendingRepeatDays(repeatDays);
    setRepeatVisible(true);
  };

  const toggleRepeatDay = (day: RepeatDay) => {
    setPendingRepeatDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const saveRepeat = () => {
    setRepeatDays(pendingRepeatDays);
    setRepeatVisible(false);
  };

  const saveWorkout = () => {
    if (!scheduledTime) return;

    router.replace({
      pathname: "/",
      params: {
        plannedWorkout: "1",
        plannedDate: getDateKey(scheduledDate),
        plannedTime: scheduledTime,
        plannedClientName: clientName,
        plannedExerciseCount: String(selectedExerciseCount),
        ...(repeatDays.length > 0 ? { plannedRepeatDays: repeatDays.join(",") } : {})
      }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Создание тренировки" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        <Select
          label="Дата"
          value={formatSelectDate(scheduledDate)}
          width="fill"
          showMessage={false}
          state={dateConfirmed ? "default" : "empty"}
          onPress={openCalendar}
        />
        <Select
          label="Время начала"
          value={scheduledTime}
          placeholder="Выберите время"
          width="fill"
          showMessage={false}
          state={dateConfirmed ? "default" : "empty"}
          onPress={openCalendar}
        />
        <Select
          label="Повтор"
          value={repeatValue}
          placeholder={dateConfirmed ? "Не повторяется" : "Value"}
          width="fill"
          showMessage={false}
          onPress={openRepeat}
        />

        {dateConfirmed && scheduledTime ? (
          <View style={styles.previewSection}>
            <Divider width="fill" tone="canvasSoft" />
            <View style={styles.previewCardWrap}>
              <Card
                variant="workout"
                workoutStatus="planned"
                muscleGroup="Руки"
                clientName={clientName}
                workoutTime={scheduledTime}
                exerciseCount={selectedExerciseCount}
                showAction={false}
                showMenu={false}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyGrow} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Сохранить" type="primary" size="large" width="fill" state={scheduledTime ? "active" : "disabled"} onPress={saveWorkout} />
      </View>

      <CalendarSheet
        visible={calendarVisible}
        selectedDate={pendingDate}
        selectedSlot={pendingSlot}
        onClose={() => setCalendarVisible(false)}
        onSelectDate={setPendingDate}
        onSelectSlot={setPendingSlot}
        onSave={saveCalendar}
      />

      <Modal
        visible={repeatVisible}
        presentation="overlay"
        title="Повтор"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="single"
        primaryAction={{ label: "Сохранить", type: "primary", onPress: saveRepeat }}
        onClose={() => setRepeatVisible(false)}
        bodyStyle={styles.repeatBody}
      >
        {repeatOptions.map((option, index) => {
          const selected = pendingRepeatDays.includes(option.key);
          const previousSelected = index > 0 && pendingRepeatDays.includes(repeatOptions[index - 1].key);
          const nextSelected = index < repeatOptions.length - 1 && pendingRepeatDays.includes(repeatOptions[index + 1].key);

          return (
            <ListItemCell
              key={option.key}
              title={option.label}
              leading="none"
              trailingSlot={<Checkbox selected={selected} showLabel={false} onChange={() => toggleRepeatDay(option.key)} />}
              selected={selected}
              groupPosition={getListItemCellSelectedGroupPosition(selected, previousSelected, nextSelected)}
              onPress={() => toggleRepeatDay(option.key)}
            />
          );
        })}
      </Modal>
    </SafeAreaView>
  );
}

function CalendarSheet({
  visible,
  selectedDate,
  selectedSlot,
  onClose,
  onSelectDate,
  onSelectSlot,
  onSave
}: {
  visible: boolean;
  selectedDate: Date;
  selectedSlot?: CalendarSlot;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  onSelectSlot: (slot: CalendarSlot) => void;
  onSave: () => void;
}) {
  const selectedKey = getDateKey(selectedDate);
  const months = useMemo(() => [startOfDay(selectedDate), addMonths(selectedDate, 1)], [selectedKey]);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [progress, visible]);

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0]
  });

  return (
    <NativeModal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View pointerEvents="none" style={styles.sheetBackdrop} />
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть выбор даты" style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.calendarSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.calendarNav}>
            <Pressable accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onClose} style={styles.closeTextButton}>
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

          <ScrollView contentContainerStyle={styles.calendarScrollContent} showsVerticalScrollIndicator={false}>
            {months.map((month) => (
              <MonthSection
                key={getDateKey(month)}
                month={month}
                selectedKey={selectedKey}
                onSelectDate={onSelectDate}
              />
            ))}
          </ScrollView>

          <View style={styles.slotAction}>
            <View style={styles.slotContent}>
              <Text style={styles.slotTitle}>Свободное время</Text>
              <View style={styles.slotList}>
                {freeSlots.map((slot) => (
                  <Pressable
                    key={slot}
                    accessibilityRole="button"
                    accessibilityState={{ selected: slot === selectedSlot }}
                    onPress={() => onSelectSlot(slot)}
                  >
                    <Badge label={slot} tone={slot === selectedSlot ? "select" : "neutral"} icon={false} />
                  </Pressable>
                ))}
              </View>
            </View>
            <Button label="Сохранить" type="primary" size="large" width="fill" state={selectedSlot ? "active" : "disabled"} onPress={onSave} />
          </View>
        </Animated.View>
      </View>
    </NativeModal>
  );
}

function MonthSection({
  month,
  selectedKey,
  onSelectDate
}: {
  month: Date;
  selectedKey: string;
  onSelectDate: (date: Date) => void;
}) {
  const weeks = useMemo(() => buildMonthWeeks(month, selectedKey), [month, selectedKey]);

  return (
    <View style={styles.monthSection}>
      <Text style={styles.monthTitle}>{formatMonth(month)}</Text>
      <View style={styles.monthGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={`${getDateKey(month)}-${weekIndex}`} style={styles.monthWeek}>
            {week.map((cell, dayIndex) =>
              cell ? (
                <CalendarDateButton
                  key={cell.key}
                  cell={cell}
                  selected={cell.key === selectedKey}
                  onPress={() => onSelectDate(cell.date)}
                />
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
      accessibilityLabel={formatSelectDate(cell.date)}
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
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1
  },
  previewSection: {
    flex: 1,
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.lg
  },
  previewCardWrap: {
    paddingHorizontal: theme.spacing.lg
  },
  emptyGrow: {
    flex: 1
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  repeatBody: {
    gap: theme.spacing.xs
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end"
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.content.ink,
    opacity: 0.5
  },
  calendarSheet: {
    maxHeight: "91%",
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  calendarNav: {
    minHeight: theme.spacing["3xl"] + theme.spacing.md,
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
  calendarScrollContent: {
    paddingBottom: theme.spacing["3xl"] * 3 + theme.spacing.lg
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
    position: "absolute",
    right: theme.spacing[0],
    bottom: theme.spacing[0],
    left: theme.spacing[0],
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
