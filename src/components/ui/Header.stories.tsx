import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Header, type HeaderSize } from "./Header";
import { theme } from "@/theme";

type StoryArgs = {
  title: string;
  subtitle: string;
  size: HeaderSize;
  showSubtitle: boolean;
  subtitlePosition: "top" | "bottom";
};

const sizes: HeaderSize[] = ["xl", "lg", "md", "sm"];

const meta: Meta<StoryArgs> = {
  title: "Components/Header",
  args: {
    title: "Phone payment",
    subtitle: "Phone payment",
    size: "xl",
    showSubtitle: true,
    subtitlePosition: "bottom"
  },
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
    size: { control: "select", options: sizes },
    showSubtitle: { control: "boolean" },
    subtitlePosition: { control: "select", options: ["top", "bottom"] }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => (
    <Header
      title={args.title}
      subtitle={args.subtitle}
      size={args.size}
      showSubtitle={args.showSubtitle}
      subtitlePosition={args.subtitlePosition}
    />
  )
};

export const Sizes: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.xl }}>
      {sizes.map((size) => (
        <Header key={size} title="Phone payment" subtitle="Phone payment" size={size} />
      ))}
    </View>
  )
};
