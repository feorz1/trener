import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Header, ListItemCell, getListItemCellGroupPosition } from "@/components/ui";
import { useClients } from "@/data";
import { theme } from "@/theme";

export default function ClientsScreen() {
  const { clients } = useClients();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);

  const openNewClient = () => {
    router.push("/clients/new");
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Header title="Клиенты" showSubtitle={false} size="xl" style={styles.header} />
          <Button label="Новый" type="secondaryNeutral" size="medium" style={styles.headerButton} onPress={openNewClient} accessibilityLabel="Создать клиента" />
        </View>

        <View style={styles.listFrame}>
          {clients.map((client, index) => (
            <ListItemCell
              key={client.id}
              title={client.name}
              subtitle={client.goal}
              leading="none"
              trailing="icon"
              trailingIconName="chevron right"
              density="compact"
              surface="canvasSoft"
              groupPosition={getListItemCellGroupPosition(index, clients.length)}
              onPress={() => router.push({ pathname: "/clients/[clientId]", params: { clientId: client.id } })}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  body: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing["3xl"] + theme.spacing["3xl"]
  },
  headerRow: {
    minHeight: theme.sizes.buttonSmHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  header: {
    flex: 1,
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing[0],
    paddingBottom: theme.spacing[0]
  },
  headerButton: {
    height: theme.sizes.buttonSmHeight,
    minHeight: theme.sizes.buttonSmHeight
  },
  listFrame: {
    width: "100%",
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvasSoft
  }
});
