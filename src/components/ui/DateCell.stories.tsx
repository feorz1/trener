import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { DateCell, type DateCellState } from "./DateCell";

const states: DateCellState[] = ["date", "select", "disabled"];

const meta = {
  title: "Components/DateCell",
  component: DateCell,
  args: {
    label: "12",
    state: "date"
  },
  argTypes: {
    state: {
      control: "select",
      options: states
    }
  }
} satisfies Meta<typeof DateCell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "center" }}>
      <DateCell label="12" state="date" />
      <DateCell label="14" state="select" />
      <DateCell label="15" state="disabled" />
    </View>
  )
};
