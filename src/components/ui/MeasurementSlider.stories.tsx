import { useEffect, useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { MeasurementSlider } from "./MeasurementSlider";

const meta = {
  title: "Components/MeasurementSlider",
  component: MeasurementSlider,
  args: {
    title: "Текущий рост",
    value: 175,
    min: 0,
    max: 250,
    step: 1,
    majorStep: 5,
    onChange: () => undefined
  },
  argTypes: {
    title: {
      control: "text"
    },
    value: {
      control: { type: "number", min: 0, max: 250, step: 1 }
    },
    min: {
      control: { type: "number", min: 0, max: 249, step: 1 }
    },
    max: {
      control: { type: "number", min: 1, max: 300, step: 1 }
    },
    step: {
      control: { type: "number", min: 1, max: 10, step: 1 }
    },
    majorStep: {
      control: { type: "number", min: 1, max: 25, step: 1 }
    }
  }
} satisfies Meta<typeof MeasurementSlider>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveMeasurementSlider(args: ComponentProps<typeof MeasurementSlider>) {
  const [value, setValue] = useState(args.value);

  useEffect(() => {
    setValue(args.value);
  }, [args.value]);

  return <MeasurementSlider {...args} value={value} onChange={setValue} />;
}

export const Playground: Story = {
  render: (args) => <InteractiveMeasurementSlider {...args} />
};

export const Weight: Story = {
  args: {
    title: "Текущий вес",
    value: 75
  },
  render: (args) => <InteractiveMeasurementSlider {...args} />
};

export const TargetWeight: Story = {
  args: {
    title: "Желаемый вес",
    value: 70,
    referenceValue: 75
  },
  render: (args) => <InteractiveMeasurementSlider {...args} />
};
