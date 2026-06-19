import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Divider, ListItemGym, Navigation, Search, StateSelect, getListItemGymSelectedGroupPosition } from "@/components/ui";
import { mockExercises } from "@/data/mockExercises";
import { parseWorkoutResult, serializeWorkoutResult, type WorkoutResultSnapshot } from "@/features/workouts/sessionResult";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
type SelectionMode = "session" | "workout-draft";
type DayExerciseIds = Partial<Record<RepeatDay, string[]>>;
const repeatDays: RepeatDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayNames: Record<RepeatDay, string> = {
  monday: "Понедельник",
  tuesday: "Вторник",
  wednesday: "Среда",
  thursday: "Четверг",
  friday: "Пятница",
  saturday: "Суббота",
  sunday: "Воскресенье"
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseIds(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

function parseDayExerciseIds(value?: string | string[]) {
  const raw = firstParam(value);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([day, ids]) => {
        if (!repeatDays.includes(day as RepeatDay) || !Array.isArray(ids)) return [];
        return [[day, ids.filter((id): id is string => typeof id === "string")]];
      })
    ) as DayExerciseIds;
  } catch {
    return {};
  }
}

function serializeDayExerciseIds(data: DayExerciseIds) {
  const entries = Object.entries(data).filter(([, ids]) => Array.isArray(ids) && ids.length > 0);
  if (entries.length === 0) return undefined;
  return encodeURIComponent(JSON.stringify(Object.fromEntries(entries)));
}

function getAdjacentConnectionIds(ids: string[]) {
  return ids.slice(0, -1).map((id, index) => `${id}:${ids[index + 1]}`);
}

function getSessionExerciseId(exerciseId: string, index: number) {
  return `session-${exerciseId}-${index + 1}`;
}

function addExercisesToSession(snapshot: WorkoutResultSnapshot, exerciseIds: string[]) {
  const existingExerciseIds = new Set(snapshot.exercises.map((exercise) => exercise.exerciseId));
  const newExercises = exerciseIds.flatMap((exerciseId, index) => {
    if (existingExerciseIds.has(exerciseId)) return [];

    const exercise = mockExercises.find((item) => item.id === exerciseId);
    if (!exercise) return [];

    const sessionExerciseId = getSessionExerciseId(exercise.id, snapshot.exercises.length + index);

    return [
      {
        id: sessionExerciseId,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [
          {
            id: `${sessionExerciseId}-set-1`,
            index: 1,
            unit: "кг",
            state: "default" as const
          }
        ]
      }
    ];
  });

  return {
    ...snapshot,
    exercises: [...snapshot.exercises, ...newExercises]
  };
}

export default function ExerciseSelectionScreen() {
  const { mode, workoutId, sessionSnapshot, activeWorkoutSnapshots, clientId, clientName, date, selectedDays, scheduleTimes, activeDay, dayExerciseIds, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    mode?: SelectionMode;
    workoutId?: string;
    sessionSnapshot?: string;
    activeWorkoutSnapshots?: string;
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
  const modeValue = firstParam(mode);
  const activeMode: SelectionMode | undefined = modeValue === "session" || modeValue === "workout-draft" ? modeValue : undefined;
  const sessionWorkoutId = firstParam(workoutId);
  const parsedSessionSnapshot = useMemo(() => parseWorkoutResult(sessionSnapshot), [sessionSnapshot]);
  const existingSessionExerciseIds = useMemo(
    () => new Set(parsedSessionSnapshot?.exercises.map((exercise) => exercise.exerciseId) ?? []),
    [parsedSessionSnapshot]
  );
  const activeWorkoutDay = repeatDays.includes(firstParam(activeDay) as RepeatDay) ? (firstParam(activeDay) as RepeatDay) : undefined;
  const dayExerciseIdsFromParams = useMemo(() => parseDayExerciseIds(dayExerciseIds), [dayExerciseIds]);
  const selectedFromParams = useMemo(() => {
    if (activeMode === "session") return [];
    if (activeWorkoutDay) return dayExerciseIdsFromParams[activeWorkoutDay] ?? parseIds(exerciseIds);
    return parseIds(exerciseIds);
  }, [activeMode, activeWorkoutDay, dayExerciseIdsFromParams, exerciseIds]);
  const supersetConnectionIdsFromParams = useMemo(() => parseIds(supersetConnectionIds), [supersetConnectionIds]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFromParams);
  const [search, setSearch] = useState("");
  const { scrollProps } = useConditionalScroll();
  const normalizedSearch = search.trim().toLowerCase();
  const selectedIdSet = useMemo(() => {
    const nextSelectedIds = new Set(selectedIds);
    if (activeMode === "session") {
      existingSessionExerciseIds.forEach((id) => nextSelectedIds.add(id));
    }
    return nextSelectedIds;
  }, [activeMode, existingSessionExerciseIds, selectedIds]);
  const hasInvalidContext = !activeMode || (activeMode === "session" && (!sessionWorkoutId || !parsedSessionSnapshot || parsedSessionSnapshot.workoutId !== sessionWorkoutId));

  const filteredExercises = useMemo(() => {
    if (!normalizedSearch) return mockExercises;
    return mockExercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const toggleExercise = (exerciseId: string) => {
    if (activeMode === "session" && existingSessionExerciseIds.has(exerciseId)) return;
    setSelectedIds((current) => (current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]));
  };

  const saveSelection = () => {
    if (activeMode === "session") {
      if (!sessionWorkoutId || !parsedSessionSnapshot || parsedSessionSnapshot.workoutId !== sessionWorkoutId) return;

      const nextSnapshot = addExercisesToSession(parsedSessionSnapshot, selectedIds);

      router.replace({
        pathname: "/workouts/[workoutId]/session",
        params: {
          workoutId: sessionWorkoutId,
          sessionSnapshot: serializeWorkoutResult(nextSnapshot),
          ...(activeWorkoutSnapshots ? { activeWorkoutSnapshots } : {})
        }
      });
      return;
    }

    if (activeMode !== "workout-draft") return;

    const validConnectionIds = getAdjacentConnectionIds(selectedIds);
    const nextSupersetConnectionIds = supersetConnectionIdsFromParams.filter((id) => validConnectionIds.includes(id));
    const nextDayExerciseIds = activeWorkoutDay ? { ...dayExerciseIdsFromParams, [activeWorkoutDay]: selectedIds } : dayExerciseIdsFromParams;
    const serializedDayExerciseIds = serializeDayExerciseIds(nextDayExerciseIds);

    router.replace({
      pathname: "/workouts/new",
      params: {
        ...(clientId ? { clientId } : {}),
        ...(clientName ? { clientName } : {}),
        ...(date ? { date } : {}),
        ...(selectedDays ? { selectedDays } : {}),
        ...(scheduleTimes ? { scheduleTimes } : {}),
        ...(activeDay ? { activeDay } : {}),
        ...(serializedDayExerciseIds ? { dayExerciseIds: serializedDayExerciseIds } : {}),
        ...(selectedIds.length > 0 ? { exerciseIds: selectedIds.join(",") } : {}),
        ...(nextSupersetConnectionIds.length > 0 ? { supersetConnectionIds: nextSupersetConnectionIds.join(",") } : {}),
        ...(approachData ? { approachData } : {})
      }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Упражнения" onBack={() => router.back()} />

      {hasInvalidContext ? (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Не удалось выбрать упражнение</Text>
          <Text style={styles.errorCopy}>Вернитесь назад и откройте выбор из тренировки или конструктора.</Text>
          <Button label="Назад" type="secondary" size="large" width="fill" onPress={() => router.back()} />
        </View>
      ) : (
        <>

      <View style={styles.filter}>
        {activeWorkoutDay ? <Text style={styles.dayContext}>{dayNames[activeWorkoutDay]}</Text> : null}
        <Search value={search} width="fill" placeholder="Поиск упражнений" onChangeText={setSearch} onClear={() => setSearch("")} />
        <View style={styles.chips}>
          <Chip label="Мышцы" dropdown />
        </View>
      </View>

      <Divider width="fill" tone="canvasSoft" />
      <View style={styles.body}>
        <View style={styles.bodyContent}>
          <StateSelect selectedCount={selectedIds.length} label={activeMode === "session" ? "К добавлению" : "Выбрано"} resetLabel="Сбросить" width="fill" onReset={() => setSelectedIds([])} />
          <ScrollView contentContainerStyle={styles.list} {...scrollProps}>
            {filteredExercises.map((exercise, index) => {
              const selected = selectedIdSet.has(exercise.id);
              const alreadyInSession = activeMode === "session" && existingSessionExerciseIds.has(exercise.id);
              const previousSelected = index > 0 && selectedIdSet.has(filteredExercises[index - 1].id);
              const nextSelected = index < filteredExercises.length - 1 && selectedIdSet.has(filteredExercises[index + 1].id);

              return (
                <ListItemGym
                  key={exercise.id}
                  title={exercise.name}
                  groupPosition={getListItemGymSelectedGroupPosition(selected, previousSelected, nextSelected)}
                  mode={selected ? "selected" : "default"}
                  width="fill"
                  selected={selected}
                  disabled={alreadyInSession}
                  onPress={alreadyInSession ? undefined : () => toggleExercise(exercise.id)}
                  onSelectedChange={alreadyInSession ? undefined : () => toggleExercise(exercise.id)}
                />
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Сохранить"
          type="primary"
          size="large"
          width="fill"
          state={selectedIds.length > 0 ? "active" : "disabled"}
          onPress={saveSelection}
        />
      </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  filter: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  dayContext: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  chips: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  body: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  bodyContent: {
    flex: 1,
    paddingTop: theme.spacing.lg
  },
  list: {
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing["3xl"]
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  errorTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  errorCopy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  }
});
