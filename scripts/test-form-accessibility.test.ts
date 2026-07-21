import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("form accessibility contracts", () => {
  it("gives single and split inputs distinct labels and announces validation feedback", () => {
    const source = readSource("../src/components/ui/Input.tsx");

    expect(source).toContain('prefixAccessibilityLabel ?? `${label}, код страны`');
    expect(source).toContain('doubleField ? `${label}, номер` : label');
    expect(source).toContain("accessibilityHint={resolvedAccessibilityHint}");
    expect(source).toContain('accessibilityRole={showStatus ? "alert" : undefined}');
    expect(source).toContain('accessibilityLiveRegion={showStatus ? "polite" : "none"}');
  });

  it("labels text areas and announces their error message", () => {
    const source = readSource("../src/components/ui/TextArea.tsx");

    expect(source).toContain("accessibilityLabel={accessibilityLabel ?? label}");
    expect(source).toContain("accessibilityHint={resolvedAccessibilityHint}");
    expect(source).toContain('accessibilityRole={resolvedState === "error" ? "alert" : undefined}');
    expect(source).toContain('accessibilityLiveRegion={resolvedState === "error" ? "polite" : "none"}');
  });

  it("exposes a select value without treating keyboard focus as expanded state", () => {
    const source = readSource("../src/components/ui/Select.tsx");

    expect(source).toContain("accessibilityValue={accessibilityValue ?? { text: hasValue ? value : placeholder }}");
    expect(source).toContain("accessibilityState={{ ...accessibilityState, disabled }}");
    expect(source).not.toContain('expanded: resolvedState === "focus"');
    expect(source).toContain("warning: theme.colors.status.warningText");
  });
});
