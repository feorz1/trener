import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { CalendarMonth } from "./CalendarMonth";

type StoryArgs = {
  selectedKey: string;
};

const meta: Meta<StoryArgs> = {
  title: "Components/CalendarMonth",
  args: {
    selectedKey: "2026-07-04"
  },
  argTypes: {
    selectedKey: {
      control: "text"
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => {
    const [selectedKey, setSelectedKey] = useState(args.selectedKey);

    return <CalendarMonth selectedKey={selectedKey} minDate={new Date(2026, 6, 4)} onSelect={setSelectedKey} />;
  }
};
