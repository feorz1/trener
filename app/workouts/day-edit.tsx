import { Alert, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Checkbox, getListItemCellSelectedGroupPosition, ListItemCell, Modal } from "@/components/ui";
import { repeatDayLabels, repeatOptions, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";

type DayExerciseIds = Partial<Record<RepeatDay, string[]>>;
type ScheduleTimes = Partial<Record<RepeatDay, string>>;
type ApproachData = Record<string, unknown[]>;

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

function parseDays(value?: string) {
  if (!value) return [];

  const daySet = new Set(repeatOptions.map((option) => option.key));
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is RepeatDay => daySet.has(item as RepeatDay));
}

function parseJsonParam<T>(value?: string, fallback: T = {} as T) {
  if (!value) return fallback;

  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return fallback;
  }
}

function serializeJsonParam<T extends object>(value: T) {
  const entries = Object.entries(value).filter(([, item]) => {
    if (Array.isArray(item)) return item.length > 0;
    return item !== undefined && item !== null;
  });

  if (entries.length === 0) return undefined;
  return encodeURIComponent(JSON.stringify(Object.fromEntries(entries)));
}

function cleanDayExerciseIds(dayExerciseIds: DayExerciseIds, selectedDays: RepeatDay[]) {
  const selectedSet = new Set(selectedDays);
  return Object.fromEntries(Object.entries(dayExerciseIds).filter(([day]) => selectedSet.has(day as RepeatDay))) as DayExerciseIds;
}

function cleanScheduleTimes(scheduleTimes: ScheduleTimes, selectedDays: RepeatDay[]) {
  const selectedSet = new Set(selectedDays);
  return Object.fromEntries(Object.entries(scheduleTimes).filter(([day, time]) => selectedSet.has(day as RepeatDay) && Boolean(time))) as ScheduleTimes;
}

function cleanApproachData(approachData: ApproachData, selectedDays: RepeatDay[]) {
  const selectedSet = new Set(selectedDays);
  return Object.fromEntries(Object.entries(approachData).filter(([key]) => selectedSet.has(key.split(":")[0] as RepeatDay))) as ApproachData;
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

export default function WorkoutDayEditSheet() {
  const {
    clientId,
    clientName,
    date,
    selectedDays,
    scheduleTimes,
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
    activeDay?: string;
    dayExerciseIds?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const initialSelectedDays = useMemo(() => parseDays(firstParam(selectedDays)), [selectedDays]);
  const parsedScheduleTimes = useMemo(() => parseJsonParam<ScheduleTimes>(firstParam(scheduleTimes)), [scheduleTimes]);
  const parsedDayExerciseIds = useMemo(() => parseJsonParam<DayExerciseIds>(firstParam(dayExerciseIds)), [dayExerciseIds]);
  const parsedApproachData = useMemo(() => parseJsonParam<ApproachData>(firstParam(approachData)), [approachData]);
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

    if ((parsedDayExerciseIds[day]?.length ?? 0) > 0) {
      Alert.alert(`Удалить ${repeatDayDeleteLabels[day]}?`, "Упражнения и подходы для этого дня удалятся.", [
        { text: "Оставить", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: () => removeDay(day) }
      ]);
      return;
    }

    removeDay(day);
  };

  const saveDays = () => {
    const nextDays = repeatOptions.map((option) => option.key).filter((day) => draftDaySet.has(day));
    const cleanedDayExerciseIds = cleanDayExerciseIds(parsedDayExerciseIds, nextDays);
    const cleanedScheduleTimes = cleanScheduleTimes(parsedScheduleTimes, nextDays);
    const cleanedApproachData = cleanApproachData(parsedApproachData, nextDays);
    const activeDayValue = firstParam(activeDay) as RepeatDay | undefined;
    const addedDayWithoutTime = nextDays.find((day) => !initialSelectedDays.includes(day) && !cleanedScheduleTimes[day]);
    const nextActiveDay = addedDayWithoutTime ?? (activeDayValue && nextDays.includes(activeDayValue) ? activeDayValue : nextDays[0]);
    const nextActiveExerciseIds = cleanedDayExerciseIds[nextActiveDay] ?? [];
    const serializedScheduleTimes = serializeJsonParam(cleanedScheduleTimes);
    const serializedDayExerciseIds = serializeJsonParam(cleanedDayExerciseIds);
    const serializedApproachData = serializeJsonParam(cleanedApproachData);
    const keepSupersets = activeDayValue === nextActiveDay && nextActiveExerciseIds.length > 1;
    const nextParams = {
      ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
      ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
      ...(firstParam(date) ? { date: firstParam(date) } : {}),
      selectedDays: nextDays.join(","),
      ...(serializedScheduleTimes ? { scheduleTimes: serializedScheduleTimes } : {}),
      activeDay: nextActiveDay,
      ...(serializedDayExerciseIds ? { dayExerciseIds: serializedDayExerciseIds } : {}),
      ...(nextActiveExerciseIds.length > 0 ? { exerciseIds: nextActiveExerciseIds.join(",") } : {}),
      ...(keepSupersets && firstParam(supersetConnectionIds) ? { supersetConnectionIds: firstParam(supersetConnectionIds) } : {}),
      ...(serializedApproachData ? { approachData: serializedApproachData } : {})
    };

    if (addedDayWithoutTime) {
      router.replace({
        pathname: "/workouts/slot-select",
        params: {
          ...nextParams,
          returnTo: "workout-new",
          slotDay: addedDayWithoutTime
        }
      });
      return;
    }

    router.dismissTo({
      pathname: "/workouts/new",
      params: nextParams
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
