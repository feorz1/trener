export const colors = {
  content: {
    primary: "#9FE870",
    onPrimary: "#0E0F0C",
    primaryActive: "#CDFFAD",
    primaryNeutral: "#C5EDAB",
    primaryPale: "#E2F6D5",
    ink: "#0E0F0C",
    inkDeep: "#163300",
    body: "#454745",
    mute: "#868685",
    disabled: "#CFCFCF"
  },
  background: {
    canvas: "#FFFFFF",
    canvasSoft: "#F3F3F3",
    cardDivider: "#F5F4F2",

    // Compatibility aliases for the pre-Wise app screens.
    app: "#F3F3F3",
    surface: "#FFFFFF",
    surfaceSoft: "#E2F6D5",
    surfaceMuted: "#F3F3F3",
    overlay: "#0E0F0C"
  },
  status: {
    positive: "#2EAD4B",
    positiveDeep: "#054D28",
    warning: "#FFD11A",
    warningDeep: "#F38800",
    warningContent: "#4A3B1C",
    negative: "#D03238",
    negativeDeep: "#A72027",
    negativeDarkest: "#A7000D",
    negativeBg: "#320707",

    // Compatibility aliases for existing components.
    success: "#2EAD4B",
    successSoft: "#E2F6D5",
    warningSoft: "#FFF6CC",
    error: "#D03238",
    errorSoft: "#FDEAEA",
    neutral: "#F3F3F3"
  },
  accent: {
    orange: "#FFC091",
    cyan: "#38C8FF"
  },

  // Compatibility aliases. New code should prefer theme.colors.content/background/status/accent.
  text: {
    primary: "#0E0F0C",
    secondary: "#454745",
    muted: "#868685",
    inverse: "#FFFFFF",
    disabled: "#CFCFCF"
  },
  border: {
    default: "#0E0F0C",
    active: "#9FE870",
    soft: "#F3F3F3"
  },
  brand: {
    primary: "#9FE870",
    dark: "#163300",
    soft: "#E2F6D5",
    contrast: "#0E0F0C"
  },
  workout: {
    planned: "#E2F6D5",
    inProgress: "#FFD11A",
    completed: "#E2F6D5",
    cancelled: "#FDEAEA"
  }
} as const;

export type ColorToken = typeof colors;
