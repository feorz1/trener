import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Switch } from "./Switch";
import { theme } from "@/theme";

type StoryArgs = {
  selected: boolean;
  disabled: boolean;
};

const meta: Meta<StoryArgs> = {
  title: "Components/Switch",
  args: {
    selected: true,
    disabled: false
  },
  argTypes: {
    selected: {
      control: "boolean"
    },
    disabled: {
      control: "boolean"
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(args.selected ?? false);

    useEffect(() => {
      setSelected(args.selected ?? false);
    }, [args.selected]);

    return <Switch selected={selected} disabled={args.disabled ?? false} onChange={setSelected} />;
  }
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      <Switch selected onChange={() => undefined} />
      <Switch selected={false} onChange={() => undefined} />
      <Switch selected disabled onChange={() => undefined} />
      <Switch selected={false} disabled onChange={() => undefined} />
    </View>
  )
};
