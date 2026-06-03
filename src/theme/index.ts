export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./radius";
export * from "./sizes";
export * from "./shadows";

import { colors } from "./colors";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { sizes } from "./sizes";
import { spacing } from "./spacing";
import { typography } from "./typography";

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  sizes,
  shadows
} as const;

export type Theme = typeof theme;
