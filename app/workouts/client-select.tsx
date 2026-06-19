import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ListItemCell, Modal, Radio } from "@/components/ui";
import { useClients, useWorkoutActions, useWorkoutDraft } from "@/data";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutClientSelectSheet() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();
  const draftIdValue = firstParam(draftId);
  const { clients } = useClients();
  const { draft } = useWorkoutDraft(draftIdValue);
  const workouts = useWorkoutActions();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  const closeSheet = () => {
    router.back();
  };

  const chooseClient = async () => {
    if (!selectedClientId || !draftIdValue || !draft) return;

    await workouts.setDraftClient(draftIdValue, selectedClientId);

    router.dismissAll();
    router.push({
      pathname: "/workouts/schedule",
      params: {
        draftId: draftIdValue
      }
    });
  };

  const createNewClient = () => {
    router.dismissAll();
    router.push({
      pathname: "/clients/new",
      params: {
        returnTo: "/workouts/schedule",
        ...(draftIdValue ? { draftId: draftIdValue } : {})
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
        primaryAction={{ label: "Выбрать", type: "primary", disabled: !selectedClientId, onPress: chooseClient }}
        secondaryAction={{ label: "Создать нового клиента", type: "secondaryNeutral", onPress: createNewClient }}
        onClose={closeSheet}
        bodyStyle={styles.body}
        style={styles.modal}
      >
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
  }
});
