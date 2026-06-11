import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Sortable from "react-native-sortables";
import { theme } from "@/theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background.canvasSoft }}>
        <ActivityIndicator color={theme.colors.content.primary} />
      </View>
    );
  }

  const appStack = (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background.canvasSoft }
        }}
      />
    </>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background.canvasSoft }}>
      <KeyboardProvider>{Platform.OS === "web" ? appStack : <Sortable.PortalProvider>{appStack}</Sortable.PortalProvider>}</KeyboardProvider>
    </GestureHandlerRootView>
  );
}
