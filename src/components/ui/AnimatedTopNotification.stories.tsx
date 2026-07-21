import { useState } from "react";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { theme } from "@/theme";
import { Button } from "./Button";
import { AnimatedTopNotification } from "./AnimatedTopNotification";

const meta = {
  title: "Components/AnimatedTopNotification",
  component: AnimatedTopNotification,
  args: {
    visible: false,
    message: "Тренировка перенесена",
    duration: 2000,
    respectSafeArea: false
  },
  argTypes: {
    message: { control: "text" },
    duration: { control: "number" }
  }
} satisfies Meta<typeof AnimatedTopNotification>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <AnimatedNotificationStory {...args} />
};

function AnimatedNotificationStory(args: ComponentProps<typeof AnimatedTopNotification>) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.frame}>
      <AnimatedTopNotification {...args} visible={visible} onFinish={() => setVisible(false)} />
      <View style={styles.action}>
        <Button label="Вызвать нотификацию" type="secondary" size="large" width="fill" onPress={() => setVisible(true)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: theme.sizes.modalPreviewHeight,
    justifyContent: "flex-end",
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  action: {
    gap: theme.spacing.md
  }
});
