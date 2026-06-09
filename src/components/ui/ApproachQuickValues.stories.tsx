import type { Meta, StoryObj } from "@storybook/react-native";
import { useState } from "react";
import { View } from "react-native";
import { theme } from "@/theme";
import { ApproachQuickValues } from "./ApproachQuickValues";

const meta: Meta<typeof ApproachQuickValues> = {
  title: "Components/ApproachQuickValues",
  component: ApproachQuickValues,
  args: {
    frequentValues: [6, 8, 15],
    popularValues: [6, 8, 12, 15, 18, 20, 25, 30]
  }
};

export default meta;

type Story = StoryObj<typeof ApproachQuickValues>;

export const Default: Story = {
  render: (args) => {
    const [selectedValue, setSelectedValue] = useState<number | undefined>();

    return (
      <View style={{ gap: theme.spacing.lg, padding: theme.spacing.lg, backgroundColor: theme.colors.background.canvasSoft }}>
        <ApproachQuickValues {...args} onSelectValue={setSelectedValue} />
        {selectedValue ? <ApproachQuickValues frequentValues={[selectedValue]} popularValues={[]} /> : null}
      </View>
    );
  }
};
