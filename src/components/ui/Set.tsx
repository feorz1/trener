import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Badge } from "./Badge";

export type WorkoutSetVariant = "set" | "new";

export type WorkoutSetValue = {
  id: string;
  label: string;
};

export type SetProps = {
  variant?: WorkoutSetVariant;
  values?: WorkoutSetValue[];
  addLabel?: string;
  onAddPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const defaultValues: WorkoutSetValue[] = [
  { id: "one", label: "12x10кг" },
  { id: "two", label: "8x15кг" },
  { id: "three", label: "6x15кг" },
  { id: "four", label: "4x10кг" }
];

export function Set({ variant = "set", values = defaultValues, addLabel = "Добавь подход", onAddPress, style }: SetProps) {
  return (
    <View style={[styles.root, style]}>
      {variant === "new" ? (
        onAddPress ? (
          <Pressable accessibilityLabel={addLabel} accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onAddPress}>
            <Badge label={addLabel} tone="neutral" size="s" icon={false} />
          </Pressable>
        ) : (
          <Badge label={addLabel} tone="neutral" size="s" icon={false} />
        )
      ) : (
        values.map((value) => <Badge key={value.id} label={value.label} tone="neutral" size="s" icon={false} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.xs
  }
});
