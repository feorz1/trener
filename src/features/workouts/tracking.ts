import type { MetricKey, MetricValues, WorkoutResultType } from "@/types";

export type MetricInputType = "integer" | "decimal" | "duration";
export type TrackingLayout = "compact" | "expanded";
export type TimerMode = "countdown" | "stopwatch";
export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type MetricDefinition = {
  key: MetricKey;
  label: string;
  shortLabel: string;
  inputType: MetricInputType;
  unit?: string;
  required: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type TrackingPreset = {
  type: WorkoutResultType;
  title: string;
  metrics: MetricDefinition[];
  layout: TrackingLayout;
  timer?: {
    metric: "duration" | "interval";
    mode: TimerMode;
  };
};

export type SetTimerState = {
  workoutId: string;
  exerciseId: string;
  setId: string;
  metricKey: "duration" | "interval";
  mode: TimerMode;
  status: TimerStatus;
  targetSeconds?: number;
  startedAt?: number;
  endsAt?: number;
  accumulatedSeconds: number;
};

const decimalMetric = (key: MetricKey, label: string, shortLabel = label, required = true): MetricDefinition => ({
  key,
  label,
  shortLabel,
  inputType: "decimal",
  required,
  min: 0
});

const integerMetric = (key: MetricKey, label: string, shortLabel = label, required = true): MetricDefinition => ({
  key,
  label,
  shortLabel,
  inputType: "integer",
  required,
  min: 0
});

const durationMetric = (key: MetricKey, label: string, required = true): MetricDefinition => ({
  key,
  label,
  shortLabel: label,
  inputType: "duration",
  required,
  min: 0
});

export const trackingPresets: Record<WorkoutResultType, TrackingPreset> = {
  weight_reps: {
    type: "weight_reps",
    title: "Вес + повторы",
    metrics: [decimalMetric("weight", "КГ"), integerMetric("reps", "ПОВТОРЫ")],
    layout: "compact"
  },
  reps: {
    type: "reps",
    title: "Только повторы",
    metrics: [integerMetric("reps", "ПОВТОРЫ")],
    layout: "compact"
  },
  duration: {
    type: "duration",
    title: "Удержание на время",
    metrics: [durationMetric("duration", "ВРЕМЯ")],
    layout: "compact",
    timer: { metric: "duration", mode: "countdown" }
  },
  distance_duration: {
    type: "distance_duration",
    title: "Дистанция + время",
    metrics: [decimalMetric("distance", "ДИСТАНЦИЯ"), durationMetric("duration", "ВРЕМЯ")],
    layout: "compact",
    timer: { metric: "duration", mode: "stopwatch" }
  },
  reps_only: {
    type: "reps_only",
    title: "Только повторы",
    metrics: [integerMetric("reps", "ПОВТОРЫ")],
    layout: "compact"
  },
  weighted_bodyweight: {
    type: "weighted_bodyweight",
    title: "Собственный вес + дополнительный вес",
    metrics: [decimalMetric("addedWeight", "ДОП. КГ"), integerMetric("reps", "ПОВТОРЫ")],
    layout: "compact"
  },
  assisted_bodyweight: {
    type: "assisted_bodyweight",
    title: "Упражнение с помощью",
    metrics: [decimalMetric("assistance", "ПОМОЩЬ, КГ"), integerMetric("reps", "ПОВТОРЫ")],
    layout: "compact"
  },
  weight_reps_rpe: {
    type: "weight_reps_rpe",
    title: "Вес + повторы + RPE",
    metrics: [decimalMetric("weight", "КГ"), integerMetric("reps", "ПОВТОРЫ"), { ...decimalMetric("rpe", "RPE"), min: 1, max: 10, step: 0.5 }],
    layout: "expanded"
  },
  duration_hold: {
    type: "duration_hold",
    title: "Удержание на время",
    metrics: [durationMetric("duration", "ВРЕМЯ")],
    layout: "compact",
    timer: { metric: "duration", mode: "countdown" }
  },
  time_result: {
    type: "time_result",
    title: "Время на результат",
    metrics: [durationMetric("duration", "ВРЕМЯ")],
    layout: "compact",
    timer: { metric: "duration", mode: "stopwatch" }
  },
  weight_duration: {
    type: "weight_duration",
    title: "Вес + время",
    metrics: [decimalMetric("weight", "КГ"), durationMetric("duration", "ВРЕМЯ")],
    layout: "compact",
    timer: { metric: "duration", mode: "countdown" }
  },
  distance_time: {
    type: "distance_time",
    title: "Дистанция + время",
    metrics: [decimalMetric("distance", "ДИСТАНЦИЯ"), durationMetric("duration", "ВРЕМЯ")],
    layout: "compact",
    timer: { metric: "duration", mode: "stopwatch" }
  },
  distance_only: {
    type: "distance_only",
    title: "Только дистанция",
    metrics: [decimalMetric("distance", "ДИСТАНЦИЯ")],
    layout: "compact"
  },
  weight_distance: {
    type: "weight_distance",
    title: "Вес + дистанция",
    metrics: [decimalMetric("weight", "КГ"), decimalMetric("distance", "ДИСТАНЦИЯ")],
    layout: "compact"
  },
  time_calories: {
    type: "time_calories",
    title: "Время + калории",
    metrics: [durationMetric("duration", "ВРЕМЯ"), integerMetric("calories", "ККАЛ")],
    layout: "compact",
    timer: { metric: "duration", mode: "stopwatch" }
  },
  calories_only: {
    type: "calories_only",
    title: "Только калории",
    metrics: [integerMetric("calories", "ККАЛ")],
    layout: "compact"
  },
  cardio_extended: {
    type: "cardio_extended",
    title: "Расширенное кардио",
    metrics: [
      durationMetric("duration", "ВРЕМЯ"),
      decimalMetric("distance", "ДИСТАНЦИЯ"),
      integerMetric("calories", "ККАЛ", "ККАЛ", false),
      decimalMetric("speed", "СКОРОСТЬ", "СКОР.", false),
      durationMetric("pace", "ТЕМП", false),
      decimalMetric("incline", "НАКЛОН", "НАКЛ.", false),
      decimalMetric("resistance", "СОПРОТ.", "СОПР.", false)
    ],
    layout: "expanded",
    timer: { metric: "duration", mode: "stopwatch" }
  },
  interval_reps: {
    type: "interval_reps",
    title: "Интервал + повторы",
    metrics: [durationMetric("interval", "ИНТЕРВАЛ"), integerMetric("reps", "ПОВТОРЫ")],
    layout: "compact",
    timer: { metric: "interval", mode: "countdown" }
  },
  amrap: {
    type: "amrap",
    title: "AMRAP",
    metrics: [durationMetric("duration", "ВРЕМЯ"), integerMetric("rounds", "РАУНДЫ"), integerMetric("extraReps", "ДОП. ПОВТОРЫ", "ДОП.", false)],
    layout: "expanded",
    timer: { metric: "duration", mode: "countdown" }
  },
  side_reps: {
    type: "side_reps",
    title: "Левая + правая",
    metrics: [integerMetric("leftReps", "ЛЕВАЯ"), integerMetric("rightReps", "ПРАВАЯ")],
    layout: "compact"
  },
  weight_side_reps: {
    type: "weight_side_reps",
    title: "Вес + левая + правая",
    metrics: [decimalMetric("weight", "КГ"), integerMetric("leftReps", "ЛЕВАЯ"), integerMetric("rightReps", "ПРАВАЯ")],
    layout: "expanded"
  },
  completion_only: {
    type: "completion_only",
    title: "Без числового результата",
    metrics: [],
    layout: "compact"
  }
};

export const trackingPresetGroups: Array<{ title: string; types: WorkoutResultType[] }> = [
  { title: "Силовые", types: ["weight_reps", "reps_only", "weighted_bodyweight", "assisted_bodyweight", "weight_reps_rpe"] },
  { title: "Время", types: ["duration_hold", "time_result", "weight_duration"] },
  { title: "Кардио и перемещение", types: ["distance_time", "distance_only", "weight_distance", "time_calories", "calories_only", "cardio_extended"] },
  { title: "Интервалы и комплексы", types: ["interval_reps", "amrap"] },
  { title: "Односторонние", types: ["side_reps", "weight_side_reps"] },
  { title: "Без числовой метрики", types: ["completion_only"] }
];

export function normalizeTrackingType(type?: WorkoutResultType): WorkoutResultType {
  if (type === "reps") return "reps_only";
  if (type === "duration") return "duration_hold";
  if (type === "distance_duration") return "distance_time";
  return type ?? "weight_reps";
}

export function getTrackingPreset(type?: WorkoutResultType): TrackingPreset {
  return trackingPresets[normalizeTrackingType(type)];
}

export function getPrimaryWeightMetricKey(type?: WorkoutResultType): Extract<MetricKey, "weight" | "addedWeight" | "assistance"> | undefined {
  const metrics = getTrackingPreset(type).metrics;
  if (metrics.some((metric) => metric.key === "weight")) return "weight";
  if (metrics.some((metric) => metric.key === "addedWeight")) return "addedWeight";
  if (metrics.some((metric) => metric.key === "assistance")) return "assistance";
  return undefined;
}

export function isMetricCompatible(type: WorkoutResultType | undefined, key: MetricKey) {
  return getTrackingPreset(type).metrics.some((metric) => metric.key === key);
}

export function getLegacyValues(input: {
  values?: MetricValues;
  weight?: number;
  repetitions?: number;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
}): MetricValues {
  return {
    ...input.values,
    weight: input.values?.weight ?? input.weight,
    reps: input.values?.reps ?? input.repetitions ?? input.reps,
    duration: input.values?.duration ?? input.durationSeconds,
    distance: input.values?.distance ?? input.distanceMeters
  };
}

export function valuesToLegacyFields(values: MetricValues, type?: WorkoutResultType) {
  const weightMetricKey = getPrimaryWeightMetricKey(type);
  return {
    weight: weightMetricKey ? values[weightMetricKey] : values.weight,
    repetitions: values.reps,
    durationSeconds: values.duration,
    distanceMeters: values.distance
  };
}

export function pickCompatibleValues(values: MetricValues | undefined, type?: WorkoutResultType): MetricValues {
  const preset = getTrackingPreset(type);
  const nextValues: MetricValues = {};
  for (const metric of preset.metrics) {
    const value = values?.[metric.key];
    if (Number.isFinite(value)) nextValues[metric.key] = value;
  }
  return nextValues;
}

export function hasAnyMetricValue(values: MetricValues | undefined) {
  return Boolean(values && Object.values(values).some((value) => Number.isFinite(value)));
}

export function isSetCompleteAllowed(type: WorkoutResultType | undefined, values: MetricValues) {
  const preset = getTrackingPreset(type);
  if (preset.type === "completion_only") return true;

  return preset.metrics.every((metric) => {
    if (!metric.required) return true;
    const value = values[metric.key];
    if (!Number.isFinite(value)) return false;
    const numericValue = value as number;
    if (metric.min !== undefined && numericValue < metric.min) return false;
    if (metric.max !== undefined && numericValue > metric.max) return false;
    return true;
  });
}

export function parseDurationInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+(?::\d{1,2}){0,2}$/.test(trimmed)) return undefined;
  const parts = trimmed.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  if (parts.length === 1) return parts[0];
  if (parts.some((part, index) => index > 0 && part > 59)) return undefined;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function formatDuration(totalSeconds: number | undefined) {
  if (!Number.isFinite(totalSeconds)) return "";
  const safeSeconds = Math.max(0, Math.floor(totalSeconds ?? 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function parseMetricInput(value: string, metric: MetricDefinition): number | undefined {
  if (metric.inputType === "duration") return parseDurationInput(value);

  const normalizedValue = value.replace(",", ".").trim();
  if (!normalizedValue) return undefined;
  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) return undefined;

  const steppedValue = metric.inputType === "integer" ? Math.floor(parsedValue) : parsedValue;
  if (metric.min !== undefined && steppedValue < metric.min) return undefined;
  if (metric.max !== undefined && steppedValue > metric.max) return undefined;
  if (metric.step === 0.5) return Math.round(steppedValue * 2) / 2;
  return steppedValue;
}

export function formatMetricInputValue(value: number | undefined, metric: MetricDefinition) {
  if (!Number.isFinite(value)) return "";
  if (metric.inputType === "duration") return formatDuration(value);
  return String(value);
}

export function sanitizeMetricInput(value: string, metric: MetricDefinition) {
  if (metric.inputType === "duration") return value.replace(/[^\d:]/g, "");
  if (metric.inputType === "integer") return value.replace(/[^\d]/g, "");
  return value.replace(/[^\d.,]/g, "");
}

function formatNumber(value: number | undefined, options?: Intl.NumberFormatOptions) {
  if (!Number.isFinite(value)) return undefined;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2, ...options }).format(value ?? 0);
}

function formatDistance(value: number | undefined) {
  if (!Number.isFinite(value)) return undefined;
  const distance = value ?? 0;
  if (distance >= 1000) return `${formatNumber(distance / 1000)}км`;
  return `${formatNumber(distance)}м`;
}

export function formatPreviousSetValue(type: WorkoutResultType | undefined, valuesInput: MetricValues | undefined) {
  const preset = getTrackingPreset(type);
  const values = pickCompatibleValues(valuesInput, preset.type);
  const n = (key: MetricKey) => formatNumber(values[key]);
  const duration = (key: "duration" | "interval") => formatDuration(values[key]);
  const distance = formatDistance(values.distance);
  const hasValue = (key: MetricKey) => Number.isFinite(values[key]);

  switch (preset.type) {
    case "weight_reps":
      return hasValue("weight") && hasValue("reps") ? `${n("weight")}×${n("reps")}` : n("reps") ?? n("weight") ?? "—";
    case "reps_only":
      return n("reps") ?? "—";
    case "weighted_bodyweight":
      return hasValue("addedWeight") && hasValue("reps") ? `+${n("addedWeight")}×${n("reps")}` : n("reps") ?? "—";
    case "assisted_bodyweight":
      return hasValue("assistance") && hasValue("reps") ? `${n("assistance")}×${n("reps")}` : n("reps") ?? "—";
    case "weight_reps_rpe":
      return hasValue("weight") && hasValue("reps") ? `${n("weight")}×${n("reps")}${hasValue("rpe") ? ` @${n("rpe")}` : ""}` : "—";
    case "duration_hold":
    case "time_result":
      return hasValue("duration") ? duration("duration") : "—";
    case "weight_duration":
      return hasValue("weight") && hasValue("duration") ? `${n("weight")}·${duration("duration")}` : duration("duration") || n("weight") || "—";
    case "distance_time":
      return [distance, hasValue("duration") ? duration("duration") : undefined].filter(Boolean).join("·") || "—";
    case "distance_only":
      return distance ?? "—";
    case "weight_distance":
      return [hasValue("weight") ? `${n("weight")}кг` : undefined, distance].filter(Boolean).join("·") || "—";
    case "time_calories":
      return [hasValue("duration") ? duration("duration") : undefined, n("calories")].filter(Boolean).join("·") || "—";
    case "calories_only":
      return n("calories") ?? "—";
    case "cardio_extended":
      return [hasValue("duration") ? duration("duration") : undefined, distance, n("calories")].filter(Boolean).join("·") || "—";
    case "interval_reps":
      return [hasValue("interval") ? duration("interval") : undefined, n("reps")].filter(Boolean).join("·") || "—";
    case "amrap":
      return hasValue("duration") && hasValue("rounds")
        ? `${duration("duration")}·${n("rounds")}${hasValue("extraReps") ? `+${n("extraReps")}` : ""}`
        : "—";
    case "side_reps":
      return hasValue("leftReps") && hasValue("rightReps") ? `${n("leftReps")}/${n("rightReps")}` : "—";
    case "weight_side_reps":
      return hasValue("weight") && hasValue("leftReps") && hasValue("rightReps") ? `${n("weight")}·${n("leftReps")}/${n("rightReps")}` : "—";
    case "completion_only":
      return "Выполнено";
    default:
      return "—";
  }
}

export function getTimerElapsedSeconds(timer: SetTimerState, now = Date.now()) {
  if (timer.status === "running" && timer.startedAt) {
    return timer.accumulatedSeconds + Math.max(0, Math.floor((now - timer.startedAt) / 1000));
  }

  return timer.accumulatedSeconds;
}

export function getTimerDisplaySeconds(timer: SetTimerState, now = Date.now()) {
  const elapsed = getTimerElapsedSeconds(timer, now);
  if (timer.mode === "countdown") return Math.max(0, (timer.targetSeconds ?? 0) - elapsed);
  return elapsed;
}

export function isTimerFinished(timer: SetTimerState, now = Date.now()) {
  return timer.mode === "countdown" && timer.status === "running" && getTimerDisplaySeconds(timer, now) <= 0;
}
