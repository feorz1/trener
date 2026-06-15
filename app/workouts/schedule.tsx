import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Navigation, Select, Variant } from "@/components/ui";
import { isCalendarSlot, parseDateKey, repeatDayLabels, repeatOptions, type CalendarSlot, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

type ScheduleTimes = Partial<Record<RepeatDay, CalendarSlot>>;

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

function parseScheduleTimes(value?: string): ScheduleTimes {
  if (!value) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [RepeatDay, CalendarSlot] => parseDays(entry[0]).length === 1 && isCalendarSlot(entry[1]))
    ) as ScheduleTimes;
  } catch {
    return {};
  }
}

function serializeScheduleTimes(value: ScheduleTimes) {
  return encodeURIComponent(JSON.stringify(value));
}

export default function ScheduleWorkoutScreen() {
  const { clientId, clientName, date, selectedDays: selectedDaysParam, scheduleTimes: scheduleTimesParam } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    selectedDays?: string;
    scheduleTimes?: string;
  }>();
  const selectedDate = useMemo(() => parseDateKey(firstParam(date)), [date]);
  const fallbackDay = getNativeWeekdayDay(selectedDate);
  const initialDays = useMemo(() => {
    const parsedDays = parseDays(firstParam(selectedDaysParam));
    if (parsedDays.length > 0) return parsedDays;
    return fallbackDay ? [fallbackDay] : [];
  }, [fallbackDay, selectedDaysParam]);
  const [selectedDays, setSelectedDays] = useState<RepeatDay[]>(initialDays);
  const [scheduleTimes, setScheduleTimes] = useState<ScheduleTimes>(() => parseScheduleTimes(firstParam(scheduleTimesParam)));
  const { scrollProps } = useConditionalScroll();
  const canContinue = selectedDays.length > 0 && selectedDays.every((day) => Boolean(scheduleTimes[day]));

  useEffect(() => {
    setSelectedDays(initialDays);
  }, [initialDays]);

  useEffect(() => {
    setScheduleTimes(parseScheduleTimes(firstParam(scheduleTimesParam)));
  }, [scheduleTimesParam]);

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

      return repeatOptions.map((option) => option.key).filter((item) => item === day || current.includes(item));
    });
  };

  const openTimeSheet = (day: RepeatDay) => {
    router.push({
      pathname: "/workouts/slot-select",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        selectedDays: selectedDays.join(","),
        scheduleTimes: serializeScheduleTimes(scheduleTimes),
        slotDay: day
      }
    });
  };

  const continueToExercises = () => {
    if (!canContinue) return;

    router.replace({
      pathname: "/workouts/new",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        selectedDays: selectedDays.join(","),
        scheduleTimes: serializeScheduleTimes(scheduleTimes),
        activeDay: selectedDays[0]
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
