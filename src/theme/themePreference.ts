export const THEME_PREFERENCE_STORAGE_KEY = "trainer-app:theme-preference:v1";

export type ThemePreference = "system" | "light" | "dark";

export type ThemePreferenceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export async function loadThemePreference(storage: ThemePreferenceStorage): Promise<ThemePreference> {
  try {
    const stored = await storage.getItem(THEME_PREFERENCE_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export async function saveThemePreference(preference: ThemePreference, storage: ThemePreferenceStorage) {
  try {
    await storage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
  } catch {
    // Theme selection should remain usable even when device storage is unavailable.
  }
}
