import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Checkbox, getListItemCellSelectedGroupPosition, ListItemCell, Modal } from "@/components/ui";
import { useWorkoutActions, useWorkoutDraft } from "@/data";
import { repeatDayLabels, repeatOptions, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";

type ScheduleTimes = Partial<Record<RepeatDay, string>>;

const repeatDayDeleteLabels: Record<RepeatDay, string> = {
  monday: "понедельник",
  tuesday: "вторник",
  wednesday: "среду",
  thursday: "четверг",
  friday: "пятницу",
  saturday: "субботу",
  sunday: "воскресенье"
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanScheduleTimes(scheduleTimes: ScheduleTimes, selectedDays: RepeatDay[]) {
  const selectedSet = new Set(selectedDays);
  return Object.fromEntries(Object.entries(scheduleTimes).filter(([day, time]) => selectedSet.has(day as RepeatDay) && Boolean(time))) as ScheduleTimes;
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export default function WorkoutDayEditSheet() {
  const { draftId } = useLocalSearchParams<{
    draftId?: string;
  }>();
  const draftIdValue = firstParam(draftId);
  const { draft } = useWorkoutDraft(draftIdValue);
  const workouts = useWorkoutActions();
  const initialSelectedDays = useMemo(() => {
    if (draft?.repeatDays && draft.repeatDays.length > 0) return draft.repeatDays;
    return ["monday"] as RepeatDay[];
  }, [draft?.repeatDays]);
  const parsedScheduleTimes = useMemo(() => draft?.scheduleTimes ?? {}, [draft?.scheduleTimes]);
  const [draftDays, setDraftDays] = useState<RepeatDay[]>(() => (initialSelectedDays.length > 0 ? initialSelectedDays : ["monday"]));
  const draftDaySet = useMemo(() => new Set(draftDays), [draftDays]);

  const closeSheet = () => {
    router.back();
  };

  const removeDay = (day: RepeatDay) => {
    setDraftDays((current) => current.filter((item) => item !== day));
  };

  const toggleDay = (day: RepeatDay) => {
    if (!draftDaySet.has(day)) {
      setDraftDays((current) => repeatOptions.map((option) => option.key).filter((item) => item === day || current.includes(item)));
      return;
    }

    if (draftDays.length <= 1) return;

    if ((draft?.exercises.filter((exercise) => exercise.day === day).length ?? 0) > 0) {
      Alert.alert(`Удалить ${repeatDayDeleteLabels[day]}?`, "Упражнения и подходы для этого дня удалятся.", [
        { text: "Оставить", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: () => removeDay(day) }
      ]);
      return;
    }

    removeDay(day);
  };

  const saveDays = async () => {
    const nextDays = repeatOptions.map((option) => option.key).filter((day) => draftDaySet.has(day));
    const cleanedScheduleTimes = cleanScheduleTimes(parsedScheduleTimes, nextDays);
    const dayWithoutTime = nextDays.find((day) => !cleanedScheduleTimes[day]);
    if (draftIdValue) {
      await workouts.updateDraft(draftIdValue, {
        repeatDays: nextDays,
        scheduleTimes: cleanedScheduleTimes,
        exercises: draft?.exercises.filter((exercise) => !exercise.day || nextDays.includes(exercise.day)) ?? []
      });
    }

    if (dayWithoutTime) {
      router.replace({
        pathname: "/workouts/slot-select",
        params: {
          ...(draftIdValue ? { draftId: draftIdValue } : {}),
          returnTo: "workout-new",
          slotDay: dayWithoutTime
        }
      });
      return;
    }

    router.dismissTo({
      pathname: "/workouts/new",
      params: {
        ...(draftIdValue ? { draftId: draftIdValue } : {})
      }
    });
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Дни тренировок"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="single"
        primaryAction={{ label: "Сохранить", type: "primary", disabled: draftDays.length === 0, onPress: saveDays }}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        {repeatOptions.map((option, index) => {
          const selected = draftDaySet.has(option.key);
          const previousSelected = index > 0 && draftDaySet.has(repeatOptions[index - 1].key);
          const nextSelected = index < repeatOptions.length - 1 && draftDaySet.has(repeatOptions[index + 1].key);
          const disabled = selected && draftDays.length <= 1;

          return (
            <ListItemCell
              key={option.key}
              title={capitalize(repeatDayLabels[option.key])}
              subtitle={parsedScheduleTimes[option.key]}
              leading="none"
              density="compact"
              trailingSlot={<Checkbox selected={selected} disabled={disabled} showLabel={false} onChange={() => toggleDay(option.key)} />}
              selected={selected}
              disabled={disabled}
              groupPosition={getListItemCellSelectedGroupPosition(selected, previousSelected, nextSelected)}
              onPress={() => toggleDay(option.key)}
            />
          );
        })}
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
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs
  }
});
