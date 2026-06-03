import type { Meta, StoryObj } from "@storybook/react-native";
import { ChipsList } from "./ChipsList";

const meta = {
  title: "Components/ChipsList",
  component: ChipsList,
  args: {
    items: [
      { id: "mine", label: "Mine", state: "default" },
      { id: "muscles", label: "Muscles", state: "dropdown" }
    ]
  }
} satisfies Meta<typeof ChipsList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
