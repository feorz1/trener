import { router, useNavigation } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AccountDeletionCleanupPendingError, useAuth } from "@/auth";
import { Alert, Modal } from "@/components/ui";
import { theme } from "@/theme";

export default function DeleteAccountSheet() {
  const navigation = useNavigation();
  const { deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [cleanupPending, setCleanupPending] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const dismissBlocked = isDeleting || cleanupPending;

  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: !dismissBlocked });
  }, [dismissBlocked, navigation]);

  const closeSheet = () => {
    if (dismissBlocked) return;
    setDeleteAccountError(null);
    router.back();
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
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Удалить аккаунт?"
        showSubline={false}
        subheader="Будут удалены аккаунт, клиенты, тренировки, история, результаты и локальные данные."
        description="Это действие нельзя отменить."
        primaryAction={{
          label: cleanupPending ? "Повторить удаление" : "Удалить аккаунт",
          type: "destructive",
          state: isDeleting ? "loading" : "active",
          onPress: () => {
            void confirmDeleteAccount();
          }
        }}
        secondaryAction={{
          label: "Отмена",
          type: "secondaryNeutral",
          disabled: dismissBlocked,
          onPress: closeSheet
        }}
        actionLayout="stacked"
        showCloseButton={!dismissBlocked}
        onClose={dismissBlocked ? undefined : closeSheet}
        style={styles.modal}
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
  screen: {
    width: "100%",
    backgroundColor: theme.colors.background.canvas
  },
  modal: {
    width: "100%"
  }
});
