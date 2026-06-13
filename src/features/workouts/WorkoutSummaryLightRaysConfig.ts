import { theme } from "@/theme";

export type WorkoutSummaryLightRayLayerConfig = {
  intensity: number;
  color: string;
  rayPosition: [number, number];
  speed: number;
  depthAttenuation: number;
  rayLength: number;
  rayDirection: [number, number];
  rayWidth: number;
  numRays: number;
};

export type WorkoutSummaryLightRaysConfig = {
  height: number;
  opacity: number;
  fade: {
    softOpacity: number;
    mediumOpacity: number;
    strongOpacity: number;
    solidHeight: number;
  };
  layers: [WorkoutSummaryLightRayLayerConfig, WorkoutSummaryLightRayLayerConfig];
};

export const workoutSummaryLightRaysDefaultConfig: WorkoutSummaryLightRaysConfig = {
  height: theme.sizes.workoutSummaryLightRaysHeight,
  opacity: 1,
  fade: {
    softOpacity: 0,
    mediumOpacity: 0,
    strongOpacity: 0,
    solidHeight: 0
  },
  layers: [
    {
      intensity: 1.8299999237060547,
      color: theme.colors.content.primary,
      rayPosition: [0.5099999904632568, -0.34],
      speed: 2,
      depthAttenuation: 0.72,
      rayLength: 0.8299999833106995,
      rayDirection: [0.06, 1],
      rayWidth: 3,
      numRays: 10
    },
    {
      intensity: 0.5799999833106995,
      color: theme.colors.content.primaryActive,
      rayPosition: [0.56, -0.38],
      speed: 0.34,
      depthAttenuation: 0.72,
      rayLength: 1,
      rayDirection: [-0.06, 1],
      rayWidth: 1.2,
      numRays: 3
    }
  ]
};
