import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Button, Loader, Navigation, Select, Variant } from "@/components/ui";
import { useDataMutation, useWorkoutActions, useWorkoutDraft } from "@/data";
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
  const draftQuery = useWorkoutDraft(draftIdValue);
  const { draft } = draftQuery;
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
  const continueAction = useCallback(async () => {
    if (!canContinue || !draftIdValue) return null;
    const firstDay = selectedDays[0];
    const effectiveScheduleTimes = withDefaultScheduleTimes(selectedDays, scheduleTimes);
    return workouts.updateDraft(draftIdValue, {
      startsAt: buildStartsAt(selectedDate, firstDay ? effectiveScheduleTimes[firstDay] : undefined),
      repeatDays: selectedDays,
      scheduleTimes: effectiveScheduleTimes
    });
  }, [canContinue, draftIdValue, scheduleTimes, selectedDate, selectedDays, workouts]);
  const continueMutation = useDataMutation(continueAction);

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
    if (continueMutation.isSubmitting) return;
    const updatedDraft = await continueMutation.mutate().catch(() => null);
    if (!updatedDraft) return;

    router.replace({
      pathname: "/workouts/new",
      params: {
        draftId: draftIdValue
      }
    });
  };

  if (draftQuery.isLoading) {
    return <ScheduleState title="Загружаем расписание" loading />;
  }

  if (draftQuery.error) {
    return <ScheduleState title="Не удалось загрузить расписание" description={draftQuery.error.message} actionLabel="Повторить" onAction={draftQuery.retry} />;
  }

  if (!draftIdValue || draftQuery.notFound || !draft) {
    return <ScheduleState title="Черновик не найден" description="Вернитесь к планированию и создайте тренировку заново." />;
  }

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
        {continueMutation.error ? (
          <View style={styles.inlineAlert}>
            <Alert
              tone="negative"
              layout="expanded"
              title="Расписание не сохранено"
              description={continueMutation.error.message}
              width="fill"
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Продолжить" type="primary" size="large" width="fill" state={continueMutation.isSubmitting ? "loading" : canContinue ? "active" : "disabled"} onPress={continueToExercises} />
      </View>
    </SafeAreaView>
  );
}

function ScheduleState({
  title,
  description,
  loading = false,
  actionLabel,
  onAction
}: {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Создание тренировки" onBack={() => router.back()} />
      <View style={styles.state}>
        {loading ? <Loader size="medium" tone="brand" /> : null}
        <Text style={styles.stateTitle}>{title}</Text>
        {description ? <Text style={styles.stateCopy}>{description}</Text> : null}
        {actionLabel && onAction ? <Button label={actionLabel} type="secondary" size="large" width="fill" onPress={onAction} /> : null}
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
  inlineAlert: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  state: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  stateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  stateCopy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  }
});
