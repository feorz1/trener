import { StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth";
import { Button, Header, ListItemCell } from "@/components/ui";
import { theme } from "@/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const { state, signOut } = useAuth();

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Header title="Настройки" showSubtitle={false} size="xl" style={styles.header} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          <View style={styles.listGroup}>
            <ListItemCell
              title="Тренер"
              subtitle="Профиль будет доступен позже"
              leading="avatar"
              avatarType="icon"
              leadingIconName="user"
              trailing="none"
              disabled
              groupPosition="single"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Основные параметры</Text>
          <View style={styles.listGroup}>
            <ListItemCell
              title="Уведомления"
              subtitle="Будет доступно позже"
              leading="icon"
              leadingIconName="bell"
              trailing="switch"
              selected={false}
              disabled
              groupPosition="first"
            />
            <ListItemCell
              title="Автозапуск таймера"
              subtitle="Будет доступно позже"
              leading="icon"
              leadingIconName="clock"
              trailing="switch"
              selected={false}
              disabled
              groupPosition="middle"
            />
            <ListItemCell title="Единицы измерения" subtitle="Будет доступно позже" leading="icon" leadingIconName="chart" trailing="text" trailingText="кг / см" disabled groupPosition="middle" />
            <ListItemCell title="Тема" subtitle="Будет доступно позже" leading="icon" leadingIconName="settings" trailing="text" trailingText="Системная" disabled groupPosition="last" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Доступ</Text>
          <View style={styles.authPanel}>
            <Text style={styles.authTitle}>{state.session?.displayName ?? "Локальный тренер"}</Text>
            <Text style={styles.authCopy}>Локальные данные сохранятся после выхода.</Text>
            <Button label="Выйти" type="secondaryNeutral" size="large" width="fill" onPress={() => void signOut({ mode: "preserve_local_data" })} />
          </View>
        </View>
      </View>
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
  },
  authPanel: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  authTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  authCopy: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  }
});
