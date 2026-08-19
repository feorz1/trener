import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CalendarMonth } from "@/components/calendar";
import { Modal } from "@/components/ui";
import { getDateKey, parseDateKey, startOfDay } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function RescheduleDateSelectSheet() {
  const { workoutId, selectedDate } = useLocalSearchParams<{
    workoutId?: string;
    selectedDate?: string;
  }>();
  const workoutIdValue = firstParam(workoutId);
  const initialDate = useMemo(() => parseDateKey(firstParam(selectedDate)), [selectedDate]);
  const [pendingDate, setPendingDate] = useState(initialDate);

  const closeSheet = () => {
    router.back();
  };

  const saveDate = () => {
    if (!workoutIdValue) return;

    router.dismissTo({
      pathname: "/workouts/[workoutId]/reschedule",
      params: {
        workoutId: workoutIdValue,
        rescheduleDate: getDateKey(pendingDate),
        rescheduleTime: ""
      }
    });
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Дата"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="single"
        primaryAction={{ label: "Сохранить", type: "primary", onPress: saveDate }}
        onClose={closeSheet}
        actionStyle={styles.action}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        <CalendarMonth
          minDate={startOfDay(new Date())}
          selectedKey={getDateKey(pendingDate)}
          onSelect={(_, date) => setPendingDate(startOfDay(date))}
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
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs
  },
  action: {
    padding: theme.spacing.lg
  }
});
