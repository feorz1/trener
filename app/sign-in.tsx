import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { Alert, Button } from "@/components/ui";
import { useAuth } from "@/auth";
import { theme } from "@/theme";

export default function SignInScreen() {
  const { state, signInDevelopment } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const copy = useMemo(() => {
    if (state.signedOutReason === "expired") return "Сессия истекла. Войдите снова, чтобы продолжить локальную работу.";
    if (state.signedOutReason === "provider_unavailable") return "Провайдер авторизации пока не подключен. Доступен локальный режим разработки.";
    return "Провайдер авторизации пока не выбран. Используйте локальный вход для разработки.";
  }, [state.signedOutReason]);

  return (
    <View style={[styles.safeArea, { paddingTop: topInset }]}>
      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.eyebrow}>Trainer</Text>
          <Text style={styles.title}>Вход тренера</Text>
          <Text style={styles.copy}>{copy}</Text>
        </View>

        <Alert tone={state.signedOutReason === "expired" ? "warning" : "neutral"} layout="expanded" width="fill" title="Локальный режим" description="Данные остаются на устройстве. Реальный auth provider ожидает продуктового решения." />

        <Button label="Войти локально" type="primary" size="large" width="fill" onPress={() => void signInDevelopment()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: theme.spacing.xl,
    padding: theme.spacing.xl
  },
  titleGroup: {
    gap: theme.spacing.sm
  },
  eyebrow: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.body
  },
  title: {
    ...theme.typography.display.sm,
    color: theme.colors.content.ink
  },
  copy: {
    ...theme.typography.body.md,
    color: theme.colors.content.body
  }
});
