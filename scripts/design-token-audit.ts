import fs from "node:fs";
import path from "node:path";

type AuditResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  filesScanned: number;
};

type Registry = {
  components?: Array<{
    name: string;
    code?: { path?: string; docs?: string };
    figma?: { componentSet?: string; nodeId?: string };
  }>;
};

const root = process.cwd();

function read(filePath: string) {
  return fs.readFileSync(path.join(root, filePath), "utf8");
}

function exists(filePath: string) {
  return fs.existsSync(path.join(root, filePath));
}

function walk(dir: string): string[] {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(item) : [item];
  });
}

function lineNumber(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function report(
  result: AuditResult,
  severity: "error" | "warning",
  filePath: string,
  content: string,
  index: number,
  message: string,
  suggestion: string
) {
  const line = lineNumber(content, index);
  const formatted = `${filePath}:${line} ${message}; use ${suggestion}`;
  if (severity === "error") result.errors.push(formatted);
  else result.warnings.push(formatted);
}

function assertIncludes(result: AuditResult, filePath: string, expected: string) {
  if (!exists(filePath)) {
    result.errors.push(`Missing file: ${filePath}`);
    return;
  }
  const content = read(filePath);
  if (!content.includes(expected)) {
    result.errors.push(`${filePath} does not include: ${expected}`);
  }
}

function auditDocs(result: AuditResult) {
  const requiredFiles = [
    "DESIGN.md",
    "AGENTS.md",
    "PROMPT_FOR_CODEX.md",
    "docs/codex/00-start-here.md",
    "docs/design-system/rules.md",
    "docs/design-system/figma-token-map.md",
    "docs/design-system/figma-to-code-map.md",
    "docs/design-system/component-registry.json",
    "docs/design-system/tokens.design.json",
    "docs/design-system/drift.md",
    "docs/design-system/foundations/color.md",
    "docs/design-system/foundations/spacing.md",
    "docs/design-system/foundations/typography.md",
    "docs/design-system/foundations/radius.md",
    "docs/design-system/foundations/elevation.md",
    "docs/design-system/foundations/motion.md",
    "docs/design-system/foundations/accessibility.md",
    "docs/design-system/foundations/breakpoints.md",
    "docs/design-system/tokens/token-reference.md",
    "docs/design-system/tokens/color-tokens.md",
    "docs/design-system/tokens/spacing-tokens.md",
    "docs/design-system/tokens/typography-tokens.md",
    "docs/design-system/tokens/radius-tokens.md",
    "docs/design-system/patterns/mobile-screen-layout.md",
    "docs/design-system/patterns/workout-session-flow.md",
    "docs/design-system/patterns/form-layout.md",
    "docs/design-system/patterns/error-handling.md"
  ];

  for (const filePath of requiredFiles) {
    if (!exists(filePath)) result.errors.push(`Missing file: ${filePath}`);
  }

  assertIncludes(result, "docs/design-system/figma-token-map.md", "color/content/primary");
  assertIncludes(result, "docs/design-system/figma-token-map.md", "theme.colors.content.primary");
  assertIncludes(result, "docs/design-system/figma-token-map.md", "Typography/Body/MD");
  assertIncludes(result, "docs/design-system/figma-token-map.md", "theme.typography.body.md");
  assertIncludes(result, "docs/design-system/figma-to-code-map.md", "Badge");
  assertIncludes(result, "AGENTS.md", "Before creating screens or components");
}

function auditRegistry(result: AuditResult) {
  if (!exists("docs/design-system/component-registry.json")) return;

  let registry: Registry;
  try {
    registry = JSON.parse(read("docs/design-system/component-registry.json")) as Registry;
  } catch (error) {
    result.errors.push(`Invalid JSON: docs/design-system/component-registry.json (${String(error)})`);
    return;
  }

  for (const component of registry.components ?? []) {
    if (!component.name) result.errors.push("Registry component is missing name.");
    if (!component.figma?.componentSet) result.errors.push(`Registry component ${component.name} is missing figma.componentSet.`);
    if (!component.figma?.nodeId) result.errors.push(`Registry component ${component.name} is missing figma.nodeId.`);
    if (component.code?.docs && !exists(component.code.docs)) {
      result.errors.push(`Registry docs missing for ${component.name}: ${component.code.docs}`);
    }
    if (component.code?.path && !component.code.path.includes("src/components/")) {
      result.warnings.push(`Registry code path for ${component.name} is not under src/components.`);
    }
  }
}

function auditThemeShape(result: AuditResult) {
  if (!exists("src/theme/index.ts")) {
    result.errors.push("Missing src/theme/index.ts");
    return;
  }

  const themeFiles = walk("src/theme").filter((file) => file.endsWith(".ts"));
  const combined = themeFiles.map((file) => read(file)).join("\n");

  const expectedThemeMarkers = [
    "content",
    "background",
    "status",
    "accent",
    "xxs",
    "pill",
    "display",
    "body",
    "button",
    "export const theme"
  ];

  for (const marker of expectedThemeMarkers) {
    if (!combined.includes(marker)) {
      result.errors.push(`Theme does not expose current token marker: ${marker}`);
    }
  }
}

function auditVisualValues(result: AuditResult) {
  const files = walk("src/components")
    .concat(walk("app"))
    .filter((file) => /\.(ts|tsx)$/.test(file));

  result.filesScanned += files.length;

  const patterns: Array<{
    severity: "error" | "warning";
    regex: RegExp;
    message: string;
    suggestion: string;
  }> = [
    {
      severity: "error",
      regex: /#[0-9A-Fa-f]{3,8}|rgba?\(/g,
      message: "hardcoded color",
      suggestion: "theme.colors.*"
    },
    {
      severity: "warning",
      regex: /\b(?:padding|paddingHorizontal|paddingVertical|paddingTop|paddingBottom|paddingLeft|paddingRight|margin|marginTop|marginBottom|marginLeft|marginRight|gap|rowGap|columnGap|itemSpacing)\s*:\s*(?!theme\.spacing|spacing\[|spacing\.)\d+/g,
      message: "raw spacing value",
      suggestion: "theme.spacing.*"
    },
    {
      severity: "warning",
      regex: /\b(?:borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\s*:\s*(?!theme\.radius|radius\.)\d+/g,
      message: "raw radius value",
      suggestion: "theme.radius.*"
    },
    {
      severity: "warning",
      regex: /\b(?:fontSize|lineHeight|fontWeight|letterSpacing)\s*:\s*(?!theme\.typography|typography\.)[-]?\d+/g,
      message: "raw typography value",
      suggestion: "theme.typography.*"
    },
    {
      severity: "warning",
      regex: /\b(?:shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation)\s*:/g,
      message: "local elevation value",
      suggestion: "theme.shadows.*"
    }
  ];

  for (const file of files) {
    const content = read(file);
    for (const pattern of patterns) {
      for (const match of content.matchAll(pattern.regex)) {
        if (match.index == null) continue;
        report(result, pattern.severity, file, content, match.index, pattern.message, pattern.suggestion);
      }
    }
  }
}

function auditTokenDrift(result: AuditResult) {
  if (!exists("docs/design-system/tokens.design.json")) return;
  if (!exists("src/theme/colors.ts")) return;

  const tokenJson = read("docs/design-system/tokens.design.json");
  const themeCombined = walk("src/theme")
    .filter((file) => file.endsWith(".ts"))
    .map((file) => read(file))
    .join("\n");

  for (const required of ["#9FE870", "#F3F3F3", "content", "background", "status", "accent"]) {
    if (!tokenJson.includes(required)) result.errors.push(`tokens.design.json missing ${required}`);
    if (!themeCombined.includes(required)) result.errors.push(`src/theme missing ${required}`);
  }
}

const result: AuditResult = {
  ok: true,
  errors: [],
  warnings: [],
  filesScanned: 0
};

auditDocs(result);
auditRegistry(result);
auditThemeShape(result);
auditVisualValues(result);
auditTokenDrift(result);

result.ok = result.errors.length === 0;

console.log("Design Token Audit");
console.log(`Files scanned: ${result.filesScanned}`);
console.log(`Errors: ${result.errors.length}`);
console.log(`Warnings: ${result.warnings.length}`);

for (const warning of result.warnings) {
  console.warn(`WARN ${warning}`);
}

for (const error of result.errors) {
  console.error(`ERROR ${error}`);
}

if (!result.ok) {
  process.exit(1);
}

console.log("Design token audit passed.");
