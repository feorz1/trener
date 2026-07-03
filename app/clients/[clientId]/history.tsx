import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, ListItemCell, Loader, Navigation, getListItemCellGroupPosition } from "@/components/ui";
import { useClient, useClientWorkoutHistory } from "@/data";
import { formatDurationCompact } from "@/features/workouts/sessionHistory";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatHistorySessionDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long"
  }).format(date);
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

  return `${day}, ${time}`;
}

function formatExerciseCount(count: number) {
  const absoluteCount = Math.abs(count);
  const lastTwoDigits = absoluteCount % 100;
  const lastDigit = absoluteCount % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} упражнений`;
  if (lastDigit === 1) return `${count} упражнение`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} упражнения`;
  return `${count} упражнений`;
}

export default function ClientWorkoutHistoryScreen() {
  const { clientId: rawClientId } = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = firstParam(rawClientId);
  const clientQuery = useClient(clientId);
  const historyQuery = useClientWorkoutHistory(clientId);
  const { client, notFound } = clientQuery;
  const { sessions } = historyQuery;
  const { scrollProps } = useConditionalScroll();
  const isLoading = clientQuery.isLoading || historyQuery.isLoading;
  const error = clientQuery.error ?? historyQuery.error;

  if (isLoading) {
    return <HistoryState title="Загружаем историю" loading />;
  }

  if (error) {
    return <HistoryState title="Не удалось загрузить историю" description={error.message} actionLabel="Повторить" onAction={clientQuery.retry} />;
  }

  if (notFound || !client) {
    return <HistoryState title="Клиент не найден" />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="История" subtitle={client.name} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Все тренировки</Text>
          <Badge label={String(sessions.length)} tone="neutral" size="s" icon={false} />
        </View>

        {sessions.length > 0 ? (
          <View style={styles.listFrame}>
            {sessions.map((session, index) => {
              const subtitle = [
                formatDurationCompact(session.durationSeconds),
                formatExerciseCount(session.exercises.length)
              ].filter(Boolean).join(" • ");

              return (
                <ListItemCell
                  key={session.id}
                  title={session.workoutTitleSnapshot ?? "Тренировка"}
                  eyebrow={formatHistorySessionDate(session.completedAt)}
                  subtitle={subtitle}
                  leading="none"
                  trailing="icon"
                  trailingIconName="chevron right"
                  surface="canvasSoft"
                  groupPosition={getListItemCellGroupPosition(index, sessions.length)}
                  onPress={() => router.push({ pathname: "/sessions/[sessionId]/summary", params: { sessionId: session.id, from: "client" } })}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyText}>Тренировок ещё не было.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryState({
  title,
  description,
  loading = false,
  actionLabel,
  onAction
}: {
  title: string;
  description?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="История" onBack={() => router.back()} />
      <View style={styles.state}>
        {loading ? <Loader size="medium" tone="brand" /> : null}
        <Text style={styles.stateTitle}>{title}</Text>
        {description ? <Text style={styles.stateCopy}>{description}</Text> : null}
        {actionLabel && onAction ? <Button label={actionLabel} type="secondary" size="large" width="fill" onPress={onAction} /> : null}
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
    paddingBottom: theme.spacing["3xl"]
  },
  sectionHeader: {
    minHeight: theme.sizes.buttonMediumHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  listFrame: {
    overflow: "hidden",
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  emptyPanel: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  emptyText: {
    ...theme.typography.body.md,
    color: theme.colors.content.body
  },
  state: {
    flex: 1,
    alignItems: "stretch",
    justifyContent: "center",
    gap: theme.spacing.lg,
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
