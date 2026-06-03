import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Icon, iconNames, type IconName } from "./Icon";
import { theme } from "@/theme";

const meta = {
  title: "Components/Icon",
  component: Icon,
  args: {
    name: "information" as IconName,
    size: 24,
    color: theme.colors.content.ink
  },
  argTypes: {
    name: {
      control: "select",
      options: iconNames
    },
    size: {
      control: "number"
    },
    color: {
      control: "text"
    }
  }
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CoreSet: Story = {
  render: () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.lg }}>
      {iconNames.slice(0, 48).map((name) => (
        <Icon key={name} name={name} size={24} color={theme.colors.content.ink} />
      ))}
    </View>
  )
};
