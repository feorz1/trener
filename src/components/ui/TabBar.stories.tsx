import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { theme } from "@/theme";
import { TabBar, trainerTabBarItems } from "./TabBar";

const meta = {
  title: "Components/TabBar",
  component: TabBar,
  args: {
    selectedValue: "home"
  },
  argTypes: {
    selectedValue: {
      control: "select",
      options: trainerTabBarItems.map((item) => item.value)
    }
  }
} satisfies Meta<typeof TabBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Interactive: Story = {
  render: () => {
    const [selectedValue, setSelectedValue] = useState("home");

    return (
      <View style={{ alignItems: "stretch", width: "100%", padding: theme.spacing.md, backgroundColor: theme.colors.background.canvasSoft }}>
        <TabBar selectedValue={selectedValue} onValueChange={setSelectedValue} />
      </View>
    );
  }
};
