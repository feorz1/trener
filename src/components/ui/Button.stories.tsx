import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Button, type ButtonSize, type ButtonState, type ButtonType } from "./Button";
import { theme } from "@/theme";

const buttonTypes: ButtonType[] = ["primary", "secondary", "secondaryNeutral", "destructive", "tertiary"];
const buttonSizes: ButtonSize[] = ["large", "medium", "small", "mediumIcon", "smallIcon"];
const buttonStates: ButtonState[] = ["active", "disabled", "loading"];

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    label: "Medium",
    type: "primary",
    size: "medium",
    state: "active",
    width: "hug"
  },
  argTypes: {
    type: {
      control: "select",
      options: buttonTypes
    },
    size: {
      control: "select",
      options: buttonSizes
    },
    state: {
      control: "select",
      options: buttonStates
    },
    width: {
      control: "select",
      options: ["hug", "fill"]
    },
    label: {
      control: "text"
    }
  }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.md }}>
      {buttonTypes.map((type) => (
        <View key={type} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
          <Button type={type} size="large" label="Large" />
          <Button type={type} size="medium" label="Medium" />
          <Button type={type} size="small" label="Small" />
          <Button type={type} size="medium" state="loading" />
          {type !== "tertiary" ? (
            <>
              <Button type={type} size="mediumIcon" />
              <Button type={type} size="smallIcon" />
            </>
          ) : (
            <Button type={type} size="smallIcon" />
          )}
        </View>
      ))}
    </View>
  )
};
