import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("selection accessibility contracts", () => {
  it("preserves caller semantics and infers canonical selection roles", () => {
    const source = readSource("../src/components/ui/ListItemCell.tsx");

    expect(source).toContain("accessibilityRole={accessibilityRole ?? inferredAccessibilityRole}");
    expect(source).toContain("accessibilityState={resolvedAccessibilityState}");
    expect(source).toContain('trailing === "switch"');
    expect(source).toContain("accessibilityElementsHidden={isRowInteractive}");
  });

  it.each([
    ["theme options", "../app/(tabs)/settings.tsx", 'accessibilityRole="radio"'],
    ["client options", "../app/workouts/client-select.tsx", 'accessibilityRole="radio"'],
    ["repeat-day options", "../app/workouts/repeat-select.tsx", 'accessibilityRole="checkbox"']
  ])("exposes %s as one selectable accessibility target", (_name, path, roleContract) => {
    const source = readSource(path);

    expect(source).toContain(roleContract);
    expect(source).toContain("accessibilityState={{ checked:");
    expect(source).toContain("importantForAccessibility=\"no-hide-descendants\"");
  });
});
