import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const stagedSwipeDelete = readSource("../src/components/ui/StagedSwipeDelete.tsx");
assert.ok(
  stagedSwipeDelete.includes("backgroundColor: resolvedColors.status.negative"),
  "StagedSwipeDelete must pass a resolved string color to Reanimated"
);
assert.ok(
  !stagedSwipeDelete.includes("backgroundColor: theme.colors.status.negative"),
  "StagedSwipeDelete must not pass DynamicColorIOS to Reanimated"
);

const animatedTopNotification = readSource("../src/components/ui/AnimatedTopNotification.tsx");
assert.ok(
  animatedTopNotification.includes('resolvedColorScheme === "dark" ? resolvedColors.background.canvasSoft : resolvedColors.background.canvas'),
  "AnimatedTopNotification must match the secondary-neutral surface in dark mode and preserve the light surface"
);
assert.ok(
  animatedTopNotification.includes("withResolvedShadowColor(theme.shadows.notification, resolvedColors.background.shadow)"),
  "AnimatedTopNotification must pass a resolved shadow color to Reanimated"
);
assert.ok(
  !/backgroundColor:\s*theme\.colors\./.test(animatedTopNotification),
  "AnimatedTopNotification must not pass DynamicColorIOS to Reanimated"
);
assert.equal(animatedTopNotification.includes("notificationHalo"), false, "AnimatedTopNotification must not stack halo shadows");
assert.equal(animatedTopNotification.includes("<LiquidGlassView"), false, "AnimatedTopNotification must keep the original single surface");

const resolvedBorderControls = [
  ["Input", readSource("../src/components/ui/Input.tsx")],
  ["Select", readSource("../src/components/ui/Select.tsx")],
  ["Search", readSource("../src/components/ui/Search.tsx")],
  ["Variant", readSource("../src/components/ui/Variant.tsx")],
  ["TextArea", readSource("../src/components/ui/TextArea.tsx")]
] as const;

for (const [name, source] of resolvedBorderControls) {
  assert.ok(source.includes("resolvedColors"), `${name} borders must use the concrete active palette`);
  assert.equal(
    /borderColor:\s*theme\.colors\./.test(source),
    false,
    `${name} must not pass DynamicColorIOS directly to an iOS Fabric border`
  );
}

assert.equal(readSource("../src/components/ui/Input.tsx").includes("const stateBorderColor"), false);
assert.equal(readSource("../src/components/ui/Select.tsx").includes("const stateBorderColor"), false);
assert.equal(readSource("../src/components/ui/TextArea.tsx").includes("const stateBorderColor"), false);

console.log("Reanimated theme color tests passed.");
