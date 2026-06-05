import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { ListItemGym, getListItemGymGroupPosition, getListItemGymSelectedGroupPosition, type ListItemGymMode } from "./ListItemGym";

const modes: ListItemGymMode[] = ["default", "selected", "move"];

const exercises = [
  "Horizontal leg press machine",
  "Wide grip lat pulldown",
  "Dumbbell shoulder press"
];

const meta = {
  title: "Components/ListItemGym",
  component: ListItemGym,
  args: {
    title: exercises[0],
    mode: "default",
    deleteOpen: false
  },
  argTypes: {
    title: { control: "text" },
    mode: { control: "select", options: modes },
    deleteOpen: { control: "boolean" }
  }
} satisfies Meta<typeof ListItemGym>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const SwipeDelete: Story = {
  render: () => {
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
      <ListItemGym
        title={exercises[0]}
        mode="move"
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        onDelete={() => setDeleteOpen(false)}
      />
    );
  }
};

export const GroupedSelectedList: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.xxs }}>
      {exercises.map((item, index) => (
        <ListItemGym
          key={item}
          title={item}
          groupPosition={getListItemGymGroupPosition(index, exercises.length)}
          mode="selected"
          selected
        />
      ))}
    </View>
  )
};

export const AdjacentSelectedPair: Story = {
  render: () => {
    const selectedFlags = [true, true, false];

    return (
      <View style={{ gap: theme.spacing.xxs }}>
        {exercises.map((item, index) => {
          const selected = selectedFlags[index] ?? false;

          return (
            <ListItemGym
              key={item}
              title={item}
              groupPosition={getListItemGymSelectedGroupPosition(
                selected,
                selectedFlags[index - 1] ?? false,
                selectedFlags[index + 1] ?? false
              )}
              mode={selected ? "selected" : "default"}
              selected={selected}
            />
          );
        })}
      </View>
    );
  }
};

export const ReorderableList: Story = {
  render: () => {
    const [items, setItems] = useState(exercises);

    const move = (index: number, direction: -1 | 1) => {
      setItems((current) => {
        const nextIndex = index + direction;
        if (nextIndex < theme.spacing[0] || nextIndex >= current.length) return current;

        const next = [...current];
        const [item] = next.splice(index, 1);
        next.splice(nextIndex, 0, item);
        return next;
      });
    };

    return (
      <View style={{ gap: theme.spacing.xxs }}>
        {items.map((item, index) => (
          <ListItemGym
            key={item}
            title={item}
            mode="move"
            onMovePress={() => move(index, index === items.length - 1 ? -1 : 1)}
          />
        ))}
      </View>
    );
  }
};
