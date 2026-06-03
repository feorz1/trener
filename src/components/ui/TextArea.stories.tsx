import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { TextArea, type TextAreaState } from "./TextArea";
import { theme } from "@/theme";

type StoryArgs = {
  label: string;
  value: string;
  message: string;
  state: TextAreaState;
  disabled: boolean;
  showLabel: boolean;
  showMessage: boolean;
};

const textAreaStates: TextAreaState[] = ["empty", "default", "focus", "error", "disabled"];

const meta: Meta<StoryArgs> = {
  title: "Components/TextArea",
  args: {
    label: "Field label",
    value: "Value",
    message: "Message",
    state: "default",
    disabled: false,
    showLabel: true,
    showMessage: true
  },
  argTypes: {
    label: {
      control: "text"
    },
    value: {
      control: "text"
    },
    message: {
      control: "text"
    },
    state: {
      control: "select",
      options: textAreaStates
    },
    disabled: {
      control: "boolean"
    },
    showLabel: {
      control: "boolean"
    },
    showMessage: {
      control: "boolean"
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value ?? "");

    useEffect(() => {
      setValue(args.value ?? "");
    }, [args.value]);

    return (
      <TextArea
        label={args.label ?? "Field label"}
        value={args.state === "empty" ? "" : value}
        message={args.state === "error" ? args.message || "Error message" : args.message ?? "Message"}
        state={args.state ?? "default"}
        disabled={args.state === "disabled" || (args.disabled ?? false)}
        showLabel={args.showLabel ?? true}
        showMessage={args.showMessage ?? true}
        onChangeText={setValue}
      />
    );
  }
};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.xl }}>
      <TextArea label="Field label" value="" state="empty" message="Message" />
      <TextArea label="Field label" value="Value" state="default" message="Message" />
      <TextArea label="Field label" value="Value" state="focus" message="Message" />
      <TextArea label="Field label" value="Value" state="error" message="Error message" />
      <TextArea label="Field label" value="Value" state="disabled" disabled message="Message" />
    </View>
  )
};
