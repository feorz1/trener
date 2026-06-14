import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Checkbox, getListItemCellSelectedGroupPosition, ListItemCell, Modal } from "@/components/ui";
import { parseRepeatDays, repeatOptions, type RepeatDay } from "@/features/workouts/scheduleOptions";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutRepeatSelectSheet() {
  const { clientId, clientName, date, exerciseIds, scheduleDate, scheduleTime, scheduleDateConfirmed, scheduleRepeatDays } = useLocalSearchParams<{
    clientId?: string;
    clientName?: string;
    date?: string;
    exerciseIds?: string;
    scheduleDate?: string;
    scheduleTime?: string;
    scheduleDateConfirmed?: string;
    scheduleRepeatDays?: string;
  }>();
  const [selectedDays, setSelectedDays] = useState<RepeatDay[]>(() => parseRepeatDays(firstParam(scheduleRepeatDays)));

  const closeSheet = () => {
    router.back();
  };

  const toggleRepeatDay = (day: RepeatDay) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const saveRepeat = () => {
    router.dismissTo({
      pathname: "/workouts/schedule",
      params: {
        ...(firstParam(clientId) ? { clientId: firstParam(clientId) } : {}),
        ...(firstParam(clientName) ? { clientName: firstParam(clientName) } : {}),
        ...(firstParam(date) ? { date: firstParam(date) } : {}),
        ...(firstParam(exerciseIds) ? { exerciseIds: firstParam(exerciseIds) } : {}),
        ...(firstParam(scheduleDate) ? { scheduleDate: firstParam(scheduleDate) } : {}),
        ...(firstParam(scheduleTime) ? { scheduleTime: firstParam(scheduleTime) } : {}),
        ...(firstParam(scheduleDateConfirmed) ? { scheduleDateConfirmed: firstParam(scheduleDateConfirmed) } : {}),
        scheduleRepeatDays: selectedDays.join(",")
      }
    });
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Повтор"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        actionLayout="single"
        primaryAction={{ label: "Сохранить", type: "primary", onPress: saveRepeat }}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        {repeatOptions.map((option, index) => {
          const selected = selectedDays.includes(option.key);
          const previousSelected = index > 0 && selectedDays.includes(repeatOptions[index - 1].key);
          const nextSelected = index < repeatOptions.length - 1 && selectedDays.includes(repeatOptions[index + 1].key);

          return (
            <ListItemCell
              key={option.key}
              title={option.label}
              leading="none"
              trailingSlot={<Checkbox selected={selected} showLabel={false} onChange={() => toggleRepeatDay(option.key)} />}
              selected={selected}
              groupPosition={getListItemCellSelectedGroupPosition(selected, previousSelected, nextSelected)}
              onPress={() => toggleRepeatDay(option.key)}
            />
          );
        })}
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
    gap: theme.spacing.xs
  }
});
