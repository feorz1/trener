import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Loader, type LoaderSize, type LoaderTone } from "./Loader";
import { theme } from "@/theme";

const loaderSizes: LoaderSize[] = ["small", "medium"];
const loaderTones: LoaderTone[] = ["brand", "inverse", "negative", "neutral", "canvas"];

const meta = {
  title: "Components/Loader",
  component: Loader,
  args: {
    size: "medium",
    tone: "brand"
  },
  argTypes: {
    size: {
      control: "select",
      options: loaderSizes
    },
    tone: {
      control: "select",
      options: loaderTones
    }
  }
} satisfies Meta<typeof Loader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      {loaderTones.map((tone) => (
        <View key={tone} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
          <Loader tone={tone} size="small" />
          <Loader tone={tone} size="medium" />
        </View>
      ))}
    </View>
  )
};
