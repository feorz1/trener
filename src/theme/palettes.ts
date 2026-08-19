type ColorPaletteShape<T> = {
  [Key in keyof T]: T[Key] extends string ? string : ColorPaletteShape<T[Key]>;
};

export const lightColors = {
  content: {
    primary: "#9FE870",
    onPrimary: "#0E0F0C",
    primaryActive: "#CDFFAD",
    primaryNeutral: "#C5EDAB",
    primaryPale: "#E2F6D5",
    ink: "#0E0F0C",
    inkDeep: "#163300",
    controlAccent: "#163300",
    body: "#454745",
    mute: "#6F716E",
    disabled: "#CFCFCF"
  },
  background: {
    canvas: "#FFFFFF",
    canvasSoft: "#EFEFEF",
    border: "#E9E9E9",
    cardDivider: "#F5F4F2",
    glass: "rgba(239, 239, 239, 0.72)",
    glassOverlay: "rgba(255, 255, 255, 0.24)",
    notificationHalo: "rgba(255, 255, 255, 0.96)",
    notificationHaloSoft: "rgba(255, 255, 255, 0.72)",
    overlay: "#0E0F0C",
    shadow: "#0E0F0C",
    splash: "#163300",
    app: "#EFEFEF",
    surface: "#FFFFFF",
    surfaceSoft: "#E2F6D5",
    surfaceMuted: "#EFEFEF"
  },
  status: {
    positive: "#2EAD4B",
    positiveDeep: "#054D28",
    warning: "#FFD11A",
    warningDeep: "#F38800",
    warningDeepSoft: "#FDE7CC",
    warningDarkest: "#9A5600",
    warningContent: "#4A3B1C",
    warningText: "#7A4300",
    onWarningDeep: "#0E0F0C",
    negative: "#D03238",
    negativeDeep: "#A72027",
    negativeDarkest: "#A7000D",
    negativeSoft: "#F6D6D7",
    negativeBg: "#320707",
    negativeContent: "#FFFFFF",
    onNegative: "#FFFFFF",
    success: "#2EAD4B",
    successSoft: "#E2F6D5",
    warningSoft: "#FFF6CC",
    error: "#D03238",
    errorSoft: "#FDEAEA",
    neutral: "#EFEFEF"
  },
  accent: {
    orange: "#FFC091",
    cyan: "#38C8FF",
    onCyan: "#0E0F0C",
    rayPrimary: "#9FE870",
    raySecondary: "#CDFFAD"
  },
  auth: {
    vk: "#0077FF",
    yandex: "#000000",
    yandexMark: "#FC3F1D",
    onBrand: "#FFFFFF"
  },
  text: {
    primary: "#0E0F0C",
    secondary: "#454745",
    muted: "#6F716E",
    inverse: "#FFFFFF",
    disabled: "#CFCFCF"
  },
  border: {
    default: "#0E0F0C",
    active: "#9FE870",
    soft: "#EFEFEF"
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

export const darkColors = {
  content: {
    primary: "#2F571F",
    onPrimary: "#F5F5F4",
    primaryActive: "#3B682B",
    primaryNeutral: "#416D31",
    primaryPale: "#21301D",
    ink: "#F5F5F4",
    inkDeep: "#F0F0EE",
    controlAccent: "#A9EC7D",
    body: "#C7C7C4",
    mute: "#A0A09C",
    disabled: "#6B6B68"
  },
  background: {
    canvas: "#141414",
    canvasSoft: "#242424",
    border: "#3A3A3A",
    cardDivider: "#2E2E2E",
    glass: "rgba(36, 36, 36, 0.78)",
    glassOverlay: "rgba(255, 255, 255, 0.08)",
    notificationHalo: "rgba(36, 36, 36, 0.96)",
    notificationHaloSoft: "rgba(36, 36, 36, 0.76)",
    overlay: "#000000",
    shadow: "#000000",
    splash: "#163300",
    app: "#101010",
    surface: "#1C1C1C",
    surfaceSoft: "#21301D",
    surfaceMuted: "#242424"
  },
  status: {
    positive: "#66CF7E",
    positiveDeep: "#9FE8AD",
    warning: "#F2C94C",
    warningDeep: "#FF9F43",
    warningDeepSoft: "#3A2813",
    warningDarkest: "#FFD29A",
    warningContent: "#2C240D",
    warningText: "#FFD29A",
    onWarningDeep: "#141414",
    negative: "#FF6B70",
    negativeDeep: "#FF8C90",
    negativeDarkest: "#FFB4B7",
    negativeSoft: "#401D20",
    negativeBg: "#300B0E",
    negativeContent: "#FFECEE",
    onNegative: "#141414",
    success: "#66CF7E",
    successSoft: "#21301D",
    warningSoft: "#382F10",
    error: "#FF6B70",
    errorSoft: "#401D20",
    neutral: "#242424"
  },
  accent: {
    orange: "#FFB47E",
    cyan: "#66D4FF",
    onCyan: "#141414",
    rayPrimary: "#9FE870",
    raySecondary: "#CDFFAD"
  },
  auth: {
    vk: "#278CFF",
    yandex: "#000000",
    yandexMark: "#FC3F1D",
    onBrand: "#FFFFFF"
  },
  text: {
    primary: "#F5F5F4",
    secondary: "#C7C7C4",
    muted: "#A0A09C",
    inverse: "#141414",
    disabled: "#6B6B68"
  },
  border: {
    default: "#F0F0EE",
    active: "#9FE870",
    soft: "#3A3A3A"
  },
  brand: {
    primary: "#9FE870",
    dark: "#163300",
    soft: "#21301D",
    contrast: "#0E0F0C"
  },
  workout: {
    planned: "#21301D",
    inProgress: "#F2C94C",
    completed: "#21301D",
    cancelled: "#401D20"
  }
} as const satisfies ColorPaletteShape<typeof lightColors>;

export type ThemeColors = ColorPaletteShape<typeof lightColors>;
