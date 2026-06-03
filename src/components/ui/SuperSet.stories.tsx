import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SuperSet, type SuperSetSegment } from "./SuperSet";

const meta = {
  title: "Components/SuperSet",
  component: SuperSet
} satisfies Meta<typeof SuperSet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => {
    const [segments, setSegments] = useState<SuperSetSegment[]>([
      { id: "one" },
      { id: "two", selected: true }
    ]);

    return (
      <SuperSet
        itemCount={3}
        segments={segments}
        onSegmentPress={(id) =>
          setSegments((current) =>
            current.map((segment) => (segment.id === id ? { ...segment, selected: !segment.selected } : segment))
          )
        }
      />
    );
  }
};
