import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/theme";

const MIN_COLUMNS = 1;
const MAX_COLUMNS = 5;
const MAX_ROWS = 5;
const MAX_ITEMS = 25;

export type VariantItem<T extends string> = {
  label: string;
  key?: T;
  value?: T;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export type VariantProps<T extends string> = {
  label: string;
  items: VariantItem<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
  message?: string;
  showLabel?: boolean;
  showMessage?: boolean;
  disabled?: boolean;
  width?: "fixed" | "fill";
};

const getItemValue = <T extends string>(item: VariantItem<T>) => {
  const itemValue = item.value ?? item.key;
  if (!itemValue) {
    throw new Error("Variant item must provide key or value.");
  }
  return itemValue;
};

const resolveColumns = (itemsCount: number, columns: number) => {
  const preferredColumns = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.floor(columns)));
  const minimumColumnsForRows = Math.ceil(itemsCount / MAX_ROWS);
  return Math.min(MAX_COLUMNS, Math.max(preferredColumns, minimumColumnsForRows));
};

const chunkItems = <T extends string>(items: VariantItem<T>[], columns: number) => {
  const rows: Array<VariantItem<T>[]> = [];

  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }

  return rows;
};

export function Variant<T extends string>({
  label,
  items,
  value,
  onChange,
  columns,
  message = "Message",
  showLabel = true,
  showMessage = false,
  disabled = false,
  width = "fixed"
}: VariantProps<T>) {
  if (items.length > MAX_ITEMS) {
    throw new Error("Variant supports up to 25 items.");
  }

  if (items.length < 1) {
    throw new Error("Variant requires at least one item.");
  }

  const resolvedColumns = resolveColumns(items.length, columns ?? Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, items.length)));
  const rows = chunkItems(items, resolvedColumns);

  return (
    <View style={[styles.root, width === "fill" && styles.rootFill]}>
      {showLabel ? <Text style={[styles.label, disabled && styles.disabledText]}>{label}</Text> : null}

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((item) => {
              const itemValue = getItemValue(item);
              const selected = itemValue === value;
              const itemDisabled = disabled || item.disabled;

              return (
                <Pressable
                  accessibilityLabel={item.accessibilityLabel ?? item.label}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: itemDisabled }}
                  disabled={itemDisabled}
                  key={itemValue}
                  onPress={() => onChange(itemValue)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && !itemDisabled && !selected && styles.optionPressed,
                    itemDisabled && styles.optionDisabled
                  ]}
                >
                  <Text numberOfLines={1} style={[styles.optionLabel, itemDisabled && styles.disabledText]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {showMessage ? (
        <View style={styles.messageRow}>
          <Text style={[styles.message, disabled && styles.disabledText]}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: theme.sizes.variantWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm
  },
  rootFill: {
    width: "auto",
    alignSelf: "stretch"
  },
  label: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  grid: {
    gap: theme.spacing.sm
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.spacing.sm
  },
  option: {
    flex: 1,
    minWidth: theme.spacing[0],
    height: theme.sizes.variantOptionHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 2,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.background.canvasSoft,
    backgroundColor: theme.colors.background.canvasSoft
  },
  optionSelected: {
    borderColor: theme.colors.content.inkDeep,
    backgroundColor: theme.colors.background.canvas
  },
  optionPressed: {
    backgroundColor: theme.colors.content.primaryActive
  },
  optionDisabled: {
    opacity: 0.48
  },
  optionLabel: {
    ...theme.typography.body.md,
    minWidth: theme.spacing[0],
    minHeight: theme.typography.body.md.lineHeight,
    color: theme.colors.content.ink
  },
  messageRow: {
    minHeight: theme.typography.body.sm.lineHeight,
    flexDirection: "row",
    alignItems: "center"
  },
  message: {
    ...theme.typography.body.sm,
    flex: 1,
    minWidth: theme.spacing[0],
    color: theme.colors.content.body
  },
  disabledText: {
    color: theme.colors.content.mute
  }
});
