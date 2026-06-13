import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";

export type HeaderSize = "xl" | "lg" | "md" | "sm";

export type HeaderProps = {
  title: string;
  subtitle?: string;
  showSubtitle?: boolean;
  subtitlePosition?: "top" | "bottom";
  size?: HeaderSize;
  width?: "fill";
  trailingSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const titleStyles = StyleSheet.create({
  xl: {
    ...theme.typography.display.sm,
    color: theme.colors.content.ink
  },
  lg: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink
  },
  md: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  sm: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  }
});

const subtitleStyles = StyleSheet.create({
  xl: {
    ...theme.typography.body.md,
    color: theme.colors.content.mute
  },
  lg: {
    ...theme.typography.body.md,
    color: theme.colors.content.mute
  },
  md: {
    ...theme.typography.body.md,
    color: theme.colors.content.mute
  },
  sm: {
    ...theme.typography.body.sm,
    color: theme.colors.content.mute
  }
});

export function Header({ title, subtitle, showSubtitle = true, subtitlePosition = "bottom", size = "xl", trailingSlot, style }: HeaderProps) {
  const shouldShowSubtitle = showSubtitle && Boolean(subtitle);
  const content = (
    <>
      {shouldShowSubtitle && subtitlePosition === "top" ? (
        <Text numberOfLines={1} style={subtitleStyles[size]}>
          {subtitle}
        </Text>
      ) : null}
      <Text numberOfLines={1} style={titleStyles[size]}>
        {title}
      </Text>
      {shouldShowSubtitle && subtitlePosition === "bottom" ? (
        <Text numberOfLines={1} style={subtitleStyles[size]}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  if (trailingSlot) {
    return (
      <View style={[styles.root, styles.rootWithTrailing, style]}>
        <View style={styles.textStack}>{content}</View>
        {trailingSlot}
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    justifyContent: "center",
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md
  },
  rootWithTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  textStack: {
    flex: 1,
    minWidth: theme.spacing[0],
    justifyContent: "center",
    gap: theme.spacing.xxs
  }
});
