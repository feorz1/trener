import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
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

const accessibilityAdjustmentActions: AccessibilityActionInfo[] = [
  { name: "increment", label: "Увеличить" },
  { name: "decrement", label: "Уменьшить" }
];
const accessibilityNumberFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 10
});

type AccessibilityUnitForms = {
  one: string;
  few: string;
  many: string;
};

type AccessibilityPluralCategory = keyof AccessibilityUnitForms;

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, min: number, step: number) {
  return min + Math.round((value - min) / step) * step;
}

function getAccessibilityStepValue(value: number, action: "increment" | "decrement", min: number, max: number, step: number) {
  const direction = action === "increment" ? 1 : -1;
  return clampValue(roundToStep(value + direction * step, min, step), min, max);
}

function formatAccessibilityNumber(value: number) {
  return accessibilityNumberFormatter.format(value);
}

function getAccessibilityUnitForms(title: string): AccessibilityUnitForms | undefined {
  const normalizedTitle = title.toLocaleLowerCase("ru-RU");
  if (normalizedTitle.includes("возраст")) return { one: "год", few: "года", many: "лет" };
  if (normalizedTitle.includes("рост")) return { one: "сантиметр", few: "сантиметра", many: "сантиметров" };
  if (normalizedTitle.includes("вес")) return { one: "килограмм", few: "килограмма", many: "килограммов" };
  return undefined;
}

function getRussianAccessibilityPluralCategory(value: number): AccessibilityPluralCategory {
  const absoluteValue = Math.round(Math.abs(value) * 1e10) / 1e10;

  // Russian decimal quantities use the genitive singular form (for example, "70,5 килограмма").
  if (!Number.isInteger(absoluteValue)) return "few";

  const lastDigit = absoluteValue % 10;
  const lastTwoDigits = absoluteValue % 100;

  if (lastDigit === 1 && lastTwoDigits !== 11) return "one";
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) return "few";
  return "many";
}

function formatMeasurementAccessibilityValue(title: string, value: number) {
  const formattedValue = formatAccessibilityNumber(value);
  const unitForms = getAccessibilityUnitForms(title);
  if (!unitForms) return formattedValue;

  const unit = unitForms[getRussianAccessibilityPluralCategory(value)];
  return `${formattedValue} ${unit}`;
}

function getAccessibilityValueText(title: string, value: number, referenceValue?: number) {
  const formattedValue = formatMeasurementAccessibilityValue(title, value);
  return typeof referenceValue === "number"
    ? `${formattedValue}. Исходное значение: ${formatMeasurementAccessibilityValue(title, referenceValue)}`
    : formattedValue;
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
  referenceValue
}: MeasurementSliderProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastHapticValue = useRef(value);
  const liveValue = useRef(value);
  const userScrolling = useRef(false);
  const initializedKey = useRef("");
  const finishScrollTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const safeValue = clampValue(value, min, max);
  const [displayValue, setDisplayValue] = useState(safeValue);
  const tickSpacing = theme.sizes.measurementSliderTickSpacing;
  const selectedOffset = getOffsetForValue(safeValue, min, max, step, tickSpacing);
  const tickValues = useMemo(() => {
    const count = Math.floor((max - min) / step) + 1;
    return Array.from({ length: count }, (_, index) => min + index * step);
  }, [max, min, step]);
  const sideInset = Math.max(theme.spacing[0], layoutWidth / 2 - tickSpacing / 2);
  const contentWidth = Math.max(theme.spacing[0], tickValues.length * tickSpacing);
  const snapOffsets = useMemo(() => tickValues.map((tickValue) => getOffsetForValue(tickValue, min, max, step, tickSpacing)), [max, min, step, tickSpacing, tickValues]);
  const sliderKey = `${title}:${min}:${max}:${step}`;
  const rulerOffset = theme.sizes.measurementSliderValueHeight + theme.sizes.measurementSliderContentGap;
  const accessibilityValueText = getAccessibilityValueText(title, displayValue, referenceValue);

  const scrollToValue = useCallback(
    (nextValue: number, animated: boolean) => {
      const nextOffset = getOffsetForValue(nextValue, min, max, step, tickSpacing);
      scrollRef.current?.scrollTo({ x: nextOffset, animated });
    },
    [max, min, step, tickSpacing]
  );

  useEffect(() => {
    liveValue.current = safeValue;
    if (!userScrolling.current) {
      setDisplayValue(safeValue);
    }
  }, [safeValue, sliderKey]);

  useEffect(() => {
    if (layoutWidth > 0 && initializedKey.current !== sliderKey) {
      initializedKey.current = sliderKey;
      liveValue.current = safeValue;
      setDisplayValue(safeValue);
      lastHapticValue.current = safeValue;
      scrollToValue(safeValue, false);
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
    if (Platform.OS === "web") return;
    if (nextValue === lastHapticValue.current) return;
    lastHapticValue.current = nextValue;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const emitValue = (nextValue: number) => {
    if (nextValue === liveValue.current) return;
    liveValue.current = nextValue;
    setDisplayValue(nextValue);
    emitHaptic(nextValue);
  };

  const commitValue = (nextValue: number) => {
    emitValue(nextValue);
    if (nextValue !== safeValue) {
      onChange(nextValue);
    }
  };

  const finishScroll = (offsetX: number) => {
    const nextValue = getNearestValue(offsetX, min, max, step);
    userScrolling.current = false;
    commitValue(nextValue);
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
    const nextValue = getNearestValue(event.nativeEvent.contentOffset.x, min, max, step);
    emitValue(nextValue);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    finishScroll(event.nativeEvent.contentOffset.x);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    const actionName = event.nativeEvent.actionName;
    if (actionName !== "increment" && actionName !== "decrement") return;

    const currentValue = clampValue(liveValue.current, min, max);
    const nextValue = getAccessibilityStepValue(currentValue, actionName, min, max, step);
    if (nextValue === currentValue) return;

    userScrolling.current = false;
    if (finishScrollTimeout.current) {
      clearTimeout(finishScrollTimeout.current);
    }
    commitValue(nextValue);
    scrollToValue(nextValue, true);
  };

  const majorValues = tickValues.filter((tickValue) => (tickValue - min) % majorStep === 0);

  return (
    <View
      accessible
      accessibilityActions={accessibilityAdjustmentActions}
      accessibilityLabel={title}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: displayValue, text: accessibilityValueText }}
      onAccessibilityAction={handleAccessibilityAction}
      style={styles.root}
      onLayout={handleLayout}
    >
      <Text accessible={false} accessibilityElementsHidden importantForAccessibility="no" style={styles.title}>
        {title}
      </Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.controlArea}>
        <ScrollView
          key={sliderKey}
          ref={scrollRef}
          horizontal
          bounces={false}
          contentOffset={{ x: selectedOffset, y: 0 }}
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
          style={styles.rulerScroller}
          contentContainerStyle={[
            styles.rulerContent,
            {
              paddingTop: rulerOffset + theme.spacing.xl,
              paddingHorizontal: sideInset,
              width: contentWidth + sideInset + sideInset
            }
          ]}
        >
          {majorValues.map((tickValue) => {
            const tickIndex = (tickValue - min) / step;
            return (
              <Text
                key={`label-${tickValue}`}
                style={[
                  styles.tickLabel,
                  {
                    top: rulerOffset,
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
        <View pointerEvents="none" style={styles.valueRow}>
          {typeof referenceValue === "number" ? (
            <>
              <Text style={styles.valueText}>{referenceValue}</Text>
              <Icon name="chevron right" size={theme.spacing.xl} color={theme.colors.content.ink} />
              <Text style={[styles.valueText, styles.targetValueText]}>{displayValue}</Text>
            </>
          ) : (
            <Text style={styles.valueText}>{displayValue}</Text>
          )}
        </View>
        <View pointerEvents="none" style={[styles.leftFade, styles.nonInteractive, { top: rulerOffset }]}>
          <Svg pointerEvents="none" width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} style={styles.nonInteractive}>
            <Defs>
              <LinearGradient id="leftFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.colors.background.canvas} stopOpacity="1" />
                <Stop offset="1" stopColor={theme.colors.background.canvas} stopOpacity="0.5" />
              </LinearGradient>
            </Defs>
            <Rect width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} fill="url(#leftFade)" />
          </Svg>
        </View>
        <View pointerEvents="none" style={[styles.rightFade, styles.nonInteractive, { top: rulerOffset }]}>
          <Svg pointerEvents="none" width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} style={styles.nonInteractive}>
            <Defs>
              <LinearGradient id="rightFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.colors.background.canvas} stopOpacity="0.5" />
                <Stop offset="1" stopColor={theme.colors.background.canvas} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect width={theme.sizes.measurementSliderFadeWidth} height={theme.sizes.measurementSliderFadeHeight} fill="url(#rightFade)" />
          </Svg>
        </View>
        <View pointerEvents="none" style={[styles.centerMarker, styles.nonInteractive, { top: rulerOffset + theme.spacing.xl }]}>
          <View style={styles.centerTick} />
          <Svg pointerEvents="none" width={theme.sizes.measurementSliderIndicatorWidth} height={theme.sizes.measurementSliderIndicatorHeight} viewBox="0 0 10 9" style={styles.markerTriangle}>
            <Path d="M3.09919 0.891148C3.89075 -0.297076 5.63659 -0.297078 6.42815 0.891146L9.18784 5.03374C10.0733 6.3629 9.12044 8.14258 7.52336 8.14258H2.00398C0.406898 8.14258 -0.545945 6.3629 0.339502 5.03375L3.09919 0.891148Z" fill={theme.colors.content.controlAccent} />
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
    fontVariant: ["tabular-nums"],
    color: theme.colors.content.ink,
    textAlign: "center"
  },
  targetValueText: {
    color: theme.colors.status.positive
  },
  controlArea: {
    position: "relative",
    alignSelf: "stretch",
    height: theme.sizes.measurementSliderValueHeight + theme.sizes.measurementSliderContentGap + theme.sizes.measurementSliderRulerHeight
  },
  rulerScroller: {
    ...StyleSheet.absoluteFillObject
  },
  rulerContent: {
    position: "relative",
    alignItems: "flex-start"
  },
  tickColumn: {
    height: theme.sizes.measurementSliderMajorTickHeight,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  tickLabel: {
    position: "absolute",
    width: theme.sizes.measurementSliderLabelWidth,
    ...theme.typography.body.md,
    height: theme.spacing.xl,
    fontVariant: ["tabular-nums"],
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
  leftFade: {
    position: "absolute",
    left: 0
  },
  rightFade: {
    position: "absolute",
    right: 0
  },
  centerMarker: {
    position: "absolute",
    left: "50%",
    width: theme.sizes.measurementSliderIndicatorWidth,
    alignItems: "center",
    transform: [{ translateX: -theme.sizes.measurementSliderIndicatorWidth / 2 }]
  },
  centerTick: {
    width: theme.sizes.measurementSliderTickWidth,
    height: theme.sizes.measurementSliderMajorTickHeight,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.controlAccent
  },
  markerTriangle: {
    marginTop: theme.spacing.xs
  },
  nonInteractive: {
    pointerEvents: "none"
  }
});
