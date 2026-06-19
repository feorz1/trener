import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Navigation, Select, Variant } from "@/components/ui";
import { useWorkoutActions, useWorkoutDraft } from "@/data";
import { isCalendarSlot, parseDateKey, repeatDayLabels, repeatOptions, type CalendarSlot, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

type ScheduleTimes = Partial<Record<RepeatDay, CalendarSlot>>;
const defaultCalendarSlot: CalendarSlot = "17:00";

const dayItems = repeatOptions.map((option) => ({
  key: option.key,
  label: getShortDayLabel(option.key)
}));
function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getShortDayLabel(day: RepeatDay) {
  if (day === "monday") return "Пн";
  if (day === "tuesday") return "Вт";
  if (day === "wednesday") return "Ср";
  if (day === "thursday") return "Чт";
  if (day === "friday") return "Пт";
  if (day === "saturday") return "Сб";
  return "Вс";
}

function getNativeWeekdayDay(date?: Date): RepeatDay | undefined {
  if (!date) return undefined;

  const day = date.getDay();
  if (day === 0) return "sunday";
  if (day === 1) return "monday";
  if (day === 2) return "tuesday";
  if (day === 3) return "wednesday";
  if (day === 4) return "thursday";
  if (day === 5) return "friday";
  return "saturday";
}

function parseDays(value?: string) {
  if (!value) return [];

  const daySet = new Set(repeatOptions.map((option) => option.key));
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is RepeatDay => daySet.has(item as RepeatDay));
}

function withDefaultScheduleTimes(days: RepeatDay[], scheduleTimes: ScheduleTimes) {
  return days.reduce<ScheduleTimes>(
    (nextTimes, day) => ({
      ...nextTimes,
      [day]: nextTimes[day] ?? defaultCalendarSlot
    }),
    { ...scheduleTimes }
  );
}

function buildStartsAt(date: Date | undefined, time: string | undefined) {
  const value = date ? new Date(date) : new Date();
  const [hours, minutes] = (time ?? "17:00").split(":").map(Number);
  value.setHours(Number.isFinite(hours) ? hours : 17, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return value.toISOString();
}

export default function ScheduleWorkoutScreen() {
  const { draftId } = useLocalSearchParams<{
    draftId?: string;
  }>();
  const draftIdValue = firstParam(draftId);
  const workouts = useWorkoutActions();
  const { draft } = useWorkoutDraft(draftIdValue);
  const selectedDate = useMemo(() => parseDateKey(draft?.startsAt), [draft?.startsAt]);
  const fallbackDay = getNativeWeekdayDay(selectedDate);
  const initialDays = useMemo(() => {
    if (draft?.repeatDays && draft.repeatDays.length > 0) return draft.repeatDays;
    return fallbackDay ? [fallbackDay] : [];
  }, [draft?.repeatDays, fallbackDay]);
  const [selectedDays, setSelectedDays] = useState<RepeatDay[]>(initialDays);
  const [scheduleTimes, setScheduleTimes] = useState<ScheduleTimes>(() => withDefaultScheduleTimes(initialDays, (draft?.scheduleTimes ?? {}) as ScheduleTimes));
  const { scrollProps } = useConditionalScroll();
  const canContinue = selectedDays.length > 0;

  useEffect(() => {
    setSelectedDays(initialDays);
    setScheduleTimes(withDefaultScheduleTimes(initialDays, (draft?.scheduleTimes ?? {}) as ScheduleTimes));
  }, [draft?.scheduleTimes, initialDays]);

  const toggleDay = (day: RepeatDay) => {
    setSelectedDays((current) => {
      if (current.includes(day)) {
        const nextDays = current.filter((item) => item !== day);
        setScheduleTimes((currentTimes) => {
          const { [day]: _removed, ...rest } = currentTimes;
          return rest;
        });
        return nextDays;
      }

      const nextDays = repeatOptions.map((option) => option.key).filter((item) => item === day || current.includes(item));
      setScheduleTimes((currentTimes) => withDefaultScheduleTimes(nextDays, currentTimes));
      return nextDays;
    });
  };

  const openTimeSheet = (day: RepeatDay) => {
    router.push({
      pathname: "/workouts/slot-select",
      params: {
        ...(draftIdValue ? { draftId: draftIdValue } : {}),
        slotDay: day
      }
    });
  };

  const continueToExercises = async () => {
    if (!canContinue || !draftIdValue) return;
    const firstDay = selectedDays[0];
    const effectiveScheduleTimes = withDefaultScheduleTimes(selectedDays, scheduleTimes);
    await workouts.updateDraft(draftIdValue, {
      startsAt: buildStartsAt(selectedDate, firstDay ? effectiveScheduleTimes[firstDay] : undefined),
      repeatDays: selectedDays,
      scheduleTimes: effectiveScheduleTimes
    });

    router.replace({
      pathname: "/workouts/new",
      params: {
        draftId: draftIdValue
      }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Создание тренировки" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        <Variant
          label="Дни тренировок"
          items={dayItems}
          value={selectedDays[0]}
          values={selectedDays}
          selectionMode="multiple"
          columns={7}
          width="fill"
          onChange={toggleDay}
        />

        <View style={styles.selects}>
          {selectedDays.map((day) => (
            <Select
              key={day}
              label={capitalize(repeatDayLabels[day])}
              value={scheduleTimes[day]}
              placeholder="Выбери время"
              width="fill"
              showMessage={false}
              onPress={() => openTimeSheet(day)}
            />
          ))}
        </View>

        <View style={styles.emptyGrow} />
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Продолжить" type="primary" size="large" width="fill" state={canContinue ? "active" : "disabled"} onPress={continueToExercises} />
      </View>
    </SafeAreaView>
  );
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1
  },
  selects: {
    paddingTop: theme.spacing.sm
  },
  emptyGrow: {
    flex: 1
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
