import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Divider, Icon, ListItemCell, Loader, Modal, Navigation, getListItemCellGroupPosition } from "@/components/ui";
import { useClient, useClientActions, useClientWorkoutHistory, useDataMutation } from "@/data";
import { formatDurationCompact } from "@/features/workouts/sessionHistory";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ClientProfileScreen() {
  const { clientId: rawClientId } = useLocalSearchParams<{ clientId?: string | string[] }>();
  const clientId = firstParam(rawClientId);
  const clientQuery = useClient(clientId);
  const historyQuery = useClientWorkoutHistory(clientId);
  const clientActions = useClientActions();
  const removeClientMutation = useDataMutation(clientActions.remove);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const { client, notFound } = clientQuery;
  const { sessions } = historyQuery;
  const { scrollProps } = useConditionalScroll();
  const latestSessions = sessions.slice(0, 3);
  const isLoading = clientQuery.isLoading || historyQuery.isLoading;
  const error = clientQuery.error ?? historyQuery.error;
  const isDeleting = removeClientMutation.isSubmitting;

  const openDeleteModal = () => {
    removeClientMutation.reset();
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    removeClientMutation.reset();
    setDeleteModalVisible(false);
  };

  const confirmDeleteClient = async () => {
    if (!client || isDeleting) return;

    try {
      await removeClientMutation.mutate(client.id);
      setDeleteModalVisible(false);
      router.replace("/clients");
    } catch {
      // The mutation state renders the error in the confirmation modal.
    }
  };

  if (isLoading) {
    return <ClientState title="Загружаем клиента" loading />;
  }

  if (error) {
    return <ClientState title="Не удалось загрузить клиента" description={error.message} actionLabel="Повторить" onAction={clientQuery.retry} />;
  }

  if (notFound || !client) {
    return <ClientState title="Клиент не найден" actionLabel="К списку клиентов" onAction={() => router.replace("/clients")} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation
        title={client.name}
        onBack={() => router.back()}
        trailingSlot={
          <Button
            type="tertiary"
            size="mediumIcon"
            accessibilityLabel="Удалить клиента"
            state={isDeleting ? "loading" : "active"}
            onPress={openDeleteModal}
            icon={<Icon name="trash" size={theme.sizes.navigationIcon} color={theme.colors.status.negative} />}
          />
        }
      />

      <ScrollView contentContainerStyle={styles.content} {...scrollProps}>
        <View style={styles.topSection}>
          <View style={[styles.listGroup, styles.clientDataGroup]}>
            <ListItemCell
              title="Данные клиента"
              subtitle="Имя, контакты, анкета, цель и заметки"
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
            <View style={[styles.section, styles.restrictionsSection]}>
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
                  onPress={() => router.push({ pathname: "/sessions/[sessionId]/summary", params: { sessionId: session.id, from: "client" } })}
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

      <Modal
        visible={deleteModalVisible}
        presentation="overlay"
        title="Удалить клиента?"
        subline={client.name}
        subheader="Будут удалены карточка клиента, его тренировки, история и связанные результаты."
        description="Это действие нельзя отменить."
        actionLayout="stacked"
        primaryAction={{
          label: "Удалить",
          type: "destructive",
          state: isDeleting ? "loading" : "active",
          onPress: () => {
            void confirmDeleteClient();
          }
        }}
        secondaryAction={{
          label: "Отмена",
          type: "secondaryNeutral",
          disabled: isDeleting,
          onPress: closeDeleteModal
        }}
        onClose={isDeleting ? undefined : closeDeleteModal}
      >
        {removeClientMutation.error ? <Text style={styles.deleteError}>{removeClientMutation.error.message}</Text> : null}
      </Modal>
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

function ClientState({
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
      <Navigation title="Профиль" onBack={() => router.back()} />
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
  restrictionsSection: {
    paddingBottom: theme.spacing.lg
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
  clientDataGroup: {
    borderRadius: theme.radius.lg
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs
  },
  emptyPanel: {
    marginTop: theme.spacing.sm,
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
  },
  deleteError: {
    ...theme.typography.body.sm,
    color: theme.colors.status.negative
  }
});
