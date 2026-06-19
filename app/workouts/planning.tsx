import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ListItemCell, Modal } from "@/components/ui";
import { useWorkoutActions } from "@/data";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutPlanningSheet() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = firstParam(date);
  const workouts = useWorkoutActions();

  const closeSheet = () => {
    router.back();
  };

  const createNewWorkout = async () => {
    const draft = await workouts.createDraft({
      startsAt: selectedDate ? new Date(selectedDate).toISOString() : undefined
    });

    router.push({
      pathname: "/workouts/client-select",
      params: { draftId: draft.id }
    });
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
        <ListItemCell
          title="Создать новую"
          leading="avatar"
          avatarType="icon"
          leadingIconName="edit"
          trailing="icon"
          trailingIconName="chevron right"
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
  }
});
