import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Divider, ListItemGym, Navigation, Search, StateSelect, getListItemGymSelectedGroupPosition } from "@/components/ui";
import { useExercises, useSession, useSessionActions, useWorkoutActions, useWorkoutDraft } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const repeatDays: RepeatDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ExerciseSelectionScreen() {
  const {
    draftId: rawDraftId,
    sessionId: rawSessionId,
    day
  } = useLocalSearchParams<{
    draftId?: string;
    sessionId?: string;
    day?: string;
  }>();
  const draftId = firstParam(rawDraftId);
  const sessionId = firstParam(rawSessionId);
  const activeDayValue = firstParam(day);
  const draftDay = repeatDays.includes(activeDayValue as RepeatDay) ? (activeDayValue as RepeatDay) : undefined;
  const hasDraftContext = Boolean(draftId);
  const hasSessionContext = Boolean(sessionId);
  const { exercises } = useExercises();
  const { draft } = useWorkoutDraft(draftId);
  const { session } = useSession(sessionId);
  const workouts = useWorkoutActions();
  const sessions = useSessionActions();
  const existingExerciseIds = useMemo(() => {
    if (draft) return new Set(draft.exercises.filter((exercise) => exercise.day === draftDay).map((exercise) => exercise.exerciseId));
    if (session) return new Set(session.exercises.map((exercise) => exercise.exerciseId));
    return new Set<string>();
  }, [draft, draftDay, session]);
  const selectedFromStore = useMemo(() => (hasSessionContext ? [] : Array.from(existingExerciseIds)), [existingExerciseIds, hasSessionContext]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFromStore);
  const [search, setSearch] = useState("");
  const { scrollProps } = useConditionalScroll();
  const normalizedSearch = search.trim().toLowerCase();
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const contextCount = [hasDraftContext, hasSessionContext].filter(Boolean).length;
  const hasInvalidContext = contextCount !== 1 || (hasDraftContext && !draft) || (hasSessionContext && !session);

  const filteredExercises = useMemo(() => {
    if (!normalizedSearch) return exercises;
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedSearch));
  }, [exercises, normalizedSearch]);

  const toggleExercise = (exerciseId: string) => {
    if (hasSessionContext && existingExerciseIds.has(exerciseId)) return;
    setSelectedIds((current) => (current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]));
  };

  const saveSelection = async () => {
    if (draftId && draft) {
      await workouts.setDraftExercises(draftId, selectedIds, { day: draftDay });
      router.back();
      return;
    }

    if (sessionId && session) {
      for (const exerciseId of selectedIds) {
        if (!existingExerciseIds.has(exerciseId)) {
          await sessions.addExercise(sessionId, exerciseId);
        }
      }
      router.back();
    }
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
        <Search value={search} width="fill" placeholder="Поиск упражнений" onChangeText={setSearch} onClear={() => setSearch("")} />
        <View style={styles.chips}>
          <Chip label="Мышцы" dropdown />
        </View>
      </View>

      <Divider width="fill" tone="canvasSoft" />
      <View style={styles.body}>
        <View style={styles.bodyContent}>
          <StateSelect selectedCount={selectedIds.length} label={hasSessionContext ? "К добавлению" : "Выбрано"} resetLabel="Сбросить" width="fill" onReset={() => setSelectedIds([])} />
          <ScrollView contentContainerStyle={styles.list} {...scrollProps}>
            {filteredExercises.map((exercise, index) => {
              const selected = selectedIdSet.has(exercise.id);
              const alreadyInSession = hasSessionContext && existingExerciseIds.has(exercise.id);
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
