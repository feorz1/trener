import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Set as WorkoutSet, type WorkoutSetVariant } from "./Set";

const variants: WorkoutSetVariant[] = ["set", "new"];

const meta = {
  title: "Components/Set",
  component: WorkoutSet,
  args: {
    variant: "set"
  },
  argTypes: {
    variant: { control: "select", options: variants }
  }
} satisfies Meta<typeof WorkoutSet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.sm }}>
      <WorkoutSet variant="set" />
      <WorkoutSet variant="new" />
    </View>
  )
};
