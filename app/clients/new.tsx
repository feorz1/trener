import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  getListItemCellSelectedGroupPosition,
  Input,
  ListItemCell,
  Navigation,
  ProgressBar,
  Radio,
  SegmentedControl,
  TextArea,
  Variant
} from "@/components/ui";
import { theme } from "@/theme";

type Gender = "male" | "female";
type HealthConstraint =
  | "backInjury"
  | "hernia"
  | "knees"
  | "shoulders"
  | "pressure"
  | "varicose"
  | "postSurgery"
  | "other";
type ActivityLevel = "sedentary" | "mixed" | "active";
type SleepMode = "less6" | "sixToEight" | "more8";
type TrainingExperience = "never" | "old" | "regular";
type SportKind = "basketball" | "football" | "running" | "swimming" | "wrestling" | "crossfit" | "weightlifting" | "other";
type Goal = "loseWeight" | "gainMuscle" | "keepFit" | "rehab" | "event";
type ExerciseRestriction = "twists" | "axialLoads" | "jumps" | "running" | "behindNeckPull" | "other";

type ClientForm = {
  name: string;
  phonePrefix: string;
  phone: string;
  telegram: string;
  height: string;
  weight: string;
  age: string;
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
  targetKg: string;
};

const TOTAL_STEPS = 7;
const stepProgressPercent = [0, 0, 16, 33, 50, 66, 83, 100] as const;

const healthOptions: { key: HealthConstraint; label: string; restrictions: string[] }[] = [
  { key: "backInjury", label: "Травмы спины", restrictions: ["Нельзя скручивания", "Нельзя осевые нагрузки"] },
  { key: "hernia", label: "Грыжи / протрузии", restrictions: ["Нельзя скручивания", "Нельзя осевые нагрузки"] },
  { key: "knees", label: "Проблемы с коленями", restrictions: ["Ограничить прыжки", "Ограничить глубокие приседы"] },
  { key: "shoulders", label: "Проблемы с плечами", restrictions: ["Ограничить жимы над головой"] },
  { key: "pressure", label: "Повышенное давление", restrictions: ["Контроль интенсивности", "Без задержки дыхания"] },
  { key: "varicose", label: "Варикоз", restrictions: ["Ограничить статические нагрузки"] },
  { key: "postSurgery", label: "Послеоперационный период", restrictions: ["Только щадящие нагрузки"] },
  { key: "other", label: "Другое", restrictions: [] }
];

const exerciseRestrictionOptions: { key: ExerciseRestriction; label: string }[] = [
  { key: "twists", label: "Нельзя скручивания" },
  { key: "axialLoads", label: "Нельзя осевые нагрузки" },
  { key: "jumps", label: "Ограничить прыжки" },
  { key: "running", label: "Ограничить бег" },
  { key: "behindNeckPull", label: "Нельзя тягу за голову" },
  { key: "other", label: "Другое" }
];

const activityOptions: { key: ActivityLevel; title: string; subtitle: string }[] = [
  { key: "sedentary", title: "Сидячая работа", subtitle: "Минимальная активность" },
  { key: "mixed", title: "Смешанная", subtitle: "Умеренная активность 3-5 тыс. шагов" },
  { key: "active", title: "Активная", subtitle: "Более 10 тыс. шагов или физическая работа" }
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
  height: "186",
  weight: "84",
  age: "29",
  gender: "male",
  healthConstraints: ["hernia", "knees"],
  healthOther: "",
  exerciseRestrictions: ["twists", "axialLoads"],
  exerciseRestrictionsOther: "",
  activityLevel: "mixed",
  sleepMode: "sixToEight",
  workoutsPerWeek: "3",
  trainingExperience: "old",
  sports: ["football"],
  sportsOther: "",
  goal: "gainMuscle",
  targetKg: "10"
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

function getRestrictionLabels(form: ClientForm) {
  const labels = form.healthConstraints.flatMap((key) => healthOptions.find((option) => option.key === key)?.restrictions ?? []);
  return Array.from(new Set(labels));
}

function getGoalSummary(form: ClientForm) {
  const goal = getLabel(goalOptions, form.goal);
  if (form.targetKg && (form.goal === "gainMuscle" || form.goal === "loseWeight")) {
    return `${goal} ${form.goal === "gainMuscle" ? "+" : "-"}${form.targetKg} кг`;
  }
  return goal;
}

export default function NewClientScreen() {
  const { date, exerciseIds, supersetConnectionIds, approachData } = useLocalSearchParams<{
    date?: string;
    exerciseIds?: string;
    supersetConnectionIds?: string;
    approachData?: string;
  }>();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ClientForm>(initialForm);
  const selectedHealthLabels = form.healthConstraints.map((key) => getLabel(healthOptions, key));
  const selectedExerciseRestrictionLabels = form.exerciseRestrictions.map((key) => getLabel(exerciseRestrictionOptions, key));
  const restrictionLabels = useMemo(() => getRestrictionLabels(form), [form]);
  const selectedSportLabels = form.sports.map((key) => getLabel(sportOptions, key));
  const canGoNext = step < TOTAL_STEPS;

  const updateForm = <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const goBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  };

  const goNext = () => {
    if (canGoNext) {
      setStep((current) => current + 1);
    }
  };

  const createClient = () => {
    const createdClientId = `demo-${Date.now()}`;

    router.replace({
      pathname: "/workouts/new",
      params: {
        clientId: createdClientId,
        clientName: form.name,
        ...(date ? { date: firstParam(date) } : {}),
        ...(exerciseIds ? { exerciseIds: firstParam(exerciseIds) } : {}),
        ...(supersetConnectionIds ? { supersetConnectionIds: firstParam(supersetConnectionIds) } : {}),
        ...(approachData ? { approachData: firstParam(approachData) } : {})
      }
    });
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <Navigation title="" showSubtitle={false} onBack={goBack} backAccessibilityLabel="Назад" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{getStepTitle(step)}</Text>
          <ProgressBar completed={stepProgressPercent[step]} total={100} label={`${step} из ${TOTAL_STEPS}`} showBadge />
        </View>

        <Divider width="fill" tone="canvasSoft" />

        {step === 1 ? <BasicStep form={form} updateForm={updateForm} /> : null}
        {step === 2 ? <BodyStep form={form} updateForm={updateForm} /> : null}
        {step === 3 ? <HealthStep form={form} updateForm={updateForm} /> : null}
        {step === 4 ? <LifestyleStep form={form} updateForm={updateForm} /> : null}
        {step === 5 ? <ExperienceStep form={form} updateForm={updateForm} /> : null}
        {step === 6 ? <GoalStep form={form} updateForm={updateForm} /> : null}
        {step === 7 ? (
          <SummaryStep
            form={form}
            selectedHealthLabels={selectedHealthLabels}
            selectedExerciseRestrictionLabels={selectedExerciseRestrictionLabels}
            selectedSportLabels={selectedSportLabels}
            restrictionLabels={restrictionLabels}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label={step === TOTAL_STEPS ? "Создать клиента" : "Продолжить"} type="primary" width="fill" onPress={step === TOTAL_STEPS ? createClient : goNext} />
      </View>
    </SafeAreaView>
  );
}

function getStepTitle(step: number) {
  if (step === 1) return "Новый клиент";
  if (step === 2) return "Здоровье";
  if (step === 3) return "Здоровье и ограничения";
  if (step === 4) return "Образ жизни";
  if (step === 5) return "Опыт тренировок";
  if (step === 6) return "Цель";
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

function BodyStep({
  form,
  updateForm
}: {
  form: ClientForm;
  updateForm: <K extends keyof ClientForm>(key: K, value: ClientForm[K]) => void;
}) {
  return (
    <View style={styles.section}>
      <Input label="Рост" value={form.height} width="fill" showMessage={false} keyboardType="number-pad" onChangeText={(value) => updateForm("height", value)} />
      <Input label="Вес" value={form.weight} width="fill" showMessage={false} keyboardType="number-pad" onChangeText={(value) => updateForm("weight", value)} />
      <Input label="Возраст" value={form.age} width="fill" showMessage={false} keyboardType="number-pad" onChangeText={(value) => updateForm("age", value)} />
      <View style={styles.controlBlock}>
        <Text style={styles.sectionTitle}>Пол</Text>
        <SegmentedControl
          items={[
            { key: "male", label: "Мужской" },
            { key: "female", label: "Женский" }
          ]}
          value={form.gender}
          width="full"
          onChange={(value) => updateForm("gender", value)}
        />
      </View>
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
      <SectionTitle title="Есть ли особенности здоровья или травмы?" />
      <View style={styles.group}>
        {healthOptions.map((option, index) => {
          const selected = form.healthConstraints.includes(option.key);
          const previousSelected = index > 0 && form.healthConstraints.includes(healthOptions[index - 1].key);
          const nextSelected = index < healthOptions.length - 1 && form.healthConstraints.includes(healthOptions[index + 1].key);

          return (
            <ListItemCell
              key={option.key}
              title={option.label}
              leading="none"
              trailingSlot={
                <Checkbox
                  selected={selected}
                  showLabel={false}
                  onChange={() => updateForm("healthConstraints", toggleItem(form.healthConstraints, option.key))}
                />
              }
              selected={selected}
              groupPosition={getListItemCellSelectedGroupPosition(selected, previousSelected, nextSelected)}
              onPress={() => updateForm("healthConstraints", toggleItem(form.healthConstraints, option.key))}
            />
          );
        })}
      </View>
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
      <Divider width="fill" tone="canvasSoft" />
      <SectionTitle title="Что нельзя выполнять?" />
      <View style={styles.group}>
        {exerciseRestrictionOptions.map((option, index) => {
          const selected = form.exerciseRestrictions.includes(option.key);
          const previousSelected = index > 0 && form.exerciseRestrictions.includes(exerciseRestrictionOptions[index - 1].key);
          const nextSelected = index < exerciseRestrictionOptions.length - 1 && form.exerciseRestrictions.includes(exerciseRestrictionOptions[index + 1].key);

          return (
            <ListItemCell
              key={option.key}
              title={option.label}
              leading="none"
              trailingSlot={
                <Checkbox
                  selected={selected}
                  showLabel={false}
                  onChange={() => updateForm("exerciseRestrictions", toggleItem(form.exerciseRestrictions, option.key))}
                />
              }
              selected={selected}
              groupPosition={getListItemCellSelectedGroupPosition(selected, previousSelected, nextSelected)}
              onPress={() => updateForm("exerciseRestrictions", toggleItem(form.exerciseRestrictions, option.key))}
            />
          );
        })}
      </View>
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
      <RadioGroup
        items={activityOptions}
        value={form.activityLevel}
        onChange={(value) => updateForm("activityLevel", value)}
      />
      <Divider width="fill" tone="canvasSoft" />
      <SectionTitle title="Сон" />
      <RadioGroup
        items={sleepOptions}
        value={form.sleepMode}
        onChange={(value) => updateForm("sleepMode", value)}
      />
      <Divider width="fill" tone="canvasSoft" />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Сколько тренировок в неделю планируете?</Text>
        <Variant
          label="Тренировок в неделю"
          showLabel={false}
          items={["1", "2", "3", "4", "5"].map((value) => ({ key: value, label: value }))}
          value={form.workoutsPerWeek}
          columns={5}
          width="fill"
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
      <RadioGroup
        items={experienceOptions}
        value={form.trainingExperience}
        onChange={(value) => updateForm("trainingExperience", value)}
      />
      <Divider width="fill" tone="canvasSoft" />
      <SectionTitle title="Какими видами спорта занимались" />
      <View style={styles.section}>
        <ChoiceGrid
          items={sportOptions}
          selectedValues={form.sports}
          onToggle={(value) => updateForm("sports", toggleItem(form.sports, value))}
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
      <Divider width="fill" tone="canvasSoft" />
      <View style={styles.section}>
        <Input
          label={form.goal === "loseWeight" ? "Сколько кг хотите сбросить?" : "Сколько кг хотите набрать?"}
          value={form.targetKg}
          width="fill"
          showMessage={false}
          keyboardType="number-pad"
          onChangeText={(value) => updateForm("targetKg", value)}
        />
      </View>
    </View>
  );
}

function SummaryStep({
  form,
  selectedHealthLabels,
  selectedExerciseRestrictionLabels,
  selectedSportLabels,
  restrictionLabels
}: {
  form: ClientForm;
  selectedHealthLabels: string[];
  selectedExerciseRestrictionLabels: string[];
  selectedSportLabels: string[];
  restrictionLabels: string[];
}) {
  const allRestrictionLabels = Array.from(new Set([...selectedExerciseRestrictionLabels, ...restrictionLabels]));
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
      <ListItemCell title={form.name || "Новый клиент"} subtitle={`${form.phonePrefix} ${form.phone}`} leading="avatar" avatarType="initials" avatarInitials={getInitials(form.name)} />
      <View style={styles.summaryGroup}>
        {summaryRows.map(([label, value]) => (
          <View key={label} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text numberOfLines={2} style={styles.summaryValue}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      <Divider width="fill" tone="canvasSoft" />
      <View style={styles.badgeSection}>
        <Text style={styles.sectionTitle}>Ограничения</Text>
        <View style={styles.badgeWrap}>
          {selectedHealthLabels.map((label) => (
            <Badge key={label} label={label} tone="negativeSolid" size="sm" icon={false} />
          ))}
          {allRestrictionLabels.map((label) => (
            <Badge key={label} label={label} tone="negativeSolid" size="sm" icon={false} />
          ))}
          {form.healthOther ? <Badge label={form.healthOther} tone="negativeSolid" size="sm" icon={false} /> : null}
          {form.exerciseRestrictionsOther ? <Badge label={form.exerciseRestrictionsOther} tone="negativeSolid" size="sm" icon={false} /> : null}
        </View>
      </View>
    </View>
  );
}

function ChoiceGrid<T extends string>({
  items,
  selectedValues,
  onToggle
}: {
  items: { key: T; label: string }[];
  selectedValues: T[];
  onToggle: (value: T) => void;
}) {
  const rows = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }

  return (
    <View style={styles.choiceGrid}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.choiceRow}>
          {row.map((item) => {
            const selected = selectedValues.includes(item.key);

            return (
              <Pressable
                key={item.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => onToggle(item.key)}
                style={({ pressed }) => [styles.choiceTile, selected && styles.choiceTileSelected, pressed && styles.choiceTilePressed]}
              >
                <Text numberOfLines={1} style={styles.choiceTileLabel}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
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
    <View style={styles.group}>
      {items.map((item) => {
        const selected = item.key === value;
        return (
          <ListItemCell
            key={item.key}
            title={item.title}
            subtitle={item.subtitle}
            leading="none"
            trailingSlot={<Radio selected={selected} showLabel={false} onChange={() => onChange(item.key)} />}
            selected={selected}
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "НК";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
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
    paddingHorizontal: theme.spacing[0],
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg
  },
  controlBlock: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  sectionTitleWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xs
  },
  sectionTitle: {
    ...theme.typography.body.mdStrong,
    color: theme.colors.content.ink
  },
  group: {
    gap: theme.spacing.xs
  },
  badgeSection: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg
  },
  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  choiceGrid: {
    alignSelf: "stretch",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: theme.spacing.sm
  },
  choiceTile: {
    flex: 1,
    minWidth: theme.spacing[0],
    height: theme.sizes.variantOptionHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: 2,
    borderRadius: theme.radius.md,
    borderColor: theme.colors.background.canvasSoft,
    backgroundColor: theme.colors.background.canvasSoft
  },
  choiceTileSelected: {
    borderColor: theme.colors.content.inkDeep,
    backgroundColor: theme.colors.content.primaryPale
  },
  choiceTilePressed: {
    opacity: 0.84
  },
  choiceTileLabel: {
    ...theme.typography.body.md,
    color: theme.colors.content.ink
  },
  summaryGroup: {
    paddingVertical: theme.spacing.sm
  },
  summaryRow: {
    minHeight: theme.spacing["2xl"] + theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background.canvas
  },
  summaryLabel: {
    ...theme.typography.body.sm,
    flex: 1,
    minWidth: theme.spacing[0],
    color: theme.colors.content.body
  },
  summaryValue: {
    ...theme.typography.body.sm,
    flex: 1,
    minWidth: theme.spacing[0],
    color: theme.colors.content.body,
    textAlign: "right"
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
