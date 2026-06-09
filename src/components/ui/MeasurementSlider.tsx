import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { theme } from "@/theme";
import { Icon } from "./Icon";

export type MeasurementSliderProps = {
  title: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  majorStep?: number;
  onChange: (value: number) => void;
  referenceValue?: number;
  rangeFrom?: number;
};

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, min: number, step: number) {
  return min + Math.round((value - min) / step) * step;
}

function getNearestValue(offsetX: number, min: number, max: number, step: number) {
  return clampValue(roundToStep(min + (offsetX / theme.sizes.measurementSliderTickSpacing) * step, min, step), min, max);
}

function getOffsetForValue(value: number, min: number, max: number, step: number, tickSpacing: number) {
  return ((clampValue(value, min, max) - min) / step) * tickSpacing;
}

export function MeasurementSlider({
  title,
  value,
  min,
  max,
  step = 1,
  majorStep = 5,
  onChange,
  referenceValue,
  rangeFrom
}: MeasurementSliderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastHapticValue = useRef(value);
  const userScrolling = useRef(false);
  const initializedKey = useRef("");
  const finishScrollTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const safeValue = clampValue(value, min, max);
  const tickValues = useMemo(() => {
    const count = Math.floor((max - min) / step) + 1;
    return Array.from({ length: count }, (_, index) => min + index * step);
  }, [max, min, step]);
  const tickSpacing = theme.sizes.measurementSliderTickSpacing;
  const sideInset = Math.max(theme.spacing[0], layoutWidth / 2 - tickSpacing / 2);
  const contentWidth = Math.max(theme.spacing[0], tickValues.length * tickSpacing);
  const snapOffsets = useMemo(() => tickValues.map((tickValue) => getOffsetForValue(tickValue, min, max, step, tickSpacing)), [max, min, step, tickSpacing, tickValues]);
  const sliderKey = `${title}:${min}:${max}:${step}`;

  const scrollToValue = useCallback(
    (nextValue: number, animated: boolean) => {
      const nextOffset = getOffsetForValue(nextValue, min, max, step, tickSpacing);
      setScrollOffset(nextOffset);
      scrollRef.current?.scrollTo({ x: nextOffset, animated });
    },
    [max, min, step, tickSpacing]
  );

  useEffect(() => {
    if (layoutWidth > 0 && initializedKey.current !== sliderKey) {
      initializedKey.current = sliderKey;
      lastHapticValue.current = safeValue;
      requestAnimationFrame(() => scrollToValue(safeValue, false));
    }
  }, [layoutWidth, safeValue, scrollToValue, sliderKey]);

  useEffect(() => {
    return () => {
      if (finishScrollTimeout.current) {
        clearTimeout(finishScrollTimeout.current);
      }
    };
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };

  const emitHaptic = (nextValue: number) => {
    if (nextValue === lastHapticValue.current) return;
    lastHapticValue.current = nextValue;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const finishScroll = (offsetX: number) => {
    const nextValue = getNearestValue(offsetX, min, max, step);
    userScrolling.current = false;
    if (nextValue !== safeValue) {
      emitHaptic(nextValue);
      onChange(nextValue);
    }
    scrollToValue(nextValue, true);
  };

  const scheduleFinishScroll = (offsetX: number) => {
    if (finishScrollTimeout.current) {
      clearTimeout(finishScrollTimeout.current);
    }
    finishScrollTimeout.current = setTimeout(() => finishScroll(offsetX), theme.sizes.measurementSliderSnapDelay);
  };

  const handleScrollBegin = () => {
    userScrolling.current = true;
    if (finishScrollTimeout.current) {
      clearTimeout(finishScrollTimeout.current);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    userScrolling.current = true;
    setScrollOffset(event.nativeEvent.contentOffset.x);
    const nextValue = getNearestValue(event.nativeEvent.contentOffset.x, min, max, step);
    if (nextValue !== safeValue) {
      emitHaptic(nextValue);
      onChange(nextValue);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    finishScroll(event.nativeEvent.contentOffset.x);
  };

  const rangeBounds = typeof rangeFrom === "number" ? [clampValue(rangeFrom, min, max), safeValue].sort((left, right) => left - right) : undefined;
  const rangeLeft = rangeBounds ? sideInset + ((rangeBounds[0] - min) / step) * tickSpacing + tickSpacing / 2 - scrollOffset : 0;
  const rangeWidth = rangeBounds ? Math.max(theme.sizes.measurementSliderTickWidth, ((rangeBounds[1] - rangeBounds[0]) / step) * tickSpacing) : 0;
  const majorValues = tickValues.filter((tickValue) => (tickValue - min) % majorStep === 0);

  return (
    <View style={styles.root} onLayout={handleLayout}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.valueRow}>
        {typeof referenceValue === "number" ? (
          <>
            <Text style={styles.valueText}>{referenceValue}</Text>
            <Icon name="chevron right" size={theme.spacing.xl} color={theme.colors.content.ink} />
            <Text style={[styles.valueText, styles.targetValueText]}>{safeValue}</Text>
          </>
        ) : (
          <Text style={styles.valueText}>{safeValue}</Text>
        )}
      </View>

      <View style={styles.rulerWrap}>
        <ScrollView
          ref={scrollRef}
          horizontal
          bounces={false}
          decelerationRate="fast"
          onMomentumScrollEnd={handleScrollEnd}
          onMomentumScrollBegin={handleScrollBegin}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBegin}
          onScrollEndDrag={(event) => scheduleFinishScroll(event.nativeEvent.contentOffset.x)}
          scrollEventThrottle={16}
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.rulerContent, { paddingHorizontal: sideInset, width: contentWidth + sideInset + sideInset }]}
        >
          {majorValues.map((tickValue) => {
            const tickIndex = (tickValue - min) / step;
            return (
              <Text
                key={`label-${tickValue}`}
                style={[
                  styles.tickLabel,
                  {
                    left: sideInset + tickIndex * tickSpacing + tickSpacing / 2 - theme.sizes.measurementSliderLabelWidth / 2
                  }
                ]}
              >
                {tickValue}
              </Text>
            );
          })}
          {tickValues.map((tickValue) => {
            const major = (tickValue - min) % majorStep === 0;
            return (
              <View key={tickValue} style={[styles.tickColumn, { width: tickSpacing }]}>
                <View style={[styles.tick, major ? styles.majorTick : styles.minorTick]} />
              </View>
            );
          })}
        </ScrollView>
        <Svg width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} style={[styles.leftFade, styles.nonInteractive]}>
          <Defs>
            <LinearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.background.canvas} stopOpacity="1" />
              <Stop offset="1" stopColor={theme.colors.background.canvas} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          <Rect width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} fill="url(#leftFade)" />
        </Svg>
        <Svg width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} style={[styles.rightFade, styles.nonInteractive]}>
          <Defs>
            <LinearGradient id="rightFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.colors.background.canvas} stopOpacity="0.5" />
              <Stop offset="1" stopColor={theme.colors.background.canvas} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} fill="url(#rightFade)" />
        </Svg>
        {rangeBounds ? (
          <Svg width={rangeWidth} height={theme.sizes.measurementSliderRangeHeight} style={[styles.range, styles.nonInteractive, { left: rangeLeft }]}>
            <Defs>
              <LinearGradient id="measurementRange" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.colors.content.primaryPale} stopOpacity="0" />
                <Stop offset="1" stopColor={theme.colors.content.primaryPale} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width={rangeWidth} height={theme.sizes.measurementSliderRangeHeight} fill="url(#measurementRange)" />
          </Svg>
        ) : null}
        <View style={[styles.centerMarker, styles.nonInteractive]}>
          <View style={styles.centerTick} />
          <Svg width={theme.sizes.measurementSliderIndicatorWidth} height={theme.sizes.measurementSliderIndicatorHeight} viewBox="0 0 10 9" style={styles.markerTriangle}>
            <Path d="M3.09919 0.891148C3.89075 -0.297076 5.63659 -0.297078 6.42815 0.891146L9.18784 5.03374C10.0733 6.3629 9.12044 8.14258 7.52336 8.14258H2.00398C0.406898 8.14258 -0.545945 6.3629 0.339502 5.03375L3.09919 0.891148Z" fill={theme.colors.content.inkDeep} />
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    minHeight: theme.sizes.measurementSliderHeight,
    alignItems: "center",
    gap: theme.sizes.measurementSliderContentGap,
    paddingTop: theme.spacing["3xl"],
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  title: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  valueRow: {
    height: theme.sizes.measurementSliderValueHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    alignSelf: "stretch"
  },
  valueText: {
    ...theme.typography.display.xl,
    lineHeight: theme.sizes.measurementSliderValueHeight,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  targetValueText: {
    color: theme.colors.status.positive
  },
  rulerWrap: {
    alignSelf: "stretch",
    height: theme.sizes.measurementSliderRulerHeight
  },
  rulerContent: {
    position: "relative",
    alignItems: "flex-start",
    paddingTop: theme.spacing.xl
  },
  tickColumn: {
    height: theme.sizes.measurementSliderMajorTickHeight,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  tickLabel: {
    position: "absolute",
    top: theme.spacing[0],
    width: theme.sizes.measurementSliderLabelWidth,
    ...theme.typography.body.md,
    height: theme.spacing.xl,
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  tick: {
    width: theme.sizes.measurementSliderTickWidth,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.disabled
  },
  minorTick: {
    height: theme.sizes.measurementSliderMinorTickHeight
  },
  majorTick: {
    height: theme.sizes.measurementSliderMajorTickHeight
  },
  range: {
    position: "absolute",
    top: theme.spacing.xl
  },
  leftFade: {
    position: "absolute",
    left: 0,
    top: 0
  },
  rightFade: {
    position: "absolute",
    right: 0,
    top: 0
  },
  centerMarker: {
    position: "absolute",
    top: theme.spacing.xl,
    left: "50%",
    width: theme.sizes.measurementSliderIndicatorWidth,
    alignItems: "center",
    transform: [{ translateX: -theme.sizes.measurementSliderIndicatorWidth / 2 }]
  },
  centerTick: {
    width: theme.sizes.measurementSliderTickWidth,
    height: theme.sizes.measurementSliderMajorTickHeight,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.inkDeep
  },
  markerTriangle: {
    marginTop: theme.spacing.xs
  },
  nonInteractive: {
    pointerEvents: "none"
  }
});
