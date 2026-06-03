import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type NavigationProps = {
  title: string;
  subtitle?: string;
  showSubtitle?: boolean;
  onBack?: PressableProps["onPress"];
  backAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Navigation({
  title,
  subtitle,
  showSubtitle = true,
  onBack,
  backAccessibilityLabel = "Go back",
  style
}: NavigationProps) {
  const hasSubtitle = showSubtitle && Boolean(subtitle);

  return (
    <View style={[styles.root, style]}>
      <Pressable
        accessibilityLabel={backAccessibilityLabel}
        accessibilityRole="button"
        hitSlop={theme.spacing.sm}
        onPress={onBack}
        style={({ pressed }) => [styles.sideSlot, pressed && styles.pressed]}
      >
        <Icon name="arrow left" size={theme.sizes.navigationIcon} color={theme.colors.content.ink} />
      </Pressable>

      <View style={styles.centerSlot}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {hasSubtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.sideSlot} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    minHeight: theme.sizes.navigationHeight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg
  },
  sideSlot: {
    width: theme.sizes.navigationHeight,
    minHeight: theme.sizes.navigationHeight,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  centerSlot: {
    flex: 1,
    minWidth: theme.spacing[0],
    minHeight: theme.sizes.navigationHeight,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  subtitle: {
    ...theme.typography.body.sm,
    color: theme.colors.content.mute,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.64
  }
});
