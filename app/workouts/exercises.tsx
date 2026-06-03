import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Chip, Divider, ListItemGym, Navigation, Search, StateSelect } from "@/components/ui";
import { mockExercises } from "@/data/mockExercises";
import { theme } from "@/theme";

function parseIds(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

function getAdjacentConnectionIds(ids: string[]) {
  return ids.slice(0, -1).map((id, index) => `${id}:${ids[index + 1]}`);
}

export default function ExerciseSelectionScreen() {
  const { clientId, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    clientId?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const selectedFromParams = useMemo(() => parseIds(exerciseIds), [exerciseIds]);
  const supersetConnectionIdsFromParams = useMemo(() => parseIds(supersetConnectionIds), [supersetConnectionIds]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedFromParams);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const filteredExercises = useMemo(() => {
    if (!normalizedSearch) return mockExercises;
    return mockExercises.filter((exercise) => exercise.name.toLowerCase().includes(normalizedSearch));
  }, [normalizedSearch]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedIds((current) => (current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]));
  };

  const saveSelection = () => {
    const validConnectionIds = getAdjacentConnectionIds(selectedIds);
    const nextSupersetConnectionIds = supersetConnectionIdsFromParams.filter((id) => validConnectionIds.includes(id));

    router.replace({
      pathname: "/workouts/new",
      params: {
        ...(clientId ? { clientId } : {}),
        ...(selectedIds.length > 0 ? { exerciseIds: selectedIds.join(",") } : {}),
        ...(nextSupersetConnectionIds.length > 0 ? { supersetConnectionIds: nextSupersetConnectionIds.join(",") } : {}),
        ...(approachData ? { approachData } : {})
      }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Упражнения" onBack={() => router.back()} />

      <View style={styles.filter}>
        <Search value={search} width="fill" placeholder="Search..." onChangeText={setSearch} onClear={() => setSearch("")} />
        <View style={styles.chips}>
          <Chip label="Мышцы" dropdown />
        </View>
      </View>

      <Divider width="fill" tone="canvasSoft" />

      <View style={styles.body}>
        <StateSelect selectedCount={selectedIds.length} label="Выбрано" resetLabel="Сбросить" width="fill" onReset={() => setSelectedIds([])} />
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredExercises.map((exercise) => {
            const selected = selectedIds.includes(exercise.id);

            return (
              <ListItemGym
                key={exercise.id}
                title={exercise.name}
                mode={selected ? "selected" : "default"}
                width="fill"
                selected={selected}
                onPress={() => toggleExercise(exercise.id)}
                onSelectedChange={() => toggleExercise(exercise.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <Button
          label="Сохранить"
          type="primary"
          width="fill"
          state={selectedIds.length > 0 ? "active" : "disabled"}
          onPress={saveSelection}
        />
      </View>
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
  chips: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  body: {
    flex: 1,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing["3xl"]
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
