import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Alert, ListItemCell, Modal, Radio } from "@/components/ui";
import { useClients, useDataMutation, useWorkoutActions, useWorkoutDraft } from "@/data";
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

export default function WorkoutClientSelectSheet() {
  const { date, draftId } = useLocalSearchParams<{ date?: string; draftId?: string }>();
  const selectedDate = firstParam(date);
  const draftIdValue = firstParam(draftId);
  const { clients } = useClients();
  const { draft } = useWorkoutDraft(draftIdValue);
  const workouts = useWorkoutActions();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const chooseClientMutation = useDataMutation(async (clientId: string) => {
    if (draftIdValue) {
      if (!draft) throw new Error("Черновик не найден");
      await workouts.setDraftClient(draftIdValue, clientId);
      return draftIdValue;
    }

    const createdDraft = await workouts.createDraft({
      clientId,
      startsAt: getSelectedStartIso(selectedDate)
    });
    return createdDraft.id;
  });

  const closeSheet = () => {
    router.back();
  };

  const chooseClient = async () => {
    if (!selectedClientId || chooseClientMutation.isSubmitting) return;

    const nextDraftId = await chooseClientMutation.mutate(selectedClientId).catch(() => null);
    if (!nextDraftId) return;

    router.dismissAll();
    router.push({
      pathname: "/workouts/schedule",
      params: {
        draftId: nextDraftId
      }
    });
  };

  const createNewClient = () => {
    router.dismissAll();
    router.push({
      pathname: "/clients/new",
      params: {
        returnTo: "/workouts/schedule",
        ...(draftIdValue ? { draftId: draftIdValue } : {}),
        ...(!draftIdValue && selectedDate ? { date: selectedDate } : {})
      }
    });
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Выбор клиента"
        showSubline={false}
        showBodyText={false}
        showCloseButton
        showActions
        actionLayout="stacked"
        primaryAction={{ label: "Выбрать", type: "primary", disabled: !selectedClientId || chooseClientMutation.isSubmitting, onPress: chooseClient }}
        secondaryAction={{ label: "Создать нового клиента", type: "secondaryNeutral", onPress: createNewClient }}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
        {chooseClientMutation.error ? <Alert tone="negative" layout="compact" width="fill" title={chooseClientMutation.error.message} style={styles.alert} /> : null}
        {clients.map((client) => {
          const selected = client.id === selectedClientId;

          return (
            <ListItemCell
              key={client.id}
              title={client.name}
              leading="none"
              density="compact"
              trailingSlot={<Radio selected={selected} showLabel={false} onChange={() => setSelectedClientId(client.id)} />}
              onPress={() => setSelectedClientId(client.id)}
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
    gap: theme.spacing[0]
  },
  alert: {
    marginBottom: theme.spacing.sm
  }
});
