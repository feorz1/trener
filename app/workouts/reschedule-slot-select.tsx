import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Modal, Variant } from "@/components/ui";
import { useWorkouts } from "@/data";
import { buildSlotDateTime, getAvailableWorkoutSlots } from "@/features/workouts/availableSlots";
import { getDateKey, isCalendarSlot, parseDateKey, type CalendarSlot } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";
import { formatRuDayMonth } from "@/utils/date";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function RescheduleSlotSelectSheet() {
  const { workoutId, date, selectedSlot } = useLocalSearchParams<{
    workoutId?: string;
    date?: string;
    selectedSlot?: string;
  }>();
  const workoutIdValue = firstParam(workoutId);
  const selectedDate = useMemo(() => parseDateKey(firstParam(date)), [date]);
  const { workouts } = useWorkouts();
  const availableSlots = useMemo(
    () => getAvailableWorkoutSlots({ date: selectedDate, workouts, excludeWorkoutId: workoutIdValue }),
    [selectedDate, workoutIdValue, workouts]
  );
  const slotItems = useMemo(
    () =>
      availableSlots.map((slot) => ({
        key: slot,
        label: slot,
        accessibilityLabel: `Выбрать ${slot}`
      })),
    [availableSlots]
  );
  const initialSlot = firstParam(selectedSlot);
  const [pendingSlot, setPendingSlot] = useState<CalendarSlot | undefined>(() =>
    isCalendarSlot(initialSlot) && availableSlots.includes(initialSlot) ? initialSlot : undefined
  );

  const closeSheet = () => {
    router.back();
  };

  const saveSlot = () => {
    if (!workoutIdValue || !pendingSlot || !buildSlotDateTime(selectedDate, pendingSlot)) return;

    router.dismissTo({
      pathname: "/workouts/[workoutId]/reschedule",
      params: {
        workoutId: workoutIdValue,
        rescheduleDate: getDateKey(selectedDate),
        rescheduleTime: pendingSlot
      }
    });
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title={formatRuDayMonth(selectedDate)}
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="single"
        primaryAction={{ label: "Сохранить", type: "primary", disabled: !pendingSlot, onPress: saveSlot }}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        {slotItems.length > 0 ? (
          <Variant<CalendarSlot>
            label="Свободное время"
            items={slotItems}
            value={pendingSlot}
            columns={4}
            width="fill"
            inset="none"
            showLabel={false}
            onChange={setPendingSlot}
          />
        ) : (
          <Text style={styles.emptySlots}>На эту дату свободных слотов нет.</Text>
        )}
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
    paddingVertical: theme.spacing.xs
  },
  emptySlots: {
    ...theme.typography.body.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.content.body
  }
});
