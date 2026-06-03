import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Checkbox } from "./Checkbox";
import { theme } from "@/theme";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: {
    selected: true,
    state: "default",
    label: "Text",
    showLabel: true
  },
  argTypes: {
    selected: {
      control: "boolean"
    },
    state: {
      control: "select",
      options: ["default", "error", "disabled"]
    },
    label: {
      control: "text"
    },
    showLabel: {
      control: "boolean"
    }
  }
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      <Checkbox selected label="Text" />
      <Checkbox selected={false} label="Text" />
      <Checkbox selected state="error" label="Text" />
      <Checkbox selected={false} state="error" label="Text" />
      <Checkbox selected state="disabled" label="Text" />
      <Checkbox selected={false} state="disabled" label="Text" />
      <Checkbox selected showLabel={false} />
    </View>
  )
};
