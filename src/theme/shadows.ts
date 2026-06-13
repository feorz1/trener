import { Platform } from "react-native";
import { colors } from "./colors";

export const shadows = {
  none: {},
  card: Platform.select({
    ios: {
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18
    },
    android: {
      elevation: 2
    },
    default: {}
  }),
  raised: Platform.select({
    ios: {
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24
    },
    android: {
      elevation: 4
    },
    default: {}
  }),
  dividerOverlay: Platform.select({
    android: {
      elevation: 1
    },
    default: {}
  }),
  switchThumb: Platform.select({
    ios: {
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20
    },
    android: {
      elevation: 2
    },
    default: {}
  }),
  glass: Platform.select({
    ios: {
      shadowColor: colors.text.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 40
    },
    android: {
      elevation: 6
    },
    default: {}
  }),
  glassAction: Platform.select({
    ios: {
      shadowColor: colors.content.ink,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 18
    },
    android: {
      elevation: 6
    },
    web: {
      boxShadow: "0px 10px 28px rgba(14, 15, 12, 0.1), 0px 2px 8px rgba(14, 15, 12, 0.05)"
    },
    default: {}
  })
} as const;
