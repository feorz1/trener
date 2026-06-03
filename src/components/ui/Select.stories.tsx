import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Select, type SelectState } from "./Select";
import { theme } from "@/theme";

type StoryArgs = {
  label: string;
  value: string;
  placeholder: string;
  message: string;
  state: SelectState;
  disabled: boolean;
  showLabel: boolean;
  showMessage: boolean;
};

const selectStates: SelectState[] = ["empty", "default", "focus", "error", "positive", "warning", "disabled"];

const meta: Meta<StoryArgs> = {
  title: "Components/Select",
  args: {
    label: "Date",
    value: "Value",
    placeholder: "Value",
    message: "Message",
    state: "default",
    disabled: false,
    showLabel: true,
    showMessage: true
  },
  argTypes: {
    label: { control: "text" },
    value: { control: "text" },
    placeholder: { control: "text" },
    message: { control: "text" },
    state: { control: "select", options: selectStates },
    disabled: { control: "boolean" },
    showLabel: { control: "boolean" },
    showMessage: { control: "boolean" }
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
      <Select
        label={args.label ?? "Date"}
        value={args.state === "empty" ? "" : value}
        placeholder={args.placeholder ?? "Value"}
        message={args.state === "error" ? args.message || "Error message" : args.message ?? "Message"}
        state={args.state ?? "default"}
        disabled={args.state === "disabled" || (args.disabled ?? false)}
        showLabel={args.showLabel ?? true}
        showMessage={args.showMessage ?? true}
        onPress={() => setValue(value ? "" : "Value")}
      />
    );
  }
};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.xl }}>
      <Select label="Date" value="" state="empty" message="Message" />
      <Select label="Date" value="Value" state="default" message="Message" />
      <Select label="Date" value="Value" state="focus" message="Message" />
      <Select label="Date" value="Value" state="error" message="Error message" />
      <Select label="Date" value="Value" state="positive" message="Positive message" />
      <Select label="Date" value="Value" state="warning" message="Warning message" />
      <Select label="Date" value="Value" state="disabled" message="Message" />
    </View>
  )
};
