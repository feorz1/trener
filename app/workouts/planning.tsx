import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Alert, ListItemCell, Modal } from "@/components/ui";
import { useDataMutation, useLatestWorkoutDraft, useWorkoutActions } from "@/data";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutPlanningSheet() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = firstParam(date);
  const workouts = useWorkoutActions();
  const { draft: latestDraft } = useLatestWorkoutDraft();
  const discardDraftMutation = useDataMutation(async () => {
    const workoutList = await workouts.list();
    const drafts = workoutList.filter((workout) => workout.status === "draft");
    await Promise.all(drafts.map((draft) => workouts.discardDraft(draft.id)));
  });
  const actionError = discardDraftMutation.error;
  const isBusy = discardDraftMutation.isSubmitting;
  const visibleLatestDraft = latestDraft;

  const closeSheet = () => {
    router.back();
  };

  const resumeDraft = () => {
    if (!visibleLatestDraft) return;
    router.dismissTo({
      pathname: "/workouts/new",
      params: { draftId: visibleLatestDraft.id }
    });
  };

  const createNewWorkout = async () => {
    if (isBusy) return;
    router.replace({
      pathname: "/workouts/client-select",
      params: selectedDate ? { date: selectedDate } : {}
    });
  };

  const discardLatestDraft = async () => {
    if (!visibleLatestDraft || isBusy) return;
    await discardDraftMutation.mutate().catch(() => null);
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
        {visibleLatestDraft ? (
          <>
            <ListItemCell
              title="Продолжить черновик"
              subtitle={visibleLatestDraft.title}
              leading="avatar"
              avatarType="icon"
              leadingIconName="edit"
              trailing="icon"
              trailingIconName="chevron right"
              disabled={isBusy}
              onPress={resumeDraft}
            />
            <ListItemCell
              title="Удалить черновик"
              subtitle="Черновик будет удален с этого устройства"
              leading="avatar"
              avatarType="icon"
              leadingIconName="close"
              trailing="none"
              disabled={isBusy}
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
          disabled={isBusy}
          onPress={createNewWorkout}
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
