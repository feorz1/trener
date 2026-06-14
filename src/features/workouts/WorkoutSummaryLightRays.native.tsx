import { LightRayOverlay } from "@native-springs/shaders";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { workoutSummaryLightRaysDefaultConfig, type WorkoutSummaryLightRaysConfig } from "./WorkoutSummaryLightRaysConfig";

export function WorkoutSummaryLightRays({
  config = workoutSummaryLightRaysDefaultConfig,
  style
}: {
  config?: WorkoutSummaryLightRaysConfig;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[styles.container, { opacity: config.opacity }, style]}>
      {config.layers.map((layer, index) => (
        <LightRayOverlay key={index} parameters={layer} style={StyleSheet.absoluteFill} />
      ))}
      <View style={[styles.fadeBand, styles.fadeBandSoft, { opacity: config.fade.softOpacity }]} />
      <View style={[styles.fadeBand, styles.fadeBandMedium, { opacity: config.fade.mediumOpacity }]} />
      <View style={[styles.fadeBand, styles.fadeBandStrong, { opacity: config.fade.strongOpacity }]} />
      <View style={[styles.fadeBand, styles.fadeBandSolid, { height: config.fade.solidHeight }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  fadeBand: {
    position: "absolute",
    right: theme.spacing[0],
    left: theme.spacing[0],
    backgroundColor: theme.colors.background.canvas
  },
  fadeBandSoft: {
    bottom: 48,
    height: 20,
    opacity: 0.2
  },
  fadeBandMedium: {
    bottom: 28,
    height: 20,
    opacity: 0.44
  },
  fadeBandStrong: {
    bottom: 12,
    height: 16,
    opacity: 0.74
  },
  fadeBandSolid: {
    bottom: 0,
    opacity: 1
  }
});
