export const typography = {
  display: {
    mega: {
      fontFamily: "Inter",
      fontSize: 126,
      lineHeight: 107.1,
      fontWeight: "700",
      letterSpacing: 0
    },
    xxl: {
      fontFamily: "Inter",
      fontSize: 96,
      lineHeight: 81.6,
      fontWeight: "700",
      letterSpacing: 0
    },
    xl: {
      fontFamily: "Inter",
      fontSize: 64,
      lineHeight: 54.4,
      fontWeight: "700",
      letterSpacing: 0
    },
    lg: {
      fontFamily: "Inter",
      fontSize: 47,
      lineHeight: 70.5,
      fontWeight: "400",
      letterSpacing: -0.108
    },
    md: {
      fontFamily: "Inter",
      fontSize: 40,
      lineHeight: 34,
      fontWeight: "700",
      letterSpacing: 0
    },
    sm: {
      fontFamily: "Inter",
      fontSize: 32,
      lineHeight: 38.4,
      fontWeight: "600",
      letterSpacing: -0.96
    },
    xs: {
      fontFamily: "Inter",
      fontSize: 24,
      lineHeight: 31.2,
      fontWeight: "600",
      letterSpacing: -0.48
    }
  },
  body: {
    lg: {
      fontFamily: "Inter",
      fontSize: 20,
      lineHeight: 30,
      fontWeight: "600",
      letterSpacing: 0
    },
    md: {
      fontFamily: "Inter",
      fontSize: 16,
      lineHeight: 24,
      fontWeight: "400",
      letterSpacing: 0
    },
    mdStrong: {
      fontFamily: "Inter",
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "600",
      letterSpacing: 0
    },
    sm: {
      fontFamily: "Inter",
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "400",
      letterSpacing: 0
    },
    smStrong: {
      fontFamily: "Inter",
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "600",
      letterSpacing: 0
    },
    smCaption: {
      fontFamily: "Inter",
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      letterSpacing: 0
    },
    caption: {
      fontFamily: "Inter",
      fontSize: 10,
      lineHeight: 16,
      fontWeight: "600",
      letterSpacing: 0
    }
  },
  caption: {
    fontFamily: "Inter",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0
  },
  captionStrong: {
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0
  },
  button: {
    md: {
      fontFamily: "Inter",
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "600",
      letterSpacing: 0
    }
  },

  // Compatibility aliases for existing components.
  fontFamily: {
    base: "Inter"
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
    fontFamily: "Inter",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700"
  },
  h1: {
    fontFamily: "Inter",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700"
  },
  h2: {
    fontFamily: "Inter",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700"
  },
  h3: {
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600"
  },
  bodyLegacy: {
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400"
  },
  bodyStrong: {
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600"
  },
  buttonLegacy: {
    fontFamily: "Inter",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700"
  },
  number: {
    fontFamily: "Inter",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700"
  }
} as const;

export type TypographyToken = typeof typography;
