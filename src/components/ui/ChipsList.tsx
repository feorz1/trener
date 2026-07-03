import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/theme";
import { Chip, type ChipProps } from "./Chip";

export type ChipsListItem = ChipProps & {
  id: string;
};

export type ChipsListProps = {
  items: ChipsListItem[];
  style?: StyleProp<ViewStyle>;
};

export function ChipsList({ items, style }: ChipsListProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={style}
      contentContainerStyle={styles.root}
    >
      {items.map(({ id, ...chip }) => (
        <Chip key={id} {...chip} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  }
});
