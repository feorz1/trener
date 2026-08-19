import { Platform } from "react-native";
import { colors } from "./colors";

export function withResolvedShadowColor(shadow: object | undefined, shadowColor: string) {
  return { ...shadow, shadowColor };
}

export const shadows = {
  none: {},
  card: Platform.select({
    ios: {
      shadowColor: colors.background.shadow,
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
      shadowColor: colors.background.shadow,
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
      shadowColor: colors.background.shadow,
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
      shadowColor: colors.background.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 40
    },
    android: {
      elevation: 6
    },
    web: {
      boxShadow: "0px 8px 40px light-dark(rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.48))"
    },
    default: {}
  }),
  glassAction: Platform.select({
    ios: {
      shadowColor: colors.background.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 18
    },
    android: {
      elevation: 6
    },
    web: {
      boxShadow: "0px 10px 28px light-dark(rgba(14, 15, 12, 0.1), rgba(0, 0, 0, 0.5)), 0px 2px 8px light-dark(rgba(14, 15, 12, 0.05), rgba(0, 0, 0, 0.32))"
    },
    default: {}
  }),
  notification: Platform.select({
    ios: {
      shadowColor: colors.background.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 44
    },
    android: {
      elevation: 4
    },
    default: {}
  }),
  notificationHalo: Platform.select({
    ios: {
      shadowColor: colors.background.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.14,
      shadowRadius: 34
    },
    android: {
      elevation: 2
    },
    default: {}
  })
} as const;
