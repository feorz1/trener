import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Input, Navigation, TextArea } from "@/components/ui";
import { useExerciseActions, useSession, useSessionActions, useWorkoutActions, useWorkoutDraft } from "@/data";
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
    sessionId: rawSessionId,
    day
  } = useLocalSearchParams<{ draftId?: string | string[]; sessionId?: string | string[]; day?: string | string[] }>();
  const draftId = firstParam(rawDraftId);
  const sessionId = firstParam(rawSessionId);
  const dayValue = firstParam(day);
  const draftDay = repeatDays.includes(dayValue as RepeatDay) ? (dayValue as RepeatDay) : undefined;
  const { draft } = useWorkoutDraft(draftId);
  const { session } = useSession(sessionId);
  const exercises = useExerciseActions();
  const workouts = useWorkoutActions();
  const sessions = useSessionActions();
  const { scrollProps } = useConditionalScroll();
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState("");
  const [notes, setNotes] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>(["legs"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canSave = useMemo(() => Boolean(name.trim() && primaryMuscles.length > 0 && !saving), [name, primaryMuscles.length, saving]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const exercise = await exercises.create({
        name,
        primaryMuscles,
        equipment,
        notes
      });

      if (draftId && draft) {
        const currentIds = draft.exercises.filter((item) => item.day === draftDay).map((item) => item.exerciseId);
        await workouts.setDraftExercises(draftId, [...currentIds, exercise.id], { day: draftDay });
        router.dismissTo({ pathname: "/workouts/new", params: { draftId, ...(draftDay ? { activeDay: draftDay } : {}) } });
        return;
      }

      if (sessionId && session) {
        await sessions.addExercise(sessionId, exercise.id);
        router.dismissTo({ pathname: "/workouts/[workoutId]/session", params: { workoutId: session.id, sessionId: session.id } });
        return;
      }

      router.back();
    } catch {
      setError("Не удалось создать упражнение.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Новое упражнение" onBack={() => router.back()} />

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
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Создать" type="primary" size="large" width="fill" state={saving ? "loading" : canSave ? "active" : "disabled"} onPress={save} />
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
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
