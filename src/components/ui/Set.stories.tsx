import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Set as WorkoutSet, type WorkoutSetVariant } from "./Set";

const variants: WorkoutSetVariant[] = ["set", "new"];

const overflowValues = [
  { id: "one", label: "12x10кг" },
  { id: "two", label: "8x15кг" },
  { id: "three", label: "6x15кг" },
  { id: "four", label: "4x10кг" },
  { id: "five", label: "10x20кг" },
  { id: "six", label: "12x25кг" }
];

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

export const Overflow: Story = {
  render: () => (
    <View style={{ width: theme.sizes.listItemGymWidth - theme.sizes.listItemGymThumb - theme.spacing["3xl"] }}>
      <WorkoutSet variant="set" values={overflowValues} />
    </View>
  )
};
