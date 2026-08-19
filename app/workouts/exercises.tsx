import { useCallback, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { FlatList, ScrollView, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Badge, Button, Checkbox, Chip, Divider, Icon, ListItemGym, Modal, Navigation, Search, StateSelect, getListItemGymSelectedGroupPosition } from "@/components/ui";
import { useClient, useDataMutation, useExerciseActions, useExercises, useSession, useSessionActions, useWorkoutActions, useWorkoutDraft } from "@/data";
import { getExerciseClientRestrictionLabels } from "@/features/workouts/exerciseRestrictions";
import { theme } from "@/theme";
import type { Exercise } from "@/types";

type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const repeatDays: RepeatDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const customExerciseFilterId = "custom";

const muscleLabels: Record<string, string> = {
  legs: "Ноги",
  quads: "Квадрицепс",
  shoulders: "Плечи",
  triceps: "Трицепс",
  back: "Спина",
  biceps: "Бицепс",
  chest: "Грудь",
  glutes: "Ягодицы"
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function exerciseMatchesSearch(exercise: { name: string; searchAliases?: string[] }, normalizedSearch: string) {
  if (!normalizedSearch) return true;
  const searchableText = [exercise.name, ...(exercise.searchAliases ?? [])].join(" ").toLowerCase();
  return searchableText.includes(normalizedSearch);
}

function getExerciseMuscles(exercise: Pick<Exercise, "primaryMuscles" | "secondaryMuscles">) {
  return [...exercise.primaryMuscles, ...(exercise.secondaryMuscles ?? [])];
}

function ListSeparator() {
  return <View style={styles.listSeparator} />;
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
  const exerciseActions = useExerciseActions();
  const { draft } = useWorkoutDraft(draftId);
  const { session } = useSession(sessionId);
  const { client: selectedClient } = useClient(draft?.clientId ?? session?.clientId);
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
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [customOnlySelected, setCustomOnlySelected] = useState(false);
  const [restrictedExercisePending, setRestrictedExercisePending] = useState<Exercise | null>(null);
  const archiveExerciseMutation = useDataMutation(async (exerciseId: string) => exerciseActions.archive(exerciseId));
  const saveSelectionMutation = useDataMutation(async () => {
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
  });
  const normalizedSearch = search.trim().toLowerCase();
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedMuscleSet = useMemo(() => new Set(selectedMuscles), [selectedMuscles]);
  const displayedSelectedIdSet = useMemo(() => {
    if (!hasSessionContext) return selectedIdSet;
    return new Set([...existingExerciseIds, ...selectedIds]);
  }, [existingExerciseIds, hasSessionContext, selectedIdSet, selectedIds]);
  const contextCount = [hasDraftContext, hasSessionContext].filter(Boolean).length;
  const hasInvalidContext = contextCount !== 1 || (hasDraftContext && !draft) || (hasSessionContext && !session);

  const muscleFilters = useMemo(() => {
    return Array.from(new Set(exercises.flatMap((exercise) => getExerciseMuscles(exercise)))).sort();
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = exerciseMatchesSearch(exercise, normalizedSearch);
      const matchesCustomOnly = !customOnlySelected || exercise.source === "custom";
      const exerciseMuscles = getExerciseMuscles(exercise);
      const matchesMuscle = selectedMuscleSet.size === 0 || exerciseMuscles.some((muscle) => selectedMuscleSet.has(muscle));
      return matchesSearch && matchesCustomOnly && matchesMuscle;
    });
  }, [customOnlySelected, exercises, normalizedSearch, selectedMuscleSet]);

  const toggleMuscleFilter = useCallback((muscle: string) => {
    setSelectedMuscles((current) => (current.includes(muscle) ? current.filter((item) => item !== muscle) : [...current, muscle]));
  }, []);

  const removeMuscleFilter = useCallback((muscle: string) => {
    setSelectedMuscles((current) => current.filter((item) => item !== muscle));
  }, []);

  const toggleExercise = useCallback((exerciseId: string) => {
    if (hasSessionContext && existingExerciseIds.has(exerciseId)) return;
    setSelectedIds((current) => (current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]));
  }, [existingExerciseIds, hasSessionContext]);

  const requestExerciseSelection = useCallback((exercise: Exercise, hasClientRestrictions: boolean) => {
    if (hasSessionContext && existingExerciseIds.has(exercise.id)) return;
    if (selectedIdSet.has(exercise.id)) {
      toggleExercise(exercise.id);
      return;
    }

    if (hasClientRestrictions) {
      setRestrictedExercisePending(exercise);
      return;
    }

    toggleExercise(exercise.id);
  }, [existingExerciseIds, hasSessionContext, selectedIdSet, toggleExercise]);

  const confirmRestrictedExerciseSelection = useCallback(() => {
    if (!restrictedExercisePending) return;
    setSelectedIds((current) => (current.includes(restrictedExercisePending.id) ? current : [...current, restrictedExercisePending.id]));
    setRestrictedExercisePending(null);
  }, [restrictedExercisePending]);

  const openCreateExercise = useCallback(() => {
    router.push({
      pathname: "/workouts/exercise-new",
      params: {
        ...(draftId ? { draftId } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(draftDay ? { day: draftDay } : {})
      }
    });
  }, [draftDay, draftId, sessionId]);

  const saveSelection = () => {
    void saveSelectionMutation.mutate().catch(() => undefined);
  };

  const archiveExercise = useCallback(async (exerciseId: string) => {
    const archived = await archiveExerciseMutation.mutate(exerciseId).catch(() => null);
    if (archived) {
      setSelectedIds((current) => current.filter((id) => id !== exerciseId));
    }
  }, [archiveExerciseMutation]);

  const renderExercise = useCallback<ListRenderItem<Exercise>>(
    ({ item: exercise, index }) => {
      const alreadyInSession = hasSessionContext && existingExerciseIds.has(exercise.id);
      const displayedSelected = displayedSelectedIdSet.has(exercise.id);
      const isCustom = exercise.source === "custom";
      const restrictionLabels = getExerciseClientRestrictionLabels(exercise, selectedClient);
      const hasClientRestrictions = restrictionLabels.length > 0;
      const previousSelected = index > 0 && displayedSelectedIdSet.has(filteredExercises[index - 1].id);
      const nextSelected = index < filteredExercises.length - 1 && displayedSelectedIdSet.has(filteredExercises[index + 1].id);

      return (
        <ListItemGym
          title={exercise.name}
          groupPosition={getListItemGymSelectedGroupPosition(displayedSelected, previousSelected, nextSelected)}
          mode={displayedSelected ? "selected" : "default"}
          width="fill"
          selected={displayedSelected}
          disabled={alreadyInSession}
          suppressPressedStyle={isCustom}
          supportingSlot={hasClientRestrictions ? <Badge label="Есть ограничения" tone="negativeSoft" size="s" icon={false} style={styles.restrictionBadge} /> : undefined}
          trailingSlot={
            isCustom ? (
              <View style={styles.exerciseActions}>
                <Button
                  type="tertiary"
                  size="smallIcon"
                  accessibilityLabel={`Редактировать ${exercise.name}`}
                  icon={<Icon name="edit" size={theme.sizes.buttonIconSmall} color={theme.colors.content.inkDeep} />}
                  onPress={() => router.push({ pathname: "/workouts/exercise-new", params: { exerciseId: exercise.id } })}
                />
                <Checkbox
                  accessibilityLabel={`Выбрать ${exercise.name}`}
                  selected={displayedSelected}
                  showLabel={false}
                  onChange={alreadyInSession ? undefined : () => requestExerciseSelection(exercise, hasClientRestrictions)}
                />
              </View>
            ) : undefined
          }
          onDelete={isCustom ? () => void archiveExercise(exercise.id) : undefined}
          onPress={alreadyInSession ? undefined : () => requestExerciseSelection(exercise, hasClientRestrictions)}
          onSelectedChange={alreadyInSession ? undefined : () => requestExerciseSelection(exercise, hasClientRestrictions)}
        />
      );
    },
    [archiveExercise, displayedSelectedIdSet, existingExerciseIds, filteredExercises, hasSessionContext, requestExerciseSelection, selectedClient]
  );

  const restrictionModalLabels = selectedClient?.restrictions ?? [];

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation
        title="Упражнения"
        onBack={() => router.back()}
        trailingSlot={
          <Button
            type="tertiary"
            size="smallIcon"
            accessibilityLabel="Создать упражнение"
            icon={<Icon name="add" size={theme.sizes.navigationIcon} color={theme.colors.content.ink} />}
            onPress={openCreateExercise}
          />
        }
      />

      {hasInvalidContext ? (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Не удалось выбрать упражнение</Text>
          <Text style={styles.errorCopy}>Вернитесь назад и откройте выбор из тренировки или конструктора.</Text>
          <Button label="Назад" type="secondary" size="large" width="fill" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <View style={styles.filter}>
            {saveSelectionMutation.error ? <Alert tone="negative" layout="compact" width="fill" title={saveSelectionMutation.error.message} /> : null}
            {archiveExerciseMutation.error ? <Alert tone="negative" layout="compact" width="fill" title={archiveExerciseMutation.error.message} /> : null}
            <Search value={search} width="fill" placeholder="Поиск упражнений" onChangeText={setSearch} onClear={() => setSearch("")} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.chips, styles.chipsContent]}
              style={styles.chipsScroller}
            >
              <Chip
                key={customExerciseFilterId}
                label="Мои"
                selected={customOnlySelected}
                onPress={() => setCustomOnlySelected(!customOnlySelected)}
                onRemove={() => setCustomOnlySelected(false)}
              />
              {muscleFilters.map((muscle) => {
                const isSelected = selectedMuscleSet.has(muscle);
                return (
                  <Chip
                    key={muscle}
                    label={muscleLabels[muscle] ?? muscle}
                    selected={isSelected}
                    onPress={() => (isSelected ? removeMuscleFilter(muscle) : toggleMuscleFilter(muscle))}
                    onRemove={() => removeMuscleFilter(muscle)}
                  />
                );
              })}
            </ScrollView>
          </View>

          <Divider width="fill" tone="canvasSoft" />
          <View style={styles.body}>
            <View style={styles.bodyContent}>
              <StateSelect selectedCount={selectedIds.length} label={hasSessionContext ? "К добавлению" : "Выбрано"} resetLabel="Сбросить" width="fill" onReset={() => setSelectedIds([])} />
              <FlatList
                data={filteredExercises}
                keyExtractor={(exercise) => exercise.id}
                renderItem={renderExercise}
                style={styles.exerciseList}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={ListSeparator}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                removeClippedSubviews
                windowSize={7}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Сохранить"
              type="primary"
              size="large"
              width="fill"
              state={saveSelectionMutation.isSubmitting ? "loading" : selectedIds.length > 0 ? "active" : "disabled"}
              onPress={saveSelection}
            />
          </View>
        </>
      )}

      <Modal
        visible={Boolean(restrictedExercisePending)}
        presentation="overlay"
        title="Есть ограничения"
        showSubline={false}
        showBodyText={false}
        bodyStyle={styles.restrictionModalBody}
        actionStyle={styles.restrictionModalAction}
        primaryAction={{ label: "Всё равно добавить", type: "destructive", onPress: confirmRestrictedExerciseSelection }}
        onClose={() => setRestrictedExercisePending(null)}
      >
        <View style={styles.restrictionModalBadges}>
          {restrictionModalLabels.map((restriction) => (
            <Badge key={restriction} label={restriction} tone="negativeSoft" size="sm" icon={false} />
          ))}
        </View>
      </Modal>
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
    alignItems: "center",
    gap: theme.spacing.sm
  },
  chipsScroller: {
    marginHorizontal: -theme.spacing.lg
  },
  chipsContent: {
    paddingHorizontal: theme.spacing.lg
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  restrictionBadge: {
    alignSelf: "flex-start"
  },
  restrictionModalBody: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs
  },
  restrictionModalBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  restrictionModalAction: {
    padding: theme.spacing.lg
  },
  body: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  bodyContent: {
    flex: 1,
    paddingTop: theme.spacing.lg
  },
  exerciseList: {
    flex: 1
  },
  list: {
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing["3xl"]
  },
  listSeparator: {
    height: theme.spacing.xxs
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
