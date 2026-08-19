import { StyleSheet, Text, View } from "react-native";
import { Button, Icon } from "@/components/ui";
import { useAuth } from "@/auth";
import { theme } from "@/theme";

export default function AuthConnectionErrorScreen() {
  const { state, checkSession, resetAuthStorage } = useAuth();
  const loading = state.status === "checking";
  const networkError = state.error?.code === "network_error";

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Icon name="warning circle" size={theme.sizes.buttonIconMedium} color={theme.colors.status.warningDeep} />
        </View>
        <Text style={styles.title}>Не удалось подключиться</Text>
        <Text style={styles.subtitle}>
          {networkError
            ? "Проверьте интернет и попробуйте ещё раз"
            : "Не удалось восстановить данные входа. Повторите попытку или сбросьте локальную сессию"}
        </Text>
        <Button label="Повторить" type="secondary" size="large" width="fill" state={loading ? "loading" : "active"} onPress={() => void checkSession()} />
        <Button
          label="Сбросить данные входа"
          type="secondaryNeutral"
          size="large"
          width="fill"
          state={loading ? "disabled" : "active"}
          onPress={() => void resetAuthStorage()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.lg,
    padding: theme.spacing.xl
  },
  iconWrap: {
    width: theme.sizes.avatarLg,
    height: theme.sizes.avatarLg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.status.warningDeepSoft
  },
  title: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  subtitle: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  }
});
