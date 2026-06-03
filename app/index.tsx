import { useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CalendarDayStrip, type CalendarDayStripItem } from "@/components/calendar/CalendarDayStrip";
import { Card, Header, ListItemCell, Modal, Radio } from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { theme } from "@/theme";
import type { WorkoutStatus } from "@/types";

type PlanningModalStep = "closed" | "choice" | "client";

type TodayWorkout = {
  id: string;
  clientName: string;
  time: string;
  title: string;
  exercisesCount: number;
  completedExercises: number;
  status: Extract<WorkoutStatus, "planned" | "inProgress" | "completed">;
};

const weekdayShort = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStart(date: Date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return addDays(value, mondayOffset);
}

function getWeekItems(today: Date): CalendarDayStripItem[] {
  const todayStart = startOfDay(today);
  const weekStart = getWeekStart(todayStart);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dateStart = startOfDay(date);
    const temporalState = dateStart < todayStart ? "past" : dateStart > todayStart ? "future" : "default";

    return {
      key: getDateKey(dateStart),
      weekday: weekdayShort[dateStart.getDay()],
      dayNumber: String(dateStart.getDate()),
      temporalState
    };
  });
}

function formatHeaderDate(date: Date) {
  const parts = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long"
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";

  return `${day} ${month} · ${weekday}`;
}

function formatPlanDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function getDemoWorkouts(today: Date): Record<string, TodayWorkout[]> {
  return {
    [getDateKey(addDays(today, -1))]: [
      {
        id: "workout-past-planned",
        clientName: "Константин",
        time: "19:00",
        title: "Руки",
        exercisesCount: 6,
        completedExercises: 0,
        status: "planned"
      },
      {
        id: "workout-past-completed",
        clientName: "Мария Лебедева",
        time: "18:30",
        title: "Фулбоди",
        exercisesCount: 4,
        completedExercises: 4,
        status: "completed"
      }
    ],
    [getDateKey(today)]: [
      {
        id: "workout-today-planned",
        clientName: "Константин",
        time: "19:00",
        title: "Руки",
        exercisesCount: 6,
        completedExercises: 0,
        status: "planned"
      }
    ]
  };
}

function getPlanCount(workoutsCount: number) {
  if (workoutsCount === 0) return "Занятий нет";
  if (workoutsCount === 1) return "1 занятие";
  if (workoutsCount >= 2 && workoutsCount <= 4) return `${workoutsCount} занятия`;
  return `${workoutsCount} занятий`;
}

export default function IndexScreen() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const weekItems = useMemo(() => getWeekItems(today), [today]);
  const todayKey = useMemo(() => getDateKey(today), [today]);
  const workoutsByDay = useMemo(() => getDemoWorkouts(today), [today]);
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);
  const [planningStep, setPlanningStep] = useState<PlanningModalStep>("closed");
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  const selectedDate = useMemo(() => {
    const index = weekItems.findIndex((item) => item.key === selectedDayKey);
    return index >= 0 ? addDays(getWeekStart(today), index) : today;
  }, [selectedDayKey, today, weekItems]);

  const isToday = selectedDayKey === todayKey;
  const isPast = startOfDay(selectedDate) < today;
  const originalWorkoutsCount = workoutsByDay[selectedDayKey]?.length ?? 0;
  const selectedWorkouts = useMemo(() => {
    const dayWorkouts = workoutsByDay[selectedDayKey] ?? [];
    return isPast ? dayWorkouts.filter((workout) => workout.status !== "planned") : dayWorkouts;
  }, [isPast, selectedDayKey, workoutsByDay]);
  const hasVisibleWorkouts = selectedWorkouts.length > 0;
  const shouldShowDayPlan = isToday || originalWorkoutsCount === 0;
  const shouldShowAddWorkout = !isPast && originalWorkoutsCount > 0;

  const openWorkoutSession = (workoutId: string) => {
    router.push({
      pathname: "/workouts/[workoutId]/session",
      params: { workoutId }
    });
  };

  const openPlanningChoice = () => {
    setSelectedClientId(undefined);
    setPlanningStep("choice");
  };

  const closePlanning = () => {
    setPlanningStep("closed");
  };

  const saveClientSelection = () => {
    if (!selectedClientId) return;
    setPlanningStep("closed");
    router.push({
      pathname: "/workouts/new",
      params: {
        clientId: selectedClientId,
        date: selectedDayKey
      }
    });
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Header title="Тренировки" subtitle={formatHeaderDate(selectedDate)} subtitlePosition="top" size="xl" style={styles.header} />

          <CalendarDayStrip items={weekItems} selectedKey={selectedDayKey} todayKey={todayKey} width="full" onSelect={setSelectedDayKey} />

          <View style={styles.cards}>
            {shouldShowDayPlan ? (
              <Card
                variant="dayPlan"
                dayPlanState={originalWorkoutsCount === 0 && !isPast ? "planNext" : "plan"}
                dayTitle={`План ${formatPlanDate(selectedDate)}`}
                dayCount={getPlanCount(originalWorkoutsCount)}
                dayMeta={originalWorkoutsCount > 0 ? "Следующая через 25 минут" : ""}
                onAddWorkout={openPlanningChoice}
              />
            ) : null}

            {hasVisibleWorkouts
              ? selectedWorkouts.map((workout) => (
                  <Card
                    key={workout.id}
                    variant="workout"
                    workoutStatus={workout.status}
                    muscleGroup={workout.title}
                    clientName={workout.clientName}
                    workoutTime={workout.time}
                    exerciseCount={workout.exercisesCount}
                    completedExercises={workout.completedExercises}
                    totalExercises={workout.exercisesCount}
                    showAction={!isPast && workout.status !== "completed"}
                    showMenu={!isPast}
                    onStart={() => openWorkoutSession(workout.id)}
                    onContinue={() => openWorkoutSession(workout.id)}
                  />
                ))
              : null}

            {shouldShowAddWorkout ? <Card variant="addWorkout" onAddWorkout={openPlanningChoice} /> : null}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={planningStep !== "closed"}
        presentation="overlay"
        title={planningStep === "client" ? "Выбор клиента" : "Запланировать тренировку"}
        showSubline={false}
        showBodyText={false}
        showCloseButton
        showActions={planningStep === "client"}
        actionLayout="stacked"
        primaryAction={planningStep === "client" ? { label: "Сохранить", type: "primary", disabled: !selectedClientId, onPress: saveClientSelection } : undefined}
        secondaryAction={planningStep === "client" ? { label: "Создать нового клиента", type: "secondaryNeutral", disabled: true } : undefined}
        onClose={closePlanning}
        bodyStyle={styles.modalBody}
      >
        {planningStep === "choice" ? (
          <>
            <ListItemCell
              title="Создать новую"
              leading="avatar"
              avatarType="icon"
              leadingIconName="edit"
              trailing="icon"
              trailingIconName="chevron right"
              onPress={() => setPlanningStep("client")}
            />
            <ListItemCell
              title="Выбрать из шаблона"
              leading="avatar"
              avatarType="icon"
              leadingIconName="list"
              trailing="icon"
              trailingIconName="chevron right"
            />
          </>
        ) : null}

        {planningStep === "client"
          ? mockClients.map((client) => {
              const selected = client.id === selectedClientId;

              return (
                <ListItemCell
                  key={client.id}
                  title={client.name}
                  leading="avatar"
                  avatarType="initials"
                  avatarInitials={client.avatarInitials}
                  trailingSlot={<Radio selected={selected} showLabel={false} onChange={() => setSelectedClientId(client.id)} />}
                  selected={selected}
                  onPress={() => setSelectedClientId(client.id)}
                />
              );
            })
          : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing["3xl"]
  },
  body: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  header: {
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing[0],
    paddingBottom: theme.spacing[0]
  },
  cards: {
    gap: theme.spacing.md
  },
  modalBody: {
    gap: theme.spacing[0]
  }
});
