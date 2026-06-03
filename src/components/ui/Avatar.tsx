import { Image, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Icon, type IconName } from "./Icon";

export type AvatarSize = 40 | 48 | 56 | 72;
export type AvatarType = "icon" | "initials" | "image" | "count" | "pair" | "badge" | "notification";

export type AvatarProps = {
  type?: AvatarType;
  size?: AvatarSize;
  source?: ImageSourcePropType;
  secondarySource?: ImageSourcePropType;
  initials?: string;
  count?: string;
  iconName?: IconName;
  accessibilityLabel?: string;
};

const avatarSizes: Record<AvatarSize, number> = {
  40: theme.sizes.avatar40,
  48: theme.sizes.avatar48,
  56: theme.sizes.avatar56,
  72: theme.sizes.avatar72
};

export function Avatar({
  type = "image",
  size = 56,
  source,
  secondarySource,
  initials = "JW",
  count = "+3",
  iconName = "user",
  accessibilityLabel
}: AvatarProps) {
  const avatarSize = avatarSizes[size];

  if (type === "count") {
    const overlap = avatarSize * 0.82;
    const ring = theme.sizes.avatarRingStroke;

    return (
      <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={[styles.groupRoot, { width: overlap + avatarSize + ring, height: avatarSize }]}>
        <AvatarCircle size={avatarSize} source={source} />
        <RingedAvatarInitials size={avatarSize} label={count} style={{ position: "absolute", left: overlap - ring, top: -ring }} />
      </View>
    );
  }

  if (type === "pair") {
    const overlap = avatarSize * 0.82;
    const ring = theme.sizes.avatarRingStroke;

    return (
      <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={[styles.groupRoot, { width: overlap + avatarSize + ring, height: avatarSize }]}>
        <AvatarCircle size={avatarSize} source={source} />
        <RingedAvatarCircle size={avatarSize} source={secondarySource ?? source} style={{ position: "absolute", left: overlap - ring, top: -ring }} />
      </View>
    );
  }

  if (type === "icon") {
    return (
      <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={[styles.iconAvatar, circleStyle(avatarSize)]}>
        <Icon name={iconName} size={avatarSize * 0.5} color={theme.colors.content.inkDeep} />
      </View>
    );
  }

  if (type === "initials") {
    return <AvatarInitials accessibilityLabel={accessibilityLabel} size={avatarSize} label={initials} />;
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={[styles.singleRoot, circleStyle(avatarSize)]}>
      <AvatarCircle size={avatarSize} source={source} />
      {type === "badge" ? <Indicator size={avatarSize} tone="badge" /> : null}
      {type === "notification" ? <Indicator size={avatarSize} tone="notification" /> : null}
    </View>
  );
}

function RingedAvatarCircle({ size, source, style }: { size: number; source?: ImageSourcePropType; style?: StyleProp<ViewStyle> }) {
  const ring = theme.sizes.avatarRingStroke;

  return (
    <View style={[styles.ringShell, circleStyle(size + ring * 2), style]}>
      <AvatarCircle size={size} source={source} />
    </View>
  );
}

function AvatarCircle({ size, source, style }: { size: number; source?: ImageSourcePropType; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.circle, circleStyle(size), style]}>
      {source ? <Image source={source} resizeMode="cover" style={styles.image} /> : <AvatarImageFallback />}
    </View>
  );
}

function RingedAvatarInitials({ size, label, style }: { size: number; label: string; style?: StyleProp<ViewStyle> }) {
  const ring = theme.sizes.avatarRingStroke;

  return (
    <View style={[styles.ringShell, circleStyle(size + ring * 2), style]}>
      <AvatarInitials size={size} label={label} />
    </View>
  );
}

function AvatarInitials({
  size,
  label,
  style,
  accessibilityLabel
}: {
  size: number;
  label: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="image" style={[styles.initialsCircle, circleStyle(size), style]}>
      <Text style={[initialsTextStyle(size), styles.initialsText]}>{label}</Text>
    </View>
  );
}

function AvatarImageFallback() {
  return (
    <View style={styles.fallbackRoot}>
      <View style={styles.fallbackTop} />
      <View style={styles.fallbackBottom} />
    </View>
  );
}

function Indicator({ size, tone }: { size: number; tone: "badge" | "notification" }) {
  const dotSize = Math.max(theme.sizes.avatarIndicatorMin, Math.round(size * 0.24));
  const backgroundColor = tone === "notification" ? theme.colors.status.negative : theme.colors.content.primary;
  const verticalPosition = tone === "notification" ? -dotSize * 0.15 : size - dotSize * 1.4;

  return (
    <View
      style={[
        styles.indicator,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor,
          left: size - dotSize / 2,
          top: verticalPosition
        }
      ]}
    />
  );
}

function circleStyle(size: number) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2
  };
}

function initialsTextStyle(size: number) {
  if (size <= theme.sizes.avatar48) return theme.typography.body.smStrong;
  if (size <= theme.sizes.avatar56) return theme.typography.body.mdStrong;
  return theme.typography.display.xs;
}

const styles = StyleSheet.create({
  singleRoot: {
    position: "relative",
    overflow: "visible"
  },
  groupRoot: {
    position: "relative",
    overflow: "visible"
  },
  circle: {
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvasSoft
  },
  image: {
    width: "100%",
    height: "100%"
  },
  fallbackRoot: {
    flex: 1,
    backgroundColor: theme.colors.content.primaryPale
  },
  fallbackTop: {
    flex: 1,
    backgroundColor: theme.colors.accent.cyan
  },
  fallbackBottom: {
    flex: 1,
    backgroundColor: theme.colors.accent.orange
  },
  initialsCircle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background.canvasSoft
  },
  initialsText: {
    color: theme.colors.content.inkDeep
  },
  iconAvatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.sizes.avatarRingStroke,
    borderColor: theme.colors.background.canvasSoft,
    backgroundColor: theme.colors.background.canvas
  },
  ringShell: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background.canvas
  },
  indicator: {
    position: "absolute",
    borderWidth: theme.sizes.avatarRingStroke,
    borderColor: theme.colors.background.canvas
  }
});
