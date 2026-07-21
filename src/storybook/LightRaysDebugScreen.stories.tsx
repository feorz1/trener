import Slider from "@react-native-community/slider";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button, Divider, Navigation, ProgressBar } from "@/components/ui";
import { WorkoutSummaryLightRays } from "@/features/workouts/WorkoutSummaryLightRays";
import {
  workoutSplashLightRaysConfig,
  workoutSummaryLightRaysDefaultConfig,
  type WorkoutSummaryLightRayLayerConfig,
  type WorkoutSummaryLightRaysConfig
} from "@/features/workouts/WorkoutSummaryLightRaysConfig";
import { theme } from "@/theme";

type NumericLayerKey = Exclude<keyof WorkoutSummaryLightRayLayerConfig, "color" | "rayPosition" | "rayDirection">;
type VectorLayerKey = "rayPosition" | "rayDirection";
type VectorIndex = 0 | 1;

type ScalarControl = {
  key: NumericLayerKey;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
};

type VectorControl = {
  key: VectorLayerKey;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
};

const scalarControls: ScalarControl[] = [
  { key: "intensity", label: "Intensity", min: 0, max: 3, step: 0.01, precision: 2 },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.01, precision: 2 },
  { key: "depthAttenuation", label: "Depth", min: 0, max: 1, step: 0.01, precision: 2 },
  { key: "rayLength", label: "Length", min: 0.2, max: 2, step: 0.01, precision: 2 },
  { key: "rayWidth", label: "Width", min: 0.4, max: 8, step: 0.1, precision: 1 },
  { key: "numRays", label: "Rays", min: 1, max: 16, step: 1, precision: 0 }
];

const vectorControls: VectorControl[] = [
  { key: "rayPosition", label: "Position", min: -1.2, max: 1.2, step: 0.01, precision: 2 },
  { key: "rayDirection", label: "Direction", min: -1, max: 1, step: 0.01, precision: 2 }
];

function cloneConfig(config: WorkoutSummaryLightRaysConfig): WorkoutSummaryLightRaysConfig {
  return {
    ...config,
    fade: { ...config.fade },
    layers: config.layers.map((layer) => ({
      ...layer,
      rayPosition: [...layer.rayPosition] as [number, number],
      rayDirection: [...layer.rayDirection] as [number, number]
    })) as [WorkoutSummaryLightRayLayerConfig, WorkoutSummaryLightRayLayerConfig]
  };
}

function formatValue(value: number, precision: number) {
  return value.toFixed(precision);
}

function LightRaysDebugScreen() {
  const [config, setConfig] = useState(() => cloneConfig(workoutSummaryLightRaysDefaultConfig));

  const updateLayerScalar = (layerIndex: 0 | 1, key: NumericLayerKey, value: number) => {
    setConfig((current) => {
      const next = cloneConfig(current);
      next.layers[layerIndex][key] = key === "numRays" ? Math.round(value) : value;
      return next;
    });
  };

  const updateLayerVector = (layerIndex: 0 | 1, key: VectorLayerKey, vectorIndex: VectorIndex, value: number) => {
    setConfig((current) => {
      const next = cloneConfig(current);
      next.layers[layerIndex][key][vectorIndex] = value;
      return next;
    });
  };

  const setPreset = (preset: WorkoutSummaryLightRaysConfig) => {
    setConfig(cloneConfig(preset));
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View pointerEvents="none" style={styles.screenLightRays}>
        <WorkoutSummaryLightRays config={config} style={styles.screenLightRaysFill} />
      </View>
      <Navigation title="Итоги тренировки" backIconName="arrow left" backAccessibilityLabel="Назад" onBack={() => undefined} />

      <View style={styles.topSection}>
        <View style={styles.topSectionContent}>
          <Text style={styles.summaryClientName}>Константин</Text>
          <ProgressBar completed={0} total={1} label="0 из 1 упражнений" tone="primary" />

          <View style={styles.metricsGrid}>
            <View style={styles.metricsRow}>
              <SummaryMetric value="11:24" label="9 июля" />
              <SummaryMetric value="21:01" label="Время тренировки" />
            </View>
            <View style={styles.metricsRow}>
              <SummaryMetric value="0" label="Калории" />
              <SummaryMetric value="0 кг" label="Общий вес" />
            </View>
          </View>
        </View>
      </View>

      <Divider width="fill" tone="canvasSoft" />

      <ScrollView style={styles.controlsScroll} contentContainerStyle={styles.controlsContent} keyboardShouldPersistTaps="handled">
        <View style={styles.controlsSection}>
          <View style={styles.presetRow}>
            <Button label="Summary" type="secondary" size="small" width="hug" onPress={() => setPreset(workoutSummaryLightRaysDefaultConfig)} />
            <Button label="Splash" type="secondaryNeutral" size="small" width="hug" onPress={() => setPreset(workoutSplashLightRaysConfig)} />
          </View>

          <View style={styles.controls}>
            <GlobalControl label="Opacity" value={config.opacity} min={0} max={1} step={0.01} precision={2} onChange={(value) => setConfig((current) => ({ ...current, opacity: value }))} />
            {config.layers.map((layer, layerIndex) => (
              <View key={layerIndex} style={styles.layerGroup}>
                <Text style={styles.layerTitle}>Layer {layerIndex + 1}</Text>
                {scalarControls.map((control) => (
                  <GlobalControl
                    key={`${layerIndex}-${control.key}`}
                    label={control.label}
                    value={layer[control.key]}
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    precision={control.precision}
                    onChange={(value) => updateLayerScalar(layerIndex as 0 | 1, control.key, value)}
                  />
                ))}
                {vectorControls.map((control) => (
                  <View key={`${layerIndex}-${control.key}`} style={styles.vectorGroup}>
                    <GlobalControl
                      label={`${control.label} X`}
                      value={layer[control.key][0]}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      precision={control.precision}
                      onChange={(value) => updateLayerVector(layerIndex as 0 | 1, control.key, 0, value)}
                    />
                    <GlobalControl
                      label={`${control.label} Y`}
                      value={layer[control.key][1]}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      precision={control.precision}
                      onChange={(value) => updateLayerVector(layerIndex as 0 | 1, control.key, 1, value)}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.exportBlock}>
            <Text style={styles.exportTitle}>Current config</Text>
            <Text selectable style={styles.exportText}>{formatConfigLine("Layer 1", config.layers[0])}</Text>
            <Text selectable style={styles.exportText}>{formatConfigLine("Layer 2", config.layers[1])}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricCard}>
      <Text numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
      <Text numberOfLines={2} style={styles.metricLabel}>
        {label}
      </Text>
    </View>
  );
}

function formatConfigLine(label: string, layer: WorkoutSummaryLightRayLayerConfig) {
  return [
    label,
    `intensity ${formatValue(layer.intensity, 2)}`,
    `position ${formatValue(layer.rayPosition[0], 2)}, ${formatValue(layer.rayPosition[1], 2)}`,
    `speed ${formatValue(layer.speed, 2)}`,
    `length ${formatValue(layer.rayLength, 2)}`,
    `direction ${formatValue(layer.rayDirection[0], 2)}, ${formatValue(layer.rayDirection[1], 2)}`,
    `width ${formatValue(layer.rayWidth, 1)}`,
    `rays ${layer.numRays}`
  ].join(" / ");
}

function GlobalControl({
  label,
  value,
  min,
  max,
  step,
  precision,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  precision: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.control}>
      <View style={styles.controlHeader}>
        <Text style={styles.controlLabel}>{label}</Text>
        <Text style={styles.controlValue}>{formatValue(value, precision)}</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={theme.colors.content.primary}
        maximumTrackTintColor={theme.colors.background.border}
        thumbTintColor={theme.colors.content.inkDeep}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  screenLightRays: {
    position: "absolute",
    top: theme.spacing[0],
    right: theme.spacing[0],
    left: theme.spacing[0],
    height: theme.sizes.workoutSummaryLightRaysHeight,
  },
  screenLightRaysFill: {
    ...StyleSheet.absoluteFillObject
  },
  topSection: {
    position: "relative"
  },
  topSectionContent: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  summaryClientName: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  metricsGrid: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg
  },
  metricsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  metricCard: {
    flex: 1,
    minHeight: theme.sizes.alertCompactMinHeight + theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  metricValue: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  metricLabel: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  controlsScroll: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  controlsContent: {
    paddingBottom: theme.spacing["3xl"]
  },
  controlsSection: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg
  },
  presetRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  controls: {
    gap: theme.spacing.lg
  },
  layerGroup: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm
  },
  layerTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  vectorGroup: {
    gap: theme.spacing.xs
  },
  control: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs
  },
  controlHeader: {
    minHeight: theme.sizes.buttonSmallHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md
  },
  controlLabel: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.body
  },
  controlValue: {
    ...theme.typography.body.smCaption,
    color: theme.colors.content.ink
  },
  exportBlock: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  exportTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  exportText: {
    ...theme.typography.caption,
    color: theme.colors.content.body
  }
});

const meta = {
  title: "Development/WorkoutSummaryLightRays",
  component: LightRaysDebugScreen
} satisfies Meta<typeof LightRaysDebugScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
