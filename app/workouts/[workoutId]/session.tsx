import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Header } from "@/components/ui";
import { theme } from "@/theme";

export default function WorkoutSessionScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.body}>
        <Header title="Тренировка" subtitle={`ID: ${workoutId ?? "unknown"}`} style={styles.header} />
        <Text style={styles.copy}>Экран сессии будет следующим шагом после Today/Home.</Text>
        <Link href="/" asChild>
          <Button label="Назад к расписанию" type="secondary" size="large" width="fill" />
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  body: {
    flex: 1,
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  header: {
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing[0]
  },
  copy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body
  }
});
