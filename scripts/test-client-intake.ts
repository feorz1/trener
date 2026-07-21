import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CLIENT_CUSTOM_ANSWER_MAX_LENGTH, getClientIntakeStepError } from "../src/features/clients/clientIntakeValidation";

const newClientSource = readFileSync(resolve(process.cwd(), "app/clients/new.tsx"), "utf8");
const profileSource = readFileSync(resolve(process.cwd(), "app/clients/[clientId]/index.tsx"), "utf8");
const clientDataSource = readFileSync(resolve(process.cwd(), "app/clients/[clientId]/edit.tsx"), "utf8");

const intakeFields = [
  "ageYears",
  "targetWeightKg",
  "healthConstraints",
  "exerciseRestrictions",
  "activityLevel",
  "sleep",
  "workoutsPerWeek",
  "trainingExperience",
  "sports"
];

assert.match(newClientSource, /intake:\s*\{/);
for (const field of intakeFields) {
  assert.match(newClientSource, new RegExp(`${field}:`), `Client creation must persist intake.${field}`);
}

assert.match(newClientSource, /workoutsPerWeek:\s*Number\(form\.workoutsPerWeek\)/);
assert.match(newClientSource, /form\.healthConstraints\.includes\("other"\) \? form\.healthOther : undefined/);
assert.match(newClientSource, /form\.exerciseRestrictions\.includes\("other"\) \? form\.exerciseRestrictionsOther : undefined/);
assert.match(newClientSource, /form\.sports\.includes\("other"\) \? form\.sportsOther : undefined/);
assert.match(newClientSource, /restrictions,\s*\n\s*metrics:/);
assert.equal((newClientSource.match(/maxLength=\{CLIENT_CUSTOM_ANSWER_MAX_LENGTH\}/g) ?? []).length, 3);
assert.match(newClientSource, /validationAttemptedSteps\[step\] \? stepError : undefined/);
assert.doesNotMatch(newClientSource, /Константин|999-312-21-42|@konstantin/);
assert.match(newClientSource, /name:\s*""/);
assert.match(newClientSource, /healthConstraints:\s*\[\]/);
assert.match(newClientSource, /sports:\s*\[\]/);

const customAnswers = {
  healthConstraints: ["other"],
  healthOther: "",
  exerciseRestrictions: ["other"],
  exerciseRestrictionsOther: "",
  trainingExperience: "regular",
  sports: ["other"],
  sportsOther: ""
};
assert.equal(getClientIntakeStepError("health", customAnswers), "Опишите особенность здоровья.");
assert.equal(getClientIntakeStepError("restrictions", customAnswers), "Опишите, что нельзя выполнять.");
assert.equal(getClientIntakeStepError("experience", customAnswers), "Укажите другой вид спорта.");
assert.equal(
  getClientIntakeStepError("health", { ...customAnswers, healthOther: "x".repeat(CLIENT_CUSTOM_ANSWER_MAX_LENGTH) }),
  undefined
);
assert.equal(
  getClientIntakeStepError("health", { ...customAnswers, healthOther: "x".repeat(CLIENT_CUSTOM_ANSWER_MAX_LENGTH + 1) }),
  `Не больше ${CLIENT_CUSTOM_ANSWER_MAX_LENGTH} символов.`
);

const blankAnswers = {
  name: "",
  gender: "",
  age: 0,
  height: 0,
  weight: 0,
  targetWeight: 0,
  healthConstraints: [],
  healthOther: "",
  exerciseRestrictions: [],
  exerciseRestrictionsOther: "",
  activityLevel: "",
  sleepMode: "",
  workoutsPerWeek: "",
  trainingExperience: "",
  sports: [],
  sportsOther: "",
  goal: ""
};
assert.equal(getClientIntakeStepError("basic", blankAnswers), "Введите имя клиента.");
assert.equal(getClientIntakeStepError("age", blankAnswers), "Укажите возраст.");
assert.equal(getClientIntakeStepError("height", blankAnswers), "Укажите рост.");
assert.equal(getClientIntakeStepError("weight", blankAnswers), "Укажите текущий вес.");
assert.equal(getClientIntakeStepError("targetWeight", blankAnswers), "Укажите желаемый вес.");
assert.equal(getClientIntakeStepError("lifestyle", blankAnswers), "Укажите уровень активности.");
assert.equal(getClientIntakeStepError("experience", blankAnswers), "Укажите опыт тренировок.");
assert.equal(getClientIntakeStepError("goal", blankAnswers), "Укажите цель.");

const completedAnswers = {
  ...blankAnswers,
  name: "Анна",
  gender: "female",
  age: 30,
  height: 170,
  weight: 65,
  targetWeight: 62,
  activityLevel: "active",
  sleepMode: "sixToEight",
  workoutsPerWeek: "3",
  trainingExperience: "regular",
  goal: "keepFit"
};
for (const step of ["basic", "age", "height", "weight", "targetWeight", "health", "restrictions", "lifestyle", "experience", "goal"]) {
  assert.equal(getClientIntakeStepError(step, completedAnswers), undefined, `Completed ${step} step must be valid`);
}

const questionnaireLabels = [
  "Возраст",
  "Рост",
  "Вес",
  "Целевой вес",
  "Особенности здоровья",
  "Что нельзя выполнять",
  "Активность",
  "Сон",
  "Тренировок в неделю",
  "Опыт тренировок",
  "Спорт"
];

assert.match(profileSource, /subtitle="Имя, контакты, анкета, цель и заметки"/);
assert.match(profileSource, /groupPosition="single"/);
assert.doesNotMatch(profileSource, /getClientQuestionnaireRows|questionnaireRows\.map/, "Questionnaire must not render on the client profile");
assert.doesNotMatch(profileSource, />\s*Анкета\s*</, "Questionnaire must not render as a separate client-profile section");

assert.match(clientDataSource, /const questionnaireRows = getClientQuestionnaireRows\(client\)/);
assert.match(clientDataSource, /<Text accessibilityRole="header" style=\{styles\.sectionTitle\}>Анкета<\/Text>/);
assert.match(clientDataSource, /questionnaireRows\.map\(\(row, index\) =>/);
assert.match(clientDataSource, /getListItemCellGroupPosition\(index, questionnaireRows\.length\)/);
assert.match(clientDataSource, /accessibilityRole="text"/);
assert.match(clientDataSource, /accessibilityLabel=\{`\$\{row\.label\}: \$\{row\.value\}`\}/);
assert.match(clientDataSource, /accessibilityLabel="Анкета не заполнена"/);
for (const label of questionnaireLabels) {
  assert.ok(clientDataSource.includes(`"${label}"`), `Client data screen must render questionnaire answer ${label}`);
}

console.log("Client intake source checks passed.");
