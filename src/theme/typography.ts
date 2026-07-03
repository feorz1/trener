import { Platform } from "react-native";

const systemFontFamily = Platform.select({
  ios: "SF Pro Display",
  android: "sans-serif",
  default: "system-ui"
});

const fontFamilies = {
  regular: systemFontFamily,
  medium: systemFontFamily,
  semibold: systemFontFamily,
  bold: systemFontFamily
} as const;

export const typography = {
  display: {
    mega: {
      fontFamily: fontFamilies.bold,
      fontSize: 126,
      lineHeight: 107.1,
      fontWeight: "700",
      letterSpacing: 0
    },
    xxl: {
      fontFamily: fontFamilies.bold,
      fontSize: 96,
      lineHeight: 81.6,
      fontWeight: "700",
      letterSpacing: 0
    },
    xl: {
      fontFamily: fontFamilies.bold,
      fontSize: 64,
      lineHeight: 54.4,
      fontWeight: "700",
      letterSpacing: 0.22
    },
    lg: {
      fontFamily: fontFamilies.regular,
      fontSize: 47,
      lineHeight: 70.5,
      fontWeight: "400",
      letterSpacing: 0.37
    },
    md: {
      fontFamily: fontFamilies.bold,
      fontSize: 40,
      lineHeight: 34,
      fontWeight: "700",
      letterSpacing: 0.37
    },
    sm: {
      fontFamily: fontFamilies.semibold,
      fontSize: 32,
      lineHeight: 38.4,
      fontWeight: "600",
      letterSpacing: 0.4
    },
    xs: {
      fontFamily: fontFamilies.medium,
      fontSize: 24,
      lineHeight: 31.2,
      fontWeight: "500",
      letterSpacing: 0.35
    }
  },
  body: {
    lg: {
      fontFamily: fontFamilies.semibold,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "600",
      letterSpacing: 0.38
    },
    md: {
      fontFamily: fontFamilies.regular,
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "400",
      letterSpacing: -0.32
    },
    mdStrong: {
      fontFamily: fontFamilies.medium,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "500",
      letterSpacing: -0.32
    },
    sm: {
      fontFamily: fontFamilies.regular,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "400",
      letterSpacing: -0.15
    },
    smStrong: {
      fontFamily: fontFamilies.medium,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "500",
      letterSpacing: -0.15
    },
    smCaption: {
      fontFamily: fontFamilies.medium,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "500",
      letterSpacing: 0
    },
    caption: {
      fontFamily: fontFamilies.semibold,
      fontSize: 10,
      lineHeight: 16,
      fontWeight: "600",
      letterSpacing: 0.12
    }
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0
  },
  captionStrong: {
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.12
  },
  button: {
    md: {
      fontFamily: fontFamilies.semibold,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "600",
      letterSpacing: -0.32
    }
  },

  // Compatibility aliases for existing components.
  fontFamily: {
    base: fontFamilies.regular,
    medium: fontFamilies.medium,
    semibold: fontFamilies.semibold,
    bold: fontFamilies.bold
  },
  fontSize: {
    h1: 32,
    h2: 24,
    h3: 20,
    body: 16,
    label: 14,
    caption: 12
  },
  lineHeight: {
    h1: 38,
    h2: 30,
    h3: 26,
    body: 22,
    label: 18,
    caption: 16
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700"
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700"
  },
  h1: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700"
  },
  h2: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700"
  },
  h3: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600"
  },
  bodyLegacy: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400"
  },
  bodyStrong: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600"
  },
  buttonLegacy: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700"
  },
  number: {
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700"
  }
} as const;

export type TypographyToken = typeof typography;
