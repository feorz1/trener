import type { ThemePreference } from "@/theme";

export type ThemeOption = {
  value: ThemePreference;
  label: string;
  description: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  { value: "system", label: "Системная", description: "Следует настройкам устройства" },
  { value: "light", label: "Светлая", description: "Всегда светлое оформление" },
  { value: "dark", label: "Тёмная", description: "Всегда тёмное оформление" }
];

export function getThemePreferenceLabel(preference: ThemePreference) {
  return THEME_OPTIONS.find((option) => option.value === preference)?.label ?? THEME_OPTIONS[0].label;
}
