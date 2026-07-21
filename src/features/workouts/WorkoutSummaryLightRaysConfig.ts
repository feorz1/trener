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
      intensity: 1.83,
      color: theme.colors.accent.rayPrimary,
      rayPosition: [0.51, -0.27],
      speed: 1.65,
      depthAttenuation: 0.72,
      rayLength: 0.55,
      rayDirection: [-0.7, -0.09],
      rayWidth: 0.9,
      numRays: 3
    },
    {
      intensity: 0.36,
      color: theme.colors.accent.raySecondary,
      rayPosition: [0.56, -0.38],
      speed: 0.34,
      depthAttenuation: 0.72,
      rayLength: 1,
      rayDirection: [0, 1],
      rayWidth: 1,
      numRays: 3
    }
  ]
};

export const workoutSplashLightRaysConfig: WorkoutSummaryLightRaysConfig = {
  ...workoutSummaryLightRaysDefaultConfig,
  layers: [
    {
      intensity: 2.3,
      color: theme.colors.accent.rayPrimary,
      rayPosition: [1, -0.38],
      speed: 1.7,
      depthAttenuation: 0.72,
      rayLength: 1.4,
      rayDirection: [0.06, 1],
      rayWidth: 4.5,
      numRays: 10
    },
    {
      intensity: 0.85,
      color: theme.colors.accent.raySecondary,
      rayPosition: [1, -0.38],
      speed: 1.6,
      depthAttenuation: 0.72,
      rayLength: 1.4,
      rayDirection: [-0.06, 1],
      rayWidth: 6,
      numRays: 10
    }
  ]
};
