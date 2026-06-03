import { useEffect, useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Alert, type AlertLayout, type AlertTone } from "./Alert";
import { theme } from "@/theme";

const alertTones: AlertTone[] = ["neutral", "positive", "negative", "warning"];
const alertLayouts: AlertLayout[] = ["compact", "expanded", "action"];

const meta = {
  title: "Components/Alert",
  component: Alert,
  args: {
    tone: "neutral",
    layout: "compact",
    width: "fill",
    expanded: true
  },
  argTypes: {
    tone: {
      control: "select",
      options: alertTones
    },
    layout: {
      control: "select",
      options: alertLayouts
    },
    width: {
      control: "select",
      options: ["fixed", "fill"]
    },
    title: {
      control: "text"
    },
    description: {
      control: "text"
    },
    actionLabel: {
      control: "text"
    },
    expanded: {
      control: "boolean"
    }
  }
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveAlert(args: ComponentProps<typeof Alert>) {
  const [localExpanded, setLocalExpanded] = useState(args.expanded ?? args.defaultExpanded ?? args.layout !== "compact");

  useEffect(() => {
    setLocalExpanded(args.expanded ?? args.defaultExpanded ?? args.layout !== "compact");
  }, [args.defaultExpanded, args.expanded, args.layout]);

  return <Alert {...args} expanded={args.layout === "compact" ? undefined : localExpanded} onExpandedChange={setLocalExpanded} />;
}

export const Playground: Story = {
  render: (args) => <InteractiveAlert {...args} />
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      {alertTones.map((tone) => (
        <View key={tone} style={{ gap: theme.spacing.sm }}>
          {alertLayouts.map((layout) => (
            <Alert key={`${tone}-${layout}`} tone={tone} layout={layout} width="fill" expanded />
          ))}
        </View>
      ))}
    </View>
  )
};
