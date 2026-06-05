export const radius = {
  none: 0,
  s: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
  full: 9999,

  // Compatibility aliases for existing components.
  m: 12,
  l: 16
} as const;

export type RadiusToken = keyof typeof radius;
