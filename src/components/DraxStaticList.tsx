import { forwardRef, useRef, type ReactNode } from "react";
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

type StaticListSeparators = {
  highlight: () => void;
  unhighlight: () => void;
  updateProps: () => void;
};

type StaticListRenderInfo<T> = {
  item: T;
  index: number;
  separators: StaticListSeparators;
};

export type DraxStaticListProps<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: StaticListRenderInfo<T>) => ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  horizontal?: boolean;
  onContentSizeChange?: (width: number, height: number) => void;
  style?: StyleProp<ViewStyle>;
};

const separators: StaticListSeparators = {
  highlight: () => undefined,
  unhighlight: () => undefined,
  updateProps: () => undefined
};

function DraxStaticListInner<T>(
  { contentContainerStyle, data, horizontal = false, keyExtractor, onContentSizeChange, renderItem, style }: DraxStaticListProps<T>,
  ref: React.ForwardedRef<View>
) {
  const sizeRef = useRef({ width: 0, height: 0 });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    if (sizeRef.current.width === width && sizeRef.current.height === height) return;

    sizeRef.current = { width, height };
    onContentSizeChange?.(width, height);
  };

  return (
    <View ref={ref} style={[style, contentContainerStyle, horizontal && { flexDirection: "row" }]} onLayout={handleLayout} collapsable={false}>
      {data.map((item, index) => (
        <View key={keyExtractor(item, index)} collapsable={false}>
          {renderItem({ item, index, separators })}
        </View>
      ))}
    </View>
  );
}

export const DraxStaticList = forwardRef(DraxStaticListInner) as <T>(
  props: DraxStaticListProps<T> & { ref?: React.ForwardedRef<View> }
) => ReactNode;
