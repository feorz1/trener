import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const root = process.cwd();
const files = execFileSync("rg", ["--files", "app", "src"], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const violations: string[] = [];
type ConstInitializers = Map<string, ts.Expression>;

function getLine(sourceFile: ts.SourceFile, node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function getPropertyName(name: ts.PropertyName) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return undefined;
}

function isRouterMemberCall(node: ts.CallExpression) {
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  if (!ts.isIdentifier(node.expression.expression) || node.expression.expression.text !== "router") return false;
  return ["push", "replace", "dismissTo", "setParams"].includes(node.expression.name.text);
}

function isPrimitiveRouteParamName(name: string | undefined) {
  if (!name) return false;
  if (name.endsWith("Value")) return isPrimitiveRouteParamName(name.slice(0, -"Value".length));
  if (["id", "day", "from", "returnTo", "date", "draftId", "activeDay", "selectedKey", "selectedSlot"].includes(name)) return true;
  return /(Id|Ids|Name|Date|Time|Day|Days|Key|Slot|Confirmed)$/.test(name);
}

function isPluralRouteParamName(name: string | undefined) {
  return Boolean(name && /(Ids|Days)$/.test(name));
}

function isPrimitiveRouteParamExpression(expression: ts.Expression, routeParamName?: string): boolean {
  const unwrappedExpression = unwrapExpression(expression);
  if (
    ts.isStringLiteral(unwrappedExpression) ||
    ts.isNoSubstitutionTemplateLiteral(unwrappedExpression) ||
    ts.isNumericLiteral(unwrappedExpression) ||
    unwrappedExpression.kind === ts.SyntaxKind.TrueKeyword ||
    unwrappedExpression.kind === ts.SyntaxKind.FalseKeyword ||
    unwrappedExpression.kind === ts.SyntaxKind.NullKeyword ||
    unwrappedExpression.kind === ts.SyntaxKind.UndefinedKeyword
  ) {
    return true;
  }

  if (ts.isIdentifier(unwrappedExpression)) {
    if (isPluralRouteParamName(routeParamName) && !unwrappedExpression.text.endsWith("Value")) return false;
    return isPrimitiveRouteParamName(routeParamName) && isPrimitiveRouteParamName(unwrappedExpression.text);
  }
  if (ts.isPropertyAccessExpression(unwrappedExpression)) return isPrimitiveRouteParamName(routeParamName) && isPrimitiveRouteParamName(unwrappedExpression.name.text);
  if (ts.isElementAccessExpression(unwrappedExpression)) return isPrimitiveRouteParamName(routeParamName);
  if (ts.isConditionalExpression(unwrappedExpression)) {
    return isPrimitiveRouteParamExpression(unwrappedExpression.whenTrue, routeParamName) && isPrimitiveRouteParamExpression(unwrappedExpression.whenFalse, routeParamName);
  }
  if (ts.isBinaryExpression(unwrappedExpression)) {
    const safeOperator =
      unwrappedExpression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      unwrappedExpression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      unwrappedExpression.operatorToken.kind === ts.SyntaxKind.PlusToken;
    return safeOperator && isPrimitiveRouteParamExpression(unwrappedExpression.left, routeParamName) && isPrimitiveRouteParamExpression(unwrappedExpression.right, routeParamName);
  }
  if (ts.isTemplateExpression(unwrappedExpression)) return unwrappedExpression.templateSpans.every((span) => isPrimitiveRouteParamExpression(span.expression));
  if (ts.isCallExpression(unwrappedExpression) && ts.isIdentifier(unwrappedExpression.expression) && unwrappedExpression.expression.text === "firstParam") {
    return (
      isPrimitiveRouteParamName(routeParamName) &&
      unwrappedExpression.arguments.every((argument) => {
        const unwrappedArgument = unwrapExpression(argument);
        if (ts.isIdentifier(unwrappedArgument)) return isPrimitiveRouteParamName(unwrappedArgument.text);
        return isPrimitiveRouteParamExpression(argument, routeParamName);
      })
    );
  }
  if (ts.isCallExpression(unwrappedExpression) && ts.isIdentifier(unwrappedExpression.expression) && unwrappedExpression.expression.text === "getDateKey") {
    return isPrimitiveRouteParamName(routeParamName) && unwrappedExpression.arguments.every((argument) => isPrimitiveRouteParamExpression(argument, routeParamName));
  }
  if (
    ts.isCallExpression(unwrappedExpression) &&
    ts.isPropertyAccessExpression(unwrappedExpression.expression) &&
    unwrappedExpression.expression.name.text === "join" &&
    isPrimitiveRouteParamName(routeParamName)
  ) {
    return unwrappedExpression.arguments.every((argument) => isPrimitiveRouteParamExpression(argument, routeParamName));
  }

  return false;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  return expression;
}

function collectConstInitializers(sourceFile: ts.SourceFile) {
  const initializers: ConstInitializers = new Map();

  function visit(node: ts.Node) {
    if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const) !== 0) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          initializers.set(declaration.name.text, declaration.initializer);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return initializers;
}

function resolveConstExpression(expression: ts.Expression, constInitializers: ConstInitializers, seen = new Set<string>()): ts.Expression {
  const unwrappedExpression = unwrapExpression(expression);
  if (!ts.isIdentifier(unwrappedExpression)) return unwrappedExpression;
  if (seen.has(unwrappedExpression.text)) return unwrappedExpression;

  const initializer = constInitializers.get(unwrappedExpression.text);
  if (!initializer) return unwrappedExpression;

  seen.add(unwrappedExpression.text);
  return resolveConstExpression(initializer, constInitializers, seen);
}

function isPrimitiveRouteParamsObject(expression: ts.Expression, constInitializers: ConstInitializers): boolean {
  const unwrappedExpression = resolveConstExpression(expression, constInitializers);
  if (ts.isConditionalExpression(unwrappedExpression)) {
    return isPrimitiveRouteParamsObject(unwrappedExpression.whenTrue, constInitializers) && isPrimitiveRouteParamsObject(unwrappedExpression.whenFalse, constInitializers);
  }
  if (!ts.isObjectLiteralExpression(unwrappedExpression)) return false;

  return unwrappedExpression.properties.every((property) => {
    if (ts.isPropertyAssignment(property)) return isPrimitiveRouteParamExpression(property.initializer, getPropertyName(property.name));
    if (ts.isShorthandPropertyAssignment(property)) return isPrimitiveRouteParamName(property.name.text);
    if (ts.isSpreadAssignment(property)) {
      const spreadExpression = resolveConstExpression(property.expression, constInitializers);
      if (ts.isObjectLiteralExpression(spreadExpression)) return isPrimitiveRouteParamsObject(spreadExpression, constInitializers);
      if (ts.isConditionalExpression(spreadExpression)) {
        return isPrimitiveRouteParamsObject(spreadExpression.whenTrue, constInitializers) && isPrimitiveRouteParamsObject(spreadExpression.whenFalse, constInitializers);
      }
      return false;
    }
    return false;
  });
}

function getRouteParamsExpression(routeObject: ts.ObjectLiteralExpression): ts.Expression | undefined {
  for (const property of routeObject.properties) {
    if (ts.isPropertyAssignment(property) && getPropertyName(property.name) === "params") return property.initializer;
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === "params") return property.name;
  }

  return undefined;
}

function checkRouteParams(normalized: string, sourceFile: ts.SourceFile, constInitializers: ConstInitializers) {
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && isRouterMemberCall(node)) {
      const [firstArg] = node.arguments;
      const resolvedFirstArg = firstArg ? resolveConstExpression(firstArg, constInitializers) : undefined;
      const routeObject = resolvedFirstArg && ts.isObjectLiteralExpression(resolvedFirstArg) ? resolvedFirstArg : undefined;
      const setParamsArg = ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "setParams" ? firstArg : undefined;
      const paramsExpression = routeObject ? getRouteParamsExpression(routeObject) : setParamsArg;

      if (paramsExpression && !isPrimitiveRouteParamsObject(paramsExpression, constInitializers)) {
        violations.push(`${normalized}:${getLine(sourceFile, paramsExpression)}: route params must be an object of IDs/primitives, not callbacks, arrays, or domain objects`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const file of files) {
  const absolutePath = join(root, file);
  const source = readFileSync(absolutePath, "utf8");
  const normalized = relative(root, absolutePath);
  const isPersistence = normalized.startsWith("src/data/persistence/");
  const sourceFile = ts.createSourceFile(normalized, source, ts.ScriptTarget.Latest, true, normalized.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const constInitializers = collectConstInitializers(sourceFile);

  if (!isPersistence && source.includes("@react-native-async-storage/async-storage")) {
    violations.push(`${normalized}: AsyncStorage import is only allowed in src/data/persistence`);
  }

  if (normalized.startsWith("app/") && /\/workouts\/\[workoutId\]\/(session|summary)/.test(source)) {
    violations.push(`${normalized}: session routes must use /sessions/[sessionId] and /sessions/[sessionId]/summary`);
  }

  if (normalized.startsWith("app/workouts/") && /dayExerciseIds|approachData|supersetConnectionIds/.test(source)) {
    violations.push(`${normalized}: legacy workout draft route params are not allowed`);
  }

  if (normalized.startsWith("app/")) {
    checkRouteParams(normalized, sourceFile, constInitializers);
  }
}

if (violations.length > 0) {
  console.error("Architecture lint failed:");
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log("Architecture lint passed.");
