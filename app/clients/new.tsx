import { useCallback, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  getListItemCellGroupPosition,
  Input,
  ListItemCell,
  MeasurementSlider,
  Navigation,
  ProgressBar,
  Radio,
  TextArea,
  Variant
} from "@/components/ui";
import { useClientActions, useDataMutation, useWorkoutActions } from "@/data";
import { useConditionalScroll } from "@/hooks/useConditionalScroll";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { theme } from "@/theme";

type Gender = "male" | "female";
type HealthConstraint = "backInjury" | "hernia" | "knees" | "shoulders" | "pressure" | "varicose" | "postSurgery" | "other";
type ExerciseRestriction = "twists" | "axialLoads" | "jumps" | "running" | "behindNeckPull" | "other";
type ActivityLevel = "sedentary" | "mixed" | "active";
type SleepMode = "less6" | "sixToEight" | "more8";
type TrainingExperience = "never" | "old" | "regular";
type SportKind = "basketball" | "football" | "running" | "swimming" | "wrestling" | "crossfit" | "weightlifting" | "other";
type Goal = "loseWeight" | "gainMuscle" | "keepFit" | "rehab" | "event";
type ClientStep =
  | "basic"
  | "age"
  | "height"
  | "weight"
  | "targetWeight"
  | "health"
  | "restrictions"
  | "lifestyle"
  | "experience"
  | "goal"
  | "summary";

type ClientForm = {
  name: string;
  phonePrefix: string;
  phone: string;
  telegram: string;
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  gender: Gender;
  healthConstraints: HealthConstraint[];
  healthOther: string;
  exerciseRestrictions: ExerciseRestriction[];
  exerciseRestrictionsOther: string;
  activityLevel: ActivityLevel;
  sleepMode: SleepMode;
  workoutsPerWeek: string;
  trainingExperience: TrainingExperience;
  sports: SportKind[];
  sportsOther: string;
  goal: Goal;
};

const STEPS: ClientStep[] = ["basic", "age", "height", "weight", "targetWeight", "health", "restrictions", "lifestyle", "experience", "goal", "summary"];
const CLIENT_FORM_KEYBOARD_OFFSET = theme.spacing.lg;
const CLIENT_FORM_TEXT_AREA_KEYBOARD_OFFSET = theme.sizes.textAreaFieldMinHeight + theme.spacing.lg;

const sectionByStep: Record<ClientStep, number> = {
  basic: 1,
  age: 2,
  height: 2,
  weight: 2,
  targetWeight: 2,
  health: 3,
  restrictions: 3,
  lifestyle: 4,
  experience: 5,
  goal: 6,
  summary: 7
};

const progressBySection: Record<number, number> = {
  1: 0,
  2: 16,
  3: 33,
  4: 50,
  5: 66,
  6: 66,
  7: 100
};

const healthOptions: { key: HealthConstraint; label: string; restrictions: string[] }[] = [
  { key: "backInjury", label: "Травмы спины", restrictions: ["Нельзя скручивания", "Нельзя осевые нагрузки"] },
  { key: "hernia", label: "Грыжи / протрузии", restrictions: ["Нельзя скручивания", "Нельзя осевые нагрузки"] },
  { key: "knees", label: "Проблемы с коленями", restrictions: ["Прыжки", "Бег"] },
  { key: "shoulders", label: "Проблемы с плечами", restrictions: ["Тяга к груди за голову"] },
  { key: "pressure", label: "Повышенное давление", restrictions: ["Контроль интенсивности", "Без задержки дыхания"] },
  { key: "varicose", label: "Варикоз", restrictions: ["Ограничить статические нагрузки"] },
  { key: "postSurgery", label: "Послеоперационный период", restrictions: ["Только щадящие нагрузки"] },
  { key: "other", label: "Другое", restrictions: [] }
];

const exerciseRestrictionOptions: { key: ExerciseRestriction; label: string; summaryLabel: string }[] = [
  { key: "twists", label: "Скручивания", summaryLabel: "Нельзя скручивания" },
  { key: "axialLoads", label: "Осевые нагрузки", summaryLabel: "Нельзя осевые нагрузки" },
  { key: "jumps", label: "Прыжки", summaryLabel: "Прыжки" },
  { key: "running", label: "Бег", summaryLabel: "Бег" },
  { key: "behindNeckPull", label: "Тяга к груди за голову", summaryLabel: "Тяга к груди за голову" },
  { key: "other", label: "Другое", summaryLabel: "Другое" }
];

const activityOptions: { key: ActivityLevel; title: string; subtitle: string }[] = [
  { key: "sedentary", title: "Сидячая работа", subtitle: "Минимальная активность" },
  { key: "mixed", title: "Смешанная", subtitle: "Умеренная активность 3-5 тыс. шагов" },
  { key: "active", title: "Активная", subtitle: "Более 10 тыс. шагов\nили физическая работа" }
];

const sleepOptions: { key: SleepMode; title: string }[] = [
  { key: "less6", title: "Меньше 6 часов" },
  { key: "sixToEight", title: "6-8 часов" },
  { key: "more8", title: "Больше 8 часов" }
];

const experienceOptions: { key: TrainingExperience; title: string }[] = [
  { key: "never", title: "Никогда не занимался" },
  { key: "old", title: "Был опыт, но давно" },
  { key: "regular", title: "Занимаюсь регулярно" }
];

const sportOptions: { key: SportKind; label: string }[] = [
  { key: "basketball", label: "Баскетбол" },
  { key: "football", label: "Футбол" },
  { key: "running", label: "Бег" },
  { key: "swimming", label: "Плавание" },
  { key: "wrestling", label: "Борьба" },
  { key: "crossfit", label: "Кроссфит" },
  { key: "weightlifting", label: "Тяжёлая атлетика" },
  { key: "other", label: "Другое" }
];

const goalOptions: { key: Goal; title: string }[] = [
  { key: "loseWeight", title: "Похудеть" },
  { key: "gainMuscle", title: "Набрать мышечную массу" },
  { key: "keepFit", title: "Поддержать форму" },
  { key: "rehab", title: "Реабилитация / восстановление" },
  { key: "event", title: "Подготовка к событию" }
];

const initialForm: ClientForm = {
  name: "Константин",
  phonePrefix: "+7",
  phone: "999-312-21-42",
  telegram: "@konstantin",
  age: 30,
  height: 175,
  weight: 80,
  targetWeight: 75,
  gender: "male",
  healthConstraints: ["hernia"],
  healthOther: "",
  exerciseRestrictions: [],
  exerciseRestrictionsOther: "",
  activityLevel: "active",
  sleepMode: "sixToEight",
  workoutsPerWeek: "3",
  trainingExperience: "regular",
  sports: ["football"],
  sportsOther: "",
  goal: "keepFit"
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getLabel<T extends string>(items: { key: T; label?: string; title?: string }[], key: T) {
  const item = items.find((option) => option.key === key);
  return item?.label ?? item?.title ?? key;
}

function toggleItem<T extends string>(items: T[], item: T) {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

function getDefaultTargetWeight(weight: number) {
  return Math.max(0, weight - 5);
}

function getRestrictionLabels(form: ClientForm) {
  const healthRestrictionLabels = form.healthConstraints.flatMap((key) => healthOptions.find((option) => option.key === key)?.restrictions ?? []);
  const directRestrictionLabels = form.exerciseRestrictions.map((key) => exerciseRestrictionOptions.find((option) => option.key === key)?.summaryLabel ?? key);
  return Array.from(new Set([...healthRestrictionLabels, ...directRestrictionLabels]));
}

function getGoalSummary(form: ClientForm) {
  const goal = getLabel(goalOptions, form.goal);
  if (form.goal === "gainMuscle") return `${goal} +${Math.abs(form.targetWeight - form.weight)} кг`;
  if (form.goal === "loseWeight") return `${goal} -${Math.abs(form.weight - form.targetWeight)} кг`;
  return goal;
}

function getClientContactSummary(form: ClientForm) {
  const phone = [form.phonePrefix, form.phone].filter(Boolean).join(" ");
  return [phone, form.telegram].filter(Boolean).join(", ");
}

export default function NewClientScreen() {
  const { returnTo, draftId } = useLocalSearchParams<{
    returnTo?: string;
    draftId?: string;
  }>();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const clients = useClientActions();
  const workouts = useWorkoutActions();
  const step = STEPS[stepIndex];
  const sectionStep = sectionByStep[step];
  const selectedHealthLabels = form.healthConstraints.map((key) => getLabel(healthOptions, key));
  const selectedSportLabels = form.sports.map((key) => getLabel(sportOptions, key));
  const restrictionLabels = useMemo(() => getRestrictionLabels(form), [form]);
  const { scrollProps } = useConditionalScroll();
  const keyboardInset = useKeyboardInset();
  const keyboardVisible = keyboardInset > theme.spacing[0];
  const hasVisibleTextArea =
    (step === "health" && form.healthConstraints.includes("other")) ||
    (step === "restrictions" && form.exerciseRestrictions.includes("other")) ||
    (step === "experience" && form.sports.includes("other"));
  const keyboardOffset = hasVisibleTextArea ? CLIENT_FORM_TEXT_AREA_KEYBOARD_OFFSET : CLIENT_FORM_KEYBOARD_OFFSET;
  const createClientAction = useCallback(async () => {
    const createdClient = await clients.create({
      name: form.name,
      phone: [form.phonePrefix, form.phone].filter(Boolean).join(" "),
      telegram: form.telegram,
      gender: form.gender,
      goal: getGoalSummary(form),
      status: "new",
      notes: getRestrictionLabels(form).join(", "),
      restrictions: getRestrictionLabels(form),
      metrics: {
        weightKg: form.weight,
        heightCm: form.height,
        attendanceRate: 100
      }
    });

    const draftIdValue = firstParam(draftId);
    if (draftIdValue) {
      await workouts.setDraftClient(draftIdValue, createdClient.id);
    }

    return createdClient;
  }, [clients, draftId, form, workouts]);
  const createClientMutation = useDataMutation(createClientAction);

  const updateForm = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateWeight = (weight: number) => {
    setForm((current) => ({ ...current, weight, targetWeight: getDefaultTargetWeight(weight) }));
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      return;
    }
    router.back();
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((current) => current + 1);
    }
  };

  const createClient = async () => {
    if (createClientMutation.isSubmitting) return;

    const createdClient = await createClientMutation.mutate().catch(() => null);
    if (!createdClient) return;

    if (!firstParam(returnTo)) {
      router.back();
      return;
    }

    const draftIdValue = firstParam(draftId);
    router.replace({
      pathname: firstParam(returnTo) === "/workouts/schedule" ? "/workouts/schedule" : "/workouts/new",
      params: draftIdValue ? { draftId: draftIdValue } : { clientId: createdClient.id }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation
        title=""
        showSubtitle={false}
        backIconName={stepIndex === 0 ? "close" : "arrow left"}
        backAccessibilityLabel={stepIndex === 0 ? "Закрыть" : "Назад"}
        onBack={goBack}
      />

      <KeyboardAwareScrollView
        bottomOffset={keyboardOffset}
        contentContainerStyle={styles.content}
        extraKeyboardSpace={keyboardOffset}
        keyboardShouldPersistTaps="handled"
        mode="insets"
        style={styles.keyboardAwareBody}
        {...scrollProps}
        scrollEnabled
      >
        <View style={styles.header}>
          <Text style={styles.title}>{getStepTitle(step)}</Text>
          <ProgressBar completed={progressBySection[sectionStep]} total={100} label={`${sectionStep} из 7`} showBadge tone="primary" />
        </View>

        <Divider width="fill" tone="canvasSoft" />

        {step === "basic" ? <BasicStep form={form} updateForm={updateForm} /> : null}
        {step === "age" ? <BodySliderStep title="Текущий возраст" value={form.age} min={0} max={100} onChange={(value) => updateForm("age", value)} /> : null}
        {step === "height" ? <BodySliderStep title="Текущий рост" value={form.height} min={0} max={250} onChange={(value) => updateForm("height", value)} /> : null}
        {step === "weight" ? <BodySliderStep title="Текущий вес" value={form.weight} min={0} max={250} onChange={updateWeight} /> : null}
        {step === "targetWeight" ? (
          <BodySliderStep
            title="Желаемый вес"
            value={form.targetWeight}
            min={0}
            max={250}
            referenceValue={form.weight}
            rangeFrom={form.weight}
            onChange={(value) => updateForm("targetWeight", value)}
          />
        ) : null}
        {step === "health" ? <HealthStep form={form} updateForm={updateForm} /> : null}
        {step === "restrictions" ? <RestrictionsStep form={form} updateForm={updateForm} /> : null}
        {step === "lifestyle" ? <LifestyleStep form={form} updateForm={updateForm} /> : null}
        {step === "experience" ? <ExperienceStep form={form} updateForm={updateForm} /> : null}
        {step === "goal" ? <GoalStep form={form} updateForm={updateForm} /> : null}
        {step === "summary" ? (
          <SummaryStep form={form} selectedHealthLabels={selectedHealthLabels} selectedSportLabels={selectedSportLabels} restrictionLabels={restrictionLabels} />
        ) : null}
        {createClientMutation.error ? (
          <View style={styles.inlineAlert}>
            <Alert
              tone="negative"
              layout="expanded"
              title="Клиент не создан"
              description={createClientMutation.error.message}
              width="fill"
            />
          </View>
        ) : null}
      </KeyboardAwareScrollView>

      {keyboardVisible ? null : (
        <View style={styles.footer}>
          <Button
            label={step === "summary" ? "Создать клиента" : "Продолжить"}
            type="primary"
            size="large"
            width="fill"
            state={createClientMutation.isSubmitting ? "loading" : "active"}
            onPress={step === "summary" ? createClient : goNext}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function getStepTitle(step: ClientStep) {
  if (step === "basic") return "Основные данные";
  if (step === "age" || step === "height" || step === "weight" || step === "targetWeight") return "Параметры тела";
  if (step === "health") return "Здоровье";
  if (step === "restrictions") return "Ограничения";
  if (step === "lifestyle") return "Образ жизни";
  if (step === "experience") return "Опыт тренировок";
  if (step === "goal") return "Цель";
  return "Сводка";
}

function BasicStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.section}>
      <Variant
        label="Пол"
        items={[
          { key: "male", label: "Мужской" },
          { key: "female", label: "Женский" }
        ]}
        value={form.gender}
        columns={2}
        width="fill"
        onChange={(value) => updateForm("gender", value)}
      />
      <Input label="Имя" value={form.name} width="fill" showMessage={false} onChangeText={(value) => updateForm("name", value)} />
      <Input
        label="Телефон"
        value={form.phone}
        prefixValue={form.phonePrefix}
        width="fill"
        doubleField
        showMessage={false}
        keyboardType="phone-pad"
        onChangePrefixText={(value) => updateForm("phonePrefix", value)}
        onChangeText={(value) => updateForm("phone", value)}
      />
      <Input label="Telegram" value={form.telegram} width="fill" showMessage={false} onChangeText={(value) => updateForm("telegram", value)} />
    </View>
  );
}

function BodySliderStep({
  title,
  value,
  min,
  max,
  referenceValue,
  rangeFrom,
  onChange
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  referenceValue?: number;
  rangeFrom?: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.sliderCard}>
      <MeasurementSlider title={title} value={value} min={min} max={max} majorStep={5} referenceValue={referenceValue} rangeFrom={rangeFrom} onChange={onChange} />
    </View>
  );
}

function HealthStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.body}>
      <SectionTitle title={"Есть ли особенности здоровья\nили травмы?"} />
      <CheckboxGroup
        items={healthOptions}
        selectedValues={form.healthConstraints}
        onToggle={(value) => updateForm("healthConstraints", toggleItem(form.healthConstraints, value))}
      />
      {form.healthConstraints.includes("other") ? (
        <TextArea
          label="Опишите ограничение"
          value={form.healthOther}
          width="fill"
          showMessage={false}
          placeholder="Что важно учитывать на тренировках"
          onChangeText={(value) => updateForm("healthOther", value)}
        />
      ) : null}
    </View>
  );
}

function RestrictionsStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.body}>
      <SectionTitle title="Что нельзя выполнять?" />
      <CheckboxGroup
        items={exerciseRestrictionOptions}
        selectedValues={form.exerciseRestrictions}
        onToggle={(value) => updateForm("exerciseRestrictions", toggleItem(form.exerciseRestrictions, value))}
      />
      {form.exerciseRestrictions.includes("other") ? (
        <TextArea
          label="Опишите запрет"
          value={form.exerciseRestrictionsOther}
          width="fill"
          showMessage={false}
          placeholder="Например, нельзя выпады"
          onChangeText={(value) => updateForm("exerciseRestrictionsOther", value)}
        />
      ) : null}
    </View>
  );
}

function LifestyleStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.body}>
      <SectionTitle title="Уровень активности" />
      <RadioGroup items={activityOptions} value={form.activityLevel} onChange={(value) => updateForm("activityLevel", value)} />
      <SectionTitle title="Сон" />
      <RadioGroup items={sleepOptions} value={form.sleepMode} onChange={(value) => updateForm("sleepMode", value)} />
      <View style={styles.workoutCountSection}>
        <Text style={styles.sectionTitle}>Сколько тренировок в неделю планируете?</Text>
        <Variant
          label="Тренировок в неделю"
          showLabel={false}
          items={["1", "2", "3", "4", "5"].map((item) => ({ key: item, label: item }))}
          value={form.workoutsPerWeek}
          columns={5}
          width="fill"
          style={styles.workoutCountVariant}
          onChange={(value) => updateForm("workoutsPerWeek", value)}
        />
      </View>
    </View>
  );
}

function ExperienceStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.body}>
      <SectionTitle title="Опыт" />
      <RadioGroup items={experienceOptions} value={form.trainingExperience} onChange={(value) => updateForm("trainingExperience", value)} />
      <SectionTitle title="Какими видами спорта занимались" />
      <View style={styles.section}>
        <Variant
          label="Виды спорта"
          showLabel={false}
          items={sportOptions}
          values={form.sports}
          selectionMode="multiple"
          columns={2}
          width="fill"
          onChange={(value) => updateForm("sports", toggleItem(form.sports, value))}
        />
        {form.sports.includes("other") ? (
          <TextArea
            label="Другой спорт"
            value={form.sportsOther}
            width="fill"
            showMessage={false}
            placeholder="Например, йога или танцы"
            onChangeText={(value) => updateForm("sportsOther", value)}
          />
        ) : null}
      </View>
    </View>
  );
}

function GoalStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.body}>
      <SectionTitle title="Какая ваша главная цель?" />
      <RadioGroup items={goalOptions} value={form.goal} onChange={(value) => updateForm("goal", value)} />
    </View>
  );
}

function SummaryStep({
  form,
  selectedHealthLabels,
  selectedSportLabels,
  restrictionLabels
}: {
  form: ClientForm;
  selectedHealthLabels: string[];
  selectedSportLabels: string[];
  restrictionLabels: string[];
}) {
  const allRestrictionLabels = Array.from(
    new Set([...selectedHealthLabels, ...restrictionLabels, form.healthOther, form.exerciseRestrictionsOther].filter(Boolean))
  );
  const summaryRows = [
    ["Возраст", `${form.age} лет`],
    ["Рост / Вес", `${form.height} см / ${form.weight} кг`],
    ["Пол", form.gender === "male" ? "Мужской" : "Женский"],
    ["Цель", getGoalSummary(form)],
    ["Активность", getLabel(activityOptions, form.activityLevel)],
    ["Сон", getLabel(sleepOptions, form.sleepMode)],
    ["Тренировок в неделю", form.workoutsPerWeek],
    ["Опыт", getLabel(experienceOptions, form.trainingExperience)],
    ["Спорт", selectedSportLabels.join(", ") || "Не указано"]
  ];

  return (
    <View style={styles.body}>
      <ListItemCell
        title={form.name || "Новый клиент"}
        subtitle={getClientContactSummary(form)}
        leading="none"
        trailing="none"
        density="compact"
      />
      <View style={styles.summaryGroup}>
        {summaryRows.map(([label, rowValue]) => (
          <ListItemCell
            key={label}
            title={label}
            trailing="text"
            trailingText={rowValue}
            leading="none"
            showSubtitle={false}
            density="compact"
            groupPosition="middle"
            style={styles.summaryItem}
          />
        ))}
      </View>
      <Divider width="fill" tone="canvasSoft" />
      <View style={styles.badgeSection}>
        <Text style={styles.sectionTitle}>Ограничения</Text>
        <View style={styles.badgeWrap}>
          {allRestrictionLabels.map((label) => (
            <Badge key={label} label={label} tone="negativeSoft" size="sm" icon={false} />
          ))}
        </View>
      </View>
    </View>
  );
}

function CheckboxGroup<T extends string>({
  items,
  selectedValues,
  onToggle
}: {
  items: { key: T; label: string }[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View style={styles.groupWrap}>
      {items.map((item, index) => {
        const selected = selectedValues.includes(item.key);
        return (
          <ListItemCell
            key={item.key}
            title={item.label}
            leading="none"
            density="compact"
            surface="canvasSoft"
            groupPosition={getListItemCellGroupPosition(index, items.length)}
            trailingSlot={<Checkbox selected={selected} showLabel={false} onChange={() => onToggle(item.key)} />}
            onPress={() => onToggle(item.key)}
          />
        );
      })}
    </View>
  );
}

function RadioGroup<T extends string>({
  items,
  value,
  onChange
}: {
  items: { key: T; title: string; subtitle?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.groupWrap}>
      {items.map((item, index) => {
        const selected = item.key === value;
        return (
          <ListItemCell
            key={item.key}
            title={item.title}
            subtitle={item.subtitle}
            leading="none"
            density="compact"
            surface="canvasSoft"
            groupPosition={getListItemCellGroupPosition(index, items.length)}
            trailingSlot={<Radio selected={selected} showLabel={false} onChange={() => onChange(item.key)} />}
            onPress={() => onChange(item.key)}
          />
        );
      })}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  keyboardAwareBody: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    paddingBottom: theme.spacing["3xl"] + theme.spacing["2xl"]
  },
  header: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  title: {
    ...theme.typography.body.lg,
    color: theme.colors.content.ink
  },
  body: {
    alignSelf: "stretch",
    alignItems: "stretch"
  },
  section: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg
  },
  workoutCountSection: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  workoutCountVariant: {
    paddingHorizontal: theme.spacing[0],
    paddingVertical: theme.spacing.sm
  },
  sliderCard: {
    alignSelf: "stretch",
    overflow: "hidden",
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  sectionTitleWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm
  },
  sectionTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  groupWrap: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvasSoft
  },
  badgeSection: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg
  },
  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  summaryGroup: {
    paddingVertical: theme.spacing.sm
  },
  summaryItem: {
    borderRadius: theme.radius.none
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  },
  inlineAlert: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg
  }
});
