import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Search, type SearchState } from "./Search";

const states: SearchState[] = ["empty", "default", "focus"];

type StoryArgs = {
  value: string;
  state: SearchState;
  showClearButton: boolean;
};

const meta: Meta<StoryArgs> = {
  title: "Components/Search",
  args: {
    value: "Value",
    state: "default",
    showClearButton: true
  },
  argTypes: {
    value: { control: "text" },
    state: { control: "select", options: states },
    showClearButton: { control: "boolean" }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);

    useEffect(() => {
      setValue(args.value);
    }, [args.value]);

    return <Search value={value} state={args.state} showClearButton={args.showClearButton} onChangeText={setValue} />;
  }
};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      <Search value="" state="empty" />
      <Search value="Value" state="default" />
      <Search value="Value" state="focus" />
    </View>
  )
};
