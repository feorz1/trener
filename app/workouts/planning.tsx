import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ListItemCell, Modal } from "@/components/ui";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutPlanningSheet() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = firstParam(date);

  const closeSheet = () => {
    router.back();
  };

  const createNewWorkout = () => {
    router.push({
      pathname: "/workouts/client-select",
      params: selectedDate ? { date: selectedDate } : {}
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
          leading="avatar"
          avatarType="icon"
          leadingIconName="list"
          trailing="icon"
          trailingIconName="chevron right"
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
