import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header, ListItemCell } from "@/components/ui";
import { theme } from "@/theme";

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoTimerEnabled, setAutoTimerEnabled] = useState(false);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Header title="Настройки" showSubtitle={false} size="xl" style={styles.header} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          <View style={styles.listGroup}>
            <ListItemCell
              title="Тренер"
              subtitle="Базовый профиль приложения"
              leading="avatar"
              avatarType="icon"
              leadingIconName="user"
              trailing="icon"
              trailingIconName="chevron right"
              groupPosition="single"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Основные параметры</Text>
          <View style={styles.listGroup}>
            <ListItemCell
              title="Уведомления"
              subtitle="Напоминания о тренировках"
              leading="icon"
              leadingIconName="bell"
              trailing="switch"
              selected={notificationsEnabled}
              onSelectedChange={setNotificationsEnabled}
              groupPosition="first"
            />
            <ListItemCell
              title="Автозапуск таймера"
              subtitle="После старта подхода"
              leading="icon"
              leadingIconName="clock"
              trailing="switch"
              selected={autoTimerEnabled}
              onSelectedChange={setAutoTimerEnabled}
              groupPosition="middle"
            />
            <ListItemCell title="Единицы измерения" leading="icon" leadingIconName="chart" trailing="text" trailingText="кг / см" groupPosition="middle" />
            <ListItemCell title="Тема" leading="icon" leadingIconName="settings" trailing="text" trailingText="Системная" groupPosition="last" />
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
  section: {
    gap: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink
  },
  listGroup: {
    gap: theme.spacing.xxs
  }
});
