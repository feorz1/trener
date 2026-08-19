import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import Sortable from "react-native-sortables";
import { AuthProvider, AuthRouteBoundary, useAuth } from "@/auth";
import { authConfig } from "@/auth/config";
import { Button, Icon } from "@/components/ui";
import { DataProvider, useDataContext } from "@/data";
import { createDataApi } from "@/data/api/dataApi";
import { fetchBootstrapState } from "@/data/remote/bootstrap";
import { AppSplashScreen } from "@/features/splash/AppSplashScreen";
import { reportAppError } from "@/observability";
import { ThemeProvider, theme, useAppTheme } from "@/theme";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportAppError({
      category: "ui",
      code: "root_render_failed",
      error,
      fatal: true,
      attributes: { phase: "root_boundary" }
    });
  }, [error]);

  return (
    <View style={styles.errorRoot} accessible accessibilityRole="alert">
      <View style={styles.errorContent}>
        <View style={styles.errorIcon}>
          <Icon name="warning circle" size={theme.sizes.buttonIconMedium} color={theme.colors.status.warningDeep} />
        </View>
        <Text style={styles.errorTitle}>Что-то пошло не так</Text>
        <Text style={styles.errorMessage}>Перезапустите экран. Ваши сохранённые данные останутся на устройстве.</Text>
        <Button label="Попробовать снова" type="secondary" size="large" width="fill" onPress={retry} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRootLayout />
    </ThemeProvider>
  );
}

function ThemedRootLayout() {
  const { isHydrated } = useAppTheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {isHydrated ? (
          <AuthProvider>
            <RootAppShell />
          </AuthProvider>
        ) : (
          <AppSplashScreen />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootAppShell() {
  const { state, authorizedFetch } = useAuth();
  const { resolvedColorScheme, resolvedColors } = useAppTheme();
  const currentOwnerId = state.user?.id ?? "__unauthenticated__";
  const dataApi = useMemo(() => (state.isAuthenticated ? createDataApi({ baseUrl: authConfig.apiBaseUrl, authorizedFetch }) : undefined), [authorizedFetch, state.isAuthenticated]);
  const bootstrapRemoteData = useCallback(
    () => fetchBootstrapState({ baseUrl: authConfig.apiBaseUrl, authorizedFetch, ownerId: currentOwnerId }),
    [authorizedFetch, currentOwnerId]
  );
  const appStack = (
    <>
      <StatusBar
        style={resolvedColorScheme === "dark" ? "light" : "dark"}
        backgroundColor={resolvedColors.background.canvasSoft}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "simple_push",
          contentStyle: { backgroundColor: theme.colors.background.canvasSoft }
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="auth/email" />
        <Stack.Screen name="auth/code" />
        <Stack.Screen name="auth/connection-error" />
        <Stack.Screen
          name="settings/appearance"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="settings/logout"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="settings/delete-account"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/planning"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/client-select"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/date-select"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/repeat-select"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/slot-select"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/reschedule-slot-select"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/reschedule-date-select"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
      </Stack>
    </>
  );

  return (
    <DataProvider
      key={currentOwnerId}
      currentOwnerId={currentOwnerId}
      bootstrapRemoteData={state.isAuthenticated ? bootstrapRemoteData : undefined}
      dataApi={dataApi}
    >
      <AccountDeletionLifecycleBridge />
      <KeyboardProvider>
        <AuthRouteBoundary>{Platform.OS === "web" ? appStack : <Sortable.PortalProvider>{appStack}</Sortable.PortalProvider>}</AuthRouteBoundary>
      </KeyboardProvider>
    </DataProvider>
  );
}

function AccountDeletionLifecycleBridge() {
  const { state, registerAccountDeletionCleanup } = useAuth();
  const { currentOwnerId, prepareAccountDeletion, clearAccountData, rollbackAccountDeletion } = useDataContext();

  useEffect(() => {
    if (!state.user || state.user.id !== currentOwnerId) return undefined;
    return registerAccountDeletionCleanup({
      ownerId: currentOwnerId,
      prepare: prepareAccountDeletion,
      commit: clearAccountData,
      rollback: rollbackAccountDeletion
    });
  }, [clearAccountData, currentOwnerId, prepareAccountDeletion, registerAccountDeletionCleanup, rollbackAccountDeletion, state.user]);

  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.canvasSoft
  },
  errorRoot: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: theme.colors.background.canvas,
    padding: theme.spacing.xl
  },
  errorContent: {
    alignItems: "center",
    gap: theme.spacing.lg
  },
  errorIcon: {
    width: theme.sizes.avatarLg,
    height: theme.sizes.avatarLg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.status.warningDeepSoft
  },
  errorTitle: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  errorMessage: {
    ...theme.typography.body.md,
    color: theme.colors.content.body,
    textAlign: "center"
  }
});
