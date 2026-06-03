import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Approach, type ApproachSet } from "./Approach";

const approachSets: ApproachSet[] = [
  { id: "one", index: 1, weight: 150, reps: 12, status: "completed" },
  { id: "two", index: 1, weight: 150, reps: 12, status: "completed" },
  { id: "three", index: 1, weight: 150, reps: 12, status: "completed" },
  { id: "four", index: 4, weight: 150, reps: 12, status: "completed" }
];

const meta = {
  title: "Components/Approach",
  component: Approach,
  args: {
    title: "Жим ногами горизонтальный в блочном тренажере",
    note: "Слева - 6, Справа - 5,6, Ножка - 4",
    addLabel: "Добавить подход",
    sets: approachSets
  }
} satisfies Meta<typeof Approach>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Canonical: Story = {
  render: () => (
    <View style={{ width: theme.sizes.approachWidth, maxWidth: "100%" }}>
      <Approach
        title="Жим ногами горизонтальный в блочном тренажере"
        note="Слева - 6, Справа - 5,6, Ножка - 4"
        addLabel="Добавить подход"
        sets={approachSets}
      />
    </View>
  )
};
