import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Modal, Variant } from "@/components/ui";
import { useWorkoutActions, useWorkoutDraft } from "@/data";
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

function normalizeScheduleTimes(value?: Partial<Record<RepeatDay, string>>) {
  if (!value) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [RepeatDay, CalendarSlot] => isRepeatDay(entry[0]) && isCalendarSlot(entry[1]))
  ) as ScheduleTimes;
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export default function WorkoutSlotSelectSheet() {
  const {
    draftId,
    slotDay,
    returnTo
  } = useLocalSearchParams<{
    draftId?: string;
    slotDay?: string;
    returnTo?: string;
  }>();
  const draftIdValue = firstParam(draftId);
  const { draft } = useWorkoutDraft(draftIdValue);
  const workouts = useWorkoutActions();
  const slotDayValue = firstParam(slotDay);
  const activeSlotDay: RepeatDay | undefined = isRepeatDay(slotDayValue) ? slotDayValue : undefined;
  const shouldReturnToWorkoutNew = firstParam(returnTo) === "workout-new";
  const selectedDayValues = useMemo(() => draft?.repeatDays ?? [], [draft?.repeatDays]);
  const parsedScheduleTimes = useMemo(() => normalizeScheduleTimes(draft?.scheduleTimes), [draft?.scheduleTimes]);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | undefined>(() => (activeSlotDay ? parsedScheduleTimes[activeSlotDay] : undefined));

  const closeSheet = () => {
    router.back();
  };

  const saveSlot = async () => {
    if (!activeSlotDay || !selectedSlot) return;

    const nextScheduleTimes = { ...parsedScheduleTimes, [activeSlotDay]: selectedSlot };
    if (draftIdValue) {
      await workouts.updateDraft(draftIdValue, {
        repeatDays: selectedDayValues,
        scheduleTimes: nextScheduleTimes
      });
    }

    if (shouldReturnToWorkoutNew) {
      const nextMissingDay = selectedDayValues.find((day) => !nextScheduleTimes[day]);
      if (nextMissingDay) {
        router.replace({
          pathname: "/workouts/slot-select",
          params: {
            draftId: draftIdValue,
            returnTo: "workout-new",
            slotDay: nextMissingDay
          }
        });
        return;
      }

      router.dismissTo({
        pathname: "/workouts/new",
        params: {
          draftId: draftIdValue,
          activeDay: activeSlotDay
        }
      });
      return;
    }

    router.dismissTo({
      pathname: "/workouts/schedule",
      params: {
        ...(draftIdValue ? { draftId: draftIdValue } : {})
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
