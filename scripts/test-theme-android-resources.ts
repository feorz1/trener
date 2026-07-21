import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { darkColors, lightColors } from "../src/theme/palettes";

function resourceName(path: string[]) {
  return `trainer_${path
    .join("_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()}`;
}

function byteHex(value: number) {
  return Math.round(value).toString(16).padStart(2, "0").toUpperCase();
}

function androidColor(value: string) {
  const rgba = value.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  if (!rgba) return value.toUpperCase();
  const [, red, green, blue, alpha] = rgba;
  return `#${byteHex(Number(alpha) * 255)}${byteHex(Number(red))}${byteHex(Number(green))}${byteHex(Number(blue))}`;
}

function flattenColors(value: Record<string, unknown>, path: string[] = []): Map<string, string> {
  const colors = new Map<string, string>();
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string") {
      colors.set(resourceName(path.concat(key)), androidColor(child));
    } else {
      for (const [name, color] of flattenColors(child as Record<string, unknown>, path.concat(key))) {
        colors.set(name, color);
      }
    }
  }
  return colors;
}

function parseResourceColors(filePath: string) {
  const source = readFileSync(filePath, "utf8");
  assert.match(source, /^<resources>[\s\S]*<\/resources>\s*$/);
  return new Map(
    Array.from(source.matchAll(/<color name="([^"]+)">([^<]+)<\/color>/g), (match) => [match[1], match[2].toUpperCase()] as const)
  );
}

for (const [mode, palette, filePath] of [
  ["light", lightColors, "android/app/src/main/res/values/colors.xml"],
  ["dark", darkColors, "android/app/src/main/res/values-night/colors.xml"]
] as const) {
  const expected = flattenColors(palette);
  const actual = parseResourceColors(filePath);

  for (const [name, value] of expected) {
    assert.equal(actual.get(name), value, `${mode}: ${name} must be ${value}`);
  }

  console.log(`${mode}: ${expected.size} Android color resources match the palette.`);
}

console.log("Android theme resource tests passed.");
