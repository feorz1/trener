import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Chip, type ChipState } from "./Chip";

const states: ChipState[] = ["default", "selected", "dropdown", "disabled"];

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: {
    label: "I am a chip",
    state: "default"
  },
  argTypes: {
    label: { control: "text" },
    state: { control: "select", options: states }
  }
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
      <Chip label="I am a chip unselected" state="default" />
      <Chip label="I am a chip" state="selected" />
      <Chip label="I am a chip unselected" state="dropdown" />
      <Chip label="I am a chip unselected" state="disabled" />
    </View>
  )
};
