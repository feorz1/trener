import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Divider, Navigation, Select } from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { getDateKey, getRepeatValue, isCalendarSlot, parseDateKey, parseRepeatDays, type CalendarSlot, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";
import { formatRuSelectDate } from "@/utils/date";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ScheduleWorkoutScreen() {
  const { clientId, clientName: clientNameParam, date, exerciseIds, scheduleDate, scheduleTime, scheduleDateConfirmed, scheduleRepeatDays } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    exerciseIds?: string;
    scheduleDate?: string;
    scheduleTime?: string;
    scheduleDateConfirmed?: string;
    scheduleRepeatDays?: string;
  }>();
  const selectedClient = mockClients.find((client) => client.id === firstParam(clientId));
  const initialDate = useMemo(() => parseDateKey(firstParam(date)), [date]);
  const [scheduledDate, setScheduledDate] = useState(initialDate);
  const [scheduledTime, setScheduledTime] = useState<CalendarSlot | undefined>();
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [repeatDays, setRepeatDays] = useState<RepeatDay[]>([]);
  const selectedExerciseCount = firstParam(exerciseIds)?.split(",").filter(Boolean).length || 6;
  const clientName = selectedClient?.name ?? firstParam(clientNameParam) ?? "Константин";
  const repeatValue = getRepeatValue(repeatDays);
  const { scrollProps } = useConditionalScroll();
  const scheduleDateParam = firstParam(scheduleDate);
  const scheduleTimeParam = firstParam(scheduleTime);
  const scheduleDateConfirmedParam = firstParam(scheduleDateConfirmed);
  const scheduleRepeatDaysParam = firstParam(scheduleRepeatDays);

  useEffect(() => {
    if (!scheduleDateParam) return;

    setScheduledDate(parseDateKey(scheduleDateParam));
  }, [scheduleDateParam]);

  useEffect(() => {
    if (!isCalendarSlot(scheduleTimeParam)) return;

    setScheduledTime(scheduleTimeParam);
  }, [scheduleTimeParam]);

  useEffect(() => {
    if (scheduleDateConfirmedParam === "1") {
      setDateConfirmed(true);
    }
  }, [scheduleDateConfirmedParam]);

  useEffect(() => {
    if (scheduleRepeatDaysParam === undefined) return;

    setRepeatDays(parseRepeatDays(scheduleRepeatDaysParam));
  }, [scheduleRepeatDaysParam]);

  const openCalendar = () => {
    router.push({
      pathname: "/workouts/date-select",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientNameParam) ? { clientName: firstParam(clientNameParam) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        ...(firstParam(exerciseIds) ? { exerciseIds: firstParam(exerciseIds) } : {}),
        scheduleDate: getDateKey(scheduledDate),
        ...(dateConfirmed && scheduledTime ? { scheduleTime: scheduledTime, scheduleDateConfirmed: "1" } : {}),
        scheduleRepeatDays: repeatDays.join(",")
      }
    });
  };

  const openRepeat = () => {
    router.push({
      pathname: "/workouts/repeat-select",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientNameParam) ? { clientName: firstParam(clientNameParam) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        ...(firstParam(exerciseIds) ? { exerciseIds: firstParam(exerciseIds) } : {}),
        scheduleDate: getDateKey(scheduledDate),
        ...(scheduledTime ? { scheduleTime: scheduledTime } : {}),
        ...(dateConfirmed ? { scheduleDateConfirmed: "1" } : {}),
        scheduleRepeatDays: repeatDays.join(",")
      }
    });
  };

  const saveWorkout = () => {
    if (!scheduledTime) return;

    router.dismissTo({
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
          value={formatRuSelectDate(scheduledDate)}
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
    </SafeAreaView>
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
  }
});
