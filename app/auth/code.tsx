import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Input, Navigation } from "@/components/ui";
import { useAuth } from "@/auth";
import { theme } from "@/theme";

const RESEND_SECONDS = 60;

export default function EmailCodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const insets = useSafeAreaInsets();
  const { state, verifyEmailCode, resendEmailCode, clearAuthError } = useAuth();
  const email = params.email ?? state.pendingEmail ?? "";
  const lastSubmittedCodeRef = useRef<string | null>(null);
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const topInset = Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0);
  const loading = state.status === "authenticating";
  const codeReady = code.length === 6;
  const inputState = state.error || (submitted && !codeReady) ? "error" : code ? "default" : "empty";
  const message = submitted && !codeReady ? "Введите 6 цифр" : state.error?.message;
  const subtitle = useMemo(() => `Мы отправили код на ${email}`, [email]);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const submitCode = useCallback(
    async (nextCode = code) => {
      const normalizedCode = nextCode.replace(/\D/g, "").slice(0, 6);
      const submissionKey = `${email}:${normalizedCode}`;

      setSubmitted(true);
      if (normalizedCode.length !== 6 || !email || loading || lastSubmittedCodeRef.current === submissionKey) return;

      lastSubmittedCodeRef.current = submissionKey;
      try {
        await verifyEmailCode(email, normalizedCode);
      } catch {
        return;
      }
    },
    [code, email, loading, verifyEmailCode]
  );

  useEffect(() => {
    if (!codeReady) return;
    void submitCode(code);
  }, [code, codeReady, submitCode]);

  const resend = async () => {
    if (!email || secondsLeft > 0) return;
    try {
      await resendEmailCode(email);
      lastSubmittedCodeRef.current = null;
      setCode("");
      setSubmitted(false);
      setSecondsLeft(RESEND_SECONDS);
    } catch {
      return;
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.root, { paddingTop: topInset }]}>
      <Navigation title="" showSubtitle={false} onBack={() => router.back()} backAccessibilityLabel="Назад" style={styles.navigation} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Введите код</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <Input
          label="Код"
          showLabel={false}
          width="fill"
          value={code}
          state={inputState}
          message={message}
          showMessage={Boolean(message)}
          placeholder="6-значный код"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          onChangeText={(value) => {
            const nextCode = value.replace(/\D/g, "").slice(0, 6);
            if (state.error) clearAuthError();
            if (nextCode !== code) {
              lastSubmittedCodeRef.current = null;
              setSubmitted(false);
            }
            setCode(nextCode);
          }}
          onSubmitEditing={() => void submitCode()}
        />

        <View style={styles.actions}>
          <Button
            label={secondsLeft > 0 ? `Отправить код ещё раз через ${secondsLeft}` : "Отправить код ещё раз"}
            type="secondaryNeutral"
            size="large"
            width="fill"
            disabled={secondsLeft > 0}
            state={secondsLeft > 0 ? "disabled" : "active"}
            onPress={() => void resend()}
          />
          <Button label="Изменить почту" type="tertiary" size="large" width="fill" onPress={() => router.replace("/auth/email")} />
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
  actions: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg
  }
});
