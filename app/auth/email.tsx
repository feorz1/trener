import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Navigation } from "@/components/ui";
import { AUTH_ERROR_MESSAGES, isValidEmail, normalizeEmail, useAuth } from "@/auth";
import { theme } from "@/theme";

export default function EmailLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, startEmailLogin, clearAuthError } = useAuth();
  const [email, setEmail] = useState(state.pendingEmail ?? "");
  const [submitted, setSubmitted] = useState(false);
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const valid = isValidEmail(normalizedEmail);
  const loading = state.status === "authenticating";
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const inputState = submitted && !valid ? "error" : email ? "default" : "empty";
  const message = submitted && !valid ? AUTH_ERROR_MESSAGES.invalid_email : state.error?.message;

  const submit = async () => {
    setSubmitted(true);
    if (!valid) return;
    try {
      await startEmailLogin(normalizedEmail);
      router.push("/auth/code");
    } catch {
      return;
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { paddingTop: topInset }]}>
      <Navigation title="" showSubtitle={false} onBack={() => router.back()} backAccessibilityLabel="Назад" style={styles.navigation} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Введите почту для входа</Text>
          <Text style={styles.subtitle}>Она останется между нами</Text>
        </View>

        <Input
          label="Email"
          showLabel={false}
          width="fill"
          value={email}
          state={inputState}
          message={message}
          showMessage={Boolean(message)}
          placeholder="Почта"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          returnKeyType="send"
          showClearButton
          onClear={() => {
            clearAuthError();
            setEmail("");
          }}
          onChangeText={(value) => {
            if (state.error) clearAuthError();
            setEmail(value);
          }}
          onBlur={() => setSubmitted(Boolean(email))}
          onSubmitEditing={() => void submit()}
        />

        <View style={styles.buttonWrap}>
          <Button
            label="Получить код"
            type="secondary"
            size="large"
            width="fill"
            disabled={!valid}
            state={loading ? "loading" : !valid ? "disabled" : "active"}
            onPress={() => void submit()}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  navigation: {
    paddingHorizontal: theme.spacing.lg
  },
  content: {
    flex: 1,
    paddingBottom: theme.spacing.lg
  },
  header: {
    gap: theme.spacing.xxs,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xs
  },
  title: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink
  },
  subtitle: {
    ...theme.typography.body.md,
    color: theme.colors.content.body
  },
  buttonWrap: {
    width: "100%",
    paddingHorizontal: theme.spacing.lg
  }
});
