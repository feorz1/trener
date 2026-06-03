import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { theme } from "@/theme";

export type DividerType = "card";
export type DividerWidth = "fixed" | "fill";
export type DividerTone = "canvas" | "canvasSoft" | "cardDivider";

export type DividerProps = {
  type?: DividerType;
  width?: DividerWidth;
  tone?: DividerTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

type DividerCornerPosition = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

const cornerPaths: Record<DividerCornerPosition, string> = {
  topLeft:
    "M3.74254e-10 0C3.74254e-10 7.43977 -0.000397259 11.1599 0.817383 14.2119C3.03662 22.494 9.50599 28.9634 17.7881 31.1826C20.8401 32.0004 24.5602 32 32 32H3.74254e-10V0Z",
  topRight:
    "M32 32H0C7.43977 32 11.1599 32.0004 14.2119 31.1826C22.494 28.9634 28.9634 22.494 31.1826 14.2119C32.0004 11.1599 32 7.43977 32 0V32Z",
  bottomLeft:
    "M32 3.74254e-10C24.5602 3.74254e-10 20.8401 -0.000397259 17.7881 0.817383C9.50599 3.03662 3.03662 9.50599 0.817383 17.7881C-0.000397259 20.8401 3.74254e-10 24.5602 3.74254e-10 32V3.74254e-10H32Z",
  bottomRight:
    "M32 32C32 24.5602 32.0004 20.8401 31.1826 17.7881C28.9634 9.50599 22.494 3.03662 14.2119 0.817383C11.1599 -0.000397259 7.43977 3.74254e-10 0 3.74254e-10H32V32Z"
};

function getDividerColor(tone: DividerTone) {
  if (tone === "canvas") {
    return theme.colors.background.canvas;
  }

  return tone === "cardDivider" ? theme.colors.background.cardDivider : theme.colors.background.canvasSoft;
}

function DividerCorner({ color, position, style }: { color: string; position: DividerCornerPosition; style: StyleProp<ViewStyle> }) {
  return (
    <Svg width={theme.sizes.dividerCorner} height={theme.sizes.dividerCorner} viewBox="0 0 32 32" fill="none" style={style}>
      <Path d={cornerPaths[position]} fill={color} />
    </Svg>
  );
}

export function Divider({ type = "card", width = "fill", tone = "canvasSoft", style, testID }: DividerProps) {
  const color = getDividerColor(tone);

  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[styles.root, width === "fill" ? styles.fillWidth : styles.fixedWidth, type === "card" && styles.card, style]}
    >
      <View style={[styles.bar, { backgroundColor: color }]} />
      <DividerCorner color={color} position="topLeft" style={[styles.corner, styles.topCorner, styles.leftCorner]} />
      <DividerCorner color={color} position="topRight" style={[styles.corner, styles.topCorner, styles.rightCorner]} />
      <DividerCorner color={color} position="bottomLeft" style={[styles.corner, styles.bottomCorner, styles.leftCorner]} />
      <DividerCorner color={color} position="bottomRight" style={[styles.corner, styles.bottomCorner, styles.rightCorner]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "relative",
    height: theme.sizes.dividerHeight,
    flexDirection: "row",
    overflow: "visible"
  },
  fixedWidth: {
    width: theme.sizes.dividerWidth
  },
  fillWidth: {
    alignSelf: "stretch",
    width: "100%"
  },
  card: {},
  bar: {
    flex: 1,
    height: "100%"
  },
  corner: {
    position: "absolute",
    width: theme.sizes.dividerCorner,
    height: theme.sizes.dividerCorner
  },
  topCorner: {
    top: -theme.sizes.dividerCorner
  },
  bottomCorner: {
    bottom: -theme.sizes.dividerCorner
  },
  leftCorner: {
    left: theme.spacing[0]
  },
  rightCorner: {
    right: theme.spacing[0]
  }
});
