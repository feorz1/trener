import type { Meta, StoryObj } from "@storybook/react-native";
import { Navigation } from "./Navigation";

type StoryArgs = {
  title: string;
  subtitle: string;
  showSubtitle: boolean;
};

const meta: Meta<StoryArgs> = {
  title: "Components/Navigation",
  args: {
    title: "Screen Header",
    subtitle: "Additional Title",
    showSubtitle: true
  },
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
    showSubtitle: { control: "boolean" }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => <Navigation title={args.title} subtitle={args.subtitle} showSubtitle={args.showSubtitle} />
};
