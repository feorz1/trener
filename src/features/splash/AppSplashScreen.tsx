import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { WorkoutSummaryLightRays } from "@/features/workouts/WorkoutSummaryLightRays";
import { workoutSplashLightRaysConfig } from "@/features/workouts/WorkoutSummaryLightRaysConfig";
import { theme } from "@/theme";

export function AppSplashScreen() {
  return (
    <View style={styles.root}>
      <StatusBar hidden style="light" />
      <View pointerEvents="none" style={styles.rays}>
        <WorkoutSummaryLightRays config={workoutSplashLightRaysConfig} style={styles.raysFill} />
      </View>
      <View pointerEvents="none" style={styles.iconWrap}>
        <View style={styles.appIcon} accessibilityLabel="Trainer">
          <Text style={styles.appLogo}>t</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.splash
  },
  rays: {
    ...StyleSheet.absoluteFillObject
  },
  raysFill: {
    ...StyleSheet.absoluteFillObject
  },
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  appIcon: {
    width: theme.sizes.splashIconSize,
    height: theme.sizes.splashIconSize,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.accent.rayPrimary
  },
  appLogo: {
    color: theme.colors.brand.contrast,
    fontSize: theme.sizes.splashLogoFontSize,
    lineHeight: theme.sizes.splashLogoLineHeight,
    fontWeight: "900",
    fontStyle: "italic",
    transform: [{ translateY: theme.spacing.xxs }]
  }
});
