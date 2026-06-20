import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Navigation, Select } from "@/components/ui";
import { buildSlotDateTime, getAvailableWorkoutSlots } from "@/features/workouts/availableSlots";
import { getDateKey, isCalendarSlot, parseDateKey, startOfDay, type CalendarSlot } from "@/features/workouts/scheduleOptions";
import { useWorkout, useWorkoutActions, useWorkouts } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";
import { formatRuDayMonth } from "@/utils/date";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateValue(date: Date | null) {
  return date ? formatRuDayMonth(date) : "";
}

export default function RescheduleWorkoutScreen() {
  const {
    workoutId: rawWorkoutId,
    rescheduleDate,
    rescheduleTime
  } = useLocalSearchParams<{
    workoutId?: string | string[];
    rescheduleDate?: string | string[];
    rescheduleTime?: string | string[];
  }>();
  const workoutId = firstParam(rawWorkoutId);
  const dateParam = firstParam(rescheduleDate);
  const timeParam = firstParam(rescheduleTime);
  const { workout, notFound } = useWorkout(workoutId);
  const { workouts: allWorkouts } = useWorkouts();
  const workouts = useWorkoutActions();
  const { scrollProps } = useConditionalScroll();
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => (dateParam ? parseDateKey(dateParam) : null));
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | undefined>(() => (isCalendarSlot(timeParam) ? timeParam : undefined));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const availableSlots = useMemo(
    () => getAvailableWorkoutSlots({ date: selectedDate, workouts: allWorkouts, excludeWorkoutId: workoutId }),
    [allWorkouts, selectedDate, workoutId]
  );
  const effectiveSelectedSlot = selectedSlot && availableSlots.includes(selectedSlot) ? selectedSlot : undefined;
  const nextDate = useMemo(() => buildSlotDateTime(selectedDate, effectiveSelectedSlot), [effectiveSelectedSlot, selectedDate]);
  const canSave = Boolean(workout && nextDate && !saving);

  useEffect(() => {
    if (!dateParam) return;

    setSelectedDate(parseDateKey(dateParam));
    setSelectedSlot(isCalendarSlot(timeParam) ? timeParam : undefined);
  }, [dateParam, timeParam]);

  const openDateSheet = () => {
    if (!workoutId) return;
    router.push({
      pathname: "/workouts/reschedule-date-select",
      params: {
        workoutId,
        ...(selectedDate ? { selectedDate: getDateKey(selectedDate) } : {})
      }
    });
  };

  const openTimeSheet = () => {
    if (!selectedDate) return;
    router.push({
      pathname: "/workouts/reschedule-slot-select",
      params: {
        ...(workoutId ? { workoutId } : {}),
        date: getDateKey(selectedDate),
        ...(effectiveSelectedSlot ? { selectedSlot: effectiveSelectedSlot } : {})
      }
    });
  };

  const save = async () => {
    if (!workoutId || !nextDate || !canSave) return;
    setSaving(true);
    setError("");
    try {
      await workouts.reschedule(workoutId, {
        startsAt: nextDate.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      router.back();
    } catch {
      setError("Не удалось перенести тренировку.");
    } finally {
      setSaving(false);
    }
  };

  if (notFound || !workout) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Перенос тренировки" onBack={() => router.back()} />
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Тренировка не найдена</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Перенос тренировки" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" {...scrollProps}>
        <Select label="Дата" value={formatDateValue(selectedDate)} width="fill" placeholder="Выберите дату" showMessage={false} onPress={openDateSheet} />
        <Select
          label="Время"
          value={effectiveSelectedSlot}
          width="fill"
          placeholder={selectedDate ? "Выберите время" : "Сначала выберите дату"}
          showMessage={false}
          disabled={!selectedDate}
          onPress={openTimeSheet}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Сохранить" type="primary" size="large" width="fill" state={saving ? "loading" : canSave ? "active" : "disabled"} onPress={save} />
        <Button label="Отмена" type="secondaryNeutral" size="large" width="fill" onPress={() => router.back()} />
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg
  },
  errorText: {
    ...theme.typography.body.sm,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.status.negative
  },
  footer: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  state: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  stateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  }
});
