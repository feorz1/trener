import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type TokenType = "color" | "dimension" | "number" | "string" | "fontFamily";

type TokenNode = {
  $type?: TokenType;
  type?: TokenType;
  $value?: unknown;
  value?: unknown;
  [key: string]: unknown;
};

const rootDir = resolve(__dirname, "..");
const inputPath = resolve(rootDir, "design-tokens/figma-light.json");
const themeDir = resolve(rootDir, "src/theme");

const rawTokens = JSON.parse(readFileSync(inputPath, "utf8")) as Record<string, TokenNode>;

const isToken = (value: unknown): value is TokenNode => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as TokenNode;
  return "$value" in node || "value" in node;
};

const tokenType = (token: TokenNode): TokenType | undefined => token.$type ?? token.type;
const tokenValue = (token: TokenNode): unknown => token.$value ?? token.value;

const toCamelCase = (key: string) =>
  key.replace(/[-_\s]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase());

const normalizeSegment = (key: string) => key.replace(/[-_\s]+/g, "").toLowerCase();

const getPath = (source: unknown, path: string[]): unknown => {
  let current = source;

  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    const record = current as Record<string, unknown>;
    const exact = record[segment];
    if (exact !== undefined) {
      current = exact;
      continue;
    }

    const normalizedSegment = normalizeSegment(segment);
    const matchingKey = Object.keys(record).find((key) => normalizeSegment(key) === normalizedSegment);
    current = matchingKey ? record[matchingKey] : undefined;
  }

  return current;
};

const resolveAlias = (alias: string, seen: string[]) => {
  const path = alias.slice(1, -1).split(".");
  const target = getPath(rawTokens, path);

  if (!isToken(target)) {
    throw new Error(`Alias "${alias}" does not point to a token.`);
  }

  return resolveToken(target, seen.concat(alias));
};

const componentToHex = (component: number) =>
  Math.round(Math.max(0, Math.min(1, component)) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

const colorToString = (value: unknown): string => {
  if (typeof value === "string") {
    if (/^\{.+\}$/.test(value)) {
      return String(resolveAlias(value, []));
    }

    return value;
  }

  if (!value || typeof value !== "object") {
    throw new Error(`Unsupported color token value: ${JSON.stringify(value)}`);
  }

  const color = value as { hex?: string; alpha?: number; components?: number[] };
  if (color.hex && (color.alpha === undefined || color.alpha >= 1)) {
    return color.hex.toUpperCase();
  }

  if (color.hex && color.alpha !== undefined && color.alpha < 1) {
    const hex = color.hex.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Number(color.alpha.toFixed(3))})`;
  }

  if (Array.isArray(color.components) && color.components.length >= 3) {
    const [r, g, b] = color.components;
    if (color.alpha !== undefined && color.alpha < 1) {
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${Number(
        color.alpha.toFixed(3)
      )})`;
    }

    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
  }

  throw new Error(`Unsupported color token value: ${JSON.stringify(value)}`);
};

const dimensionToNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    if (/^\{.+\}$/.test(value)) {
      return Number(resolveAlias(value, []));
    }

    return Number.parseFloat(value);
  }

  if (value && typeof value === "object" && "value" in value) {
    const nestedValue = (value as { value: unknown }).value;
    return dimensionToNumber(nestedValue);
  }

  throw new Error(`Unsupported dimension token value: ${JSON.stringify(value)}`);
};

const fontWeightToReactNative = (value: unknown) => {
  const label = String(value);
  const weights: Record<string, string> = {
    regular: "400",
    medium: "500",
    semibold: "600",
    "semi bold": "600",
    bold: "700"
  };

  return weights[label.toLowerCase()] ?? label;
};

const resolveToken = (token: TokenNode, seen: string[] = []): unknown => {
  const value = tokenValue(token);

  if (typeof value === "string" && /^\{.+\}$/.test(value)) {
    if (seen.includes(value)) {
      throw new Error(`Circular token alias detected: ${seen.concat(value).join(" -> ")}`);
    }

    return resolveAlias(value, seen);
  }

  switch (tokenType(token)) {
    case "color":
      return colorToString(value);
    case "dimension":
    case "number":
      return dimensionToNumber(value);
    case "fontFamily":
    case "string":
      return value;
    default:
      return value;
  }
};

const resolveGroup = (group: unknown): unknown => {
  if (isToken(group)) {
    return resolveToken(group);
  }

  if (!group || typeof group !== "object") {
    return group;
  }

  return Object.fromEntries(
    Object.entries(group as Record<string, unknown>).map(([key, value]) => [toCamelCase(key), resolveGroup(value)])
  );
};

const serialize = (value: unknown) => JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, "$1:");

const writeThemeFile = (fileName: string, body: string) => {
  const path = resolve(themeDir, fileName);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${body.trim()}\n`, "utf8");
};

const colors = resolveGroup(rawTokens.color ?? {});
const spacing = resolveGroup(rawTokens.spacing ?? {});
const radius = resolveGroup(rawTokens.radius ?? {});
const sizes = resolveGroup(rawTokens.size ?? {});
const typographySource = resolveGroup(rawTokens.typography ?? {}) as {
  fontFamily?: Record<string, string>;
  fontSize?: Record<string, number>;
  lineHeight?: Record<string, number>;
  fontWeightLabel?: Record<string, string>;
};

const fontFamily = typographySource.fontFamily ?? { base: "System" };
const fontSize = typographySource.fontSize ?? {};
const lineHeight = typographySource.lineHeight ?? {};
const fontWeight = Object.fromEntries(
  Object.entries(typographySource.fontWeightLabel ?? {}).map(([key, value]) => [key, fontWeightToReactNative(value)])
);

const typography = {
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  title: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.h1 ?? 32,
    lineHeight: lineHeight.h1 ?? 38,
    fontWeight: fontWeight.bold ?? "700"
  },
  h1: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.h2 ?? 24,
    lineHeight: lineHeight.h2 ?? 30,
    fontWeight: fontWeight.bold ?? "700"
  },
  h2: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.h3 ?? 20,
    lineHeight: lineHeight.h3 ?? 26,
    fontWeight: fontWeight.bold ?? "700"
  },
  h3: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.body ?? 16,
    lineHeight: lineHeight.body ?? 22,
    fontWeight: fontWeight.semibold ?? "600"
  },
  body: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.body ?? 16,
    lineHeight: lineHeight.body ?? 22,
    fontWeight: fontWeight.regular ?? "400"
  },
  bodyStrong: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.body ?? 16,
    lineHeight: lineHeight.body ?? 22,
    fontWeight: fontWeight.semibold ?? "600"
  },
  caption: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.caption ?? 12,
    lineHeight: lineHeight.caption ?? 16,
    fontWeight: fontWeight.medium ?? "500"
  },
  button: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.body ?? 16,
    lineHeight: lineHeight.body ?? 22,
    fontWeight: fontWeight.bold ?? "700"
  },
  number: {
    fontFamily: fontFamily.base,
    fontSize: fontSize.h2 ?? 24,
    lineHeight: lineHeight.h2 ?? 30,
    fontWeight: fontWeight.bold ?? "700"
  }
};

writeThemeFile(
  "colors.ts",
  `
export const colors = ${serialize(colors)} as const;

export type ColorToken = typeof colors;
`
);

writeThemeFile(
  "spacing.ts",
  `
export const spacing = ${serialize(spacing)} as const;

export type SpacingToken = keyof typeof spacing;
`
);

writeThemeFile(
  "radius.ts",
  `
export const radius = ${serialize(radius)} as const;

export type RadiusToken = keyof typeof radius;
`
);

writeThemeFile(
  "sizes.ts",
  `
export const sizes = ${serialize(sizes)} as const;

export type SizeToken = keyof typeof sizes;
`
);

writeThemeFile(
  "typography.ts",
  `
export const typography = ${serialize(typography)} as const;
`
);

writeThemeFile(
  "index.ts",
  `
export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./radius";
export * from "./sizes";
export * from "./shadows";
`
);

console.log("Theme files generated from design-tokens/figma-light.json");
