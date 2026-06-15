import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Modal, Variant } from "@/components/ui";
import { freeSlots, isCalendarSlot, repeatDayLabels, repeatOptions, type CalendarSlot, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";

type ScheduleTimes = Partial<Record<RepeatDay, CalendarSlot>>;

const slotItems = freeSlots.map((slot) => ({
  key: slot,
  label: slot,
  accessibilityLabel: `Выбрать ${slot}`
}));

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function isRepeatDay(value?: string): value is RepeatDay {
  return repeatOptions.some((option) => option.key === value);
}

function parseScheduleTimes(value?: string) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [RepeatDay, CalendarSlot] => isRepeatDay(entry[0]) && isCalendarSlot(entry[1]))
    ) as ScheduleTimes;
  } catch {
    return {};
  }
}

function serializeScheduleTimes(value: ScheduleTimes) {
  return encodeURIComponent(JSON.stringify(value));
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export default function WorkoutSlotSelectSheet() {
  const {
    clientId,
    clientName,
    date,
    selectedDays,
    scheduleTimes,
    slotDay,
    returnTo,
    activeDay,
    dayExerciseIds,
    exerciseIds,
    supersetConnectionIds,
    approachData
  } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    selectedDays?: string;
    scheduleTimes?: string;
    slotDay?: string;
    returnTo?: string;
    activeDay?: string;
    dayExerciseIds?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const slotDayValue = firstParam(slotDay);
  const activeSlotDay: RepeatDay | undefined = isRepeatDay(slotDayValue) ? slotDayValue : undefined;
  const shouldReturnToWorkoutNew = firstParam(returnTo) === "workout-new";
  const parsedScheduleTimes = useMemo(() => parseScheduleTimes(firstParam(scheduleTimes)), [scheduleTimes]);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | undefined>(() => (activeSlotDay ? parsedScheduleTimes[activeSlotDay] : undefined));

  const getWorkoutNewParams = (nextScheduleTimes: ScheduleTimes) => ({
    ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
    ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
    ...(firstParam(date) ? { date: firstParam(date) } : {}),
    ...(firstParam(selectedDays) ? { selectedDays: firstParam(selectedDays) } : {}),
    scheduleTimes: serializeScheduleTimes(nextScheduleTimes),
    ...(firstParam(activeDay) ? { activeDay: firstParam(activeDay) } : {}),
    ...(firstParam(dayExerciseIds) ? { dayExerciseIds: firstParam(dayExerciseIds) } : {}),
    ...(firstParam(exerciseIds) ? { exerciseIds: firstParam(exerciseIds) } : {}),
    ...(firstParam(supersetConnectionIds) ? { supersetConnectionIds: firstParam(supersetConnectionIds) } : {}),
    ...(firstParam(approachData) ? { approachData: firstParam(approachData) } : {})
  });

  const closeSheet = () => {
    if (shouldReturnToWorkoutNew) {
      router.dismissTo({
        pathname: "/workouts/new",
        params: getWorkoutNewParams(parsedScheduleTimes)
      });
      return;
    }

    router.back();
  };

  const saveSlot = () => {
    if (!activeSlotDay || !selectedSlot) return;

    const nextScheduleTimes = { ...parsedScheduleTimes, [activeSlotDay]: selectedSlot };

    if (shouldReturnToWorkoutNew) {
      router.dismissTo({
        pathname: "/workouts/new",
        params: getWorkoutNewParams(nextScheduleTimes)
      });
      return;
    }

    router.dismissTo({
      pathname: "/workouts/schedule",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        ...(firstParam(selectedDays) ? { selectedDays: firstParam(selectedDays) } : {}),
        scheduleTimes: serializeScheduleTimes(nextScheduleTimes)
      }
    });
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title={activeSlotDay ? capitalize(repeatDayLabels[activeSlotDay]) : ""}
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="single"
        primaryAction={{ label: "Сохранить", type: "primary", disabled: !selectedSlot, onPress: saveSlot }}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        <Variant<CalendarSlot>
          label={activeSlotDay ? `Слоты на ${repeatDayLabels[activeSlotDay]}` : "Слоты"}
          items={slotItems}
          value={selectedSlot}
          columns={4}
          width="fill"
          inset="none"
          showLabel={false}
          onChange={setSelectedSlot}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    backgroundColor: theme.colors.background.canvas
  },
  modal: {
    width: "100%"
  },
  body: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs
  }
});
