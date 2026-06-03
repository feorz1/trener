import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { StateSelect } from "./StateSelect";

const meta = {
  title: "Components/StateSelect",
  component: StateSelect,
  args: {
    selectedCount: 5
  },
  argTypes: {
    selectedCount: { control: "number" }
  }
} satisfies Meta<typeof StateSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => {
    const [selectedCount, setSelectedCount] = useState(args.selectedCount ?? 0);

    return <StateSelect selectedCount={selectedCount} onReset={() => setSelectedCount(0)} />;
  }
};
