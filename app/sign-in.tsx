import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { Button } from "@/components/ui";
import { useAuth } from "@/auth";
import { theme } from "@/theme";

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const bottomInset = Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0);
  const providers = state.providers;
  const loading = state.status === "authenticating";

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.appIcon}>
          <Svg width="100%" height="100%" viewBox="0 0 95 95" fill="none">
            <Rect width="95" height="95" rx={theme.radius.xl} fill={theme.colors.content.primary} />
            <Path
              d="M46.6852 68.2048C41.8734 68.2048 38.4097 67.1263 36.2941 64.9692C34.7178 63.3929 33.9297 61.2774 33.9297 58.6226C33.9297 57.7515 34.0127 56.8181 34.1786 55.8226L38.4097 31.7426L49.7964 27.0137L47.9919 37.4048H65.1652L63.6097 46.1781H46.4364L45.1919 53.2092C45.026 53.9974 44.943 54.7026 44.943 55.3248C44.943 57.9381 46.1875 59.2448 48.6764 59.2448C50.0038 59.2448 51.103 58.6848 51.9741 57.5648C52.8867 56.4448 53.5089 54.9514 53.8408 53.0848H64.1697C62.4275 63.1648 56.5993 68.2048 46.6852 68.2048Z"
              fill={theme.colors.content.onPrimary}
            />
          </Svg>
        </View>
      </View>

      <View style={[styles.sheet, { paddingBottom: Math.max(theme.spacing["3xl"], bottomInset + theme.spacing.lg) }]}>
        <View style={styles.sheetContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Войдите в аккаунт</Text>
            <Text style={styles.subtitle}>Чтобы создавать тренировки, смотреть аналитику и многое другое</Text>
          </View>

          {providers?.email !== false ? (
            <View style={styles.buttonWrap}>
              <Button
                label="Войти по почте"
                type="secondary"
                size="large"
                width="fill"
                state={loading ? "loading" : "active"}
                onPress={() => router.push("/auth/email")}
              />
            </View>
          ) : null}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.content.inkDeep
  },
  hero: {
    flex: 1,
    minHeight: theme.sizes.splashIconSize * 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.content.inkDeep
  },
  appIcon: {
    width: theme.sizes.splashIconSize,
    height: theme.sizes.splashIconSize,
    borderRadius: theme.radius.xl,
    overflow: "hidden"
  },
  sheet: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  sheetContent: {
    paddingBottom: theme.spacing.lg
  },
  header: {
    gap: theme.spacing.xxs,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md
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
  },
});
