import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type Scope = Record<string, unknown>;

const componentPath = fileURLToPath(new URL("../src/components/ui/MeasurementSlider.tsx", import.meta.url));
const componentSource = readFileSync(componentPath, "utf8");
const sourceFile = ts.createSourceFile(componentPath, componentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function getFunctionSource(name: string) {
  let declaration: ts.FunctionDeclaration | undefined;

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      declaration = node;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!declaration) throw new Error(`MeasurementSlider function ${name} was not found`);
  return declaration.getText(sourceFile);
}

function compileFunction<T>(name: string, scope: Scope = {}) {
  const compiled = ts.transpileModule(`${getFunctionSource(name)}\nconst __subject = ${name};`, {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const names = Object.keys(scope);
  return new Function(...names, `${compiled}; return __subject;`)(...names.map((key) => scope[key])) as T;
}

const clampValue = compileFunction<(value: number, min: number, max: number) => number>("clampValue");
const roundToStep = compileFunction<(value: number, min: number, step: number) => number>("roundToStep");
const getAccessibilityStepValue = compileFunction<
  (value: number, action: "increment" | "decrement", min: number, max: number, step: number) => number
>("getAccessibilityStepValue", { clampValue, roundToStep });
const formatAccessibilityNumber = compileFunction<(value: number) => string>("formatAccessibilityNumber", {
  accessibilityNumberFormatter: new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 10 })
});
const getAccessibilityUnitForms = compileFunction<(title: string) => { one: string; few: string; many: string } | undefined>("getAccessibilityUnitForms");
const getRussianAccessibilityPluralCategory = compileFunction<(value: number) => "one" | "few" | "many">("getRussianAccessibilityPluralCategory");
const formatMeasurementAccessibilityValue = compileFunction<(title: string, value: number) => string>("formatMeasurementAccessibilityValue", {
  formatAccessibilityNumber,
  getAccessibilityUnitForms,
  getRussianAccessibilityPluralCategory
});
const getAccessibilityValueText = compileFunction<(title: string, value: number, referenceValue?: number) => string>("getAccessibilityValueText", {
  formatMeasurementAccessibilityValue
});

describe("MeasurementSlider accessibility", () => {
  it("increments and decrements by step without leaving the configured range", () => {
    expect(getAccessibilityStepValue(4, "increment", 0, 10, 2)).toBe(6);
    expect(getAccessibilityStepValue(4, "decrement", 0, 10, 2)).toBe(2);
    expect(getAccessibilityStepValue(10, "increment", 0, 10, 2)).toBe(10);
    expect(getAccessibilityStepValue(0, "decrement", 0, 10, 2)).toBe(0);
    expect(getAccessibilityStepValue(0.2, "increment", 0, 0.3, 0.1)).toBeCloseTo(0.3);
  });

  it("formats the announced value for the Russian locale", () => {
    expect(formatAccessibilityNumber(12.5)).toBe("12,5");
    expect(getAccessibilityValueText("Текущий возраст", 21)).toBe("21 год");
    expect(getAccessibilityValueText("Текущий возраст", 11)).toBe("11 лет");
    expect(getAccessibilityValueText("Текущий рост", 180)).toBe("180 сантиметров");
    expect(getAccessibilityValueText("Текущий вес", 72)).toBe("72 килограмма");
    expect(getAccessibilityValueText("Текущий вес", 112)).toBe("112 килограммов");
    expect(getAccessibilityValueText("Текущий вес", 122)).toBe("122 килограмма");
    expect(getAccessibilityValueText("Желаемый вес", 70.5, 80)).toBe("70,5 килограмма. Исходное значение: 80 килограммов");
    expect(getAccessibilityValueText("Произвольное значение", 12.5)).toBe("12,5");
  });

  it("does not require Intl.PluralRules in the Hermes runtime", () => {
    expect(getRussianAccessibilityPluralCategory(1)).toBe("one");
    expect(getRussianAccessibilityPluralCategory(2)).toBe("few");
    expect(getRussianAccessibilityPluralCategory(5)).toBe("many");
    expect(getRussianAccessibilityPluralCategory(11)).toBe("many");
    expect(getRussianAccessibilityPluralCategory(21)).toBe("one");
    expect(getRussianAccessibilityPluralCategory(20.999999999999996)).toBe("one");
    expect(getRussianAccessibilityPluralCategory(22)).toBe("few");
    expect(getRussianAccessibilityPluralCategory(25)).toBe("many");
    expect(getRussianAccessibilityPluralCategory(1.5)).toBe("few");
    expect(componentSource).not.toContain("Intl.PluralRules");
  });

  it("exposes one adjustable element and hides its visual descendants from screen readers", () => {
    expect(componentSource).toContain('accessibilityRole="adjustable"');
    expect(componentSource).toContain("accessibilityLabel={title}");
    expect(componentSource).toContain("accessibilityValue={{ min, max, now: displayValue, text: accessibilityValueText }}");
    expect(componentSource).toContain("accessibilityActions={accessibilityAdjustmentActions}");
    expect(componentSource).toContain("onAccessibilityAction={handleAccessibilityAction}");
    expect(componentSource).toContain("getAccessibilityStepValue(currentValue, actionName, min, max, step)");
    expect(componentSource).toContain("commitValue(nextValue)");
    expect(componentSource).toContain("scrollToValue(nextValue, true)");
    expect(componentSource).toContain('accessibilityElementsHidden importantForAccessibility="no-hide-descendants"');
  });
});
