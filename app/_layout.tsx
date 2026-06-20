import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import Sortable from "react-native-sortables";
import { DataProvider } from "@/data";
import { theme } from "@/theme";

export default function RootLayout() {
  const appStack = (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "simple_push",
          contentStyle: { backgroundColor: theme.colors.background.canvasSoft }
        }}
      >
        <Stack.Screen
          name="workouts/planning"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetCornerRadius: theme.radius.xl,
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
            sheetCornerRadius: theme.radius.xl,
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
            sheetCornerRadius: theme.radius.xl,
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
            sheetCornerRadius: theme.radius.xl,
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
            sheetCornerRadius: theme.radius.xl,
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
            sheetCornerRadius: theme.radius.xl,
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
            sheetCornerRadius: theme.radius.xl,
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
        <Stack.Screen
          name="workouts/day-edit"
          options={{
            presentation: "formSheet",
            sheetAllowedDetents: "fitToContents",
            sheetCornerRadius: theme.radius.xl,
            sheetGrabberVisible: false,
            animation: "default",
            contentStyle: { backgroundColor: theme.colors.background.canvas }
          }}
        />
      </Stack>
    </>
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <DataProvider>
          <KeyboardProvider>{Platform.OS === "web" ? appStack : <Sortable.PortalProvider>{appStack}</Sortable.PortalProvider>}</KeyboardProvider>
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.canvasSoft
  }
});
