import { router } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth";
import { Button, Divider, Header, Icon, ListItemCell } from "@/components/ui";
import { releaseLinks } from "@/config/releaseLinks";
import { getThemePreferenceLabel } from "@/features/settings/themeOptions";
import { theme, useAppTheme } from "@/theme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const { state } = useAuth();
  const { preference } = useAppTheme();
  const user = state.user;
  const profileEmail = user?.email || "Почта не указана";
  const appearanceLabel = getThemePreferenceLabel(preference);

  const openReleaseLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Не удалось открыть ссылку", "Проверьте подключение к интернету и попробуйте ещё раз.");
    }
  };

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Header title="Настройки" showSubtitle={false} size="xl" style={styles.screenHeader} />

        <View style={styles.section}>
          <Header title="Основное" showSubtitle={false} size="lg" style={styles.sectionHeader} />
          <ListItemCell
            title="Оформление"
            showSubtitle={false}
            leading="avatar"
            avatarType="icon"
            leadingIconName="positive"
            density="compact"
            trailingSlot={
              <View style={styles.appearanceTrailing}>
                <Text style={styles.appearanceValue}>{appearanceLabel}</Text>
                <Icon name="chevron right" size={theme.sizes.listItemCellIcon} color={theme.colors.content.inkDeep} />
              </View>
            }
            groupPosition="single"
            accessibilityLabel={`Оформление, ${appearanceLabel.toLowerCase()}`}
            accessibilityHint="Открывает выбор темы приложения"
            onPress={() => router.push("/settings/appearance")}
          />
        </View>

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.section}>
          <Header title="Профиль" showSubtitle={false} size="lg" style={styles.sectionHeader} />
          <ListItemCell
            eyebrow="Почта"
            title={profileEmail}
            showEyebrow
            showSubtitle={false}
            leading="avatar"
            avatarType="icon"
            leadingIconName="user"
            trailingSlot={<Button label="Выйти" type="secondaryNeutral" size="small" onPress={() => router.push("/settings/logout")} />}
            groupPosition="first"
          />
          <ListItemCell
            title="Данные аккаунта"
            showSubtitle={false}
            leading="avatar"
            avatarType="icon"
            leadingIconName="trash"
            density="compact"
            trailingSlot={
              <Button
                label="Удалить"
                accessibilityLabel="Удалить аккаунт"
                type="destructive"
                size="small"
                onPress={() => router.push("/settings/delete-account")}
              />
            }
            groupPosition="last"
          />
        </View>

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.section}>
          <Header title="Помощь и документы" showSubtitle={false} size="lg" style={styles.sectionHeader} />
          <ListItemCell
            title="Политика конфиденциальности"
            showSubtitle={false}
            leading="avatar"
            avatarType="icon"
            leadingIconName="document"
            trailing="icon"
            trailingIconName="chevron right"
            density="compact"
            groupPosition="first"
            accessibilityHint="Открывает политику конфиденциальности во внешнем браузере"
            onPress={() => void openReleaseLink(releaseLinks.privacyPolicyUrl)}
          />
          <ListItemCell
            title="Поддержка"
            showSubtitle={false}
            leading="avatar"
            avatarType="icon"
            leadingIconName="question circle"
            trailing="icon"
            trailingIconName="chevron right"
            density="compact"
            groupPosition="last"
            accessibilityHint="Открывает страницу поддержки во внешнем браузере"
            onPress={() => void openReleaseLink(releaseLinks.supportUrl)}
          />
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
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing["3xl"] + theme.spacing["3xl"]
  },
  screenHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing[0],
    paddingBottom: theme.spacing[0]
  },
  section: {
    gap: theme.spacing.xxs
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm
  },
  appearanceTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg
  },
  appearanceValue: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  }
});
