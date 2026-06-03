import type { Meta, StoryObj } from "@storybook/react-native";
import { StyleSheet, View } from "react-native";
import { theme } from "@/theme";
import { Divider, type DividerTone, type DividerWidth } from "./Divider";

const widths: DividerWidth[] = ["fixed", "fill"];
const tones: DividerTone[] = ["canvas", "canvasSoft", "cardDivider"];

const meta = {
  title: "Components/Divider",
  component: Divider,
  args: {
    width: "fill",
    tone: "canvas"
  },
  argTypes: {
    width: {
      control: "select",
      options: widths
    },
    tone: {
      control: "select",
      options: tones
    }
  }
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <View style={styles.storyFrame}>
      <Divider {...args} />
    </View>
  )
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={styles.variants}>
      <View style={styles.cardStack}>
        <View style={styles.grayCardTop} />
        <Divider width="fixed" tone="canvas" />
        <View style={styles.grayCardBottom} />
      </View>
      <View style={styles.fillStack}>
        <View style={styles.canvasCardTop} />
        <Divider width="fill" tone="canvasSoft" />
        <View style={styles.canvasCardBottom} />
      </View>
    </View>
  )
};

const styles = StyleSheet.create({
  storyFrame: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing["3xl"]
  },
  variants: {
    alignItems: "center",
    gap: theme.spacing["3xl"]
  },
  cardStack: {
    width: theme.sizes.dividerWidth,
    alignItems: "stretch",
    backgroundColor: theme.colors.background.canvas
  },
  fillStack: {
    width: theme.sizes.cardWorkoutWidth,
    alignItems: "stretch",
    backgroundColor: theme.colors.background.canvasSoft
  },
  grayCardTop: {
    height: theme.spacing["3xl"],
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.disabled
  },
  grayCardBottom: {
    height: theme.spacing["3xl"],
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.disabled
  },
  canvasCardTop: {
    height: theme.spacing["3xl"],
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  canvasCardBottom: {
    height: theme.spacing["3xl"],
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  }
});
