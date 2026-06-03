import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Badge, type BadgeTone } from "./Badge";
import { theme } from "@/theme";

const canonicalTones: BadgeTone[] = ["error", "info", "success", "warning", "neutral", "negativeSolid", "warningDeep", "primary", "select"];

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: {
    label: "Badge",
    tone: "success",
    icon: true,
    size: "md"
  },
  argTypes: {
    tone: {
      control: "select",
      options: canonicalTones
    },
    icon: {
      control: "boolean"
    },
    label: {
      control: "text"
    },
    size: {
      control: "select",
      options: ["md", "sm", "s"]
    }
  }
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
      <Badge tone="error" label="Error" icon />
      <Badge tone="info" label="Info" icon />
      <Badge tone="success" label="Success" icon />
      <Badge tone="warning" label="Warning" icon />
      <Badge tone="neutral" label="Neutral" icon={false} />
      <Badge tone="negativeSolid" label="0%" size="sm" icon={false} />
      <Badge tone="warningDeep" label="50%" size="sm" icon={false} />
      <Badge tone="primary" label="100%" size="sm" icon={false} />
      <Badge tone="select" label="Select" icon />
      <Badge tone="neutral" label="16%" size="s" icon={false} />
    </View>
  )
};
