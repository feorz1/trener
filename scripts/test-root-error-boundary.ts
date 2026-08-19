import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layoutSource = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");

assert.match(layoutSource, /export function ErrorBoundary\(\{ error, retry \}: ErrorBoundaryProps\)/);
assert.match(layoutSource, /accessibilityRole="alert"/);
assert.match(layoutSource, /label="Попробовать снова"[\s\S]*onPress=\{retry\}/);
assert.match(layoutSource, /code: "root_render_failed"/);
assert.doesNotMatch(layoutSource, /ErrorBoundary[\s\S]*console\.(?:error|warn)\([^)]*error/);

console.info("Root error boundary checks passed.");
