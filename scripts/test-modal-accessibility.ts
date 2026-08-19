import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/components/ui/Modal.tsx"), "utf8");

assert.match(source, /accessibilityViewIsModal/, "Overlay modal must isolate its accessibility tree");
assert.match(source, /onAccessibilityEscape=\{onClose\}/, "Overlay modal must support the iOS accessibility escape gesture");
assert.match(source, /accessibilityRole="header"/, "The modal title must expose header semantics");
assert.match(source, /findNodeHandle\(initialFocusRef\.current\)/, "The initial focus target must resolve from the modal title ref");
assert.match(source, /AccessibilityInfo\.setAccessibilityFocus\(reactTag\)/, "Opening the modal must move accessibility focus inside it");
assert.match(source, /accessibilityLabel="Закрыть"/, "The close control must have a localized accessible name");
assert.match(
  source,
  /overlayBackdrop:\s*\{\s*backgroundColor:\s*theme\.colors\.background\.overlay\s*\}/,
  "The backdrop must use the semantic overlay token"
);
assert.match(
  source,
  /<Animated\.View\s+accessibilityElementsHidden\s+importantForAccessibility="no-hide-descendants"[\s\S]*?styles\.overlayBackdrop/,
  "The visual backdrop must stay out of the accessibility tree"
);
assert.match(
  source,
  /<Pressable accessibilityElementsHidden importantForAccessibility="no-hide-descendants"[\s\S]*?onPress=\{onClose\}/,
  "The full-screen dismiss hit area must stay out of the accessibility tree"
);

console.log("Modal accessibility contract tests passed.");
