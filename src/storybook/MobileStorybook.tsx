import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Action, type ActionLayout } from "@/components/ui/Action";
import { Alert, type AlertLayout, type AlertTone } from "@/components/ui/Alert";
import { Approach, type ApproachCountState, type ApproachSet } from "@/components/ui/Approach";
import { Avatar, type AvatarSize, type AvatarType } from "@/components/ui/Avatar";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, type ButtonSize, type ButtonState, type ButtonType } from "@/components/ui/Button";
import { CalendarDayStrip, type CalendarDayStripItem } from "@/components/calendar/CalendarDayStrip";
import { Card, type CardDayPlanState, type CardVariant, type CardWorkoutStatus } from "@/components/ui/Card";
import { Checkbox, type CheckboxState } from "@/components/ui/Checkbox";
import { Chip, type ChipState } from "@/components/ui/Chip";
import { ChipsList } from "@/components/ui/ChipsList";
import { DateCell, type DateCellState } from "@/components/ui/DateCell";
import { Divider } from "@/components/ui/Divider";
import { Header, type HeaderSize } from "@/components/ui/Header";
import { Icon, iconNames, type IconName } from "@/components/ui/Icon";
import { Input, type InputState } from "@/components/ui/Input";
import { ListItemGym, type ListItemGymMode } from "@/components/ui/ListItemGym";
import { ListItemCell, type ListItemCellLeading, type ListItemCellState, type ListItemCellTrailing } from "@/components/ui/ListItemCell";
import { Loader, type LoaderSize, type LoaderTone } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { Navigation } from "@/components/ui/Navigation";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Radio, type RadioState } from "@/components/ui/Radio";
import { Search, type SearchState } from "@/components/ui/Search";
import { Select, type SelectState } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Set as WorkoutSet, type WorkoutSetVariant } from "@/components/ui/Set";
import { StateSelect } from "@/components/ui/StateSelect";
import { SuperSet, type SuperSetSegment } from "@/components/ui/SuperSet";
import { Switch } from "@/components/ui/Switch";
import { TabBar, trainerTabBarItems } from "@/components/ui/TabBar";
import { TextArea, type TextAreaState } from "@/components/ui/TextArea";
import { Variant } from "@/components/ui/Variant";
import { theme } from "@/theme";
import { componentUpdates } from "./componentUpdates";

type ComponentId =
  | "Action"
  | "Modal"
  | "Card"
  | "Search"
  | "Chip"
  | "StateSelect"
  | "ChipsList"
  | "ListItemGym"
  | "Set"
  | "SuperSet"
  | "DateCell"
  | "Approach"
  | "CalendarDayStrip"
  | "ProgressBar"
  | "Divider"
  | "Button"
  | "Navigation"
  | "TabBar"
  | "Header"
  | "Select"
  | "Loader"
  | "Icon"
  | "Alert"
  | "Avatar"
  | "ListItemCell"
  | "Badge"
  | "Checkbox"
  | "Radio"
  | "Input"
  | "SegmentedControl"
  | "TextArea"
  | "Variant"
  | "Switch";
type SegmentValue = "day" | "week" | "month";
type VariantValue = "male" | "female" | "other" | "four" | "five";

const componentItems: Array<{ value: ComponentId; title: string; updatedAt: string }> = [
  { value: "Action", title: "Action", updatedAt: componentUpdates.Action },
  { value: "Modal", title: "Modal", updatedAt: componentUpdates.Modal },
  { value: "Card", title: "Card", updatedAt: componentUpdates.Card },
  { value: "Search", title: "Search", updatedAt: componentUpdates.Search },
  { value: "Chip", title: "Chip", updatedAt: componentUpdates.Chip },
  { value: "StateSelect", title: "StateSelect", updatedAt: componentUpdates.StateSelect },
  { value: "ChipsList", title: "ChipsList", updatedAt: componentUpdates.ChipsList },
  { value: "ListItemGym", title: "ListItemGym", updatedAt: componentUpdates.ListItemGym },
  { value: "Set", title: "Set", updatedAt: componentUpdates.Set },
  { value: "SuperSet", title: "SuperSet", updatedAt: componentUpdates.SuperSet },
  { value: "DateCell", title: "Date", updatedAt: componentUpdates.DateCell },
  { value: "Approach", title: "Approach", updatedAt: componentUpdates.Approach },
  { value: "CalendarDayStrip", title: "CalendarDayStrip", updatedAt: componentUpdates.CalendarDayStrip },
  { value: "ProgressBar", title: "ProgressBar", updatedAt: componentUpdates.ProgressBar },
  { value: "Divider", title: "Divider", updatedAt: componentUpdates.Divider },
  { value: "Button", title: "Button", updatedAt: componentUpdates.Button },
  { value: "Navigation", title: "Navigation", updatedAt: componentUpdates.Navigation },
  { value: "TabBar", title: "Tab Bar", updatedAt: componentUpdates.TabBar },
  { value: "Header", title: "Header", updatedAt: componentUpdates.Header },
  { value: "Select", title: "Select", updatedAt: componentUpdates.Select },
  { value: "Loader", title: "Loader", updatedAt: componentUpdates.Loader },
  { value: "Icon", title: "Icon", updatedAt: componentUpdates.Icon },
  { value: "Alert", title: "Alert", updatedAt: componentUpdates.Alert },
  { value: "Avatar", title: "Avatar", updatedAt: componentUpdates.Avatar },
  { value: "ListItemCell", title: "List item/Cell", updatedAt: componentUpdates.ListItemCell },
  { value: "Badge", title: "Badge", updatedAt: componentUpdates.Badge },
  { value: "Checkbox", title: "Checkbox", updatedAt: componentUpdates.Checkbox },
  { value: "Radio", title: "Radio", updatedAt: componentUpdates.Radio },
  { value: "Input", title: "Input", updatedAt: componentUpdates.Input },
  { value: "SegmentedControl", title: "SegmentControl", updatedAt: componentUpdates.SegmentedControl },
  { value: "TextArea", title: "TextArea", updatedAt: componentUpdates.TextArea },
  { value: "Variant", title: "Variant", updatedAt: componentUpdates.Variant },
  { value: "Switch", title: "Switch", updatedAt: componentUpdates.Switch }
];

const badgeTones: BadgeTone[] = ["error", "info", "success", "warning", "neutral", "negativeSolid", "warningDeep", "primary", "select"];
const badgeSizes: Array<"md" | "sm" | "s"> = ["md", "sm", "s"];
const cardVariants: CardVariant[] = ["dayPlan", "workout", "addWorkout"];
const cardDayPlanStates: CardDayPlanState[] = ["plan", "planNext"];
const cardStatuses: CardWorkoutStatus[] = ["planned", "inProgress", "completed"];
const dateCellStates: DateCellState[] = ["date", "select", "disabled"];
const defaultApproachSets: ApproachSet[] = [
  { id: "one", index: 1, weight: 150, reps: 12, status: "completed" },
  { id: "two", index: 1, weight: 150, reps: 12, status: "completed" },
  { id: "three", index: 1, weight: 150, reps: 12, status: "completed" },
  { id: "four", index: 4, weight: 150, reps: 12, status: "completed" }
];
const defaultApproachNote = "Слева - 6, Справа - 5,6, Ножка - 4";
const createApproachSet = (index: number): ApproachSet => ({
  id: `set-${Date.now()}-${index}`,
  index,
  weight: 150,
  reps: 12,
  status: "completed"
});
const calendarDayStripWeek: CalendarDayStripItem[] = [
  { key: "2026-05-11", weekday: "Пн", dayNumber: "12", temporalState: "past" },
  { key: "2026-05-12", weekday: "Вт", dayNumber: "12", temporalState: "past" },
  { key: "2026-05-13", weekday: "Ср", dayNumber: "15", temporalState: "default" },
  { key: "2026-05-14", weekday: "Чт", dayNumber: "14", temporalState: "default" },
  { key: "2026-05-15", weekday: "Пт", dayNumber: "15", temporalState: "future" },
  { key: "2026-05-16", weekday: "Сб", dayNumber: "15", temporalState: "future" },
  { key: "2026-05-17", weekday: "Вс", dayNumber: "15", temporalState: "future" }
];
const calendarDayStripNextWeek: CalendarDayStripItem[] = [
  { key: "2026-05-18", weekday: "Пн", dayNumber: "18", temporalState: "future" },
  { key: "2026-05-19", weekday: "Вт", dayNumber: "19", temporalState: "future" },
  { key: "2026-05-20", weekday: "Ср", dayNumber: "20", temporalState: "future" },
  { key: "2026-05-21", weekday: "Чт", dayNumber: "21", temporalState: "future" },
  { key: "2026-05-22", weekday: "Пт", dayNumber: "22", temporalState: "future" },
  { key: "2026-05-23", weekday: "Сб", dayNumber: "23", temporalState: "future" },
  { key: "2026-05-24", weekday: "Вс", dayNumber: "24", temporalState: "future" }
];
const actionLayouts: ActionLayout[] = ["single", "stacked", "inline", "triple"];
const buttonTypes: ButtonType[] = ["primary", "secondary", "secondaryNeutral", "destructive", "tertiary"];
const buttonSizes: ButtonSize[] = ["large", "medium", "small", "mediumIcon", "smallIcon"];
const buttonStates: ButtonState[] = ["active", "disabled", "loading"];
const loaderSizes: LoaderSize[] = ["small", "medium"];
const loaderTones: LoaderTone[] = ["brand", "inverse", "negative", "neutral", "canvas"];
const alertTones: AlertTone[] = ["neutral", "positive", "negative", "warning"];
const alertLayouts: AlertLayout[] = ["compact", "expanded", "action"];
const avatarTypes: AvatarType[] = ["icon", "initials", "image", "count", "pair", "badge", "notification"];
const avatarSizes: AvatarSize[] = [40, 48, 56, 72];
const listItemLeadingOptions: ListItemCellLeading[] = ["none", "avatar", "icon"];
const listItemTrailingOptions: ListItemCellTrailing[] = ["none", "button", "checkbox", "radio", "icon", "switch", "badge", "text"];
const listItemStates: ListItemCellState[] = ["default", "pressed", "disabled"];
const checkboxStates: CheckboxState[] = ["default", "error", "disabled"];
const radioStates: RadioState[] = ["default", "error", "disabled"];
const inputStates: InputState[] = ["empty", "default", "focus", "error", "positive", "warning", "disabled", "prefixFocus", "valueFocus"];
const selectStates: SelectState[] = ["empty", "default", "focus", "error", "positive", "warning", "disabled"];
const textAreaStates: TextAreaState[] = ["empty", "default", "focus", "error", "disabled"];
const variantColumnsOptions = [2, 5] as const;
const variantItems: Array<{ value: VariantValue; label: string }> = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
  { value: "other", label: "Value" },
  { value: "four", label: "Value" },
  { value: "five", label: "Value" }
];
const searchStates: SearchState[] = ["empty", "default", "focus"];
const chipStates: ChipState[] = ["default", "selected", "dropdown", "disabled"];
const listItemGymModes: ListItemGymMode[] = ["default", "selected", "move"];
const workoutSetVariants: WorkoutSetVariant[] = ["set", "new"];
const headerSizes: HeaderSize[] = ["xl", "lg", "md", "sm"];
const webMobileWidth = Platform.OS === "web" ? ({ maxWidth: theme.sizes.storybookMobileWidth, alignSelf: "center" } as const) : null;
const webGalleryWidth = Platform.OS === "web" ? ({ maxWidth: theme.sizes.storybookGalleryWidth, alignSelf: "center" } as const) : null;
const webActionWidth = Platform.OS === "web" ? ({ maxWidth: 357 } as const) : null;
const webResizablePreviewFrame =
  Platform.OS === "web"
    ? ({
        resize: "both",
        overflow: "auto",
        width: theme.sizes.storybookGalleryCardWidth,
        minWidth: theme.sizes.storybookGalleryCardWidth,
        minHeight: theme.sizes.storybookGalleryCardHeight,
        maxWidth: "none",
        alignSelf: "flex-start"
      } as ViewStyle & { resize: "both"; overflow: "auto"; maxWidth: "none" })
    : null;

export function MobileStorybook() {
  const [mode, setMode] = useState<"gallery" | "component">("gallery");
  const [component, setComponent] = useState<ComponentId>("Button");
  const [actionLayout, setActionLayout] = useState<ActionLayout>("single");
  const [modalActionLayout, setModalActionLayout] = useState<ActionLayout>("single");
  const [modalVisible, setModalVisible] = useState(false);
  const [cardVariant, setCardVariant] = useState<CardVariant>("workout");
  const [cardDayPlanState, setCardDayPlanState] = useState<CardDayPlanState>("plan");
  const [cardStatus, setCardStatus] = useState<CardWorkoutStatus>("planned");
  const [cardShowAction, setCardShowAction] = useState(false);
  const [searchValue, setSearchValue] = useState("Value");
  const [searchState, setSearchState] = useState<SearchState>("default");
  const [chipState, setChipState] = useState<ChipState>("default");
  const [stateSelectCount, setStateSelectCount] = useState(5);
  const [listItemGymMode, setListItemGymMode] = useState<ListItemGymMode>("default");
  const [listItemGymSelected, setListItemGymSelected] = useState(false);
  const [listItemGymDeleteOpen, setListItemGymDeleteOpen] = useState(false);
  const [workoutSetVariant, setWorkoutSetVariant] = useState<WorkoutSetVariant>("set");
  const [superSetSegments, setSuperSetSegments] = useState<SuperSetSegment[]>([
    { id: "one" },
    { id: "two", selected: true },
    { id: "three" },
    { id: "four", selected: true },
    { id: "five" }
  ]);
  const [dateCellState, setDateCellState] = useState<DateCellState>("date");
  const [approachStorySets, setApproachStorySets] = useState<ApproachSet[]>(defaultApproachSets);
  const [approachNote, setApproachNote] = useState(defaultApproachNote);
  const [calendarSelectedKey, setCalendarSelectedKey] = useState(calendarDayStripWeek[3].key);
  const [calendarTodayKey, setCalendarTodayKey] = useState(calendarDayStripWeek[4].key);
  const [calendarPaging, setCalendarPaging] = useState(false);
  const [progressCompleted, setProgressCompleted] = useState(3);
  const [buttonType, setButtonType] = useState<ButtonType>("primary");
  const [buttonSize, setButtonSize] = useState<ButtonSize>("medium");
  const [buttonState, setButtonState] = useState<ButtonState>("active");
  const [navigationShowSubtitle, setNavigationShowSubtitle] = useState(true);
  const [tabBarValue, setTabBarValue] = useState("home");
  const [headerSize, setHeaderSize] = useState<HeaderSize>("xl");
  const [headerShowSubtitle, setHeaderShowSubtitle] = useState(true);
  const [selectState, setSelectState] = useState<SelectState>("empty");
  const [selectShowLabel, setSelectShowLabel] = useState(true);
  const [selectShowMessage, setSelectShowMessage] = useState(true);
  const [selectValue, setSelectValue] = useState("Value");
  const [loaderSize, setLoaderSize] = useState<LoaderSize>("medium");
  const [loaderTone, setLoaderTone] = useState<LoaderTone>("brand");
  const [iconName, setIconName] = useState<IconName>("information");
  const [alertTone, setAlertTone] = useState<AlertTone>("neutral");
  const [alertLayout, setAlertLayout] = useState<AlertLayout>("compact");
  const [alertExpanded, setAlertExpanded] = useState(true);
  const [avatarType, setAvatarType] = useState<AvatarType>("image");
  const [avatarSize, setAvatarSize] = useState<AvatarSize>(56);
  const [listItemLeading, setListItemLeading] = useState<ListItemCellLeading>("avatar");
  const [listItemTrailing, setListItemTrailing] = useState<ListItemCellTrailing>("icon");
  const [listItemState, setListItemState] = useState<ListItemCellState>("default");
  const [listItemSelected, setListItemSelected] = useState(false);
  const [listItemShowEyebrow, setListItemShowEyebrow] = useState(true);
  const [listItemShowSubtitle, setListItemShowSubtitle] = useState(true);
  const [badgeTone, setBadgeTone] = useState<BadgeTone>("error");
  const [badgeSize, setBadgeSize] = useState<"md" | "sm" | "s">("md");
  const [badgeIcon, setBadgeIcon] = useState(true);
  const [checkboxSelected, setCheckboxSelected] = useState(true);
  const [checkboxState, setCheckboxState] = useState<CheckboxState>("default");
  const [checkboxShowLabel, setCheckboxShowLabel] = useState(true);
  const [radioSelected, setRadioSelected] = useState(true);
  const [radioState, setRadioState] = useState<RadioState>("default");
  const [radioShowLabel, setRadioShowLabel] = useState(true);
  const [inputState, setInputState] = useState<InputState>("empty");
  const [inputDouble, setInputDouble] = useState(false);
  const [inputShowLabel, setInputShowLabel] = useState(true);
  const [inputShowMessage, setInputShowMessage] = useState(true);
  const [inputShowClearButton, setInputShowClearButton] = useState(false);
  const [inputValue, setInputValue] = useState("Value");
  const [prefixValue, setPrefixValue] = useState("+1");
  const [textAreaState, setTextAreaState] = useState<TextAreaState>("empty");
  const [textAreaShowLabel, setTextAreaShowLabel] = useState(true);
  const [textAreaShowMessage, setTextAreaShowMessage] = useState(true);
  const [textAreaValue, setTextAreaValue] = useState("Value");
  const [variantValue, setVariantValue] = useState<VariantValue>("male");
  const [variantColumns, setVariantColumns] = useState<2 | 5>(2);
  const [switchSelected, setSwitchSelected] = useState(true);
  const [switchDisabled, setSwitchDisabled] = useState(false);
  const [segmentItemsCount, setSegmentItemsCount] = useState<"Two" | "Three">("Three");
  const [segmentValue, setSegmentValue] = useState<SegmentValue>("day");
  const [disableThird, setDisableThird] = useState(false);
  const [previewBackground, setPreviewBackground] = useState<"gray" | "white">("gray");
  const galleryScrollRef = useRef<ScrollView | null>(null);
  const galleryScrollYRef = useRef(0);

  const segmentItems = useMemo(
    () =>
      segmentItemsCount === "Two"
        ? [
            { value: "day" as const, label: "Day" },
            { value: "week" as const, label: "Week" }
          ]
        : [
            { value: "day" as const, label: "Day" },
            { value: "week" as const, label: "Week" },
            { value: "month" as const, label: "Month", disabled: disableThird }
          ],
    [disableThird, segmentItemsCount]
  );

  const resolvedSegmentValue = segmentItems.some((item) => item.value === segmentValue) ? segmentValue : "day";
  const selectedMeta = componentItems.find((item) => item.value === component) ?? componentItems[0];
  const resolvedAvatarSize = avatarSizes.includes(avatarSize) ? avatarSize : 56;

  useEffect(() => {
    if (mode !== "gallery") {
      return;
    }

    const restoreScroll = setTimeout(() => {
      galleryScrollRef.current?.scrollTo({ y: galleryScrollYRef.current, animated: false });
    }, 0);

    return () => clearTimeout(restoreScroll);
  }, [mode]);

  const openComponent = (value: ComponentId) => {
    setComponent(value);
    setMode("component");
  };

  const backToGallery = () => {
    setMode("gallery");
  };

  const preview = (item: ComponentId) => (
    <PreviewContent
      component={item}
      actionLayout={actionLayout}
      modalActionLayout={modalActionLayout}
      cardVariant={item === "Card" ? cardVariant : "workout"}
      cardDayPlanState={item === "Card" ? cardDayPlanState : "plan"}
      cardStatus={item === "Card" ? cardStatus : "planned"}
      cardShowAction={item === "Card" ? cardShowAction : false}
      searchValue={searchValue}
      searchState={item === "Search" ? searchState : "default"}
      onSearchValueChange={setSearchValue}
      chipState={item === "Chip" ? chipState : "default"}
      onChipStateChange={setChipState}
      stateSelectCount={stateSelectCount}
      onStateSelectCountChange={setStateSelectCount}
      listItemGymMode={item === "ListItemGym" ? listItemGymMode : "default"}
      listItemGymSelected={listItemGymSelected}
      onListItemGymModeChange={setListItemGymMode}
      onListItemGymSelectedChange={setListItemGymSelected}
      listItemGymDeleteOpen={item === "ListItemGym" ? listItemGymDeleteOpen : false}
      onListItemGymDeleteOpenChange={setListItemGymDeleteOpen}
      workoutSetVariant={item === "Set" ? workoutSetVariant : "set"}
      superSetSegments={superSetSegments}
      onSuperSetSegmentsChange={setSuperSetSegments}
      dateCellState={item === "DateCell" ? dateCellState : "date"}
      approachSets={approachStorySets}
      approachNote={approachNote}
      onApproachNoteChange={setApproachNote}
      onApproachSetStateChange={(id, state) =>
        setApproachStorySets((current) => current.map((set) => (set.id === id ? { ...set, state } : set)))
      }
      onApproachSetValueChange={(id, patch) =>
        setApproachStorySets((current) => current.map((set) => (set.id === id ? { ...set, ...patch } : set)))
      }
      onApproachSetDelete={(id) => setApproachStorySets((current) => current.filter((set) => set.id !== id))}
      onApproachAddSet={() => setApproachStorySets((current) => [...current, createApproachSet(current.length + 1)])}
      onApproachRestore={() => setApproachStorySets(defaultApproachSets)}
      onApproachSetsReorder={setApproachStorySets}
      showApproachDeleteActions={mode === "component" && item === "Approach"}
      calendarSelectedKey={calendarSelectedKey}
      calendarTodayKey={calendarTodayKey}
      calendarPaging={calendarPaging}
      onCalendarSelectedKeyChange={setCalendarSelectedKey}
      onCalendarTodayKeyChange={setCalendarTodayKey}
      progressCompleted={item === "ProgressBar" ? progressCompleted : 3}
      buttonType={buttonType}
      buttonSize={buttonSize}
      buttonState={buttonState}
      navigationShowSubtitle={navigationShowSubtitle}
      tabBarValue={tabBarValue}
      onTabBarValueChange={setTabBarValue}
      headerSize={headerSize}
      headerShowSubtitle={headerShowSubtitle}
      selectState={item === "Select" ? selectState : "empty"}
      selectShowLabel={selectShowLabel}
      selectShowMessage={selectShowMessage}
      selectValue={selectValue}
      onSelectValueChange={setSelectValue}
      loaderSize={loaderSize}
      loaderTone={loaderTone}
      iconName={item === "Icon" ? iconName : "information"}
      alertTone={item === "Alert" ? alertTone : "neutral"}
      alertLayout={item === "Alert" ? alertLayout : "compact"}
      alertExpanded={item === "Alert" ? alertExpanded : true}
      onAlertExpandedChange={setAlertExpanded}
      avatarType={item === "Avatar" ? avatarType : "image"}
      avatarSize={resolvedAvatarSize}
      listItemLeading={listItemLeading}
      listItemTrailing={listItemTrailing}
      listItemState={listItemState}
      listItemSelected={listItemSelected}
      listItemShowEyebrow={listItemShowEyebrow}
      listItemShowSubtitle={listItemShowSubtitle}
      onListItemSelectedChange={setListItemSelected}
      badgeTone={item === "Badge" ? badgeTone : "error"}
      badgeSize={item === "Badge" ? badgeSize : "md"}
      badgeIcon={badgeIcon}
      checkboxSelected={checkboxSelected}
      checkboxState={checkboxState}
      checkboxShowLabel={checkboxShowLabel}
      onCheckboxChange={setCheckboxSelected}
      radioSelected={radioSelected}
      radioState={radioState}
      radioShowLabel={radioShowLabel}
      onRadioChange={setRadioSelected}
      inputState={item === "Input" ? inputState : "empty"}
      inputDouble={inputDouble}
      inputShowLabel={inputShowLabel}
      inputShowMessage={inputShowMessage}
      inputShowClearButton={inputShowClearButton}
      inputValue={inputValue}
      prefixValue={prefixValue}
      onInputValueChange={setInputValue}
      onPrefixValueChange={setPrefixValue}
      textAreaState={item === "TextArea" ? textAreaState : "empty"}
      textAreaShowLabel={textAreaShowLabel}
      textAreaShowMessage={textAreaShowMessage}
      textAreaValue={textAreaValue}
      onTextAreaValueChange={setTextAreaValue}
      variantItems={variantColumns === 2 ? variantItems.slice(0, 2) : variantItems}
      variantValue={variantValue}
      variantColumns={variantColumns}
      onVariantChange={setVariantValue}
      segmentItems={segmentItems}
      segmentValue={resolvedSegmentValue}
      onSegmentChange={setSegmentValue}
      previewBackground={previewBackground}
      switchSelected={switchSelected}
      switchDisabled={switchDisabled}
      onSwitchChange={setSwitchSelected}
    />
  );

  if (mode === "component" && component === "Modal") {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.modalStoryPage}>
          <Text style={styles.heroTitle}>{selectedMeta.title}</Text>
          <View style={styles.modalStoryButtonArea}>
            <Button
              label="Open modal"
              type="primary"
              size="large"
              onPress={() => setModalVisible(true)}
              style={styles.modalStoryOpenButton}
            />
          </View>
        </View>

        <Modal
          presentation="overlay"
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          title="This is the header"
          showSubline={false}
          showBodyText={false}
          actionLayout={modalActionLayout}
          primaryAction={{ label: "Button" }}
        >
          <ListItemCell eyebrow="Payment method" title="Bank transfer" trailing="switch" selected />
        </Modal>

        <ComponentBottomNavigation value={component} onChange={openComponent} onBack={backToGallery} />
      </SafeAreaView>
    );
  }

  if (mode === "component") {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.componentPageContent}>
          <View style={styles.componentHeader}>
            <Text style={styles.heroTitle}>{selectedMeta.title}</Text>
            <View style={styles.previewToneToggle}>
              <OptionChip label="Gray" selected={previewBackground === "gray"} onPress={() => setPreviewBackground("gray")} />
              <OptionChip label="White" selected={previewBackground === "white"} onPress={() => setPreviewBackground("white")} />
            </View>
          </View>

          <PreviewCard
            allowOverflow={component === "Card" || component === "Divider"}
            background={component === "Approach" ? "white" : previewBackground}
            component={component}
            detail
          >
            {preview(component)}
          </PreviewCard>

          <View style={styles.controls}>
            <ComponentControls
              component={component}
              actionLayout={actionLayout}
              setActionLayout={setActionLayout}
              modalActionLayout={modalActionLayout}
              setModalActionLayout={setModalActionLayout}
              cardVariant={cardVariant}
              setCardVariant={setCardVariant}
              cardDayPlanState={cardDayPlanState}
              setCardDayPlanState={setCardDayPlanState}
              cardStatus={cardStatus}
              setCardStatus={setCardStatus}
              cardShowAction={cardShowAction}
              setCardShowAction={setCardShowAction}
              searchState={searchState}
              setSearchState={setSearchState}
              chipState={chipState}
              setChipState={setChipState}
              stateSelectCount={stateSelectCount}
              setStateSelectCount={setStateSelectCount}
              listItemGymMode={listItemGymMode}
              setListItemGymMode={setListItemGymMode}
              listItemGymSelected={listItemGymSelected}
              setListItemGymSelected={setListItemGymSelected}
              listItemGymDeleteOpen={listItemGymDeleteOpen}
              setListItemGymDeleteOpen={setListItemGymDeleteOpen}
              workoutSetVariant={workoutSetVariant}
              setWorkoutSetVariant={setWorkoutSetVariant}
              superSetSegments={superSetSegments}
              setSuperSetSegments={setSuperSetSegments}
              dateCellState={dateCellState}
              setDateCellState={setDateCellState}
              approachSets={approachStorySets}
              setApproachSets={setApproachStorySets}
              calendarSelectedKey={calendarSelectedKey}
              setCalendarSelectedKey={setCalendarSelectedKey}
              calendarTodayKey={calendarTodayKey}
              setCalendarTodayKey={setCalendarTodayKey}
              calendarPaging={calendarPaging}
              setCalendarPaging={setCalendarPaging}
              progressCompleted={progressCompleted}
              setProgressCompleted={setProgressCompleted}
              buttonType={buttonType}
              setButtonType={setButtonType}
              buttonSize={buttonSize}
              setButtonSize={setButtonSize}
              buttonState={buttonState}
              setButtonState={setButtonState}
              navigationShowSubtitle={navigationShowSubtitle}
              setNavigationShowSubtitle={setNavigationShowSubtitle}
              tabBarValue={tabBarValue}
              setTabBarValue={setTabBarValue}
              headerSize={headerSize}
              setHeaderSize={setHeaderSize}
              headerShowSubtitle={headerShowSubtitle}
              setHeaderShowSubtitle={setHeaderShowSubtitle}
              selectState={selectState}
              setSelectState={setSelectState}
              selectShowLabel={selectShowLabel}
              setSelectShowLabel={setSelectShowLabel}
              selectShowMessage={selectShowMessage}
              setSelectShowMessage={setSelectShowMessage}
              loaderSize={loaderSize}
              setLoaderSize={setLoaderSize}
              loaderTone={loaderTone}
              setLoaderTone={setLoaderTone}
              iconName={iconName}
              setIconName={setIconName}
              alertTone={alertTone}
              setAlertTone={setAlertTone}
              alertLayout={alertLayout}
              setAlertLayout={setAlertLayout}
              alertExpanded={alertExpanded}
              setAlertExpanded={setAlertExpanded}
              avatarType={avatarType}
              setAvatarType={setAvatarType}
              avatarSize={resolvedAvatarSize}
              setAvatarSize={setAvatarSize}
              listItemLeading={listItemLeading}
              setListItemLeading={setListItemLeading}
              listItemTrailing={listItemTrailing}
              setListItemTrailing={setListItemTrailing}
              listItemState={listItemState}
              setListItemState={setListItemState}
              listItemSelected={listItemSelected}
              setListItemSelected={setListItemSelected}
              listItemShowEyebrow={listItemShowEyebrow}
              setListItemShowEyebrow={setListItemShowEyebrow}
              listItemShowSubtitle={listItemShowSubtitle}
              setListItemShowSubtitle={setListItemShowSubtitle}
              badgeTone={badgeTone}
              setBadgeTone={setBadgeTone}
              badgeSize={badgeSize}
              setBadgeSize={setBadgeSize}
              badgeIcon={badgeIcon}
              setBadgeIcon={setBadgeIcon}
              checkboxSelected={checkboxSelected}
              setCheckboxSelected={setCheckboxSelected}
              checkboxState={checkboxState}
              setCheckboxState={setCheckboxState}
              checkboxShowLabel={checkboxShowLabel}
              setCheckboxShowLabel={setCheckboxShowLabel}
              radioSelected={radioSelected}
              setRadioSelected={setRadioSelected}
              radioState={radioState}
              setRadioState={setRadioState}
              radioShowLabel={radioShowLabel}
              setRadioShowLabel={setRadioShowLabel}
              inputState={inputState}
              setInputState={setInputState}
              inputDouble={inputDouble}
              setInputDouble={setInputDouble}
              inputShowLabel={inputShowLabel}
              setInputShowLabel={setInputShowLabel}
              inputShowMessage={inputShowMessage}
              setInputShowMessage={setInputShowMessage}
              inputShowClearButton={inputShowClearButton}
              setInputShowClearButton={setInputShowClearButton}
              textAreaState={textAreaState}
              setTextAreaState={setTextAreaState}
              textAreaShowLabel={textAreaShowLabel}
              setTextAreaShowLabel={setTextAreaShowLabel}
              textAreaShowMessage={textAreaShowMessage}
              setTextAreaShowMessage={setTextAreaShowMessage}
              variantColumns={variantColumns}
              setVariantColumns={setVariantColumns}
              switchSelected={switchSelected}
              setSwitchSelected={setSwitchSelected}
              switchDisabled={switchDisabled}
              setSwitchDisabled={setSwitchDisabled}
              segmentItemsCount={segmentItemsCount}
              setSegmentItemsCount={setSegmentItemsCount}
              disableThird={disableThird}
              setDisableThird={setDisableThird}
            />
          </View>
        </ScrollView>

        <ComponentBottomNavigation value={component} onChange={openComponent} onBack={backToGallery} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        ref={galleryScrollRef}
        contentContainerStyle={styles.galleryContent}
        onScroll={(event) => {
          galleryScrollYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Trainer Design System</Text>
          <Text style={styles.heroSubtitle}>Clean, current components for local checks</Text>
        </View>

        <View style={styles.cardList}>
          {componentItems.map((item) => (
            <ComponentCard
              key={item.value}
              title={item.title}
              updatedAt={item.updatedAt}
              component={item.value}
              onPress={() => {
                openComponent(item.value);
              }}
            >
              {preview(item.value)}
            </ComponentCard>
          ))}
        </View>
      </ScrollView>

      <BottomAction
        label="Open Storybook"
        onPress={() => {
          openComponent(componentItems[0].value);
        }}
      />
    </SafeAreaView>
  );
}

function ComponentCard({
  title,
  updatedAt,
  component,
  onPress,
  children
}: {
  title: string;
  updatedAt: string;
  component: ComponentId;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.componentCard, pressed && styles.componentCardPressed]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDate}>{updatedAt}</Text>
      </View>
      <PreviewFrame
        allowOverflow={component === "Divider"}
        compact={component === "Modal"}
        gallery
        galleryCard={component === "Card"}
        component={component}
      >
        {children}
      </PreviewFrame>
    </Pressable>
  );
}

function PreviewCard({
  children,
  allowOverflow,
  background = "white",
  component,
  detail
}: {
  children: ReactNode;
  allowOverflow?: boolean;
  background?: "gray" | "white";
  component?: ComponentId;
  detail?: boolean;
}) {
  if (detail) {
    return (
      <PreviewFrame allowOverflow={allowOverflow} background={background} component={component} detail>
        {children}
      </PreviewFrame>
    );
  }

  return (
    <View style={[styles.previewCard, allowOverflow && styles.previewCardOverflow]}>
      <PreviewFrame allowOverflow={allowOverflow} component={component}>{children}</PreviewFrame>
    </View>
  );
}

function PreviewFrame({
  children,
  compact,
  allowOverflow,
  background = "white",
  gallery,
  galleryCard,
  detail,
  component
}: {
  children: ReactNode;
  compact?: boolean;
  allowOverflow?: boolean;
  background?: "gray" | "white";
  gallery?: boolean;
  galleryCard?: boolean;
  detail?: boolean;
  component?: ComponentId;
}) {
  const isCalendarDayStrip = component === "CalendarDayStrip";

  return (
    <View
      style={[
        styles.previewFrame,
        detail && styles.previewFrameDetail,
        detail && background === "gray" && styles.previewFrameGray,
        isCalendarDayStrip && styles.previewFrameCalendar,
        gallery && styles.previewFrameGallery,
        compact && styles.previewFrameCompact,
        allowOverflow && styles.previewOverflow,
        detail && Platform.OS === "web" && styles.previewFrameResizable,
        detail && webResizablePreviewFrame
      ]}
    >
      <View
        style={[
          styles.previewContent,
          detail && styles.previewContentDetail,
          isCalendarDayStrip && styles.previewContentCalendar,
          gallery && styles.previewContentGallery,
          compact && styles.previewContentCompact,
          galleryCard && styles.previewContentGalleryCard,
          allowOverflow && styles.previewOverflow
        ]}
      >
        {children}
      </View>
    </View>
  );
}

type PreviewContentProps = {
  component: ComponentId;
  actionLayout: ActionLayout;
  modalActionLayout: ActionLayout;
  cardVariant: CardVariant;
  cardDayPlanState: CardDayPlanState;
  cardStatus: CardWorkoutStatus;
  cardShowAction: boolean;
  searchValue: string;
  searchState: SearchState;
  onSearchValueChange: (value: string) => void;
  chipState: ChipState;
  onChipStateChange: (value: ChipState) => void;
  stateSelectCount: number;
  onStateSelectCountChange: (value: number) => void;
  listItemGymMode: ListItemGymMode;
  listItemGymSelected: boolean;
  onListItemGymModeChange: (value: ListItemGymMode) => void;
  onListItemGymSelectedChange: (selected: boolean) => void;
  listItemGymDeleteOpen: boolean;
  onListItemGymDeleteOpenChange: (value: boolean) => void;
  workoutSetVariant: WorkoutSetVariant;
  superSetSegments: SuperSetSegment[];
  onSuperSetSegmentsChange: (value: SuperSetSegment[]) => void;
  dateCellState: DateCellState;
  approachSets: ApproachSet[];
  approachNote: string;
  onApproachNoteChange: (value: string) => void;
  onApproachSetStateChange: (id: string, state: ApproachCountState) => void;
  onApproachSetValueChange: (id: string, patch: Partial<Pick<ApproachSet, "weight" | "reps">>) => void;
  onApproachSetDelete: (id: string) => void;
  onApproachAddSet: () => void;
  onApproachRestore: () => void;
  onApproachSetsReorder: (sets: ApproachSet[]) => void;
  showApproachDeleteActions: boolean;
  calendarSelectedKey: string;
  calendarTodayKey: string;
  calendarPaging: boolean;
  onCalendarSelectedKeyChange: (value: string) => void;
  onCalendarTodayKeyChange: (value: string) => void;
  progressCompleted: number;
  buttonType: ButtonType;
  buttonSize: ButtonSize;
  buttonState: ButtonState;
  navigationShowSubtitle: boolean;
  tabBarValue: string;
  onTabBarValueChange: (value: string) => void;
  headerSize: HeaderSize;
  headerShowSubtitle: boolean;
  selectState: SelectState;
  selectShowLabel: boolean;
  selectShowMessage: boolean;
  selectValue: string;
  onSelectValueChange: (value: string) => void;
  loaderSize: LoaderSize;
  loaderTone: LoaderTone;
  iconName: IconName;
  alertTone: AlertTone;
  alertLayout: AlertLayout;
  alertExpanded: boolean;
  onAlertExpandedChange: (value: boolean) => void;
  avatarType: AvatarType;
  avatarSize: AvatarSize;
  listItemLeading: ListItemCellLeading;
  listItemTrailing: ListItemCellTrailing;
  listItemState: ListItemCellState;
  listItemSelected: boolean;
  listItemShowEyebrow: boolean;
  listItemShowSubtitle: boolean;
  onListItemSelectedChange: (selected: boolean) => void;
  badgeTone: BadgeTone;
  badgeSize: "md" | "sm" | "s";
  badgeIcon: boolean;
  checkboxSelected: boolean;
  checkboxState: CheckboxState;
  checkboxShowLabel: boolean;
  onCheckboxChange: (selected: boolean) => void;
  radioSelected: boolean;
  radioState: RadioState;
  radioShowLabel: boolean;
  onRadioChange: (selected: boolean) => void;
  inputState: InputState;
  inputDouble: boolean;
  inputShowLabel: boolean;
  inputShowMessage: boolean;
  inputShowClearButton: boolean;
  inputValue: string;
  prefixValue: string;
  onInputValueChange: (value: string) => void;
  onPrefixValueChange: (value: string) => void;
  textAreaState: TextAreaState;
  textAreaShowLabel: boolean;
  textAreaShowMessage: boolean;
  textAreaValue: string;
  onTextAreaValueChange: (value: string) => void;
  variantItems: Array<{ value: VariantValue; label: string }>;
  variantValue: VariantValue;
  variantColumns: 2 | 5;
  onVariantChange: (value: VariantValue) => void;
  segmentItems: Array<{ value: SegmentValue; label: string; disabled?: boolean }>;
  segmentValue: SegmentValue;
  onSegmentChange: (value: SegmentValue) => void;
  previewBackground: "gray" | "white";
  switchSelected: boolean;
  switchDisabled: boolean;
  onSwitchChange: (selected: boolean) => void;
};

function PreviewContent({
  component,
  actionLayout,
  modalActionLayout,
  cardVariant,
  cardDayPlanState,
  cardStatus,
  cardShowAction,
  searchValue,
  searchState,
  onSearchValueChange,
  chipState,
  onChipStateChange,
  stateSelectCount,
  onStateSelectCountChange,
  listItemGymMode,
  listItemGymSelected,
  onListItemGymModeChange,
  onListItemGymSelectedChange,
  listItemGymDeleteOpen,
  onListItemGymDeleteOpenChange,
  workoutSetVariant,
  superSetSegments,
  onSuperSetSegmentsChange,
  dateCellState,
  approachSets,
  approachNote,
  onApproachNoteChange,
  onApproachSetStateChange,
  onApproachSetValueChange,
  onApproachSetDelete,
  onApproachAddSet,
  onApproachRestore,
  onApproachSetsReorder,
  showApproachDeleteActions,
  calendarSelectedKey,
  calendarTodayKey,
  calendarPaging,
  onCalendarSelectedKeyChange,
  onCalendarTodayKeyChange,
  progressCompleted,
  buttonType,
  buttonSize,
  buttonState,
  navigationShowSubtitle,
  tabBarValue,
  onTabBarValueChange,
  headerSize,
  headerShowSubtitle,
  selectState,
  selectShowLabel,
  selectShowMessage,
  selectValue,
  onSelectValueChange,
  loaderSize,
  loaderTone,
  iconName,
  alertTone,
  alertLayout,
  alertExpanded,
  onAlertExpandedChange,
  avatarType,
  avatarSize,
  listItemLeading,
  listItemTrailing,
  listItemState,
  listItemSelected,
  listItemShowEyebrow,
  listItemShowSubtitle,
  onListItemSelectedChange,
  badgeTone,
  badgeSize,
  badgeIcon,
  checkboxSelected,
  checkboxState,
  checkboxShowLabel,
  onCheckboxChange,
  radioSelected,
  radioState,
  radioShowLabel,
  onRadioChange,
  inputState,
  inputDouble,
  inputShowLabel,
  inputShowMessage,
  inputShowClearButton,
  inputValue,
  prefixValue,
  onInputValueChange,
  onPrefixValueChange,
  textAreaState,
  textAreaShowLabel,
  textAreaShowMessage,
  textAreaValue,
  onTextAreaValueChange,
  variantItems,
  variantValue,
  variantColumns,
  onVariantChange,
  segmentItems,
  segmentValue,
  onSegmentChange,
  previewBackground,
  switchSelected,
  switchDisabled,
  onSwitchChange
}: PreviewContentProps) {
  if (component === "Action") {
    return <Action layout={actionLayout} />;
  }

  if (component === "Modal") {
    return (
      <View style={styles.modalPreviewCrop}>
        <Modal
          actionLayout="single"
          title="This is the header"
          showSubline={false}
          showBodyText={false}
          primaryAction={{ label: "Button" }}
          style={styles.modalPreviewPanel}
        >
          <ListItemCell eyebrow="Payment method" title="Bank transfer" trailing="switch" selected />
        </Modal>
      </View>
    );
  }

  if (component === "Card") {
    return (
      <Card
        variant={cardVariant}
        dayPlanState={cardDayPlanState}
        workoutStatus={cardStatus}
        showAction={cardShowAction}
        completedExercises={cardStatus === "completed" ? 6 : cardStatus === "inProgress" ? 1 : 0}
        totalExercises={6}
        exerciseCount={6}
        style={cardVariant === "dayPlan" || cardVariant === "addWorkout" ? styles.cardPlanPreviewItem : styles.cardWorkoutPreviewItem}
      />
    );
  }

  if (component === "Search") {
    return (
      <Search
        value={searchState === "empty" ? "" : searchValue}
        state={searchState}
        width="fill"
        onChangeText={onSearchValueChange}
      />
    );
  }

  if (component === "Chip") {
    return (
      <View style={styles.hugPreviewItem}>
        <Chip
          label={chipState === "selected" ? "I am a chip" : "I am a chip unselected"}
          state={chipState}
          onRemove={() => onChipStateChange("default")}
        />
      </View>
    );
  }

  if (component === "StateSelect") {
    return <StateSelect selectedCount={stateSelectCount} onReset={() => onStateSelectCountChange(0)} />;
  }

  if (component === "ChipsList") {
    return (
      <ChipsList
        items={[
          { id: "mine", label: "Mine" },
          { id: "muscles", label: "Muscles", state: "dropdown" }
        ]}
      />
    );
  }

  if (component === "ListItemGym") {
    return (
      <ListItemGym
        title="Horizontal leg press machine"
        mode={listItemGymMode}
        selected={listItemGymSelected}
        deleteOpen={listItemGymMode === "move" ? listItemGymDeleteOpen : undefined}
        onDeleteOpenChange={onListItemGymDeleteOpenChange}
        onDelete={() => onListItemGymDeleteOpenChange(false)}
        onMoveDown={() => onListItemGymModeChange("move")}
        onMovePress={() => onListItemGymModeChange("move")}
        onMoveUp={() => onListItemGymModeChange("move")}
        onSelectedChange={onListItemGymSelectedChange}
      />
    );
  }

  if (component === "Set") {
    return (
      <View style={styles.hugPreviewItem}>
        <WorkoutSet variant={workoutSetVariant} />
      </View>
    );
  }

  if (component === "SuperSet") {
    return (
      <View style={styles.superSetPreview}>
        <View style={styles.superSetPreviewScaleFrame}>
          <SuperSet
            segments={superSetSegments}
            style={styles.superSetPreviewItem}
            onSegmentPress={(id) => {
              if (!superSetSegments.some((segment) => segment.id === id)) {
                return;
              }

              onSuperSetSegmentsChange(superSetSegments.map((segment) => ({ ...segment, selected: segment.id === id })));
            }}
          />
        </View>
      </View>
    );
  }

  if (component === "DateCell") {
    return (
      <View style={styles.hugPreviewItem}>
        <DateCell label={dateCellState === "select" ? "14" : "12"} state={dateCellState} />
      </View>
    );
  }

  if (component === "Approach") {
    if (approachSets.length === 0) {
      return (
        <View style={styles.hugPreviewItem}>
          <Button label="Reload" type="secondaryNeutral" size="large" onPress={onApproachRestore} />
        </View>
      );
    }

    return (
      <Approach
        title="Жим ногами горизонтальный в блочном тренажере"
        sets={approachSets}
        note={approachNote}
        addLabel="Добавить подход"
        showDeleteAction={showApproachDeleteActions}
        onAddSet={onApproachAddSet}
        onDeleteSet={showApproachDeleteActions ? onApproachSetDelete : undefined}
        onNoteChange={onApproachNoteChange}
        onSetStateChange={onApproachSetStateChange}
        onSetValueChange={onApproachSetValueChange}
        onSetsReorder={onApproachSetsReorder}
      />
    );
  }

  if (component === "CalendarDayStrip") {
    const weeks = calendarPaging ? [calendarDayStripWeek, calendarDayStripNextWeek] : undefined;
    return (
      <View style={styles.calendarDayStripPreview}>
        <CalendarDayStrip
          items={calendarDayStripWeek}
          weeks={weeks}
          selectedKey={calendarSelectedKey}
          todayKey={calendarTodayKey}
          width="full"
          onSelect={(key) => onCalendarSelectedKeyChange(key)}
        />
      </View>
    );
  }

  if (component === "ProgressBar") {
    return <ProgressBar completed={progressCompleted} total={6} />;
  }

  if (component === "Divider") {
    return (
      <View style={styles.dividerPreviewStack}>
        <View style={[styles.dividerPreviewTop, previewBackground === "gray" ? styles.dividerPreviewCanvasSurface : styles.dividerPreviewGraySurface]} />
        <Divider width="fill" tone={previewBackground === "gray" ? "canvasSoft" : "canvas"} />
        <View style={[styles.dividerPreviewBottom, previewBackground === "gray" ? styles.dividerPreviewCanvasSurface : styles.dividerPreviewGraySurface]} />
      </View>
    );
  }

  if (component === "Button") {
    return (
      <View style={styles.hugPreviewItem}>
        <Button
          type={buttonType}
          size={buttonSize}
          state={buttonState}
          label={buttonSize === "large" ? "Large" : buttonSize === "small" ? "Small" : "Medium"}
        />
      </View>
    );
  }

  if (component === "Navigation") {
    return <Navigation title="Screen Header" subtitle="Additional Title" showSubtitle={navigationShowSubtitle} />;
  }

  if (component === "TabBar") {
    return <TabBar selectedValue={tabBarValue} onValueChange={onTabBarValueChange} />;
  }

  if (component === "Header") {
    return <Header title="Phone payment" subtitle="Phone payment" size={headerSize} showSubtitle={headerShowSubtitle} />;
  }

  if (component === "Select") {
    const statusMessage = selectState === "error" ? "Error message" : selectState === "positive" ? "Positive message" : selectState === "warning" ? "Warning message" : "Message";

    return (
      <Select
        label="Date"
        value={selectState === "empty" ? "" : selectValue}
        message={statusMessage}
        state={selectState}
        disabled={selectState === "disabled"}
        showLabel={selectShowLabel}
        showMessage={selectShowMessage}
        width="fill"
        onPress={() => onSelectValueChange(selectValue ? "" : "Value")}
      />
    );
  }

  if (component === "Loader") {
    return (
      <View style={styles.hugPreviewItem}>
        <Loader size={loaderSize} tone={loaderTone} />
      </View>
    );
  }

  if (component === "Icon") {
    return (
      <View style={styles.hugPreviewItem}>
        <Icon name={iconName} size={theme.spacing["3xl"]} color={theme.colors.content.ink} />
      </View>
    );
  }

  if (component === "Alert") {
    return <Alert tone={alertTone} layout={alertLayout} width="fill" expanded={alertLayout === "compact" ? undefined : alertExpanded} onExpandedChange={alertLayout === "compact" ? undefined : onAlertExpandedChange} />;
  }

  if (component === "Avatar") {
    return (
      <View style={styles.hugPreviewItem}>
        <Avatar type={avatarType} size={avatarSize} />
      </View>
    );
  }

  if (component === "ListItemCell") {
    return (
      <ListItemCell
        eyebrow="Payment method"
        title="Bank transfer"
        subtitle="Wise account"
        trailingText="1 SGD"
        leading={listItemLeading}
        trailing={listItemTrailing}
        state={listItemState}
        selected={listItemSelected}
        showEyebrow={listItemShowEyebrow}
        showSubtitle={listItemShowSubtitle}
        buttonLabel="Change"
        badgeLabel="Ready"
        badgeTone="success"
        onSelectedChange={onListItemSelectedChange}
      />
    );
  }

  if (component === "Badge") {
    return (
      <View style={styles.hugPreviewItem}>
        <Badge label="Error" tone={badgeTone} size={badgeSize} icon={badgeIcon} />
      </View>
    );
  }

  if (component === "Checkbox") {
    return (
      <View style={styles.hugPreviewItem}>
        <Checkbox selected={checkboxSelected} state={checkboxState} label="Text" showLabel={checkboxShowLabel} onChange={onCheckboxChange} />
      </View>
    );
  }

  if (component === "Radio") {
    return (
      <View style={styles.hugPreviewItem}>
        <Radio selected={radioSelected} state={radioState} label="Text" showLabel={radioShowLabel} onChange={onRadioChange} />
      </View>
    );
  }

  if (component === "Input") {
    return (
      <Input
        label="Field label"
        value={inputState === "empty" ? "" : inputValue}
        message={inputState === "error" ? "Error message" : "Message"}
        state={inputState}
        disabled={inputState === "disabled"}
        doubleField={inputDouble}
        prefixValue={prefixValue}
        showLabel={inputShowLabel}
        showMessage={inputShowMessage}
        showClearButton={inputShowClearButton}
        width="fill"
        onChangeText={onInputValueChange}
        onChangePrefixText={onPrefixValueChange}
      />
    );
  }

  if (component === "SegmentedControl") {
    return <SegmentedControl items={segmentItems} value={segmentValue} width="full" onChange={onSegmentChange} />;
  }

  if (component === "Variant") {
    const resolvedVariantValue = variantItems.some((item) => item.value === variantValue) ? variantValue : variantItems[0].value;
    return <Variant label="Пол" items={variantItems} value={resolvedVariantValue} columns={variantColumns} width="fill" onChange={onVariantChange} />;
  }

  if (component === "TextArea") {
    return (
      <TextArea
        label="Field label"
        value={textAreaState === "empty" ? "" : textAreaValue}
        message={textAreaState === "error" ? "Error message" : "Message"}
        state={textAreaState}
        disabled={textAreaState === "disabled"}
        showLabel={textAreaShowLabel}
        showMessage={textAreaShowMessage}
        width="fill"
        onChangeText={onTextAreaValueChange}
      />
    );
  }

  return (
    <View style={styles.hugPreviewItem}>
      <Switch selected={switchSelected} disabled={switchDisabled} onChange={onSwitchChange} />
    </View>
  );
}

type ComponentControlsProps = {
  component: ComponentId;
  actionLayout: ActionLayout;
  setActionLayout: (value: ActionLayout) => void;
  modalActionLayout: ActionLayout;
  setModalActionLayout: (value: ActionLayout) => void;
  cardVariant: CardVariant;
  setCardVariant: (value: CardVariant) => void;
  cardDayPlanState: CardDayPlanState;
  setCardDayPlanState: (value: CardDayPlanState) => void;
  cardStatus: CardWorkoutStatus;
  setCardStatus: (value: CardWorkoutStatus) => void;
  cardShowAction: boolean;
  setCardShowAction: (value: boolean) => void;
  searchState: SearchState;
  setSearchState: (value: SearchState) => void;
  chipState: ChipState;
  setChipState: (value: ChipState) => void;
  stateSelectCount: number;
  setStateSelectCount: (value: number) => void;
  listItemGymMode: ListItemGymMode;
  setListItemGymMode: (value: ListItemGymMode) => void;
  listItemGymSelected: boolean;
  setListItemGymSelected: (value: boolean) => void;
  listItemGymDeleteOpen: boolean;
  setListItemGymDeleteOpen: (value: boolean) => void;
  workoutSetVariant: WorkoutSetVariant;
  setWorkoutSetVariant: (value: WorkoutSetVariant) => void;
  superSetSegments: SuperSetSegment[];
  setSuperSetSegments: (value: SuperSetSegment[]) => void;
  dateCellState: DateCellState;
  setDateCellState: (value: DateCellState) => void;
  approachSets: ApproachSet[];
  setApproachSets: (value: ApproachSet[]) => void;
  calendarSelectedKey: string;
  setCalendarSelectedKey: (value: string) => void;
  calendarTodayKey: string;
  setCalendarTodayKey: (value: string) => void;
  calendarPaging: boolean;
  setCalendarPaging: (value: boolean) => void;
  progressCompleted: number;
  setProgressCompleted: (value: number) => void;
  buttonType: ButtonType;
  setButtonType: (value: ButtonType) => void;
  buttonSize: ButtonSize;
  setButtonSize: (value: ButtonSize) => void;
  buttonState: ButtonState;
  setButtonState: (value: ButtonState) => void;
  navigationShowSubtitle: boolean;
  setNavigationShowSubtitle: (value: boolean) => void;
  tabBarValue: string;
  setTabBarValue: (value: string) => void;
  headerSize: HeaderSize;
  setHeaderSize: (value: HeaderSize) => void;
  headerShowSubtitle: boolean;
  setHeaderShowSubtitle: (value: boolean) => void;
  selectState: SelectState;
  setSelectState: (value: SelectState) => void;
  selectShowLabel: boolean;
  setSelectShowLabel: (value: boolean) => void;
  selectShowMessage: boolean;
  setSelectShowMessage: (value: boolean) => void;
  loaderSize: LoaderSize;
  setLoaderSize: (value: LoaderSize) => void;
  loaderTone: LoaderTone;
  setLoaderTone: (value: LoaderTone) => void;
  iconName: IconName;
  setIconName: (value: IconName) => void;
  alertTone: AlertTone;
  setAlertTone: (value: AlertTone) => void;
  alertLayout: AlertLayout;
  setAlertLayout: (value: AlertLayout) => void;
  alertExpanded: boolean;
  setAlertExpanded: (value: boolean) => void;
  avatarType: AvatarType;
  setAvatarType: (value: AvatarType) => void;
  avatarSize: AvatarSize;
  setAvatarSize: (value: AvatarSize) => void;
  listItemLeading: ListItemCellLeading;
  setListItemLeading: (value: ListItemCellLeading) => void;
  listItemTrailing: ListItemCellTrailing;
  setListItemTrailing: (value: ListItemCellTrailing) => void;
  listItemState: ListItemCellState;
  setListItemState: (value: ListItemCellState) => void;
  listItemSelected: boolean;
  setListItemSelected: (value: boolean) => void;
  listItemShowEyebrow: boolean;
  setListItemShowEyebrow: (value: boolean) => void;
  listItemShowSubtitle: boolean;
  setListItemShowSubtitle: (value: boolean) => void;
  badgeTone: BadgeTone;
  setBadgeTone: (value: BadgeTone) => void;
  badgeSize: "md" | "sm" | "s";
  setBadgeSize: (value: "md" | "sm" | "s") => void;
  badgeIcon: boolean;
  setBadgeIcon: (value: boolean) => void;
  checkboxSelected: boolean;
  setCheckboxSelected: (value: boolean) => void;
  checkboxState: CheckboxState;
  setCheckboxState: (value: CheckboxState) => void;
  checkboxShowLabel: boolean;
  setCheckboxShowLabel: (value: boolean) => void;
  radioSelected: boolean;
  setRadioSelected: (value: boolean) => void;
  radioState: RadioState;
  setRadioState: (value: RadioState) => void;
  radioShowLabel: boolean;
  setRadioShowLabel: (value: boolean) => void;
  inputState: InputState;
  setInputState: (value: InputState) => void;
  inputDouble: boolean;
  setInputDouble: (value: boolean) => void;
  inputShowLabel: boolean;
  setInputShowLabel: (value: boolean) => void;
  inputShowMessage: boolean;
  setInputShowMessage: (value: boolean) => void;
  inputShowClearButton: boolean;
  setInputShowClearButton: (value: boolean) => void;
  textAreaState: TextAreaState;
  setTextAreaState: (value: TextAreaState) => void;
  textAreaShowLabel: boolean;
  setTextAreaShowLabel: (value: boolean) => void;
  textAreaShowMessage: boolean;
  setTextAreaShowMessage: (value: boolean) => void;
  variantColumns: 2 | 5;
  setVariantColumns: (value: 2 | 5) => void;
  switchSelected: boolean;
  setSwitchSelected: (value: boolean) => void;
  switchDisabled: boolean;
  setSwitchDisabled: (value: boolean) => void;
  segmentItemsCount: "Two" | "Three";
  setSegmentItemsCount: (value: "Two" | "Three") => void;
  disableThird: boolean;
  setDisableThird: (value: boolean) => void;
};

function ComponentControls({
  component,
  actionLayout,
  setActionLayout,
  modalActionLayout,
  setModalActionLayout,
  cardVariant,
  setCardVariant,
  cardDayPlanState,
  setCardDayPlanState,
  cardStatus,
  setCardStatus,
  cardShowAction,
  setCardShowAction,
  searchState,
  setSearchState,
  chipState,
  setChipState,
  stateSelectCount,
  setStateSelectCount,
  listItemGymMode,
  setListItemGymMode,
  listItemGymSelected,
  setListItemGymSelected,
  listItemGymDeleteOpen,
  setListItemGymDeleteOpen,
  workoutSetVariant,
  setWorkoutSetVariant,
  superSetSegments,
  setSuperSetSegments,
  dateCellState,
  setDateCellState,
  approachSets,
  setApproachSets,
  calendarSelectedKey,
  setCalendarSelectedKey,
  calendarTodayKey,
  setCalendarTodayKey,
  calendarPaging,
  setCalendarPaging,
  progressCompleted,
  setProgressCompleted,
  buttonType,
  setButtonType,
  buttonSize,
  setButtonSize,
  buttonState,
  setButtonState,
  navigationShowSubtitle,
  setNavigationShowSubtitle,
  tabBarValue,
  setTabBarValue,
  headerSize,
  setHeaderSize,
  headerShowSubtitle,
  setHeaderShowSubtitle,
  selectState,
  setSelectState,
  selectShowLabel,
  setSelectShowLabel,
  selectShowMessage,
  setSelectShowMessage,
  loaderSize,
  setLoaderSize,
  loaderTone,
  setLoaderTone,
  iconName,
  setIconName,
  alertTone,
  setAlertTone,
  alertLayout,
  setAlertLayout,
  alertExpanded,
  setAlertExpanded,
  avatarType,
  setAvatarType,
  avatarSize,
  setAvatarSize,
  listItemLeading,
  setListItemLeading,
  listItemTrailing,
  setListItemTrailing,
  listItemState,
  setListItemState,
  listItemSelected,
  setListItemSelected,
  listItemShowEyebrow,
  setListItemShowEyebrow,
  listItemShowSubtitle,
  setListItemShowSubtitle,
  badgeTone,
  setBadgeTone,
  badgeSize,
  setBadgeSize,
  badgeIcon,
  setBadgeIcon,
  checkboxSelected,
  setCheckboxSelected,
  checkboxState,
  setCheckboxState,
  checkboxShowLabel,
  setCheckboxShowLabel,
  radioSelected,
  setRadioSelected,
  radioState,
  setRadioState,
  radioShowLabel,
  setRadioShowLabel,
  inputState,
  setInputState,
  inputDouble,
  setInputDouble,
  inputShowLabel,
  setInputShowLabel,
  inputShowMessage,
  setInputShowMessage,
  inputShowClearButton,
  setInputShowClearButton,
  textAreaState,
  setTextAreaState,
  textAreaShowLabel,
  setTextAreaShowLabel,
  textAreaShowMessage,
  setTextAreaShowMessage,
  variantColumns,
  setVariantColumns,
  switchSelected,
  setSwitchSelected,
  switchDisabled,
  setSwitchDisabled,
  segmentItemsCount,
  setSegmentItemsCount,
  disableThird,
  setDisableThird
}: ComponentControlsProps) {
  const resolvedControlAvatarSize = avatarSizes.includes(avatarSize) ? avatarSize : 56;

  if (component === "Action") {
    return (
      <ControlGroup label="layout">
        {actionLayouts.map((layout) => (
          <OptionChip key={layout} label={layout} selected={actionLayout === layout} onPress={() => setActionLayout(layout)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Modal") {
    return (
      <ControlGroup label="action layout">
        {actionLayouts.map((layout) => (
          <OptionChip key={layout} label={layout} selected={modalActionLayout === layout} onPress={() => setModalActionLayout(layout)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Card") {
    return (
      <>
        <ControlGroup label="variant">
          {cardVariants.map((variant) => (
            <OptionChip key={variant} label={variant} selected={cardVariant === variant} onPress={() => setCardVariant(variant)} />
          ))}
        </ControlGroup>
        <ControlGroup label="day plan">
          {cardDayPlanStates.map((state) => (
            <OptionChip key={state} label={state} selected={cardDayPlanState === state} onPress={() => setCardDayPlanState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="status">
          {cardStatuses.map((status) => (
            <OptionChip key={status} label={status} selected={cardStatus === status} onPress={() => setCardStatus(status)} />
          ))}
        </ControlGroup>
        <ControlGroup label="show action">
          <OptionChip label="true" selected={cardShowAction} onPress={() => setCardShowAction(true)} />
          <OptionChip label="false" selected={!cardShowAction} onPress={() => setCardShowAction(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Search") {
    return (
      <ControlGroup label="state">
        {searchStates.map((state) => (
          <OptionChip key={state} label={state} selected={searchState === state} onPress={() => setSearchState(state)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Chip") {
    return (
      <ControlGroup label="state">
        {chipStates.map((state) => (
          <OptionChip key={state} label={state} selected={chipState === state} onPress={() => setChipState(state)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "StateSelect") {
    return (
      <ControlGroup label="selected count">
        {[0, 1, 3, 5].map((count) => (
          <OptionChip key={count} label={String(count)} selected={stateSelectCount === count} onPress={() => setStateSelectCount(count)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "ChipsList") {
    return null;
  }

  if (component === "ListItemGym") {
    return (
      <>
        <ControlGroup label="mode">
          {listItemGymModes.map((mode) => (
            <OptionChip
              key={mode}
              label={mode}
              selected={listItemGymMode === mode}
              onPress={() => {
                setListItemGymMode(mode);
                if (mode !== "move") {
                  setListItemGymDeleteOpen(false);
                }
              }}
            />
          ))}
        </ControlGroup>
        <ControlGroup label="selected">
          <OptionChip label="true" selected={listItemGymSelected} onPress={() => setListItemGymSelected(true)} />
          <OptionChip label="false" selected={!listItemGymSelected} onPress={() => setListItemGymSelected(false)} />
        </ControlGroup>
        <ControlGroup label="delete state">
          <OptionChip
            label="open"
            selected={listItemGymDeleteOpen}
            onPress={() => {
              setListItemGymMode("move");
              setListItemGymDeleteOpen(true);
            }}
          />
          <OptionChip label="closed" selected={!listItemGymDeleteOpen} onPress={() => setListItemGymDeleteOpen(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Set") {
    return (
      <ControlGroup label="variant">
        {workoutSetVariants.map((variant) => (
          <OptionChip key={variant} label={variant} selected={workoutSetVariant === variant} onPress={() => setWorkoutSetVariant(variant)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "SuperSet") {
    return (
      <ControlGroup label="selected segment">
        {superSetSegments.map((segment) => (
          <OptionChip
            key={segment.id}
            label={segment.id}
            selected={Boolean(segment.selected)}
            onPress={() => setSuperSetSegments(superSetSegments.map((item) => ({ ...item, selected: item.id === segment.id })))}
          />
        ))}
      </ControlGroup>
    );
  }

  if (component === "DateCell") {
    return (
      <ControlGroup label="state">
        {dateCellStates.map((state) => (
          <OptionChip key={state} label={state} selected={dateCellState === state} onPress={() => setDateCellState(state)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Approach") {
    const hasSelectedSet = approachSets.some((set) => set.state === "selected");
    const hasMoveSet = approachSets.some((set) => set.state === "move");
    const hasSets = approachSets.length > 0;

    return (
      <ControlGroup label="sets">
        <OptionChip
          label="default"
          selected={!hasSelectedSet && !hasMoveSet}
          onPress={() => setApproachSets(approachSets.map((set) => ({ ...set, state: "default" })))}
        />
        <OptionChip
          label="select first"
          selected={hasSelectedSet}
          onPress={() => setApproachSets(approachSets.map((set, index) => ({ ...set, state: index === 0 ? "selected" : "default" })))}
        />
        <OptionChip
          label="move"
          selected={hasMoveSet}
          onPress={() => setApproachSets(approachSets.map((set) => ({ ...set, state: "move" })))}
        />
        <OptionChip label="add" selected={false} onPress={() => setApproachSets([...approachSets, createApproachSet(approachSets.length + 1)])} />
        <OptionChip label="reload" selected={!hasSets} onPress={() => setApproachSets(defaultApproachSets)} />
      </ControlGroup>
    );
  }

  if (component === "CalendarDayStrip") {
    const calendarControls = calendarPaging ? [...calendarDayStripWeek, ...calendarDayStripNextWeek] : calendarDayStripWeek;

    return (
      <>
        <ControlGroup label="selected day">
          {calendarControls.map((item) => (
            <OptionChip
              key={item.key}
              label={`${item.weekday} ${item.dayNumber}`}
              selected={calendarSelectedKey === item.key}
              onPress={() => setCalendarSelectedKey(item.key)}
            />
          ))}
        </ControlGroup>
        <ControlGroup label="current day dot">
          {calendarControls.map((item) => (
            <OptionChip
              key={item.key}
              label={`${item.weekday} ${item.dayNumber}`}
              selected={calendarTodayKey === item.key}
              onPress={() => setCalendarTodayKey(item.key)}
            />
          ))}
        </ControlGroup>
        <ControlGroup label="week paging">
          <OptionChip label="single" selected={!calendarPaging} onPress={() => setCalendarPaging(false)} />
          <OptionChip label="two weeks" selected={calendarPaging} onPress={() => setCalendarPaging(true)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "ProgressBar") {
    return (
      <ControlGroup label="completed">
        {[0, 1, 2, 3, 4, 5, 6].map((value) => (
          <OptionChip key={value} label={String(value)} selected={progressCompleted === value} onPress={() => setProgressCompleted(value)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Divider") {
    return null;
  }

  if (component === "Button") {
    return (
      <>
        <ControlGroup label="type">
          {buttonTypes.map((type) => (
            <OptionChip key={type} label={type} selected={buttonType === type} onPress={() => setButtonType(type)} />
          ))}
        </ControlGroup>
        <ControlGroup label="size">
          {buttonSizes.map((size) => (
            <OptionChip key={size} label={size} selected={buttonSize === size} onPress={() => setButtonSize(size)} />
          ))}
        </ControlGroup>
        <ControlGroup label="state">
          {buttonStates.map((state) => (
            <OptionChip key={state} label={state} selected={buttonState === state} onPress={() => setButtonState(state)} />
          ))}
        </ControlGroup>
      </>
    );
  }

  if (component === "Navigation") {
    return (
      <ControlGroup label="subtitle">
        <OptionChip label="show" selected={navigationShowSubtitle} onPress={() => setNavigationShowSubtitle(true)} />
        <OptionChip label="hide" selected={!navigationShowSubtitle} onPress={() => setNavigationShowSubtitle(false)} />
      </ControlGroup>
    );
  }

  if (component === "TabBar") {
    return (
      <ControlGroup label="selected">
        {trainerTabBarItems.map((item) => (
          <OptionChip key={item.value} label={item.label} selected={tabBarValue === item.value} onPress={() => setTabBarValue(item.value)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Header") {
    return (
      <>
        <ControlGroup label="size">
          {headerSizes.map((size) => (
            <OptionChip key={size} label={size} selected={headerSize === size} onPress={() => setHeaderSize(size)} />
          ))}
        </ControlGroup>
        <ControlGroup label="subtitle">
          <OptionChip label="show" selected={headerShowSubtitle} onPress={() => setHeaderShowSubtitle(true)} />
          <OptionChip label="hide" selected={!headerShowSubtitle} onPress={() => setHeaderShowSubtitle(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Select") {
    return (
      <>
        <ControlGroup label="state">
          {selectStates.map((state) => (
            <OptionChip key={state} label={state} selected={selectState === state} onPress={() => setSelectState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="label">
          <OptionChip label="show" selected={selectShowLabel} onPress={() => setSelectShowLabel(true)} />
          <OptionChip label="hide" selected={!selectShowLabel} onPress={() => setSelectShowLabel(false)} />
        </ControlGroup>
        <ControlGroup label="message">
          <OptionChip label="show" selected={selectShowMessage} onPress={() => setSelectShowMessage(true)} />
          <OptionChip label="hide" selected={!selectShowMessage} onPress={() => setSelectShowMessage(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Loader") {
    return (
      <>
        <ControlGroup label="size">
          {loaderSizes.map((size) => (
            <OptionChip key={size} label={size} selected={loaderSize === size} onPress={() => setLoaderSize(size)} />
          ))}
        </ControlGroup>
        <ControlGroup label="tone">
          {loaderTones.map((tone) => (
            <OptionChip key={tone} label={tone} selected={loaderTone === tone} onPress={() => setLoaderTone(tone)} />
          ))}
        </ControlGroup>
      </>
    );
  }

  if (component === "Icon") {
    return (
      <ControlGroup label="name">
        {iconNames.map((name) => (
          <OptionChip key={name} label={name} selected={iconName === name} onPress={() => setIconName(name)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Alert") {
    return (
      <>
        <ControlGroup label="tone">
          {alertTones.map((tone) => (
            <OptionChip key={tone} label={tone} selected={alertTone === tone} onPress={() => setAlertTone(tone)} />
          ))}
        </ControlGroup>
        <ControlGroup label="layout">
          {alertLayouts.map((layout) => (
            <OptionChip key={layout} label={layout} selected={alertLayout === layout} onPress={() => setAlertLayout(layout)} />
          ))}
        </ControlGroup>
        <ControlGroup label="expanded">
          <OptionChip label="true" selected={alertExpanded} onPress={() => setAlertExpanded(true)} />
          <OptionChip label="false" selected={!alertExpanded} onPress={() => setAlertExpanded(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Avatar") {
    return (
      <>
        <ControlGroup label="type">
          {avatarTypes.map((type) => (
            <OptionChip key={type} label={type} selected={avatarType === type} onPress={() => setAvatarType(type)} />
          ))}
        </ControlGroup>
        <ControlGroup label="size">
          {avatarSizes.map((size) => (
            <OptionChip key={size} label={String(size)} selected={resolvedControlAvatarSize === size} onPress={() => setAvatarSize(size)} />
          ))}
        </ControlGroup>
      </>
    );
  }

  if (component === "ListItemCell") {
    return (
      <>
        <ControlGroup label="leading">
          {listItemLeadingOptions.map((leading) => (
            <OptionChip key={leading} label={leading} selected={listItemLeading === leading} onPress={() => setListItemLeading(leading)} />
          ))}
        </ControlGroup>
        <ControlGroup label="trailing">
          {listItemTrailingOptions.map((trailing) => (
            <OptionChip key={trailing} label={trailing} selected={listItemTrailing === trailing} onPress={() => setListItemTrailing(trailing)} />
          ))}
        </ControlGroup>
        <ControlGroup label="state">
          {listItemStates.map((state) => (
            <OptionChip key={state} label={state} selected={listItemState === state} onPress={() => setListItemState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="selected">
          <OptionChip label="true" selected={listItemSelected} onPress={() => setListItemSelected(true)} />
          <OptionChip label="false" selected={!listItemSelected} onPress={() => setListItemSelected(false)} />
        </ControlGroup>
        <ControlGroup label="eyebrow">
          <OptionChip label="show" selected={listItemShowEyebrow} onPress={() => setListItemShowEyebrow(true)} />
          <OptionChip label="hide" selected={!listItemShowEyebrow} onPress={() => setListItemShowEyebrow(false)} />
        </ControlGroup>
        <ControlGroup label="subtitle">
          <OptionChip label="show" selected={listItemShowSubtitle} onPress={() => setListItemShowSubtitle(true)} />
          <OptionChip label="hide" selected={!listItemShowSubtitle} onPress={() => setListItemShowSubtitle(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Badge") {
    return (
      <>
        <ControlGroup label="tone">
          {badgeTones.map((tone) => (
            <OptionChip key={tone} label={tone} selected={badgeTone === tone} onPress={() => setBadgeTone(tone)} />
          ))}
        </ControlGroup>
        <ControlGroup label="size">
          {badgeSizes.map((size) => (
            <OptionChip key={size} label={size} selected={badgeSize === size} onPress={() => setBadgeSize(size)} />
          ))}
        </ControlGroup>
        <ControlGroup label="icon">
          <OptionChip label="true" selected={badgeIcon} onPress={() => setBadgeIcon(true)} />
          <OptionChip label="false" selected={!badgeIcon} onPress={() => setBadgeIcon(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Checkbox") {
    return (
      <>
        <ControlGroup label="selected">
          <OptionChip label="true" selected={checkboxSelected} onPress={() => setCheckboxSelected(true)} />
          <OptionChip label="false" selected={!checkboxSelected} onPress={() => setCheckboxSelected(false)} />
        </ControlGroup>
        <ControlGroup label="state">
          {checkboxStates.map((state) => (
            <OptionChip key={state} label={state} selected={checkboxState === state} onPress={() => setCheckboxState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="label">
          <OptionChip label="show" selected={checkboxShowLabel} onPress={() => setCheckboxShowLabel(true)} />
          <OptionChip label="hide" selected={!checkboxShowLabel} onPress={() => setCheckboxShowLabel(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Radio") {
    return (
      <>
        <ControlGroup label="selected">
          <OptionChip label="true" selected={radioSelected} onPress={() => setRadioSelected(true)} />
          <OptionChip label="false" selected={!radioSelected} onPress={() => setRadioSelected(false)} />
        </ControlGroup>
        <ControlGroup label="state">
          {radioStates.map((state) => (
            <OptionChip key={state} label={state} selected={radioState === state} onPress={() => setRadioState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="label">
          <OptionChip label="show" selected={radioShowLabel} onPress={() => setRadioShowLabel(true)} />
          <OptionChip label="hide" selected={!radioShowLabel} onPress={() => setRadioShowLabel(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Input") {
    return (
      <>
        <ControlGroup label="state">
          {inputStates.map((state) => (
            <OptionChip key={state} label={state} selected={inputState === state} onPress={() => setInputState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="double field">
          <OptionChip label="true" selected={inputDouble} onPress={() => setInputDouble(true)} />
          <OptionChip label="false" selected={!inputDouble} onPress={() => setInputDouble(false)} />
        </ControlGroup>
        <ControlGroup label="label">
          <OptionChip label="show" selected={inputShowLabel} onPress={() => setInputShowLabel(true)} />
          <OptionChip label="hide" selected={!inputShowLabel} onPress={() => setInputShowLabel(false)} />
        </ControlGroup>
        <ControlGroup label="message">
          <OptionChip label="show" selected={inputShowMessage} onPress={() => setInputShowMessage(true)} />
          <OptionChip label="hide" selected={!inputShowMessage} onPress={() => setInputShowMessage(false)} />
        </ControlGroup>
        <ControlGroup label="clear button">
          <OptionChip label="show" selected={inputShowClearButton} onPress={() => setInputShowClearButton(true)} />
          <OptionChip label="hide" selected={!inputShowClearButton} onPress={() => setInputShowClearButton(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "TextArea") {
    return (
      <>
        <ControlGroup label="state">
          {textAreaStates.map((state) => (
            <OptionChip key={state} label={state} selected={textAreaState === state} onPress={() => setTextAreaState(state)} />
          ))}
        </ControlGroup>
        <ControlGroup label="label">
          <OptionChip label="show" selected={textAreaShowLabel} onPress={() => setTextAreaShowLabel(true)} />
          <OptionChip label="hide" selected={!textAreaShowLabel} onPress={() => setTextAreaShowLabel(false)} />
        </ControlGroup>
        <ControlGroup label="message">
          <OptionChip label="show" selected={textAreaShowMessage} onPress={() => setTextAreaShowMessage(true)} />
          <OptionChip label="hide" selected={!textAreaShowMessage} onPress={() => setTextAreaShowMessage(false)} />
        </ControlGroup>
      </>
    );
  }

  if (component === "Variant") {
    return (
      <ControlGroup label="columns">
        {variantColumnsOptions.map((columns) => (
          <OptionChip key={columns} label={String(columns)} selected={variantColumns === columns} onPress={() => setVariantColumns(columns)} />
        ))}
      </ControlGroup>
    );
  }

  if (component === "Switch") {
    return (
      <>
        <ControlGroup label="selected">
          <OptionChip label="true" selected={switchSelected} onPress={() => setSwitchSelected(true)} />
          <OptionChip label="false" selected={!switchSelected} onPress={() => setSwitchSelected(false)} />
        </ControlGroup>
        <ControlGroup label="disabled">
          <OptionChip label="true" selected={switchDisabled} onPress={() => setSwitchDisabled(true)} />
          <OptionChip label="false" selected={!switchDisabled} onPress={() => setSwitchDisabled(false)} />
        </ControlGroup>
      </>
    );
  }

  return (
    <>
      <ControlGroup label="items">
        <OptionChip label="Two" selected={segmentItemsCount === "Two"} onPress={() => setSegmentItemsCount("Two")} />
        <OptionChip label="Three" selected={segmentItemsCount === "Three"} onPress={() => setSegmentItemsCount("Three")} />
      </ControlGroup>
      <ControlGroup label="disabled third">
        <OptionChip label="true" selected={disableThird} onPress={() => setDisableThird(true)} />
        <OptionChip label="false" selected={!disableThird} onPress={() => setDisableThird(false)} />
      </ControlGroup>
    </>
  );
}

function BottomAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={styles.bottomBar}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.bottomButton, pressed && styles.bottomButtonPressed]}>
        <Text style={styles.bottomButtonText}>{label}</Text>
      </Pressable>
    </View>
  );
}

function ComponentBottomNavigation({
  value,
  onChange,
  onBack
}: {
  value: ComponentId;
  onChange: (value: ComponentId) => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.tabsBar}>
      <View style={styles.tabsSection}>
        <Text style={styles.controlLabel}>Component</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {componentItems.map((item) => (
            <OptionChip key={item.value} label={item.title} selected={value === item.value} onPress={() => onChange(item.value)} />
          ))}
        </ScrollView>
      </View>
      <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.bottomButton, pressed && styles.bottomButtonPressed]}>
        <Text style={styles.bottomButtonText}>Back to components</Text>
      </Pressable>
    </View>
  );
}

function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.controlGroup}>
      <Text style={styles.controlLabel}>{label}</Text>
      <View style={styles.optionRow}>{children}</View>
    </View>
  );
}

function OptionChip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionChip, selected && styles.optionChipSelected, pressed && styles.optionChipPressed]}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background.canvas
  },
  galleryContent: {
    width: "100%",
    ...webGalleryWidth,
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 26,
    paddingBottom: 120
  },
  componentPageContent: {
    width: "100%",
    ...webMobileWidth,
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 26,
    paddingBottom: 224
  },
  modalStoryPage: {
    flex: 1,
    width: "100%",
    ...webMobileWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 26,
    paddingBottom: 224
  },
  modalStoryButtonArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  modalStoryOpenButton: {
    width: theme.sizes.modalStoryOpenButtonWidth,
    height: theme.sizes.modalStoryOpenButtonHeight
  },
  hero: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm
  },
  componentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing.lg
  },
  previewToneToggle: {
    flexDirection: "row",
    flexShrink: 0,
    gap: theme.spacing.sm
  },
  heroTitle: {
    fontFamily: theme.typography.display.sm.fontFamily,
    fontSize: theme.typography.display.sm.fontSize,
    lineHeight: theme.typography.display.sm.lineHeight,
    fontWeight: theme.typography.display.sm.fontWeight,
    letterSpacing: theme.typography.display.sm.letterSpacing,
    color: theme.colors.content.ink
  },
  heroSubtitle: {
    ...theme.typography.body.md,
    letterSpacing: -0.08,
    color: theme.colors.content.ink
  },
  cardList: {
    gap: theme.spacing.md,
    ...(Platform.OS === "web"
      ? {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "flex-start"
        }
      : null)
  },
  componentCard: {
    gap: theme.spacing.sm,
    width: Platform.OS === "web" ? theme.sizes.storybookGalleryCardWidth : undefined,
    height: Platform.OS === "web" ? theme.sizes.storybookGalleryCardHeight : undefined,
    minHeight: 88,
    maxHeight: Platform.OS === "web" ? theme.sizes.storybookGalleryCardHeight : undefined,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvasSoft
  },
  componentCardPressed: {
    backgroundColor: theme.colors.content.primaryPale
  },
  componentCardOverflow: {
    maxHeight: undefined,
    overflow: "visible"
  },
  cardHeader: {
    minHeight: theme.spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.sm
  },
  cardTitle: {
    fontFamily: theme.typography.body.mdStrong.fontFamily,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: theme.typography.body.mdStrong.fontWeight,
    letterSpacing: -0.18,
    color: theme.colors.content.ink
  },
  cardDate: {
    ...theme.typography.body.sm,
    color: theme.colors.content.mute
  },
  previewCard: {
    minHeight: 88,
    maxHeight: Platform.OS === "web" ? 300 : undefined,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvasSoft
  },
  previewCardOverflow: {
    maxHeight: undefined,
    overflow: "visible"
  },
  previewFrame: {
    minHeight: 140,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.background.canvas
  },
  previewFrameGallery: {
    flex: 1,
    minHeight: theme.spacing[0]
  },
  previewFrameDetail: {
    minHeight: 220,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.background.canvas
  },
  previewFrameResizable: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.content.mute
  },
  previewFrameGray: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  previewFrameCalendar: {
    minHeight: theme.sizes.calendarDayStripHeight + theme.spacing.xl
  },
  previewFrameCompact: {
    backgroundColor: "transparent"
  },
  previewContent: {
    alignSelf: "stretch",
    minHeight: 140,
    alignItems: "stretch",
    justifyContent: "center",
    padding: theme.spacing["2xl"]
  },
  previewContentGallery: {
    flex: 1,
    minHeight: theme.spacing[0]
  },
  previewContentDetail: {
    minHeight: 220,
    padding: theme.spacing["2xl"]
  },
  previewContentCalendar: {
    minHeight: theme.sizes.calendarDayStripHeight,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    justifyContent: "center"
  },
  previewContentCompact: {
    padding: theme.spacing.xxs,
    justifyContent: "flex-start"
  },
  previewContentGalleryCard: {
    padding: theme.spacing.lg
  },
  previewOverflow: {
    overflow: "visible"
  },
  cardWorkoutPreviewItem: {
    alignSelf: "stretch",
    width: Platform.OS === "web" ? theme.sizes.cardWorkoutWidth : "100%"
  },
  cardPlanPreviewItem: {
    alignSelf: "stretch",
    width: Platform.OS === "web" ? theme.sizes.cardPlanWidth : "100%"
  },
  calendarDayStripPreview: {
    alignSelf: "stretch",
    minHeight: theme.sizes.calendarDayStripHeight,
    justifyContent: "center"
  },
  dividerPreviewStack: {
    alignSelf: "stretch",
    width: "100%"
  },
  dividerPreviewTop: {
    height: theme.spacing["3xl"],
    borderBottomLeftRadius: theme.radius.xl,
    borderBottomRightRadius: theme.radius.xl,
    backgroundColor: theme.colors.content.disabled
  },
  dividerPreviewBottom: {
    height: theme.spacing["3xl"],
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl
  },
  dividerPreviewCanvasSurface: {
    backgroundColor: theme.colors.background.canvas
  },
  dividerPreviewGraySurface: {
    backgroundColor: theme.colors.content.disabled
  },
  superSetPreview: {
    height: theme.sizes.modalPreviewHeight,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  superSetPreviewScaleFrame: {
    width: theme.sizes.superSetWidth * theme.sizes.superSetPreviewScale,
    height: theme.sizes.superSetHeight * theme.sizes.superSetPreviewScale,
    alignItems: "center",
    justifyContent: "center"
  },
  superSetPreviewItem: {
    transform: [{ scale: theme.sizes.superSetPreviewScale }]
  },
  calendarDayStripCard: {
    alignSelf: "stretch"
  },
  calendarDayStripEmpty: {
    minHeight: theme.spacing[12],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvasSoft
  },
  calendarDayStripEmptyText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.body
  },
  hugPreviewItem: {
    alignSelf: "center"
  },
  modalPreviewCrop: {
    width: "100%",
    height: theme.sizes.modalPreviewHeight,
    alignItems: "stretch",
    justifyContent: "flex-start",
    overflow: "hidden"
  },
  modalPreviewPanel: {
    width: "100%",
    maxWidth: "100%"
  },
  controls: {
    width: "100%",
    gap: theme.spacing.lg
  },
  controlGroup: {
    gap: theme.spacing.sm
  },
  controlLabel: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.ink
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  optionChip: {
    minHeight: theme.spacing["3xl"],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.background.canvasSoft
  },
  optionChipSelected: {
    backgroundColor: theme.colors.content.primary
  },
  optionChipPressed: {
    backgroundColor: theme.colors.content.primaryActive
  },
  optionText: {
    ...theme.typography.body.smStrong,
    color: theme.colors.content.body
  },
  optionTextSelected: {
    color: theme.colors.content.onPrimary
  },
  bottomBar: {
    position: "absolute",
    left: theme.spacing[0],
    right: theme.spacing[0],
    bottom: theme.spacing[0],
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing["2xl"],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.background.canvasSoft,
    backgroundColor: theme.colors.background.canvas
  },
  bottomButton: {
    width: "100%",
    ...webActionWidth,
    minHeight: theme.sizes.buttonMdHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.content.primary
  },
  bottomButtonPressed: {
    backgroundColor: theme.colors.content.primaryActive
  },
  bottomButtonText: {
    ...theme.typography.button.md,
    letterSpacing: 0.08,
    color: theme.colors.content.inkDeep
  },
  tabsBar: {
    position: "absolute",
    left: theme.spacing[0],
    right: theme.spacing[0],
    bottom: theme.spacing[0],
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing["2xl"],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.background.canvasSoft,
    backgroundColor: theme.colors.background.canvas
  },
  tabsSection: {
    width: "100%",
    ...webActionWidth,
    gap: theme.spacing.sm
  },
  tabsContent: {
    gap: theme.spacing.sm
  }
});
