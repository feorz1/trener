import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useAuth } from "@/auth";
import { Modal } from "@/components/ui";
import { theme } from "@/theme";

export default function LogoutSheet() {
  const { logout } = useAuth();

  const confirmLogout = () => {
    router.back();
    void logout();
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Выйти из аккаунта?"
        showSubline={false}
        showBodyText={false}
        primaryAction={{ label: "Выйти", type: "destructive", onPress: confirmLogout }}
        secondaryAction={{ label: "Отмена", type: "secondaryNeutral", onPress: () => router.back() }}
        actionLayout="stacked"
        onClose={() => router.back()}
        style={styles.modal}
      />
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
