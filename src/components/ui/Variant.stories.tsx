import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Variant } from "./Variant";

type StoryArgs = {
  values: number;
  columns: number;
  selected: string;
  showMessage: boolean;
  disabled: boolean;
};

const meta: Meta<StoryArgs> = {
  title: "Components/Variant",
  args: {
    values: 2,
    columns: 2,
    selected: "male",
    showMessage: false,
    disabled: false
  },
  argTypes: {
    values: {
      control: {
        type: "number",
        min: 1,
        max: 25,
        step: 1
      }
    },
    columns: {
      control: {
        type: "number",
        min: 1,
        max: 5,
        step: 1
      }
    },
    selected: {
      control: "text"
    },
    showMessage: {
      control: "boolean"
    },
    disabled: {
      control: "boolean"
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

const baseItems = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
  { value: "other", label: "Value" },
  { value: "four", label: "Value" },
  { value: "five", label: "Value" },
  { value: "six", label: "Value" },
  { value: "seven", label: "Value" },
  { value: "eight", label: "Value" },
  { value: "nine", label: "Value" },
  { value: "ten", label: "Value" },
  { value: "eleven", label: "Value" },
  { value: "twelve", label: "Value" },
  { value: "thirteen", label: "Value" },
  { value: "fourteen", label: "Value" },
  { value: "fifteen", label: "Value" },
  { value: "sixteen", label: "Value" },
  { value: "seventeen", label: "Value" },
  { value: "eighteen", label: "Value" },
  { value: "nineteen", label: "Value" },
  { value: "twenty", label: "Value" },
  { value: "twenty-one", label: "Value" },
  { value: "twenty-two", label: "Value" },
  { value: "twenty-three", label: "Value" },
  { value: "twenty-four", label: "Value" },
  { value: "twenty-five", label: "Value" }
] as const;

export const Playground: Story = {
  render: (args) => {
    const items = useMemo(() => baseItems.slice(0, args.values), [args.values]);
    const initialValue = items.some((item) => item.value === args.selected) ? args.selected : items[0]?.value;
    const [value, setValue] = useState(initialValue);
    const resolvedValue = items.some((item) => item.value === value) ? value : items[0]?.value;

    return (
      <Variant
        label="Пол"
        items={items}
        value={resolvedValue}
        columns={args.columns}
        showMessage={args.showMessage}
        message="Message"
        disabled={args.disabled}
        width="fill"
        onChange={setValue}
      />
    );
  }
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg, width: theme.sizes.variantWidth }}>
      <Variant
        label="Пол"
        items={[
          { value: "male", label: "Мужской" },
          { value: "female", label: "Женский" }
        ]}
        value="male"
        columns={2}
        onChange={() => undefined}
      />
      <Variant label="Рост" items={baseItems.slice(0, 25)} value="male" columns={5} onChange={() => undefined} />
    </View>
  )
};
