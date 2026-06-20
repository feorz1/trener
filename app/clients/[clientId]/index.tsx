import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Divider, ListItemCell, Navigation, getListItemCellGroupPosition } from "@/components/ui";
import { useClient, useClientWorkoutHistory } from "@/data";
import { formatDurationCompact } from "@/features/workouts/sessionHistory";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ClientProfileScreen() {
  const { clientId: rawClientId } = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = firstParam(rawClientId);
  const { client, isLoading, error, notFound } = useClient(clientId);
  const { sessions } = useClientWorkoutHistory(clientId);
  const { scrollProps } = useConditionalScroll();
  const latestSessions = sessions.slice(0, 3);

  if (isLoading) {
    return <ClientState title="Загружаем клиента" />;
  }

  if (error) {
    return <ClientState title="Не удалось загрузить клиента" actionLabel="Назад" onAction={() => router.back()} />;
  }

  if (notFound || !client) {
    return <ClientState title="Клиент не найден" actionLabel="К списку клиентов" onAction={() => router.replace("/clients")} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title={client.name} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        <View style={styles.topSection}>
          <View style={styles.listGroup}>
            <ListItemCell
              title="Данные клиента"
              subtitle="Имя, контакты, цель тренировки, заметки"
              leading="none"
              trailing="icon"
              trailingIconName="chevron right"
              surface="canvasSoft"
              groupPosition="single"
              onPress={() => router.push({ pathname: "/clients/[clientId]/edit", params: { clientId: client.id } })}
            />
          </View>
        </View>

        {client.restrictions?.length ? (
          <>
            <SectionDivider />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ограничения</Text>
              <View style={styles.badgesWrap}>
                {client.restrictions.map((restriction) => (
                  <Badge key={restriction} label={restriction} tone="negativeSoft" size="sm" icon={false} />
                ))}
              </View>
            </View>
          </>
        ) : null}

        <SectionDivider />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Последние тренировки</Text>
            <Badge label={String(sessions.length)} tone="neutral" size="s" icon={false} />
          </View>

          {latestSessions.length > 0 ? (
            <View style={styles.listGroup}>
              {latestSessions.map((session, index) => (
                <ListItemCell
                  key={session.id}
                  title={session.workoutTitleSnapshot ?? "Тренировка"}
                  eyebrow={formatProfileSessionDate(session.completedAt)}
                  subtitle={`${formatDurationCompact(session.durationSeconds)} · ${formatExerciseCount(session.exercises.length)}`}
                  leading="none"
                  trailing="icon"
                  trailingIconName="chevron right"
                  surface="canvasSoft"
                  groupPosition={getListItemCellGroupPosition(index, latestSessions.length)}
                  onPress={() => router.push({ pathname: "/workouts/[workoutId]/summary", params: { workoutId: session.id, sessionId: session.id, from: "client" } })}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyText}>Тренировок ещё не было</Text>
            </View>
          )}

          {latestSessions.length > 0 ? (
            <Button
              label="Вся история"
              type="secondaryNeutral"
              size="large"
              width="fill"
              onPress={() => router.push({ pathname: "/clients/[clientId]/history", params: { clientId: client.id } })}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionDivider() {
  return <Divider width="fill" tone="canvasSoft" />;
}

function formatProfileSessionDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date).replace(" в ", ", ");
}

function formatExerciseCount(count: number) {
  return `${count} упражнений`;
}

function ClientState({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="Профиль" onBack={() => router.back()} />
      <View style={styles.state}>
        <Text style={styles.stateTitle}>{title}</Text>
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
    paddingBottom: theme.spacing["3xl"]
  },
  topSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg
  },
  section: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing["3xl"]
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  sectionTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  listGroup: {
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft,
    paddingVertical: theme.spacing.xs
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs
  },
  emptyPanel: {
    minHeight: theme.sizes.alertCompactMinHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  emptyText: {
    ...theme.typography.body.md,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  state: {
    flex: 1,
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.lg
  },
  stateTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  }
});
