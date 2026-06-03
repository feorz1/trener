import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Radio } from "./Radio";
import { theme } from "@/theme";

const meta = {
  title: "Components/Radio",
  component: Radio,
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
} satisfies Meta<typeof Radio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      <Radio selected label="Text" />
      <Radio selected={false} label="Text" />
      <Radio selected state="error" label="Text" />
      <Radio selected={false} state="error" label="Text" />
      <Radio selected state="disabled" label="Text" />
      <Radio selected={false} state="disabled" label="Text" />
      <Radio selected showLabel={false} />
    </View>
  )
};
