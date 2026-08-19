import type { Client, Exercise, ExerciseRestrictionTag } from "@/types";

type RestrictionRule = {
  labels: string[];
  tags: ExerciseRestrictionTag[];
};

const restrictionRules: RestrictionRule[] = [
  { labels: ["Травмы спины", "Грыжи / протрузии"], tags: ["axialLoads", "twists"] },
  { labels: ["Нельзя скручивания"], tags: ["twists"] },
  { labels: ["Нельзя осевые нагрузки"], tags: ["axialLoads"] },
  { labels: ["Проблемы с коленями"], tags: ["kneeStress", "jumps", "running"] },
  { labels: ["Прыжки"], tags: ["jumps"] },
  { labels: ["Бег"], tags: ["running"] },
  { labels: ["Проблемы с плечами"], tags: ["shoulderStress", "behindNeckPull"] },
  { labels: ["Тяга к груди за голову"], tags: ["behindNeckPull"] },
  { labels: ["Повышенное давление"], tags: ["breathHold", "intensity"] },
  { labels: ["Контроль интенсивности"], tags: ["intensity"] },
  { labels: ["Без задержки дыхания"], tags: ["breathHold"] },
  { labels: ["Варикоз"], tags: ["staticLoads"] },
  { labels: ["Ограничить статические нагрузки"], tags: ["staticLoads"] },
  { labels: ["Послеоперационный период", "Только щадящие нагрузки"], tags: ["gentleOnly"] }
];

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

function uniqueValues<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function getClientRestrictionTags(restrictions: string[] = []) {
  const normalizedRestrictions = new Set(restrictions.map(normalizeLabel));
  return uniqueValues(
    restrictionRules.flatMap((rule) => (rule.labels.some((label) => normalizedRestrictions.has(normalizeLabel(label))) ? rule.tags : []))
  );
}

export function getExerciseRestrictionTags(exercise: Exercise): ExerciseRestrictionTag[] {
  const text = [exercise.name, exercise.equipment, ...(exercise.searchAliases ?? [])].join(" ").toLocaleLowerCase("ru-RU");
  const inferredTags: ExerciseRestrictionTag[] = [];

  if (/скручив|twist|rotation|woodchopper/.test(text)) inferredTags.push("twists");
  if (/станов|присед|squat|deadlift|тяга штанги в наклоне|good morning|жим над головой|армейск|overhead/.test(text)) inferredTags.push("axialLoads");
  if (/прыж|jump|plyo|burpee/.test(text)) inferredTags.push("jumps");
  if (/бег|running|treadmill|спринт/.test(text)) inferredTags.push("running");
  if (/за голову|behind neck/.test(text)) inferredTags.push("behindNeckPull");
  if (/подтяг|pull[- ]?up|брусь|dips|жим от плеч|overhead|плеч/.test(text)) inferredTags.push("shoulderStress");
  if (/присед|выпад|lunges?|leg press|жим ногами|step[- ]?up|болгар/.test(text)) inferredTags.push("kneeStress");
  if (/планк|plank|wall sit|удержан|isometric|статич/.test(text)) inferredTags.push("staticLoads");
  if (/станов|присед|жим|deadlift|squat|press/.test(text)) inferredTags.push("breathHold");
  if (exercise.category === "cardio") inferredTags.push("intensity");

  return uniqueValues([...(exercise.restrictionTags ?? []), ...inferredTags]);
}

export function getExerciseClientRestrictionLabels(exercise: Exercise, client?: Pick<Client, "restrictions"> | null) {
  const restrictions = client?.restrictions ?? [];
  if (!restrictions.length) return [];

  const exerciseTags = new Set(getExerciseRestrictionTags(exercise));
  const normalizedRestrictions = new Set(restrictions.map(normalizeLabel));
  const matchedLabels = restrictionRules.flatMap((rule) => {
    const hasClientRestriction = rule.labels.some((label) => normalizedRestrictions.has(normalizeLabel(label)));
    const matchesExercise = rule.tags.some((tag) => exerciseTags.has(tag));
    return hasClientRestriction && matchesExercise ? rule.labels.filter((label) => normalizedRestrictions.has(normalizeLabel(label))) : [];
  });

  return uniqueValues(matchedLabels);
}

export function hasExerciseClientRestrictions(exercise: Exercise, client?: Pick<Client, "restrictions"> | null) {
  return getExerciseClientRestrictionLabels(exercise, client).length > 0;
}
