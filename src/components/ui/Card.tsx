import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import { ProgressBar } from "./ProgressBar";

export type CardVariant = "dayPlan" | "workout" | "addWorkout";
export type CardDayPlanState = "plan" | "planNext";
export type CardWorkoutStatus = "planned" | "inProgress" | "completed";

export type CardProps = Omit<PressableProps, "children" | "style"> & {
  variant?: CardVariant;
  dayPlanState?: CardDayPlanState;
  workoutStatus?: CardWorkoutStatus;
  dayTitle?: string;
  dayCount?: string;
  dayMeta?: string;
  muscleGroup?: string;
  muscleIconName?: IconName;
  clientName?: string;
  workoutTime?: string;
  exerciseCount?: number;
  completedExercises?: number;
  totalExercises?: number;
  showMenu?: boolean;
  showAction?: boolean;
  onMove?: () => void;
  onCancel?: () => void;
  onStart?: () => void;
  onContinue?: () => void;
  onAddWorkout?: () => void;
  dayActionLabel?: string;
  addWorkoutLabel?: string;
  startLabel?: string;
  continueLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  variant = "workout",
  dayPlanState = "plan",
  workoutStatus = "planned",
  dayTitle = "План 5 мая",
  dayCount = "5 тренировок",
  dayMeta = "Следующая через 1 ч 20 мин",
  muscleGroup = "Руки",
  muscleIconName = "muscle arms",
  clientName = "Константин",
  workoutTime = "19:00",
  exerciseCount = 6,
  completedExercises = workoutStatus === "completed" ? exerciseCount : workoutStatus === "inProgress" ? 1 : 0,
  totalExercises = exerciseCount,
  showMenu = true,
  showAction,
  onMove,
  onCancel,
  onStart,
  onContinue,
  onAddWorkout,
  dayActionLabel = "Добавить",
  addWorkoutLabel = "Запланировать тренировку",
  startLabel = "Начать",
  continueLabel = "Продолжить",
  style,
  ...pressableProps
}: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [variant, dayPlanState, workoutStatus]);

  if (variant === "dayPlan") {
    const shouldShowDayAction = dayPlanState === "planNext" || showAction === true;

    return (
      <View style={[styles.planRoot, style]}>
        <View style={styles.planContent}>
          <Text style={styles.planTitle}>{dayTitle}</Text>
          <Text style={styles.planCount}>{dayCount}</Text>
          {!shouldShowDayAction && dayMeta ? <Text style={styles.planMeta}>{dayMeta}</Text> : null}
        </View>
        {shouldShowDayAction ? (
          <View style={styles.planActions}>
            <Button label={dayActionLabel} type="secondary" size="medium" width="fill" onPress={onAddWorkout} />
          </View>
        ) : null}
      </View>
    );
  }

  if (variant === "addWorkout") {
    return (
      <View style={[styles.addWorkoutRoot, style]}>
        <Button
          label={addWorkoutLabel}
          type="tertiary"
          size="medium"
          width="fill"
          onPress={onAddWorkout}
        />
      </View>
    );
  }

  const isCompleted = workoutStatus === "completed";
  const isInProgress = workoutStatus === "inProgress";
  const shouldShowAction = showAction ?? isInProgress;
  const exerciseLabel = `${exerciseCount} упражнений`;
  const progressLabel = `${completedExercises} из ${totalExercises} упражнений`;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole={pressableProps.onPress ? "button" : undefined}
      style={({ pressed }) => [styles.workoutRoot, menuOpen && styles.workoutRootWithMenu, pressed && styles.pressed, style]}
    >
      <View style={styles.workoutContent}>
        <View style={styles.workoutHeader}>
          <View style={styles.muscleMeta}>
            <Icon name={muscleIconName} size={theme.spacing.xl} color={theme.colors.status.negative} />
            <Text style={styles.muscleText}>{muscleGroup}</Text>
          </View>
          {showMenu ? (
            <View style={styles.moreArea}>
              <Button
                type="tertiary"
                size="smallIcon"
                accessibilityLabel="Действия тренировки"
                icon={<Icon name="more" size={theme.sizes.buttonIconSmall} color={theme.colors.content.inkDeep} />}
                onPress={() => setMenuOpen((value) => !value)}
              />
              {menuOpen ? (
                <View style={styles.menu}>
                  <Pressable accessibilityRole="button" onPress={onMove} style={styles.menuItem}>
                    <Text style={styles.menuText} numberOfLines={1}>
                      Перенести
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={onCancel} style={styles.menuItem}>
                    <Text style={[styles.menuText, styles.cancelText]} numberOfLines={1}>
                      Отменить
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.workoutBody}>
          <Text style={styles.clientName}>{clientName}</Text>

          {workoutStatus === "planned" ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{workoutTime}</Text>
              <View style={styles.metaDot} />
              <Text style={styles.metaText}>{exerciseLabel}</Text>
            </View>
          ) : (
            <ProgressBar completed={completedExercises} total={totalExercises} label={progressLabel} />
          )}
        </View>
      </View>

      {!isCompleted && shouldShowAction ? (
        <View style={styles.workoutAction}>
          <Button
            label={isInProgress ? continueLabel : startLabel}
            type={isInProgress ? "secondary" : "tertiary"}
            size="medium"
            width="fill"
            onPress={isInProgress ? onContinue : onStart}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  planRoot: {
    alignSelf: "stretch",
    minHeight: theme.spacing[12] + theme.spacing[10],
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.inkDeep
  },
  planContent: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg
  },
  planTitle: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.primaryPale
  },
  planCount: {
    ...theme.typography.display.sm,
    color: theme.colors.content.primary
  },
  planMeta: {
    ...theme.typography.body.sm,
    lineHeight: theme.typography.body.smStrong.lineHeight,
    color: theme.colors.content.primaryPale
  },
  planActions: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxs,
    paddingBottom: theme.spacing.lg
  },
  workoutRoot: {
    position: "relative",
    alignSelf: "stretch",
    minHeight: theme.spacing[12] + theme.spacing[10],
    borderRadius: theme.radius.xl,
    overflow: "visible",
    backgroundColor: theme.colors.background.canvasSoft
  },
  workoutRootWithMenu: {
    zIndex: 30
  },
  addWorkoutRoot: {
    alignSelf: "stretch",
    minHeight: theme.sizes.cardAddWorkoutMinHeight,
    justifyContent: "center",
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  pressed: {
    backgroundColor: theme.colors.content.primaryPale
  },
  workoutContent: {
    position: "relative",
    alignSelf: "stretch",
    zIndex: 20,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg
  },
  workoutHeader: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 40,
    gap: theme.spacing.md
  },
  muscleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  muscleText: {
    ...theme.typography.body.mdStrong,
    lineHeight: theme.typography.body.sm.lineHeight,
    color: theme.colors.status.negative
  },
  moreArea: {
    position: "relative",
    zIndex: 50
  },
  menu: {
    position: "absolute",
    top: theme.spacing["2xl"],
    right: theme.spacing[0],
    zIndex: 60,
    ...theme.shadows.raised,
    minWidth: theme.spacing["3xl"] + theme.spacing["2xl"] + theme.spacing["2xl"],
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.background.canvasSoft,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  menuItem: {
    minHeight: theme.spacing["3xl"],
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm
  },
  menuText: {
    ...theme.typography.body.smStrong,
    flexShrink: 1,
    flexWrap: "nowrap",
    color: theme.colors.content.ink
  },
  cancelText: {
    color: theme.colors.status.negative
  },
  workoutBody: {
    alignSelf: "stretch",
    zIndex: 1,
    gap: theme.spacing.xs
  },
  workoutAction: {
    zIndex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxs,
    paddingBottom: theme.spacing.lg
  },
  clientName: {
    ...theme.typography.display.xs,
    color: theme.colors.content.ink
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  metaText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  metaDot: {
    width: theme.spacing.xs,
    height: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.content.ink
  }
});
