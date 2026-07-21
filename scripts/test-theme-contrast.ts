import assert from "node:assert/strict";
import { darkColors, lightColors, type ThemeColors } from "../src/theme/palettes";

type ContrastScenario = {
  name: string;
  foreground: (colors: ThemeColors) => string;
  background: (colors: ThemeColors) => string;
  minimum?: number;
};

const scenarios: ContrastScenario[] = [
  { name: "primary text / canvas", foreground: (c) => c.content.ink, background: (c) => c.background.canvas },
  { name: "body text / canvas", foreground: (c) => c.content.body, background: (c) => c.background.canvas },
  { name: "muted text / canvas", foreground: (c) => c.content.mute, background: (c) => c.background.canvas },
  { name: "primary text / soft canvas", foreground: (c) => c.content.ink, background: (c) => c.background.canvasSoft },
  { name: "body text / soft canvas", foreground: (c) => c.content.body, background: (c) => c.background.canvasSoft },
  { name: "primary button", foreground: (c) => c.content.primary, background: (c) => c.content.controlAccent },
  { name: "secondary button", foreground: (c) => c.content.inkDeep, background: (c) => c.content.primary },
  { name: "control accent / canvas", foreground: (c) => c.content.controlAccent, background: (c) => c.background.canvas, minimum: 3 },
  { name: "selected content", foreground: (c) => c.content.onPrimary, background: (c) => c.content.primary },
  { name: "positive status", foreground: (c) => c.status.positiveDeep, background: (c) => c.content.primaryPale },
  { name: "warning status", foreground: (c) => c.status.warningContent, background: (c) => c.status.warning },
  { name: "warning text / canvas", foreground: (c) => c.status.warningText, background: (c) => c.background.canvas },
  { name: "warning text / soft canvas", foreground: (c) => c.status.warningText, background: (c) => c.background.canvasSoft },
  { name: "warning deep", foreground: (c) => c.status.onWarningDeep, background: (c) => c.status.warningDeep },
  { name: "negative soft", foreground: (c) => c.status.negativeDarkest, background: (c) => c.status.negativeSoft },
  { name: "negative dark", foreground: (c) => c.status.negativeContent, background: (c) => c.status.negativeBg },
  { name: "negative solid", foreground: (c) => c.status.onNegative, background: (c) => c.status.negative },
  { name: "cyan accent", foreground: (c) => c.accent.onCyan, background: (c) => c.accent.cyan }
];

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  assert.match(hex, /^#[0-9A-F]{6}$/i, `Contrast tests require an opaque hex color, received ${hex}`);
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channelToLinear(red) + 0.7152 * channelToLinear(green) + 0.0722 * channelToLinear(blue);
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function rgbChannels(hex: string) {
  assert.match(hex, /^#[0-9A-F]{6}$/i, `Neutrality tests require an opaque hex color, received ${hex}`);
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

const darkNeutralTokens = {
  ink: darkColors.content.ink,
  inkDeep: darkColors.content.inkDeep,
  body: darkColors.content.body,
  mute: darkColors.content.mute,
  disabled: darkColors.content.disabled,
  canvas: darkColors.background.canvas,
  canvasSoft: darkColors.background.canvasSoft,
  border: darkColors.background.border,
  cardDivider: darkColors.background.cardDivider
};

for (const [name, value] of Object.entries(darkNeutralTokens)) {
  const channels = rgbChannels(value);
  const channelSpread = Math.max(...channels) - Math.min(...channels);
  assert.ok(channelSpread <= 4, `dark: ${name} must stay neutral; received ${value} with channel spread ${channelSpread}`);
}

const darkPrimaryChannels = rgbChannels(darkColors.content.primary);
assert.ok(
  darkPrimaryChannels[1] - Math.max(darkPrimaryChannels[0], darkPrimaryChannels[2]) >= 16,
  `dark: primary must remain a deliberate green accent; received ${darkColors.content.primary}`
);

const darkControlAccentChannels = rgbChannels(darkColors.content.controlAccent);
assert.ok(
  darkControlAccentChannels[1] - Math.max(darkControlAccentChannels[0], darkControlAccentChannels[2]) >= 16,
  `dark: controlAccent must remain a deliberate green accent; received ${darkColors.content.controlAccent}`
);

for (const [mode, colors] of [
  ["light", lightColors],
  ["dark", darkColors]
] as const) {
  for (const scenario of scenarios) {
    const foreground = scenario.foreground(colors);
    const background = scenario.background(colors);
    const ratio = contrastRatio(foreground, background);
    const minimum = scenario.minimum ?? 4.5;

    assert.ok(
      ratio >= minimum,
      `${mode}: ${scenario.name} is ${ratio.toFixed(2)}:1; expected at least ${minimum}:1 (${foreground} on ${background})`
    );
    console.log(`${mode.padEnd(5)} ${scenario.name.padEnd(27)} ${ratio.toFixed(2)}:1`);
  }
}

console.log("Theme contrast tests passed.");
