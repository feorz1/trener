import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { SegmentedControl } from "./SegmentedControl";
import { theme } from "@/theme";

type StoryArgs = {
  items: "Two" | "Three";
  selected: "First" | "Second" | "Third";
  disabledThird: boolean;
  width: number;
};

type SegmentValue = "first" | "second" | "third";

const meta: Meta<StoryArgs> = {
  title: "Components/SegmentedControl",
  args: {
    items: "Three",
    selected: "Second",
    disabledThird: false,
    width: theme.sizes.segmentedControlThreeWidth
  },
  argTypes: {
    items: {
      control: "select",
      options: ["Two", "Three"]
    },
    selected: {
      control: "select",
      options: ["First", "Second", "Third"]
    },
    disabledThird: {
      control: "boolean"
    },
    width: {
      control: {
        type: "number",
        min: theme.sizes.segmentedControlTwoWidth,
        max: 375,
        step: theme.spacing.sm
      }
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

const selectedMap: Record<StoryArgs["selected"], SegmentValue> = {
  First: "first",
  Second: "second",
  Third: "third"
};

export const Playground: Story = {
  render: (args) => {
    const itemCount = args.items ?? "Three";
    const selected = args.selected ?? "Second";
    const disabledThird = args.disabledThird ?? false;
    const width = args.width ?? theme.sizes.segmentedControlThreeWidth;
    const availableItems = useMemo(
      () =>
        itemCount === "Two"
          ? [
              { value: "first" as const, label: "Day" },
              { value: "second" as const, label: "Week" }
            ]
          : [
              { value: "first" as const, label: "Day" },
              { value: "second" as const, label: "Week" },
              { value: "third" as const, label: "Month", disabled: disabledThird }
            ],
      [disabledThird, itemCount]
    );
    const initialValue = itemCount === "Two" && selected === "Third" ? "second" : selectedMap[selected];
    const [value, setValue] = useState<SegmentValue>(initialValue);
    const resolvedValue = availableItems.some((item) => item.value === value) ? value : availableItems[0].value;

    return <SegmentedControl value={resolvedValue} onChange={setValue} items={availableItems} width={width} />;
  }
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.md }}>
      <SegmentedControl
        value="first"
        onChange={() => undefined}
        items={[
          { value: "first", label: "Day" },
          { value: "second", label: "Week" }
        ]}
      />
      <SegmentedControl
        value="second"
        onChange={() => undefined}
        items={[
          { value: "first", label: "Day" },
          { value: "second", label: "Week" },
          { value: "third", label: "Month" }
        ]}
      />
      <SegmentedControl
        value="third"
        onChange={() => undefined}
        items={[
          { value: "first", label: "Day" },
          { value: "second", label: "Week" },
          { value: "third", label: "Month" }
        ]}
      />
    </View>
  )
};
