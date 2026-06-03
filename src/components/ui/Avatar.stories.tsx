import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Avatar, type AvatarSize, type AvatarType } from "./Avatar";
import { iconNames } from "./Icon";
import { theme } from "@/theme";

const avatarTypes: AvatarType[] = ["icon", "initials", "image", "count", "pair", "badge", "notification"];
const avatarSizes: AvatarSize[] = [40, 48, 56, 72];

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: {
    type: "image",
    size: 56,
    initials: "JW",
    count: "+3",
    iconName: "user"
  },
  argTypes: {
    type: {
      control: "select",
      options: avatarTypes
    },
    size: {
      control: "select",
      options: avatarSizes
    },
    initials: {
      control: "text"
    },
    count: {
      control: "text"
    },
    iconName: {
      control: "select",
      options: iconNames
    }
  }
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg }}>
      {avatarTypes.map((type) => (
        <View key={type} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.lg }}>
          {avatarSizes.map((size) => (
            <Avatar key={`${type}-${size}`} type={type} size={size} />
          ))}
        </View>
      ))}
    </View>
  )
};
