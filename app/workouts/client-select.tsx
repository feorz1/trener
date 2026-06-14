import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ListItemCell, Modal, Radio } from "@/components/ui";
import { mockClients } from "@/data/mockClients";
import { theme } from "@/theme";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function WorkoutClientSelectSheet() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const selectedDate = firstParam(date);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();

  const closeSheet = () => {
    router.back();
  };

  const chooseClient = () => {
    if (!selectedClientId) return;

    router.dismissAll();
    router.push({
      pathname: "/workouts/new",
      params: {
        clientId: selectedClientId,
        ...(selectedDate ? { date: selectedDate } : {})
      }
    });
  };

  const createNewClient = () => {
    router.dismissAll();
    router.push({
      pathname: "/clients/new",
      params: {
        returnTo: "/workouts/new",
        ...(selectedDate ? { date: selectedDate } : {})
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
        {mockClients.map((client) => {
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
