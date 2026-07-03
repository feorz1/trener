import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Input, Loader, Navigation, TextArea } from "@/components/ui";
import { useDataMutation, useExercise, useExerciseActions, useSession, useSessionActions, useWorkoutActions, useWorkoutDraft } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

type RepeatDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

const repeatDays: RepeatDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const muscleOptions = [
  { key: "legs", label: "Ноги" },
  { key: "quads", label: "Квадрицепс" },
  { key: "glutes", label: "Ягодицы" },
  { key: "chest", label: "Грудь" },
  { key: "back", label: "Спина" },
  { key: "shoulders", label: "Плечи" },
  { key: "biceps", label: "Бицепс" },
  { key: "triceps", label: "Трицепс" }
];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function toggle(items: string[], item: string) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export default function NewExerciseScreen() {
  const {
    draftId: rawDraftId,
    exerciseId: rawExerciseId,
    sessionId: rawSessionId,
    day
  } = useLocalSearchParams<{ draftId?: string | string[]; exerciseId?: string | string[]; sessionId?: string | string[]; day?: string | string[] }>();
  const draftId = firstParam(rawDraftId);
  const exerciseId = firstParam(rawExerciseId);
  const sessionId = firstParam(rawSessionId);
  const dayValue = firstParam(day);
  const draftDay = repeatDays.includes(dayValue as RepeatDay) ? (dayValue as RepeatDay) : undefined;
  const { draft } = useWorkoutDraft(draftId);
  const { session } = useSession(sessionId);
  const exerciseQuery = useExercise(exerciseId);
  const { exercise } = exerciseQuery;
  const exercises = useExerciseActions();
  const workouts = useWorkoutActions();
  const sessions = useSessionActions();
  const { scrollProps } = useConditionalScroll();
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState("");
  const [notes, setNotes] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>(["legs"]);
  const createExerciseMutation = useDataMutation(async () => exercises.create({ name, primaryMuscles, equipment, notes }));
  const updateExerciseMutation = useDataMutation(async (id: string) => exercises.update(id, { name, primaryMuscles, equipment, notes }));
  const archiveExerciseMutation = useDataMutation(async (id: string) => exercises.archive(id));
  const isEditing = Boolean(exerciseId);
  const isMutating = createExerciseMutation.isSubmitting || updateExerciseMutation.isSubmitting || archiveExerciseMutation.isSubmitting;
  const error = createExerciseMutation.error ?? updateExerciseMutation.error ?? archiveExerciseMutation.error;
  const canSave = useMemo(() => Boolean(name.trim() && primaryMuscles.length > 0 && !isMutating), [isMutating, name, primaryMuscles.length]);

  useEffect(() => {
    if (!exercise) return;
    setName(exercise.name);
    setEquipment(exercise.equipment);
    setNotes(exercise.notes ?? "");
    setPrimaryMuscles(exercise.primaryMuscles.length > 0 ? exercise.primaryMuscles : ["legs"]);
  }, [exercise]);

  const save = async () => {
    if (!canSave) return;
    try {
      if (isEditing) {
        if (!exerciseId) return;
        await updateExerciseMutation.mutate(exerciseId);
        router.back();
        return;
      }

      const exercise = await createExerciseMutation.mutate();

      if (draftId && draft) {
        const currentIds = draft.exercises.filter((item) => item.day === draftDay).map((item) => item.exerciseId);
        await workouts.setDraftExercises(draftId, [...currentIds, exercise.id], { day: draftDay });
        router.dismissTo({ pathname: "/workouts/new", params: { draftId, ...(draftDay ? { activeDay: draftDay } : {}) } });
        return;
      }

      if (sessionId && session) {
        await sessions.addExercise(sessionId, exercise.id);
        router.dismissTo({ pathname: "/sessions/[sessionId]", params: { sessionId: session.id } });
        return;
      }

      router.back();
    } catch {
      // Error state is owned by useDataMutation.
    }
  };

  const archiveExercise = async () => {
    if (!exerciseId || isMutating) return;
    const archived = await archiveExerciseMutation.mutate(exerciseId).catch(() => null);
    if (archived) router.back();
  };

  if (isEditing && exerciseQuery.isLoading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Упражнение" onBack={() => router.back()} />
        <View style={styles.state}>
          <Loader size="medium" tone="brand" />
          <Text style={styles.stateTitle}>Загружаем упражнение</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isEditing && exerciseQuery.error) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Упражнение" onBack={() => router.back()} />
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Не удалось загрузить упражнение</Text>
          <Text style={styles.stateCopy}>{exerciseQuery.error.message}</Text>
          <Button label="Повторить" type="primary" size="large" width="fill" onPress={exerciseQuery.retry} />
        </View>
      </SafeAreaView>
    );
  }

  if (isEditing && (!exercise || exerciseQuery.notFound)) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <Navigation title="Упражнение" onBack={() => router.back()} />
        <View style={styles.state}>
          <Text style={styles.stateTitle}>Упражнение не найдено</Text>
          <Text style={styles.stateCopy}>Вернитесь к списку и выберите другое упражнение.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title={isEditing ? "Редактировать упражнение" : "Новое упражнение"} onBack={() => router.back()} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAware}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" {...scrollProps}>
          <Input label="Название" value={name} width="fill" state={!name.trim() ? "error" : "default"} message={!name.trim() ? "Название обязательно" : undefined} onChangeText={setName} />
          <Input label="Оборудование" value={equipment} width="fill" showMessage={false} onChangeText={setEquipment} />

          <View style={styles.muscleSection}>
            <Text style={styles.sectionTitle}>Группы мышц</Text>
            <View style={styles.chips}>
              {muscleOptions.map((option) => (
                <Chip
                  key={option.key}
                  label={option.label}
                  selected={primaryMuscles.includes(option.key)}
                  onPress={() => setPrimaryMuscles((current) => toggle(current, option.key))}
                  onRemove={() => setPrimaryMuscles((current) => current.filter((item) => item !== option.key))}
                />
              ))}
            </View>
          </View>

          <TextArea label="Заметки" value={notes} width="fill" showMessage={false} onChangeText={setNotes} />
          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {isEditing ? (
            <Button label="Архивировать" type="destructive" size="large" width="fill" state={archiveExerciseMutation.isSubmitting ? "loading" : isMutating ? "disabled" : "active"} onPress={archiveExercise} />
          ) : null}
          <Button label={isEditing ? "Сохранить" : "Создать"} type="primary" size="large" width="fill" state={createExerciseMutation.isSubmitting || updateExerciseMutation.isSubmitting ? "loading" : canSave ? "active" : "disabled"} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  keyboardAware: {
    flex: 1
  },
  content: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md
  },
  muscleSection: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
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
    gap: theme.spacing.md,
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
