import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent, ScrollViewProps } from "react-native";

type ConditionalScrollOptions = {
  disabled?: boolean;
};

type ConditionalScrollProps = Pick<
  ScrollViewProps,
  "alwaysBounceVertical" | "bounces" | "onContentSizeChange" | "onLayout" | "scrollEnabled" | "showsVerticalScrollIndicator"
>;

export function useConditionalScroll({ disabled = false }: ConditionalScrollOptions = {}) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const canScrollContent = contentHeight > viewportHeight + 1;
  const scrollEnabled = canScrollContent && !disabled;

  const handleScrollLayout = useCallback((event: LayoutChangeEvent) => {
    setViewportHeight(Math.round(event.nativeEvent.layout.height));
  }, []);

  const handleScrollContentSizeChange = useCallback((_width: number, height: number) => {
    setContentHeight(Math.round(height));
  }, []);

  const scrollProps = useMemo<ConditionalScrollProps>(
    () => ({
      alwaysBounceVertical: false,
      bounces: scrollEnabled,
      scrollEnabled,
      showsVerticalScrollIndicator: scrollEnabled,
      onContentSizeChange: handleScrollContentSizeChange,
      onLayout: handleScrollLayout
    }),
    [handleScrollContentSizeChange, handleScrollLayout, scrollEnabled]
  );

  return {
    canScrollContent,
    scrollEnabled,
    scrollProps
  };
}
