import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Action, type ActionLayout } from "./Action";

const layouts: ActionLayout[] = ["single", "stacked", "inline", "triple"];

const meta = {
  title: "Components/Action",
  component: Action,
  args: {
    layout: "single"
  },
  argTypes: {
    layout: {
      control: "select",
      options: layouts
    }
  }
} satisfies Meta<typeof Action>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <View style={styles.storyFrame}>
      <Action {...args} />
    </View>
  )
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={[styles.storyFrame, { gap: theme.spacing.lg }]}>
      {layouts.map((layout) => (
        <Action key={layout} layout={layout} />
      ))}
    </View>
  )
};

const styles = {
  storyFrame: {
    width: theme.sizes.actionWidth,
    maxWidth: "100%" as const
  }
};
