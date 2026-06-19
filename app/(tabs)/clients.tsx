import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Button, Header, ListItemCell, getListItemCellGroupPosition } from "@/components/ui";
import { useClients } from "@/data";
import { theme } from "@/theme";

export default function ClientsScreen() {
  const { clients } = useClients();
  const activeClientsCount = clients.filter((client) => client.status === "active").length;
  const averageAttendanceRate = clients.length > 0 ? Math.round(clients.reduce((total, client) => total + client.metrics.attendanceRate, 0) / clients.length) : 0;

  const openNewClient = () => {
    router.push("/clients/new");
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Header title="Клиенты" showSubtitle={false} size="xl" style={styles.header} />
          <Button label="Новый" type="secondaryNeutral" size="medium" style={styles.headerButton} onPress={openNewClient} accessibilityLabel="Создать клиента" />
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Активные</Text>
            <Text style={styles.metricValue}>{activeClientsCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Посещаемость</Text>
            <Text style={styles.metricValue}>{averageAttendanceRate}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Список клиентов</Text>
            <Badge label={`${clients.length}`} tone="primary" size="s" icon={false} />
          </View>
          <View style={styles.listGroup}>
            {clients.map((client, index) => (
              <ListItemCell
                key={client.id}
                title={client.name}
                subtitle={client.goal}
                leading="avatar"
                avatarType="initials"
                avatarInitials={client.avatarInitials}
                trailing="text"
                trailingText={`${client.metrics.attendanceRate}%`}
                groupPosition={getListItemCellGroupPosition(index, clients.length)}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
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
    paddingVertical: theme.spacing.sm
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
  metricsRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  metricCard: {
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  metricLabel: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.body
  },
  metricValue: {
    ...theme.typography.display.xs,
    color: theme.colors.content.inkDeep
  },
  section: {
    gap: theme.spacing.sm
  },
  sectionHeader: {
    minHeight: theme.sizes.buttonSmHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  sectionTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink
  },
  listGroup: {
    gap: theme.spacing.xxs
  }
});
