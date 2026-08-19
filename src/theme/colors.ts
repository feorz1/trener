import { DynamicColorIOS, Platform, PlatformColor } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./palettes";

function androidResourceName(path: string[]) {
  return `trainer_${path
    .join("_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()}`;
}

function adaptiveColor(light: string, dark: string, path: string[]) {
  if (light === dark) {
    return light;
  }

  if (Platform.OS === "ios") {
    return DynamicColorIOS({ light, dark }) as unknown as string;
  }

  if (Platform.OS === "android") {
    return PlatformColor(`@color/${androidResourceName(path)}`) as unknown as string;
  }

  if (Platform.OS === "web") {
    return `light-dark(${light}, ${dark})`;
  }

  return light;
}

function createAdaptiveColors(light: Record<string, unknown>, dark: Record<string, unknown>, path: string[] = []): unknown {
  return Object.fromEntries(
    Object.entries(light).map(([key, lightValue]) => {
      const darkValue = dark[key];
      const tokenPath = path.concat(key);

      if (typeof lightValue === "string" && typeof darkValue === "string") {
        return [key, adaptiveColor(lightValue, darkValue, tokenPath)];
      }

      return [
        key,
        createAdaptiveColors(lightValue as Record<string, unknown>, darkValue as Record<string, unknown>, tokenPath)
      ];
    })
  );
}

export const colors = createAdaptiveColors(lightColors, darkColors) as ThemeColors;

export { darkColors, lightColors } from "./palettes";
export type ColorToken = typeof colors;
