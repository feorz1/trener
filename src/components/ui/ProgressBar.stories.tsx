import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { ProgressBar } from "./ProgressBar";

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  args: {
    completed: 3,
    total: 6,
    showBadge: true
  },
  argTypes: {
    completed: {
      control: "number"
    },
    total: {
      control: "number"
    },
    showBadge: {
      control: "boolean"
    }
  }
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg, width: "100%" }}>
      {[0, 1, 2, 3, 4, 5, 6].map((completed) => (
        <ProgressBar key={completed} completed={completed} total={6} />
      ))}
    </View>
  )
};
