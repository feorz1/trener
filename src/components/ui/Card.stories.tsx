import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { Card, type CardDayPlanState, type CardProps, type CardVariant, type CardWorkoutStatus } from "./Card";

const cardVariants: CardVariant[] = ["dayPlan", "workout", "addWorkout"];
const dayPlanStates: CardDayPlanState[] = ["plan", "planNext"];
const workoutStatuses: CardWorkoutStatus[] = ["planned", "inProgress", "completed"];

const meta = {
  title: "Components/Card",
  component: Card,
  args: {
    variant: "workout",
    dayPlanState: "plan",
    workoutStatus: "planned",
    clientName: "Константин",
    muscleGroup: "Руки",
    workoutTime: "19:00",
    exerciseCount: 6,
    totalExercises: 6
  },
  argTypes: {
    variant: {
      control: "select",
      options: cardVariants
    },
    dayPlanState: {
      control: "select",
      options: dayPlanStates
    },
    workoutStatus: {
      control: "select",
      options: workoutStatuses
    }
  }
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

function cardStoryWidth(variant?: CardVariant) {
  return {
    width: variant === "dayPlan" ? theme.sizes.cardPlanWidth : theme.sizes.cardWorkoutWidth
  };
}

function cardStoryProgress(args: CardProps) {
  if (args.workoutStatus === "completed") {
    return args.totalExercises ?? args.exerciseCount ?? 6;
  }

  if (args.workoutStatus === "inProgress") {
    return args.completedExercises ?? 1;
  }

  return args.completedExercises;
}

export const Playground: Story = {
  render: (args) => <Card {...args} completedExercises={cardStoryProgress(args)} style={cardStoryWidth(args.variant)} />
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={{ gap: theme.spacing.lg, alignItems: "center", width: "100%" }}>
      <Card variant="dayPlan" style={cardStoryWidth("dayPlan")} />
      <Card variant="dayPlan" dayPlanState="planNext" style={cardStoryWidth("dayPlan")} />
      <Card variant="workout" workoutStatus="planned" style={cardStoryWidth("workout")} />
      <Card variant="workout" workoutStatus="planned" showAction style={cardStoryWidth("workout")} />
      <Card variant="workout" workoutStatus="inProgress" completedExercises={1} totalExercises={6} style={cardStoryWidth("workout")} />
      <Card variant="workout" workoutStatus="completed" completedExercises={6} totalExercises={6} style={cardStoryWidth("workout")} />
      <Card variant="addWorkout" style={cardStoryWidth("addWorkout")} />
    </View>
  )
};
