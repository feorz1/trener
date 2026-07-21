import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountDeletionCleanupPendingError, useAuth } from "@/auth";
import { Alert, Button, Divider, Header, Icon, ListItemCell, Modal, Radio } from "@/components/ui";
import { theme, useAppTheme, type ThemePreference } from "@/theme";

const themeOptions: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: "system", label: "Системная", description: "Следует настройкам устройства" },
  { value: "light", label: "Светлая", description: "Всегда светлое оформление" },
  { value: "dark", label: "Тёмная", description: "Всегда тёмное оформление" }
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const { state, logout, deleteAccount } = useAuth();
  const { preference, setPreference } = useAppTheme();
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [appearanceVisible, setAppearanceVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cleanupPending, setCleanupPending] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const user = state.user;
  const profileEmail = user?.email || "Почта не указана";
  const appearanceLabel = themeOptions.find((option) => option.value === preference)?.label ?? "Системная";
  const selectTheme = (nextPreference: ThemePreference) => {
    setAppearanceVisible(false);
    void setPreference(nextPreference);
  };
  const openDeleteAccountModal = () => {
    if (isDeleting) return;
    setCleanupPending(false);
    setDeleteAccountError(null);
    setDeleteAccountVisible(true);
  };
  const closeDeleteAccountModal = () => {
    if (isDeleting || cleanupPending) return;
    setDeleteAccountError(null);
    setDeleteAccountVisible(false);
  };
  const confirmDeleteAccount = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteAccountError(null);

    try {
      await deleteAccount();
    } catch (error) {
      const isCleanupPending = error instanceof AccountDeletionCleanupPendingError;
      setCleanupPending(isCleanupPending);
      setDeleteAccountError(
        isCleanupPending
          ? error.message
          : "Не удалось удалить аккаунт. Проверьте подключение и попробуйте ещё раз."
      );
      setIsDeleting(false);
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
            onPress={() => setAppearanceVisible(true)}
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
            trailingSlot={<Button label="Выйти" type="secondaryNeutral" size="small" onPress={() => setLogoutVisible(true)} />}
            groupPosition="single"
          />
        </View>

        <Divider width="fill" tone="canvasSoft" />

        <View style={styles.section}>
          <Header title="Удаление аккаунта" showSubtitle={false} size="lg" style={styles.sectionHeader} />
          <ListItemCell
            title="Удалить аккаунт"
            subtitle="Аккаунт и связанные данные будут удалены."
            showSubtitle
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
                onPress={openDeleteAccountModal}
              />
            }
            groupPosition="single"
          />
        </View>
      </ScrollView>
      <Modal
        visible={appearanceVisible}
        presentation="overlay"
        title="Оформление"
        showSubline={false}
        showBodyText={false}
        showActions={false}
        onClose={() => setAppearanceVisible(false)}
      >
        <View style={styles.themeOptions}>
          {themeOptions.map((option, index) => (
            <ListItemCell
              key={option.value}
              title={option.label}
              subtitle={option.description}
              showSubtitle
              leading="none"
              selected={preference === option.value}
              trailingSlot={
                <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
                  <Radio selected={preference === option.value} showLabel={false} />
                </View>
              }
              groupPosition={index === 0 ? "first" : index === themeOptions.length - 1 ? "last" : "middle"}
              surface="canvasSoft"
              accessibilityLabel={`${option.label}. ${option.description}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: preference === option.value }}
              onPress={() => selectTheme(option.value)}
            />
          ))}
        </View>
      </Modal>
      <Modal
        visible={logoutVisible}
        presentation="overlay"
        title="Выйти из аккаунта?"
        showSubline={false}
        description="Вы выйдете из аккаунта на этом устройстве."
        primaryAction={{
          label: "Выйти",
          type: "destructive",
          onPress: () => {
            setLogoutVisible(false);
            void logout();
          }
        }}
        secondaryAction={{
          label: "Отмена",
          type: "secondaryNeutral",
          onPress: () => setLogoutVisible(false)
        }}
        actionLayout="stacked"
        onClose={() => setLogoutVisible(false)}
      />
      <Modal
        visible={deleteAccountVisible}
        presentation="overlay"
        title="Удалить аккаунт?"
        showSubline={false}
        subheader="Будут удалены аккаунт, клиенты, тренировки, история, результаты и локальные данные."
        description="Это действие нельзя отменить."
        primaryAction={{
          label: cleanupPending ? "Повторить очистку" : "Удалить аккаунт",
          type: "destructive",
          state: isDeleting ? "loading" : "active",
          onPress: () => {
            void confirmDeleteAccount();
          }
        }}
        secondaryAction={{
          label: "Отмена",
          type: "secondaryNeutral",
          disabled: isDeleting || cleanupPending,
          onPress: closeDeleteAccountModal
        }}
        actionLayout="stacked"
        showCloseButton={!isDeleting && !cleanupPending}
        onClose={isDeleting || cleanupPending ? undefined : closeDeleteAccountModal}
      >
        {deleteAccountError ? (
          <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Alert tone="negative" layout="compact" width="fill" title={deleteAccountError} />
          </View>
        ) : null}
      </Modal>
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
  },
  themeOptions: {
    alignSelf: "stretch",
    gap: theme.spacing.xxs
  }
});
