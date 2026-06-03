import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { theme } from "@/theme";
import { CalendarDayStrip, type CalendarDayStripItem } from "./CalendarDayStrip";

type StoryArgs = {
  selectedIndex: number;
  todayIndex: number;
  disabled: boolean;
  width: number;
};

const week: CalendarDayStripItem[] = [
  { key: "2026-05-11", weekday: "Mon", dayNumber: "12", temporalState: "past" },
  { key: "2026-05-12", weekday: "Tue", dayNumber: "12", temporalState: "past" },
  { key: "2026-05-13", weekday: "Wed", dayNumber: "15", temporalState: "default" },
  { key: "2026-05-14", weekday: "Thu", dayNumber: "14", temporalState: "default" },
  { key: "2026-05-15", weekday: "Fri", dayNumber: "15", temporalState: "future" },
  { key: "2026-05-16", weekday: "Sat", dayNumber: "15", temporalState: "future" },
  { key: "2026-05-17", weekday: "Sun", dayNumber: "15", temporalState: "future" }
];

const nextWeek: CalendarDayStripItem[] = [
  { key: "2026-05-18", weekday: "Mon", dayNumber: "18", temporalState: "future" },
  { key: "2026-05-19", weekday: "Tue", dayNumber: "19", temporalState: "future" },
  { key: "2026-05-20", weekday: "Wed", dayNumber: "20", temporalState: "future" },
  { key: "2026-05-21", weekday: "Thu", dayNumber: "21", temporalState: "future" },
  { key: "2026-05-22", weekday: "Fri", dayNumber: "22", temporalState: "future" },
  { key: "2026-05-23", weekday: "Sat", dayNumber: "23", temporalState: "future" },
  { key: "2026-05-24", weekday: "Sun", dayNumber: "24", temporalState: "future" }
];

const meta: Meta<StoryArgs> = {
  title: "Components/CalendarDayStrip",
  args: {
    selectedIndex: 3,
    todayIndex: 4,
    disabled: false,
    width: theme.sizes.calendarDayStripWidth
  },
  argTypes: {
    selectedIndex: {
      control: { type: "number", min: 0, max: 6, step: 1 }
    },
    todayIndex: {
      control: { type: "number", min: 0, max: 6, step: 1 }
    },
    disabled: {
      control: "boolean"
    },
    width: {
      control: {
        type: "number",
        min: 280,
        max: 440,
        step: theme.spacing.sm
      }
    }
  }
};

export default meta;

type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => {
    const initialIndex = Math.max(0, Math.min(6, args.selectedIndex ?? 3));
    const todayIndex = Math.max(0, Math.min(6, args.todayIndex ?? 4));
    const [selectedKey, setSelectedKey] = useState(week[initialIndex].key);

    return (
      <CalendarDayStrip
        items={week}
        selectedKey={selectedKey}
        todayKey={week[todayIndex].key}
        disabled={args.disabled}
        width={args.width}
        onSelect={setSelectedKey}
      />
    );
  }
};

export const WeekPaging: Story = {
  render: () => {
    const [selectedKey, setSelectedKey] = useState(week[3].key);

    return (
      <CalendarDayStrip
        weeks={[week, nextWeek]}
        selectedKey={selectedKey}
        todayKey={week[4].key}
        width={theme.sizes.calendarDayStripWidth}
        onSelect={setSelectedKey}
      />
    );
  }
};
