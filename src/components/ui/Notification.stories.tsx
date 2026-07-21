import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Notification, type NotificationVariant } from "./Notification";
import { theme } from "@/theme";

const variants: NotificationVariant[] = ["default", "plain"];
const effects = ["regular", "clear", "none"] as const;

const meta = {
  title: "Components/Notification",
  component: Notification,
  args: {
    text: "Тренировка перенесена",
    variant: "default",
    effect: "regular",
    interactive: false
  },
  argTypes: {
    text: { control: "text" },
    variant: { control: "select", options: variants },
    effect: { control: "select", options: effects },
    interactive: { control: "boolean" }
  }
} satisfies Meta<typeof Notification>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <Notification {...args} />
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.md, alignItems: "center" }}>
      <Notification text="Тренировка перенесена" variant="default" />
      <Notification text="Удача" variant="plain" />
    </View>
  )
};
