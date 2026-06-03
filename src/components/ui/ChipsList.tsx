import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
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
    <View style={[styles.root, style]}>
      {items.map(({ id, ...chip }) => (
        <Chip key={id} {...chip} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing.sm
  }
});
