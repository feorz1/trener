import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, Platform, useColorScheme, type ColorSchemeName } from "react-native";
import { asyncStorageKeyValueStore } from "@/data/persistence/AsyncStorageKeyValueStore";
import { darkColors, lightColors, type ThemeColors } from "./palettes";
import { loadThemePreference, saveThemePreference, type ThemePreference, type ThemePreferenceStorage } from "./themePreference";

type ResolvedColorScheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedColorScheme: ResolvedColorScheme;
  resolvedColors: ThemeColors;
  isHydrated: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyColorScheme(preference: ThemePreference) {
  const scheme: ColorSchemeName = preference === "system" ? null : preference;
  Appearance.setColorScheme(scheme);

  if (Platform.OS === "web" && typeof document !== "undefined") {
    document.documentElement.style.colorScheme = preference === "system" ? "light dark" : preference;
  }
}

export function ThemeProvider({
  children,
  storage = asyncStorageKeyValueStore
}: {
  children: ReactNode;
  storage?: ThemePreferenceStorage;
}) {
  const systemColorScheme = useColorScheme();
  const [preference, setStoredPreference] = useState<ThemePreference>("system");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    void loadThemePreference(storage).then((storedPreference) => {
      if (!active) return;
      applyColorScheme(storedPreference);
      setStoredPreference(storedPreference);
      setIsHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [storage]);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    setStoredPreference(nextPreference);
    applyColorScheme(nextPreference);
    await saveThemePreference(nextPreference, storage);
  }, [storage]);

  const resolvedColorScheme: ResolvedColorScheme =
    preference === "system" ? (systemColorScheme ?? "light") : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedColorScheme,
      resolvedColors: resolvedColorScheme === "dark" ? darkColors : lightColors,
      isHydrated,
      setPreference
    }),
    [isHydrated, preference, resolvedColorScheme, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("ThemeProvider is missing");
  }
  return context;
}
