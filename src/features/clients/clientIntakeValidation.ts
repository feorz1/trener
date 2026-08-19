export const CLIENT_CUSTOM_ANSWER_MAX_LENGTH = 160;

type ClientIntakeCustomAnswers = {
  name?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  targetWeight?: number;
  healthConstraints: readonly string[];
  healthOther: string;
  exerciseRestrictions: readonly string[];
  exerciseRestrictionsOther: string;
  activityLevel?: string;
  sleepMode?: string;
  workoutsPerWeek?: string;
  trainingExperience?: string;
  sports: readonly string[];
  sportsOther: string;
  goal?: string;
};

function getOtherAnswerError(selectedValues: readonly string[], value: string, emptyMessage: string) {
  if (!selectedValues.includes("other")) return undefined;
  if (!value.trim()) return emptyMessage;
  if (value.length > CLIENT_CUSTOM_ANSWER_MAX_LENGTH) {
    return `Не больше ${CLIENT_CUSTOM_ANSWER_MAX_LENGTH} символов.`;
  }
  return undefined;
}

export function getClientIntakeStepError(step: string, answers: ClientIntakeCustomAnswers) {
  if (step === "basic") {
    if (!answers.name?.trim()) return "Введите имя клиента.";
    if (!answers.gender) return "Укажите пол.";
  }
  if (step === "age" && (!answers.age || answers.age <= 0)) return "Укажите возраст.";
  if (step === "height" && (!answers.height || answers.height <= 0)) return "Укажите рост.";
  if (step === "weight" && (!answers.weight || answers.weight <= 0)) return "Укажите текущий вес.";
  if (step === "targetWeight" && (!answers.targetWeight || answers.targetWeight <= 0)) return "Укажите желаемый вес.";
  if (step === "health") {
    return getOtherAnswerError(answers.healthConstraints, answers.healthOther, "Опишите особенность здоровья.");
  }
  if (step === "restrictions") {
    return getOtherAnswerError(
      answers.exerciseRestrictions,
      answers.exerciseRestrictionsOther,
      "Опишите, что нельзя выполнять."
    );
  }
  if (step === "experience") {
    if (!answers.trainingExperience) return "Укажите опыт тренировок.";
    return getOtherAnswerError(answers.sports, answers.sportsOther, "Укажите другой вид спорта.");
  }
  if (step === "lifestyle") {
    if (!answers.activityLevel) return "Укажите уровень активности.";
    if (!answers.sleepMode) return "Укажите продолжительность сна.";
    if (!answers.workoutsPerWeek) return "Укажите количество тренировок в неделю.";
  }
  if (step === "goal" && !answers.goal) return "Укажите цель.";
  return undefined;
}
