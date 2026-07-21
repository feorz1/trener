import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadThemePreference,
  saveThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
  type ThemePreferenceStorage
} from "../src/theme/themePreference";

class MemoryStorage implements ThemePreferenceStorage {
  private values = new Map<string, string>();

  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

async function run() {
  const storage = new MemoryStorage();

  assert.equal(await loadThemePreference(storage), "system");

  await saveThemePreference("dark", storage);
  assert.equal(await loadThemePreference(storage), "dark");

  await storage.setItem(THEME_PREFERENCE_STORAGE_KEY, "unsupported");
  assert.equal(await loadThemePreference(storage), "system");

  const rootLayoutSource = readFileSync(resolve(process.cwd(), "app/_layout.tsx"), "utf8");
  const settingsSource = readFileSync(resolve(process.cwd(), "app/(tabs)/settings.tsx"), "utf8");
  const listItemCellSource = readFileSync(resolve(process.cwd(), "src/components/ui/ListItemCell.tsx"), "utf8");
  const themeProviderSource = readFileSync(resolve(process.cwd(), "src/theme/ThemeProvider.tsx"), "utf8");
  const themePreferenceSource = readFileSync(resolve(process.cwd(), "src/theme/themePreference.ts"), "utf8");
  const keyValueStoreSource = readFileSync(resolve(process.cwd(), "src/data/persistence/AsyncStorageKeyValueStore.ts"), "utf8");

  assert.match(rootLayoutSource, /const bootstrapRemoteData = useCallback\(/);
  assert.match(rootLayoutSource, /bootstrapRemoteData=\{state\.isAuthenticated \? bootstrapRemoteData : undefined\}/);
  assert.doesNotMatch(settingsSource, /router\.replace\(\s*["']\/settings["']\s*\)/);
  assert.match(settingsSource, /accessibilityRole="radio"/);
  assert.match(settingsSource, /accessibilityState=\{\{ checked: preference === option\.value \}\}/);
  assert.match(listItemCellSource, /accessibilityRole=\{accessibilityRole \?\? inferredAccessibilityRole\}/);
  assert.match(listItemCellSource, /\.\.\.accessibilityState,/);
  assert.match(listItemCellSource, /accessibilityValue=\{accessibilityValue\}/);
  assert.doesNotMatch(themePreferenceSource, /@react-native-async-storage\/async-storage/);
  assert.match(keyValueStoreSource, /import AsyncStorage from "@react-native-async-storage\/async-storage"/);
  assert.match(themeProviderSource, /import \{ asyncStorageKeyValueStore \} from "@\/data\/persistence\/AsyncStorageKeyValueStore"/);
  assert.match(themeProviderSource, /storage = asyncStorageKeyValueStore/);
  assert.match(themeProviderSource, /loadThemePreference\(storage\)/);
  assert.match(themeProviderSource, /saveThemePreference\(nextPreference, storage\)/);

  const applyIndex = themeProviderSource.indexOf("applyColorScheme(nextPreference)");
  const saveIndex = themeProviderSource.indexOf("await saveThemePreference(nextPreference, storage)");
  assert.ok(applyIndex >= 0 && saveIndex >= 0 && applyIndex < saveIndex, "Theme colors must switch before preference persistence");

  console.log("Theme preference tests passed.");
}

void run();
