import { useEffect, useState } from "react";
import Svg, { Path } from "react-native-svg";
import { theme } from "@/theme";

export type LoaderSize = "small" | "medium";
export type LoaderTone = "brand" | "inverse" | "negative" | "neutral" | "canvas";

type LoaderProps = {
  size?: LoaderSize;
  tone?: LoaderTone;
  frameDuration?: number;
};

type LoaderPart = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type LoaderFrame = {
  bar?: LoaderPart;
  leftInner?: LoaderPart;
  rightInner?: LoaderPart;
  leftOuter?: LoaderPart;
  rightOuter?: LoaderPart;
};

const toneColor: Record<LoaderTone, string> = {
  brand: theme.colors.content.inkDeep,
  inverse: theme.colors.content.primary,
  negative: theme.colors.status.negative,
  neutral: theme.colors.content.body,
  canvas: theme.colors.background.canvas
};

export function Loader({ size = "medium", tone = "brand", frameDuration = 160 }: LoaderProps) {
  const [elapsed, setElapsed] = useState(0);
  const color = toneColor[tone];
  const metrics = sizeMetrics[size];

  useEffect(() => {
    let animationFrame = 0;
    const startedAt = Date.now();
    const tick = () => {
      setElapsed(Date.now() - startedAt);
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const stage = getAssemblyFrame(elapsed, frameDuration);

  return (
    <Svg accessibilityRole="progressbar" width={metrics.width} height={metrics.height} viewBox="0 0 84 23">
      {stage.bar ? <LoaderRect color={color} part={stage.bar} /> : null}
      {stage.leftInner ? <LoaderRect color={color} part={stage.leftInner} /> : null}
      {stage.rightInner ? <LoaderRect color={color} part={stage.rightInner} /> : null}
      {stage.leftOuter ? <LoaderRect color={color} part={stage.leftOuter} /> : null}
      {stage.rightOuter ? <LoaderRect color={color} part={stage.rightOuter} /> : null}
    </Svg>
  );
}

function LoaderRect({ color, part }: { color: string; part: LoaderPart }) {
  return <Path d={roundedRectPath(part)} fill={color} />;
}

function roundedRectPath({ x, y, width, height }: LoaderPart) {
  const radius = Math.min(theme.sizes.loaderCornerRadius, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;

  return [
    `M ${x + radius} ${y}`,
    `H ${right - radius}`,
    `Q ${right} ${y} ${right} ${y + radius}`,
    `V ${bottom - radius}`,
    `Q ${right} ${bottom} ${right - radius} ${bottom}`,
    `H ${x + radius}`,
    `Q ${x} ${bottom} ${x} ${bottom - radius}`,
    `V ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    "Z"
  ].join(" ");
}

const sizeMetrics = {
  small: {
    width: theme.sizes.loaderSmallWidth,
    height: theme.sizes.loaderSmallHeight
  },
  medium: {
    width: theme.sizes.loaderMediumWidth,
    height: theme.sizes.loaderMediumHeight
  }
} as const;

function getAssemblyFrame(elapsed: number, moveDuration: number): LoaderFrame {
  const holdDuration = Math.round(moveDuration * 0.55);
  const finalHoldDuration = Math.round(moveDuration * 2.2);
  const cycleDuration = assemblyFrames.reduce((total, _, index) => {
    const isFinal = index === assemblyFrames.length - 1;
    return total + (isFinal ? finalHoldDuration : holdDuration + moveDuration);
  }, 0);
  let cursor = elapsed % cycleDuration;

  for (let index = 0; index < assemblyFrames.length; index += 1) {
    const current = assemblyFrames[index];
    const next = assemblyFrames[index + 1];
    const isFinal = !next;
    const hold = isFinal ? finalHoldDuration : holdDuration;

    if (cursor <= hold || isFinal) return current;
    cursor -= hold;

    if (cursor <= moveDuration) {
      return interpolateFrame(current, next, easeInCubic(cursor / moveDuration));
    }

    cursor -= moveDuration;
  }

  return assemblyFrames[0];
}

function interpolateFrame(from: LoaderFrame, to: LoaderFrame, progress: number): LoaderFrame {
  return {
    bar: interpolatePart(from.bar, to.bar, progress),
    leftInner: interpolatePart(from.leftInner, to.leftInner, progress),
    rightInner: interpolatePart(from.rightInner, to.rightInner, progress),
    leftOuter: interpolatePart(from.leftOuter, to.leftOuter, progress),
    rightOuter: interpolatePart(from.rightOuter, to.rightOuter, progress)
  };
}

function interpolatePart(from: LoaderPart | undefined, to: LoaderPart | undefined, progress: number): LoaderPart | undefined {
  if (!from && !to) return undefined;
  if (!from) return to;
  if (!to) return from;

  return {
    x: lerp(from.x, to.x, progress),
    y: lerp(from.y, to.y, progress),
    width: lerp(from.width, to.width, progress),
    height: lerp(from.height, to.height, progress)
  };
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function easeInCubic(progress: number) {
  return progress * progress * progress;
}

const assemblyFrames: LoaderFrame[] = [
  {
    bar: { x: 11, y: 8.3, width: 62, height: 6.3 }
  },
  {
    bar: { x: 11, y: 8.3, width: 62, height: 6.3 },
    leftInner: { x: 3.5, y: 0.2, width: 6.3, height: 22.6 },
    rightInner: { x: 74.2, y: 0.2, width: 6.3, height: 22.6 }
  },
  {
    bar: { x: 11, y: 8.3, width: 62, height: 6.3 },
    leftInner: { x: 25.8, y: 0.2, width: 6.3, height: 22.6 },
    rightInner: { x: 52.6, y: 0.2, width: 6.3, height: 22.6 }
  },
  {
    bar: { x: 11, y: 8.3, width: 62, height: 6.3 },
    leftInner: { x: 25.8, y: 0.2, width: 6.3, height: 22.6 },
    rightInner: { x: 52.6, y: 0.2, width: 6.3, height: 22.6 },
    leftOuter: { x: 3.5, y: 2.3, width: 6.3, height: 18.2 },
    rightOuter: { x: 74.2, y: 2.3, width: 6.3, height: 18.2 }
  },
  {
    bar: { x: 11, y: 8.3, width: 62, height: 6.3 },
    leftInner: { x: 25.8, y: 0.2, width: 6.3, height: 22.6 },
    rightInner: { x: 52.6, y: 0.2, width: 6.3, height: 22.6 },
    leftOuter: { x: 17.8, y: 2.3, width: 6.3, height: 18.2 },
    rightOuter: { x: 60.6, y: 2.3, width: 6.3, height: 18.2 }
  }
] as const;
