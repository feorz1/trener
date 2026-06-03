import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { Input, type InputState } from "./Input";
import { theme } from "@/theme";

type StoryArgs = {
  label: string;
  value: string;
  message: string;
  state: InputState;
  disabled: boolean;
  doubleField: boolean;
  prefixValue: string;
  showLabel: boolean;
  showMessage: boolean;
  showClearButton: boolean;
};

const inputStates: InputState[] = [
  "empty",
  "default",
  "focus",
  "error",
  "positive",
  "warning",
  "disabled",
  "prefixFocus",
  "valueFocus"
];

const meta: Meta<StoryArgs> = {
  title: "Components/Input",
  args: {
    label: "Field label",
    value: "Value",
    message: "Message",
    state: "default",
    disabled: false,
    doubleField: false,
    prefixValue: "+1",
    showLabel: true,
    showMessage: true,
    showClearButton: false
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
      options: inputStates
    },
    disabled: {
      control: "boolean"
    },
    doubleField: {
      control: "boolean"
    },
    prefixValue: {
      control: "text"
    },
    showLabel: {
      control: "boolean"
    },
    showMessage: {
      control: "boolean"
    },
    showClearButton: {
      control: "boolean"
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => {
    const state = args.state ?? "default";
    const disabled = state === "disabled" || (args.disabled ?? false);
    const [value, setValue] = useState(args.value ?? "");
    const [prefixValue, setPrefixValue] = useState(args.prefixValue ?? "");

    useEffect(() => {
      setValue(args.value ?? "");
    }, [args.value]);

    useEffect(() => {
      setPrefixValue(args.prefixValue ?? "");
    }, [args.prefixValue]);

    return (
      <Input
        label={args.label ?? "Field label"}
        value={value}
        message={args.message ?? "Message"}
        state={state}
        disabled={disabled}
        doubleField={args.doubleField ?? false}
        prefixValue={prefixValue}
        showLabel={args.showLabel ?? true}
        showMessage={args.showMessage ?? true}
        showClearButton={args.showClearButton ?? false}
        onChangePrefixText={setPrefixValue}
        onChangeText={setValue}
      />
    );
  }
};

export const CanonicalStates: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.xl }}>
      <Input label="Field label" value="" state="empty" message="Message" />
      <Input label="Field label" value="Value" state="default" message="Message" />
      <Input label="Field label" value="Value" state="focus" message="Message" />
      <Input label="Field label" value="Value" state="error" message="Error message" />
      <Input label="Field label" value="Value" state="positive" message="Positive message" />
      <Input label="Field label" value="Value" state="warning" message="Warning message" />
      <Input label="Field label" value="Value" state="disabled" message="Message" />
      <Input label="Field label" value="Value" state="default" message="Message" showClearButton />
      <Input label="Field label" value="" state="empty" message="Message" doubleField prefixValue="+1" />
      <Input label="Field label" value="Value" state="default" message="Message" doubleField prefixValue="+1" />
      <Input label="Field label" value="Value" state="prefixFocus" message="Message" doubleField prefixValue="+1" />
      <Input label="Field label" value="Value" state="valueFocus" message="Message" doubleField prefixValue="+1" />
      <Input label="Field label" value="Value" state="default" message="Message" doubleField prefixValue="+1" showClearButton />
    </View>
  )
};
