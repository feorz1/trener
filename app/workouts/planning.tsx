import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Alert, ListItemCell, Modal } from "@/components/ui";
import { useDataMutation, useLatestWorkoutDraft, useWorkoutActions } from "@/data";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getSelectedStartIso(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function WorkoutPlanningSheet() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = firstParam(date);
  const workouts = useWorkoutActions();
  const { draft: latestDraft } = useLatestWorkoutDraft();
  const createDraftMutation = useDataMutation(async (startsAt?: string) => workouts.createDraft({ startsAt }));
  const discardDraftMutation = useDataMutation(async (draftId: string) => workouts.discardDraft(draftId));
  const actionError = createDraftMutation.error ?? discardDraftMutation.error;

  const closeSheet = () => {
    router.back();
  };

  const resumeDraft = () => {
    if (!latestDraft) return;
    router.push({
      pathname: "/workouts/new",
      params: { draftId: latestDraft.id }
    });
  };

  const createNewWorkout = async () => {
    if (createDraftMutation.isSubmitting || discardDraftMutation.isSubmitting) return;
    const draft = await createDraftMutation.mutate(getSelectedStartIso(selectedDate)).catch(() => null);
    if (!draft) return;

    router.push({
      pathname: "/workouts/client-select",
      params: { draftId: draft.id }
    });
  };

  const discardLatestDraft = async () => {
    if (!latestDraft || createDraftMutation.isSubmitting || discardDraftMutation.isSubmitting) return;
    await discardDraftMutation.mutate(latestDraft.id).catch(() => null);
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Запланировать тренировку"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        showActions={false}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        {actionError ? <Alert tone="negative" layout="compact" width="fill" title={actionError.message} style={styles.alert} /> : null}
        {latestDraft ? (
          <>
            <ListItemCell
              title="Продолжить черновик"
              subtitle={latestDraft.title}
              leading="avatar"
              avatarType="icon"
              leadingIconName="edit"
              trailing="icon"
              trailingIconName="chevron right"
              disabled={createDraftMutation.isSubmitting || discardDraftMutation.isSubmitting}
              onPress={resumeDraft}
            />
            <ListItemCell
              title="Удалить черновик"
              subtitle="Черновик будет удален с этого устройства"
              leading="avatar"
              avatarType="icon"
              leadingIconName="close"
              trailing="none"
              disabled={createDraftMutation.isSubmitting || discardDraftMutation.isSubmitting}
              onPress={discardLatestDraft}
            />
          </>
        ) : null}
        <ListItemCell
          title="Создать новую"
          leading="avatar"
          avatarType="icon"
          leadingIconName="edit"
          trailing="icon"
          trailingIconName="chevron right"
          disabled={createDraftMutation.isSubmitting || discardDraftMutation.isSubmitting}
          onPress={createNewWorkout}
        />
        <ListItemCell
          title="Выбрать из шаблона"
          subtitle="Будет доступно позже"
          leading="avatar"
          avatarType="icon"
          leadingIconName="list"
          trailing="none"
          disabled
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    backgroundColor: theme.colors.background.canvas
  },
  modal: {
    width: "100%"
  },
  body: {
    gap: theme.spacing[0]
  },
  alert: {
    marginBottom: theme.spacing.sm
  }
});
