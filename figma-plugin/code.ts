type ColorTokenName =
  | "color/brand/primary"
  | "color/brand/soft"
  | "color/brand/contrast"
  | "color/background/app"
  | "color/background/surface"
  | "color/background/surface-soft"
  | "color/background/surface-muted"
  | "color/text/primary"
  | "color/text/secondary"
  | "color/text/muted"
  | "color/text/inverse"
  | "color/text/disabled"
  | "color/border/default"
  | "color/border/active"
  | "color/status/success"
  | "color/status/success-soft"
  | "color/status/warning"
  | "color/status/warning-soft"
  | "color/status/error"
  | "color/status/error-soft"
  | "color/status/neutral"
  | "color/workout/planned"
  | "color/workout/in-progress"
  | "color/workout/completed"
  | "color/workout/cancelled";

type NumberTokenName =
  | "spacing/1"
  | "spacing/2"
  | "spacing/3"
  | "spacing/4"
  | "spacing/5"
  | "spacing/6"
  | "spacing/8"
  | "spacing/10"
  | "spacing/12"
  | "radius/s"
  | "radius/m"
  | "radius/l"
  | "radius/xl"
  | "radius/pill";

type TextStyleName =
  | "Typography / Display / Title"
  | "Typography / Heading / H1"
  | "Typography / Heading / H2"
  | "Typography / Heading / H3"
  | "Typography / Body / Regular"
  | "Typography / Body / Strong"
  | "Typography / Body / Small"
  | "Typography / Label / Medium"
  | "Typography / Label / Small"
  | "Typography / Button / Medium"
  | "Typography / Number / Large"
  | "Typography / Number / Medium";

type TokenStore = {
  colors: Map<string, Variable>;
  numbers: Map<string, Variable>;
  textStyles: Map<TextStyleName, TextStyle>;
};

type ComponentSetSpec = {
  name: string;
  description: string;
  properties: string[];
  set: ComponentSetNode;
};

const PAGE_NAME = "Кит v0.3 Clean";
const CONTENT_WIDTH = 1280;
const SECTION_GAP = 120;
const GROUP_GAP = 80;
const GRID_GAP = 24;

const fonts = {
  regular: { family: "Inter", style: "Regular" } as FontName,
  medium: { family: "Inter", style: "Medium" } as FontName,
  semiBold: { family: "Inter", style: "Semi Bold" } as FontName,
  bold: { family: "Inter", style: "Bold" } as FontName
};

const colorFallbacks: Record<ColorTokenName, string> = {
  "color/brand/primary": "#0B5E64",
  "color/brand/soft": "#E4F4F2",
  "color/brand/contrast": "#FFFFFF",
  "color/background/app": "#F7F8F5",
  "color/background/surface": "#FFFFFF",
  "color/background/surface-soft": "#EEF7F5",
  "color/background/surface-muted": "#F2F4F1",
  "color/text/primary": "#102326",
  "color/text/secondary": "#68777A",
  "color/text/muted": "#9AA5A7",
  "color/text/inverse": "#FFFFFF",
  "color/text/disabled": "#B9C3C4",
  "color/border/default": "#DDE6E3",
  "color/border/active": "#0B5E64",
  "color/status/success": "#1E9E69",
  "color/status/success-soft": "#E6F7EF",
  "color/status/warning": "#E69B2E",
  "color/status/warning-soft": "#FFF3DF",
  "color/status/error": "#DF4B4B",
  "color/status/error-soft": "#FDEAEA",
  "color/status/neutral": "#E9EEEC",
  "color/workout/planned": "#E4F4F2",
  "color/workout/in-progress": "#FFF3DF",
  "color/workout/completed": "#E6F7EF",
  "color/workout/cancelled": "#FDEAEA"
};

const numberFallbacks: Record<NumberTokenName, number> = {
  "spacing/1": 4,
  "spacing/2": 8,
  "spacing/3": 12,
  "spacing/4": 16,
  "spacing/5": 20,
  "spacing/6": 24,
  "spacing/8": 32,
  "spacing/10": 40,
  "spacing/12": 48,
  "radius/s": 12,
  "radius/m": 16,
  "radius/l": 24,
  "radius/xl": 32,
  "radius/pill": 999
};

const textStyleDefinitions: Record<
  TextStyleName,
  { font: FontName; fontSize: number; lineHeight: number; description: string }
> = {
  "Typography / Display / Title": {
    font: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    description: "Large screen and kit section titles."
  },
  "Typography / Heading / H1": {
    font: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    description: "Primary component headings and large values."
  },
  "Typography / Heading / H2": {
    font: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
    description: "Card titles and exercise names."
  },
  "Typography / Heading / H3": {
    font: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    description: "Compact titles and row labels."
  },
  "Typography / Body / Regular": {
    font: fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    description: "Default body copy."
  },
  "Typography / Body / Strong": {
    font: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    description: "Important body text."
  },
  "Typography / Body / Small": {
    font: fonts.regular,
    fontSize: 14,
    lineHeight: 18,
    description: "Secondary copy and metadata."
  },
  "Typography / Label / Medium": {
    font: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    description: "Badges, captions, helper text."
  },
  "Typography / Label / Small": {
    font: fonts.medium,
    fontSize: 10,
    lineHeight: 14,
    description: "Dense labels."
  },
  "Typography / Button / Medium": {
    font: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    description: "Button labels."
  },
  "Typography / Number / Large": {
    font: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    description: "Time and large metrics."
  },
  "Typography / Number / Medium": {
    font: fonts.bold,
    fontSize: 18,
    lineHeight: 22,
    description: "Weight and reps values."
  }
};

const hexToRgb = (hex: string): RGB => {
  const raw = hex.replace("#", "");
  const normalized =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : raw;

  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
};

const rgbToHex = (rgb: RGB) =>
  `#${[rgb.r, rgb.g, rgb.b]
    .map((value) =>
      Math.round(Math.max(0, Math.min(1, value)) * 255)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase()
    )
    .join("")}`;

const toPaint = (hex: string, variable?: Variable): SolidPaint => {
  const paint: SolidPaint = { type: "SOLID", color: hexToRgb(hex) };
  const binder = (figma.variables as unknown as {
    setBoundVariableForPaint?: (paint: SolidPaint, field: "color", variable: Variable) => SolidPaint;
  }).setBoundVariableForPaint;

  return variable && binder ? binder(paint, "color", variable) : paint;
};

const getModeValue = async (variable: Variable): Promise<VariableValue | undefined> => {
  const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);
  const modeId = collection?.defaultModeId ?? Object.keys(variable.valuesByMode)[0];
  return modeId ? variable.valuesByMode[modeId] : undefined;
};

const ensureTextStyles = async () => {
  const localStyles = await figma.getLocalTextStylesAsync();
  const localByName = new Map(localStyles.map((style) => [style.name, style]));
  const textStyles = new Map<TextStyleName, TextStyle>();

  for (const [name, definition] of Object.entries(textStyleDefinitions) as [
    TextStyleName,
    typeof textStyleDefinitions[TextStyleName]
  ][]) {
    const style = localByName.get(name) ?? figma.createTextStyle();
    style.name = name;
    style.fontName = definition.font;
    style.fontSize = definition.fontSize;
    style.lineHeight = { unit: "PIXELS", value: definition.lineHeight };
    style.letterSpacing = { unit: "PERCENT", value: 0 };
    style.description = definition.description;
    textStyles.set(name, style);
  }

  return textStyles;
};

const getTokenStore = async (): Promise<TokenStore> => {
  const colors = new Map<string, Variable>();
  const numbers = new Map<string, Variable>();
  const variables = await figma.variables.getLocalVariablesAsync();

  for (const variable of variables) {
    if (variable.resolvedType === "COLOR") {
      colors.set(variable.name, variable);
    }

    if (variable.resolvedType === "FLOAT") {
      numbers.set(variable.name, variable);
    }
  }

  return { colors, numbers, textStyles: await ensureTextStyles() };
};

const colorHex = async (store: TokenStore, token: ColorTokenName) => {
  const variable = store.colors.get(token);
  const value = variable ? await getModeValue(variable) : undefined;

  if (value && typeof value === "object" && "r" in value && "g" in value && "b" in value) {
    return rgbToHex(value);
  }

  return colorFallbacks[token];
};

const numberValue = async (store: TokenStore, token: NumberTokenName) => {
  const variable = store.numbers.get(token);
  const value = variable ? await getModeValue(variable) : undefined;
  return typeof value === "number" ? value : numberFallbacks[token];
};

const applyFill = async (node: SceneNode & MinimalFillsMixin, store: TokenStore, token: ColorTokenName) => {
  node.fills = [toPaint(await colorHex(store, token), store.colors.get(token))];
};

const applyStroke = async (node: SceneNode & MinimalStrokesMixin, store: TokenStore, token: ColorTokenName) => {
  node.strokes = [toPaint(await colorHex(store, token), store.colors.get(token))];
};

const text = async (
  characters: string,
  options: {
    store: TokenStore;
    style?: TextStyleName;
    color?: ColorTokenName;
    align?: "LEFT" | "CENTER";
  }
) => {
  const styleName = options.style ?? "Typography / Body / Regular";
  const definition = textStyleDefinitions[styleName];
  const node = figma.createText();
  node.fontName = definition.font;
  node.fontSize = definition.fontSize;
  node.lineHeight = { unit: "PIXELS", value: definition.lineHeight };
  node.textAlignHorizontal = options.align ?? "LEFT";
  node.characters = characters;

  const style = options.store.textStyles.get(styleName);
  if (style) {
    await node.setTextStyleIdAsync(style.id);
  }

  await applyFill(node, options.store, options.color ?? "color/text/primary");
  return node;
};

const frame = (name: string, direction: "HORIZONTAL" | "VERTICAL", gap = 16) => {
  const node = figma.createFrame();
  node.name = name;
  node.layoutMode = direction;
  node.itemSpacing = gap;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.fills = [];
  return node;
};

const setPadding = (node: FrameNode | ComponentNode | ComponentSetNode, value: number) => {
  node.paddingTop = value;
  node.paddingRight = value;
  node.paddingBottom = value;
  node.paddingLeft = value;
};

const setPaddingXY = (node: FrameNode | ComponentNode, x: number, y: number) => {
  node.paddingLeft = x;
  node.paddingRight = x;
  node.paddingTop = y;
  node.paddingBottom = y;
};

const cardChrome = async (node: FrameNode | ComponentNode, store: TokenStore, selected = false) => {
  await applyFill(node, store, "color/background/surface");
  await applyStroke(node, store, selected ? "color/border/active" : "color/border/default");
  node.strokeWeight = 1;
  node.cornerRadius = await numberValue(store, "radius/m");
};

const component = async (name: string, build: (node: ComponentNode) => Promise<void>) => {
  const node = figma.createComponent();
  node.name = name;
  node.layoutMode = "VERTICAL";
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.itemSpacing = 12;
  node.fills = [];
  await build(node);
  return node;
};

const variantName = (properties: Record<string, string>) =>
  Object.entries(properties)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");

const componentSet = (name: string, parent: FrameNode, components: ComponentNode[]) => {
  const set = figma.combineAsVariants(components, parent);
  set.name = name;
  set.layoutMode = "HORIZONTAL";
  set.layoutWrap = "WRAP";
  set.itemSpacing = GRID_GAP;
  set.counterAxisSpacing = GRID_GAP;
  return set;
};

const buttonColors = (variant: string): [ColorTokenName, ColorTokenName] => {
  if (variant === "Secondary") return ["color/brand/soft", "color/brand/primary"];
  if (variant === "Ghost") return ["color/background/surface-soft", "color/text/primary"];
  if (variant === "Danger") return ["color/status/error-soft", "color/status/error"];
  return ["color/brand/primary", "color/brand/contrast"];
};

const makeButton = async (store: TokenStore, props: Record<string, string>) => {
  const [bg, fg] = buttonColors(props.variant);
  const height = props.size === "S" ? 40 : props.size === "L" ? 56 : 48;
  const width = props.icon === "None" ? 172 : 196;

  return component(variantName(props), async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    node.itemSpacing = await numberValue(store, "spacing/2");
    node.resizeWithoutConstraints(width, height);
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.cornerRadius = await numberValue(store, "radius/m");
    setPaddingXY(node, await numberValue(store, "spacing/4"), await numberValue(store, "spacing/3"));
    await applyFill(node, store, bg);
    node.opacity = props.state === "Disabled" ? 0.48 : 1;

    if (props.state === "Pressed") {
      await applyStroke(node, store, "color/border/active");
      node.strokeWeight = 1;
    }

    if (props.icon === "Left") {
      node.appendChild(await text("+", { store, style: "Typography / Button / Medium", color: fg }));
    }
    node.appendChild(
      await text(props.state === "Loading" ? "Загрузка" : "Начать", {
        store,
        style: "Typography / Button / Medium",
        color: fg,
        align: "CENTER"
      })
    );
    if (props.icon === "Right") {
      node.appendChild(await text("→", { store, style: "Typography / Button / Medium", color: fg }));
    }
  });
};

const makeIconButton = async (store: TokenStore, props: Record<string, string>) => {
  const bg: ColorTokenName =
    props.variant === "Danger"
      ? "color/status/error-soft"
      : props.variant === "Soft"
        ? "color/brand/soft"
        : props.variant === "Ghost"
          ? "color/background/surface-soft"
          : "color/background/surface";
  const fg: ColorTokenName = props.variant === "Danger" ? "color/status/error" : "color/brand/primary";
  const size = props.size === "S" ? 40 : props.size === "L" ? 48 : 44;

  return component(variantName(props), async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    node.resizeWithoutConstraints(size, size);
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.cornerRadius = await numberValue(store, "radius/m");
    await applyFill(node, store, bg);
    await applyStroke(node, store, props.state === "Pressed" ? "color/border/active" : "color/border/default");
    node.strokeWeight = props.variant === "Default" || props.state === "Pressed" ? 1 : 0;
    node.opacity = props.state === "Disabled" ? 0.48 : 1;
    node.appendChild(await text("+", { store, style: "Typography / Heading / H2", color: fg, align: "CENTER" }));
  });
};

const makeBadge = async (store: TokenStore, props: Record<string, string>) => {
  const palette: Record<string, [string, ColorTokenName, ColorTokenName]> = {
    Planned: ["План", "color/workout/planned", "color/brand/primary"],
    InProgress: ["Идет", "color/workout/in-progress", "color/status/warning"],
    Completed: ["Выполнено", "color/workout/completed", "color/status/success"],
    Cancelled: ["Отменено", "color/workout/cancelled", "color/status/error"],
    Moved: ["Перенос", "color/background/surface-muted", "color/text/secondary"],
    Positive: ["+8%", "color/status/success-soft", "color/status/success"],
    Negative: ["-4%", "color/status/error-soft", "color/status/error"],
    Neutral: ["Нейтрально", "color/status/neutral", "color/text/secondary"]
  };
  const [label, bg, fg] = palette[props.type];

  return component(variantName(props), async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    node.cornerRadius = await numberValue(store, "radius/pill");
    setPaddingXY(node, await numberValue(store, props.size === "S" ? "spacing/2" : "spacing/3"), await numberValue(store, "spacing/2"));
    await applyFill(node, store, bg);
    node.appendChild(await text(label, { store, style: "Typography / Label / Medium", color: fg }));
  });
};

const makeInput = async (store: TokenStore, props: Record<string, string>) => {
  const disabled = props.state === "Disabled";
  const error = props.state === "Error";
  const focused = props.state === "Focused";
  const height = props.type === "Textarea" ? 112 : 72;

  return component(variantName(props), async (node) => {
    node.itemSpacing = await numberValue(store, "spacing/2");
    node.resizeWithoutConstraints(320, props.helper === "True" ? height + 28 : height);
    node.counterAxisSizingMode = "FIXED";
    node.opacity = disabled ? 0.48 : 1;
    node.appendChild(await text(props.type === "Number" ? "Вес" : "Комментарий", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    const field = frame("Field", "HORIZONTAL", await numberValue(store, "spacing/2"));
    field.resizeWithoutConstraints(320, props.type === "Textarea" ? 80 : 48);
    field.primaryAxisSizingMode = "FIXED";
    field.counterAxisSizingMode = "FIXED";
    field.primaryAxisAlignItems = props.type === "Textarea" ? "MIN" : "CENTER";
    field.counterAxisAlignItems = "CENTER";
    field.cornerRadius = await numberValue(store, "radius/m");
    setPaddingXY(field, await numberValue(store, "spacing/4"), await numberValue(store, "spacing/3"));
    await applyFill(field, store, "color/background/surface");
    await applyStroke(field, store, error ? "color/status/error" : focused ? "color/border/active" : "color/border/default");
    const value = props.state === "Filled" ? (props.type === "Number" ? "14 кг" : "Следить за техникой") : "Введите значение";
    field.appendChild(await text(value, { store, style: props.type === "Number" ? "Typography / Number / Medium" : "Typography / Body / Regular", color: props.state === "Filled" ? "color/text/primary" : "color/text/muted" }));
    node.appendChild(field);
    if (props.helper === "True") {
      node.appendChild(await text(error ? "Проверьте значение" : "Подсказка для тренера", { store, style: "Typography / Label / Medium", color: error ? "color/status/error" : "color/text/muted" }));
    }
  });
};

const makeCheckbox = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.counterAxisAlignItems = "CENTER";
    node.itemSpacing = await numberValue(store, "spacing/3");
    node.opacity = props.state === "Disabled" ? 0.48 : 1;
    const box = frame("Box", "HORIZONTAL", 0);
    box.resizeWithoutConstraints(32, 32);
    box.primaryAxisSizingMode = "FIXED";
    box.counterAxisSizingMode = "FIXED";
    box.primaryAxisAlignItems = "CENTER";
    box.counterAxisAlignItems = "CENTER";
    box.cornerRadius = await numberValue(store, "radius/s");
    await applyFill(box, store, props.state === "Checked" ? "color/status/success" : "color/background/surface");
    await applyStroke(box, store, props.state === "Error" ? "color/status/error" : props.state === "Checked" ? "color/status/success" : "color/border/default");
    if (props.state === "Checked") {
      box.appendChild(await text("✓", { store, style: "Typography / Heading / H3", color: "color/text/inverse", align: "CENTER" }));
    }
    node.appendChild(box);
    node.appendChild(await text("Выполнено", { store, style: "Typography / Body / Strong" }));
  });

const makeSegmentedControl = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    const labels = props.items === "Two" ? ["День", "Неделя"] : ["День", "Неделя", "Месяц"];
    node.layoutMode = "HORIZONTAL";
    node.itemSpacing = await numberValue(store, "spacing/1");
    node.resizeWithoutConstraints(props.items === "Two" ? 220 : 320, 48);
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.cornerRadius = await numberValue(store, "radius/m");
    setPadding(node, await numberValue(store, "spacing/1"));
    await applyFill(node, store, "color/background/surface-muted");
    const selectedIndex = props.state === "SecondSelected" ? 1 : props.state === "ThirdSelected" ? 2 : 0;
    labels.forEach(async (label, index) => {
      const item = frame(label, "HORIZONTAL", 0);
      item.resizeWithoutConstraints(props.items === "Two" ? 102 : 101, 40);
      item.primaryAxisSizingMode = "FIXED";
      item.counterAxisSizingMode = "FIXED";
      item.primaryAxisAlignItems = "CENTER";
      item.counterAxisAlignItems = "CENTER";
      item.cornerRadius = await numberValue(store, "radius/s");
      if (index === selectedIndex) {
        await applyFill(item, store, "color/background/surface");
      }
      item.appendChild(await text(label, { store, style: "Typography / Label / Medium", color: index === selectedIndex ? "color/text/primary" : "color/text/secondary", align: "CENTER" }));
      node.appendChild(item);
    });
  });

const makeCard = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    const padding = props.density === "Compact" ? "spacing/3" : props.density === "Large" ? "spacing/6" : "spacing/4";
    node.resizeWithoutConstraints(280, props.density === "Compact" ? 104 : props.density === "Large" ? 156 : 128);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, padding as NumberTokenName));
    await cardChrome(node, store, props.state === "Selected");
    node.opacity = props.state === "Disabled" ? 0.48 : 1;
    if (props.state === "Pressed") {
      await applyFill(node, store, "color/background/surface-soft");
    }
    node.appendChild(await text("Card title", { store, style: "Typography / Heading / H3" }));
    node.appendChild(await text("Reusable surface for trainer workflows.", { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
  });

const makeCalendarDay = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    const selected = props.state === "Selected";
    const disabled = props.state === "Disabled";
    node.layoutMode = "VERTICAL";
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    node.itemSpacing = await numberValue(store, "spacing/1");
    node.resizeWithoutConstraints(56, 72);
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.cornerRadius = await numberValue(store, "radius/m");
    await applyFill(node, store, selected ? "color/brand/primary" : props.state === "Today" ? "color/brand/soft" : "color/background/surface");
    node.opacity = disabled ? 0.48 : 1;
    node.appendChild(await text("Вт", { store, style: "Typography / Label / Medium", color: selected ? "color/text/inverse" : "color/text/secondary", align: "CENTER" }));
    node.appendChild(await text("14", { store, style: "Typography / Number / Medium", color: selected ? "color/text/inverse" : "color/text/primary", align: "CENTER" }));
    if (props.state === "HasWorkouts") {
      const dot = figma.createEllipse();
      dot.name = "Workout indicator";
      dot.resizeWithoutConstraints(6, 6);
      await applyFill(dot, store, "color/brand/primary");
      node.appendChild(dot);
    }
  });

const makeCalendarDayStrip = async (store: TokenStore) =>
  component("CalendarDayStrip / Week", async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.itemSpacing = await numberValue(store, "spacing/2");
    for (const state of ["Default", "Today", "Selected", "HasWorkouts", "Default", "Default", "Disabled"]) {
      node.appendChild((await makeCalendarDay(store, { state })).createInstance());
    }
  });

const makeCalendarSlot = async (store: TokenStore, props: Record<string, string>) => {
  const active = props.status === "InProgress";
  const palette: Record<string, [ColorTokenName, ColorTokenName, string]> = {
    Free: ["color/background/surface", "color/text/secondary", "Свободно"],
    Planned: ["color/workout/planned", "color/brand/primary", "Ноги и спина"],
    InProgress: ["color/brand/primary", "color/text/inverse", "Идет сейчас"],
    Completed: ["color/workout/completed", "color/status/success", "Завершено"],
    Cancelled: ["color/workout/cancelled", "color/status/error", "Отменено"],
    Moved: ["color/background/surface-muted", "color/text/secondary", "Перенесено"]
  };
  const [bg, fg, title] = palette[props.status];
  return component(variantName(props), async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.counterAxisAlignItems = "CENTER";
    node.itemSpacing = await numberValue(store, "spacing/4");
    node.resizeWithoutConstraints(360, 76);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    node.cornerRadius = await numberValue(store, "radius/m");
    await applyFill(node, store, bg);
    node.appendChild(await text("12:00", { store, style: "Typography / Body / Strong", color: fg }));
    const copy = frame("Copy", "VERTICAL", 2);
    copy.appendChild(await text(title, { store, style: "Typography / Body / Strong", color: active ? "color/text/inverse" : "color/text/primary" }));
    copy.appendChild(await text("Илья Соколов", { store, style: "Typography / Label / Medium", color: active ? "color/brand/soft" : "color/text/secondary" }));
    node.appendChild(copy);
  });
};

const makeClientCard = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    node.layoutMode = "HORIZONTAL";
    node.counterAxisAlignItems = "CENTER";
    node.itemSpacing = await numberValue(store, "spacing/4");
    node.resizeWithoutConstraints(360, 112);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    await cardChrome(node, store, props.state === "Selected");
    if (props.state === "Warning") {
      await applyStroke(node, store, "color/status/warning");
    }
    const avatar = figma.createEllipse();
    avatar.name = "Avatar";
    avatar.resizeWithoutConstraints(56, 56);
    await applyFill(avatar, store, "color/brand/soft");
    node.appendChild(avatar);
    const copy = frame("Copy", "VERTICAL", 6);
    copy.layoutGrow = 1;
    copy.appendChild(await text("Анна Морозова", { store, style: "Typography / Heading / H3" }));
    copy.appendChild(await text(props.state === "NoWorkout" ? "Нет ближайшей тренировки" : "Силовая база и осанка", { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
    copy.appendChild(
      await text(props.state === "Warning" ? "Пропустила 2 занятия" : props.state === "WithNextWorkout" ? "Сегодня 09:30" : "92% посещаемость", {
        store,
        style: "Typography / Label / Medium",
        color: props.state === "Warning" ? "color/status/warning" : "color/text/muted"
      })
    );
    node.appendChild(copy);
  });

const makeStatsBlock = async (store: TokenStore, props: Record<string, string>) => {
  const palette: Record<string, [ColorTokenName, string]> = {
    Default: ["color/background/surface", "86%"],
    Positive: ["color/status/success-soft", "+8%"],
    Negative: ["color/status/error-soft", "-4%"],
    Empty: ["color/background/surface-muted", "Нет данных"]
  };
  const [bg, value] = palette[props.state];
  return component(variantName(props), async (node) => {
    node.resizeWithoutConstraints(220, 112);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    node.cornerRadius = await numberValue(store, "radius/m");
    await applyFill(node, store, bg);
    node.appendChild(await text("Посещаемость", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    node.appendChild(await text(value, { store, style: "Typography / Number / Large" }));
  });
};

const makeGoalBlock = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    node.resizeWithoutConstraints(320, 128);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    await cardChrome(node, store);
    node.appendChild(await text("Цель", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    node.appendChild(await text(props.state === "Empty" ? "Не задана" : "Силовая база и осанка", { store, style: "Typography / Heading / H3" }));
    if (props.state === "WithLimitations") {
      node.appendChild(await text("Ограничение: не форсировать плечо.", { store, style: "Typography / Body / Small", color: "color/status/warning" }));
    }
  });

const makeWorkoutCard = async (store: TokenStore, props: Record<string, string>) => {
  const badgeType = props.status === "InProgress" ? "InProgress" : props.status;
  return component(variantName(props), async (node) => {
    node.resizeWithoutConstraints(props.density === "Compact" ? 300 : 360, props.density === "Compact" ? 124 : 160);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    await cardChrome(node, store);
    const top = frame("Top", "HORIZONTAL", await numberValue(store, "spacing/3"));
    top.resizeWithoutConstraints(props.density === "Compact" ? 268 : 328, 1);
    top.primaryAxisSizingMode = "FIXED";
    const copy = frame("Copy", "VERTICAL", 4);
    copy.layoutGrow = 1;
    copy.appendChild(await text("09:30", { store, style: "Typography / Number / Large", color: "color/brand/primary" }));
    copy.appendChild(await text("Верх тела", { store, style: "Typography / Heading / H2" }));
    top.appendChild(copy);
    top.appendChild((await makeBadge(store, { type: badgeType, size: "M" })).createInstance());
    node.appendChild(top);
    node.appendChild(await text("6 упражнений · 55 мин", { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
  });
};

const makeSetRow = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    const completed = props.state === "Completed";
    const error = props.state === "Error";
    const disabled = props.state === "Disabled";
    node.resizeWithoutConstraints(360, props.comment === "True" ? 112 : 72);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/3"));
    node.itemSpacing = await numberValue(store, "spacing/2");
    node.cornerRadius = await numberValue(store, "radius/m");
    node.opacity = disabled ? 0.48 : 1;
    await applyFill(node, store, completed ? "color/status/success-soft" : error ? "color/status/error-soft" : "color/background/surface");
    await applyStroke(node, store, completed ? "color/status/success" : error ? "color/status/error" : "color/border/default");
    const row = frame("Row", "HORIZONTAL", await numberValue(store, "spacing/3"));
    row.counterAxisAlignItems = "CENTER";
    row.appendChild(await text("1", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    row.appendChild(await metricPill(store, "Вес", props.state === "Empty" ? "0 кг" : "14 кг"));
    row.appendChild(await metricPill(store, "Повт.", props.state === "Empty" ? "0" : "10"));
    row.appendChild(await checkboxBox(store, completed, error));
    node.appendChild(row);
    if (props.comment === "True") {
      node.appendChild(await text("Комментарий: оставить вес и добрать повторения.", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    }
  });

const metricPill = async (store: TokenStore, label: string, value: string) => {
  const node = frame(label, "VERTICAL", 2);
  node.resizeWithoutConstraints(112, 48);
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.cornerRadius = await numberValue(store, "radius/s");
  await applyFill(node, store, "color/background/surface-soft");
  node.appendChild(await text(label, { store, style: "Typography / Label / Small", color: "color/text/secondary" }));
  node.appendChild(await text(value, { store, style: "Typography / Number / Medium" }));
  return node;
};

const checkboxBox = async (store: TokenStore, checked: boolean, error = false) => {
  const node = frame("Checkbox", "HORIZONTAL", 0);
  node.resizeWithoutConstraints(32, 32);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.cornerRadius = await numberValue(store, "radius/s");
  await applyFill(node, store, checked ? "color/status/success" : "color/background/surface");
  await applyStroke(node, store, error ? "color/status/error" : checked ? "color/status/success" : "color/border/default");
  if (checked) {
    node.appendChild(await text("✓", { store, style: "Typography / Heading / H3", color: "color/text/inverse", align: "CENTER" }));
  }
  return node;
};

const makePreviousResult = async (store: TokenStore, props: Record<string, string>) => {
  const map: Record<string, [string, string, ColorTokenName, ColorTokenName]> = {
    Positive: ["+2 кг к прошлому", "7 мая · объем 684 кг", "color/status/success-soft", "color/status/success"],
    Negative: ["-2 повтора", "Нужен легче старт", "color/status/error-soft", "color/status/error"],
    Neutral: ["14 кг x 9", "7 мая · объем 684 кг", "color/background/surface-soft", "color/text/primary"],
    NoData: ["Нет данных", "История появится после занятия", "color/background/surface-muted", "color/text/secondary"]
  };
  const [value, meta, bg, valueColor] = map[props.state];
  return component(variantName(props), async (node) => {
    node.resizeWithoutConstraints(300, 96);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    node.cornerRadius = await numberValue(store, "radius/m");
    await applyFill(node, store, bg);
    node.appendChild(await text("Прошлый результат", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    node.appendChild(await text(value, { store, style: "Typography / Heading / H2", color: valueColor }));
    node.appendChild(await text(meta, { store, style: "Typography / Label / Medium", color: "color/text/muted" }));
  });
};

const makeProgressBadge = async (store: TokenStore, props: Record<string, string>) => {
  const type = props.direction === "Positive" ? "Positive" : props.direction === "Negative" ? "Negative" : "Neutral";
  return makeBadge(store, { type, size: props.size });
};

const makeExerciseCard = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    const collapsed = props.state === "Collapsed";
    const completed = props.state === "Completed";
    const error = props.state === "Error";
    node.resizeWithoutConstraints(392, collapsed ? 132 : props.comment === "True" ? 448 : 388);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    await cardChrome(node, store, props.state === "Active");
    if (completed) await applyFill(node, store, "color/status/success-soft");
    if (error) await applyStroke(node, store, "color/status/error");
    node.appendChild(await text("Жим гантелей лежа", { store, style: "Typography / Heading / H2" }));
    node.appendChild(await text("Грудь · трицепс", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    if (!collapsed) {
      node.appendChild((await makePreviousResult(store, { state: props.progress === "None" ? "Neutral" : props.progress })).createInstance());
      node.appendChild((await makeSetRow(store, { state: completed ? "Completed" : "Filled", comment: "False" })).createInstance());
      node.appendChild((await makeSetRow(store, { state: "Empty", comment: "False" })).createInstance());
      if (props.comment === "True") {
        node.appendChild(await text("Комментарий: не проваливать локти ниже комфортной глубины.", { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
      }
      node.appendChild((await makeButton(store, { variant: "Secondary", size: "M", state: "Default", icon: "None" })).createInstance());
      node.appendChild(await checkboxBox(store, completed, error));
    }
  });

const makeWorkoutSummary = async (store: TokenStore, props: Record<string, string>) =>
  component(variantName(props), async (node) => {
    node.resizeWithoutConstraints(360, 136);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    await cardChrome(node, store);
    if (props.state === "Error") await applyStroke(node, store, "color/status/error");
    node.appendChild(await text(props.state === "WithPdf" ? "Итоги + PDF" : "Тренировка", { store, style: "Typography / Label / Medium", color: "color/text/secondary" }));
    node.appendChild(await text("Верх тела", { store, style: "Typography / Heading / H1" }));
    node.appendChild((await makeBadge(store, { type: props.state === "Completed" ? "Completed" : props.state === "Error" ? "Negative" : "InProgress", size: "M" })).createInstance());
  });

const makePdfBlock = async (store: TokenStore, name: string) =>
  component(name, async (node) => {
    node.resizeWithoutConstraints(420, name === "PdfExerciseRow" ? 72 : 120);
    node.counterAxisSizingMode = "FIXED";
    setPadding(node, await numberValue(store, "spacing/4"));
    await cardChrome(node, store);
    node.appendChild(await text(name, { store, style: "Typography / Heading / H3" }));
    node.appendChild(await text("Printable summary content for client handoff.", { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
  });

const setBlock = async (
  parent: FrameNode,
  store: TokenStore,
  title: string,
  description: string,
  properties: string[],
  set: ComponentSetNode
): Promise<ComponentSetSpec> => {
  const block = frame(title, "VERTICAL", await numberValue(store, "spacing/4"));
  block.resizeWithoutConstraints(CONTENT_WIDTH, 1);
  block.counterAxisSizingMode = "FIXED";
  block.appendChild(await text(title, { store, style: "Typography / Heading / H2" }));
  block.appendChild(await text(description, { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
  block.appendChild(await text(`Properties: ${properties.join(", ")}`, { store, style: "Typography / Label / Medium", color: "color/text/muted" }));
  block.appendChild(set);
  parent.appendChild(block);
  return { name: title, description, properties, set };
};

const section = async (store: TokenStore, title: string, description: string) => {
  const node = frame(title, "VERTICAL", GROUP_GAP);
  node.resizeWithoutConstraints(CONTENT_WIDTH, 1);
  node.counterAxisSizingMode = "FIXED";
  const header = frame(`${title} Header`, "VERTICAL", await numberValue(store, "spacing/2"));
  header.appendChild(await text(title, { store, style: "Typography / Display / Title" }));
  header.appendChild(await text(description, { store, style: "Typography / Body / Regular", color: "color/text/secondary" }));
  node.appendChild(header);
  return node;
};

const buildCover = async (store: TokenStore) => {
  const node = await section(store, "00 Cover", "Clean v0.3 design-system kit for the trainer mobile app.");
  const card = frame("Cover Card", "VERTICAL", await numberValue(store, "spacing/4"));
  card.resizeWithoutConstraints(CONTENT_WIDTH, 240);
  card.counterAxisSizingMode = "FIXED";
  card.primaryAxisSizingMode = "FIXED";
  setPadding(card, await numberValue(store, "spacing/8"));
  card.cornerRadius = await numberValue(store, "radius/xl");
  await applyFill(card, store, "color/brand/primary");
  card.appendChild(await text("Trainer App Kit", { store, style: "Typography / Display / Title", color: "color/brand/contrast" }));
  card.appendChild(await text("v0.3 Clean · Variables, text styles, component sets, and screen examples", { store, style: "Typography / Body / Regular", color: "color/brand/soft" }));
  node.appendChild(card);
  return node;
};

const buildFoundations = async (store: TokenStore) => {
  const node = await section(store, "01 Foundations", "Source tokens, text styles, spacing, radius, touch targets, and usage notes.");
  const colorGrid = frame("Color tokens", "HORIZONTAL", await numberValue(store, "spacing/4"));
  colorGrid.layoutWrap = "WRAP";
  colorGrid.resizeWithoutConstraints(CONTENT_WIDTH, 1);
  colorGrid.counterAxisSizingMode = "FIXED";
  for (const token of Object.keys(colorFallbacks) as ColorTokenName[]) {
    const swatch = frame(token, "VERTICAL", await numberValue(store, "spacing/2"));
    swatch.resizeWithoutConstraints(190, 118);
    swatch.counterAxisSizingMode = "FIXED";
    setPadding(swatch, await numberValue(store, "spacing/3"));
    await cardChrome(swatch, store);
    const chip = figma.createRectangle();
    chip.name = token;
    chip.resizeWithoutConstraints(166, 42);
    chip.cornerRadius = await numberValue(store, "radius/s");
    await applyFill(chip, store, token);
    swatch.appendChild(chip);
    swatch.appendChild(await text(token, { store, style: "Typography / Label / Small", color: "color/text/secondary" }));
    colorGrid.appendChild(swatch);
  }
  node.appendChild(colorGrid);

  const typographyList = frame("Typography styles", "VERTICAL", await numberValue(store, "spacing/3"));
  for (const styleName of Object.keys(textStyleDefinitions) as TextStyleName[]) {
    typographyList.appendChild(await text(`${styleName} · ${textStyleDefinitions[styleName].fontSize}/${textStyleDefinitions[styleName].lineHeight}`, { store, style: styleName }));
  }
  node.appendChild(typographyList);

  const numberGrid = frame("Spacing Radius Touch targets", "HORIZONTAL", await numberValue(store, "spacing/4"));
  numberGrid.layoutWrap = "WRAP";
  for (const token of Object.keys(numberFallbacks) as NumberTokenName[]) {
    const item = frame(token, "VERTICAL", await numberValue(store, "spacing/1"));
    item.resizeWithoutConstraints(140, 82);
    item.counterAxisSizingMode = "FIXED";
    setPadding(item, await numberValue(store, "spacing/3"));
    await cardChrome(item, store);
    item.appendChild(await text(token, { store, style: "Typography / Label / Small", color: "color/text/secondary" }));
    item.appendChild(await text(`${await numberValue(store, token)}px`, { store, style: "Typography / Number / Medium" }));
    numberGrid.appendChild(item);
  }
  node.appendChild(numberGrid);

  const notes = frame("Usage notes", "VERTICAL", await numberValue(store, "spacing/2"));
  for (const note of [
    "Variables are the source of truth for color, spacing, and radius.",
    "Generated React Native theme files should mirror these token names.",
    "Use component sets for implementation mapping, not detached copies."
  ]) {
    notes.appendChild(await text(`• ${note}`, { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
  }
  node.appendChild(notes);
  return node;
};

const buildBaseComponents = async (store: TokenStore) => {
  const node = await section(store, "02 Base Components", "Reusable primitives for mobile UI.");
  const specs: ComponentSetSpec[] = [];

  const buttonComponents: ComponentNode[] = [];
  for (const variant of ["Primary", "Secondary", "Ghost", "Danger"]) {
    for (const size of ["S", "M", "L"]) {
      for (const state of ["Default", "Pressed", "Disabled", "Loading"]) {
        buttonComponents.push(await makeButton(store, { variant, size, state, icon: "None" }));
      }
    }
    buttonComponents.push(await makeButton(store, { variant, size: "M", state: "Default", icon: "Left" }));
    buttonComponents.push(await makeButton(store, { variant, size: "M", state: "Default", icon: "Right" }));
  }
  specs.push(await setBlock(node, store, "Button", "Primary action component with size, state, and icon variants.", ["variant", "size", "state", "icon"], componentSet("Button", node, buttonComponents)));

  const iconButtons: ComponentNode[] = [];
  for (const variant of ["Default", "Ghost", "Soft", "Danger"]) {
    for (const size of ["S", "M", "L"]) {
      for (const state of ["Default", "Pressed", "Disabled"]) {
        iconButtons.push(await makeIconButton(store, { variant, size, state }));
      }
    }
  }
  specs.push(await setBlock(node, store, "IconButton", "Square icon-only actions.", ["variant", "size", "state"], componentSet("IconButton", node, iconButtons)));

  const inputs: ComponentNode[] = [];
  for (const type of ["Text", "Number", "Textarea"]) {
    for (const state of ["Default", "Focused", "Filled", "Error", "Disabled"]) {
      inputs.push(await makeInput(store, { type, state, helper: "False" }));
      if (state === "Error" || state === "Default") inputs.push(await makeInput(store, { type, state, helper: "True" }));
    }
  }
  specs.push(await setBlock(node, store, "Input", "Text, number, and textarea field states.", ["type", "state", "helper"], componentSet("Input", node, inputs)));

  specs.push(
    await setBlock(
      node,
      store,
      "Checkbox",
      "Binary completion control.",
      ["state"],
      componentSet(
        "Checkbox",
        node,
        await Promise.all(["Unchecked", "Checked", "Disabled", "Error"].map((state) => makeCheckbox(store, { state })))
      )
    )
  );

  specs.push(
    await setBlock(
      node,
      store,
      "Badge",
      "Compact status label.",
      ["type", "size"],
      componentSet(
        "Badge",
        node,
        await Promise.all(
          ["Planned", "InProgress", "Completed", "Cancelled", "Moved", "Positive", "Negative", "Neutral"].flatMap((type) =>
            ["S", "M"].map((size) => makeBadge(store, { type, size }))
          )
        )
      )
    )
  );

  specs.push(
    await setBlock(
      node,
      store,
      "SegmentedControl",
      "Mode switch for short option groups.",
      ["items", "state"],
      componentSet(
        "SegmentedControl",
        node,
        await Promise.all(
          [
            ["Two", "FirstSelected"],
            ["Two", "SecondSelected"],
            ["Three", "FirstSelected"],
            ["Three", "SecondSelected"],
            ["Three", "ThirdSelected"]
          ].map(([items, state]) => makeSegmentedControl(store, { items, state }))
        )
      )
    )
  );

  const cards: ComponentNode[] = [];
  for (const density of ["Compact", "Regular", "Large"]) {
    for (const state of ["Default", "Pressed", "Selected", "Disabled"]) {
      cards.push(await makeCard(store, { density, state }));
    }
  }
  specs.push(await setBlock(node, store, "Card", "Surface container with density and state variants.", ["density", "state"], componentSet("Card", node, cards)));
  return { node, specs };
};

const buildCalendarComponents = async (store: TokenStore) => {
  const node = await section(store, "03 Calendar Components", "Calendar navigation, day indicators, and time slots.");
  const specs: ComponentSetSpec[] = [];
  specs.push(
    await setBlock(
      node,
      store,
      "CalendarDay",
      "Single day cell.",
      ["state"],
      componentSet("CalendarDay", node, await Promise.all(["Default", "Today", "Selected", "HasWorkouts", "Disabled"].map((state) => makeCalendarDay(store, { state }))))
    )
  );
  const stripBlock = frame("CalendarDayStrip", "VERTICAL", await numberValue(store, "spacing/4"));
  stripBlock.resizeWithoutConstraints(CONTENT_WIDTH, 1);
  stripBlock.counterAxisSizingMode = "FIXED";
  stripBlock.appendChild(await text("CalendarDayStrip", { store, style: "Typography / Heading / H2" }));
  stripBlock.appendChild(await text("Week strip with seven days, active day, and workout indicators.", { store, style: "Typography / Body / Small", color: "color/text/secondary" }));
  stripBlock.appendChild(await makeCalendarDayStrip(store));
  node.appendChild(stripBlock);
  specs.push(
    await setBlock(
      node,
      store,
      "CalendarSlot",
      "Training slot states.",
      ["status"],
      componentSet("CalendarSlot", node, await Promise.all(["Free", "Planned", "InProgress", "Completed", "Cancelled", "Moved"].map((status) => makeCalendarSlot(store, { status }))))
    )
  );
  return { node, specs };
};

const buildClientComponents = async (store: TokenStore) => {
  const node = await section(store, "04 Client Components", "Client cards, stats, and goal blocks.");
  const specs = [
    await setBlock(node, store, "ClientCard", "Client list item states.", ["state"], componentSet("ClientCard", node, await Promise.all(["Default", "WithNextWorkout", "NoWorkout", "Warning", "Selected"].map((state) => makeClientCard(store, { state }))))),
    await setBlock(node, store, "ClientStatsBlock", "Client KPI block.", ["state"], componentSet("ClientStatsBlock", node, await Promise.all(["Default", "Positive", "Negative", "Empty"].map((state) => makeStatsBlock(store, { state }))))),
    await setBlock(node, store, "ClientGoalBlock", "Client goal and limitations.", ["state"], componentSet("ClientGoalBlock", node, await Promise.all(["Default", "WithLimitations", "Empty"].map((state) => makeGoalBlock(store, { state })))))
  ];
  return { node, specs };
};

const buildWorkoutComponents = async (store: TokenStore) => {
  const node = await section(store, "05 Workout Components", "Workout planning and live session components.");
  const specs: ComponentSetSpec[] = [];
  const workoutCards: ComponentNode[] = [];
  for (const status of ["Planned", "InProgress", "Completed", "Cancelled", "Moved"]) {
    for (const density of ["Compact", "Regular"]) workoutCards.push(await makeWorkoutCard(store, { status, density }));
  }
  specs.push(await setBlock(node, store, "WorkoutCard", "Workout card status and density variants.", ["status", "density"], componentSet("WorkoutCard", node, workoutCards)));
  specs.push(await setBlock(node, store, "SetRow", "Live set entry states.", ["state", "comment"], componentSet("SetRow", node, await Promise.all(["Empty", "Filled", "Completed", "Error", "Disabled"].flatMap((state) => ["False", "True"].map((comment) => makeSetRow(store, { state, comment })))))));
  specs.push(await setBlock(node, store, "PreviousResultBlock", "Previous performance states.", ["state"], componentSet("PreviousResultBlock", node, await Promise.all(["Positive", "Negative", "Neutral", "NoData"].map((state) => makePreviousResult(store, { state }))))));
  specs.push(await setBlock(node, store, "ProgressBadge", "Progress direction badges.", ["direction", "size"], componentSet("ProgressBadge", node, await Promise.all(["Positive", "Negative", "Neutral"].flatMap((direction) => ["S", "M"].map((size) => makeProgressBadge(store, { direction, size })))))));
  specs.push(await setBlock(node, store, "ExerciseCard", "Exercise card practical variant set.", ["state", "progress", "comment"], componentSet("ExerciseCard", node, await Promise.all([
    makeExerciseCard(store, { state: "Default", progress: "None", comment: "False" }),
    makeExerciseCard(store, { state: "Active", progress: "Neutral", comment: "False" }),
    makeExerciseCard(store, { state: "Completed", progress: "Positive", comment: "False" }),
    makeExerciseCard(store, { state: "Collapsed", progress: "None", comment: "False" }),
    makeExerciseCard(store, { state: "Default", progress: "None", comment: "True" }),
    makeExerciseCard(store, { state: "Default", progress: "Positive", comment: "False" }),
    makeExerciseCard(store, { state: "Default", progress: "Negative", comment: "False" }),
    makeExerciseCard(store, { state: "Error", progress: "Negative", comment: "True" })
  ]))));
  specs.push(await setBlock(node, store, "WorkoutSummary", "Workout summary states.", ["state"], componentSet("WorkoutSummary", node, await Promise.all(["Draft", "Completed", "WithPdf", "Error"].map((state) => makeWorkoutSummary(store, { state }))))));
  return { node, specs };
};

const buildPdfComponents = async (store: TokenStore) => {
  const node = await section(store, "06 PDF Components", "Printable report components for client handoff.");
  const grid = frame("PDF Components", "HORIZONTAL", GRID_GAP);
  grid.layoutWrap = "WRAP";
  grid.resizeWithoutConstraints(CONTENT_WIDTH, 1);
  grid.counterAxisSizingMode = "FIXED";
  for (const name of ["PdfHeader", "PdfExerciseRow", "PdfSummaryBlock", "PdfCommentBlock"]) {
    grid.appendChild(await makePdfBlock(store, name));
  }
  node.appendChild(grid);
  return node;
};

const instanceOf = (specs: ComponentSetSpec[], name: string) => {
  const spec = specs.find((item) => item.name === name);
  const first = spec?.set.children.find((child): child is ComponentNode => child.type === "COMPONENT");
  return first?.createInstance();
};

const buildScreenExamples = async (store: TokenStore, specs: ComponentSetSpec[]) => {
  const node = await section(store, "07 Screen Examples", "Three mobile screens built from generated component instances.");
  const row = frame("Screens", "HORIZONTAL", await numberValue(store, "spacing/6"));
  for (const screenName of ["Today screen", "Client profile screen", "Workout session screen"]) {
    const screen = frame(screenName, "VERTICAL", await numberValue(store, "spacing/4"));
    screen.resizeWithoutConstraints(390, 844);
    screen.primaryAxisSizingMode = "FIXED";
    screen.counterAxisSizingMode = "FIXED";
    screen.clipsContent = true;
    screen.cornerRadius = await numberValue(store, "radius/xl");
    setPadding(screen, await numberValue(store, "spacing/5"));
    await applyFill(screen, store, "color/background/app");
    screen.appendChild(await text(screenName, { store, style: "Typography / Display / Title" }));
    const names =
      screenName === "Today screen"
        ? ["CalendarDay", "WorkoutCard", "CalendarSlot"]
        : screenName === "Client profile screen"
          ? ["ClientCard", "ClientStatsBlock", "ClientGoalBlock", "WorkoutCard"]
          : ["WorkoutSummary", "ExerciseCard", "SetRow"];
    for (const name of names) {
      const instance = instanceOf(specs, name);
      if (instance) screen.appendChild(instance);
    }
    row.appendChild(screen);
  }
  node.appendChild(row);
  return node;
};

const buildHandoffNotes = async (store: TokenStore) => {
  const node = await section(store, "08 Handoff Notes", "Implementation notes for design and code handoff.");
  for (const note of [
    "Figma variables are the source of truth.",
    "React Native components must use generated theme tokens.",
    "No hardcoded colors in code.",
    "Component names must match code component names."
  ]) {
    node.appendChild(await text(`• ${note}`, { store, style: "Typography / Body / Regular", color: "color/text/secondary" }));
  }
  return node;
};

const createCleanPage = async (store: TokenStore) => {
  const page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);

  const root = frame("Trainer App Kit v0.3 Clean", "VERTICAL", SECTION_GAP);
  root.resizeWithoutConstraints(CONTENT_WIDTH, 1);
  root.counterAxisSizingMode = "FIXED";
  root.x = 0;
  root.y = 0;
  page.appendChild(root);

  root.appendChild(await buildCover(store));
  root.appendChild(await buildFoundations(store));
  const base = await buildBaseComponents(store);
  root.appendChild(base.node);
  const calendar = await buildCalendarComponents(store);
  root.appendChild(calendar.node);
  const client = await buildClientComponents(store);
  root.appendChild(client.node);
  const workout = await buildWorkoutComponents(store);
  root.appendChild(workout.node);
  root.appendChild(await buildPdfComponents(store));
  const allSpecs = [...base.specs, ...calendar.specs, ...client.specs, ...workout.specs];
  root.appendChild(await buildScreenExamples(store, allSpecs));
  root.appendChild(await buildHandoffNotes(store));

  figma.viewport.scrollAndZoomIntoView([root]);
};

const run = async () => {
  await Promise.all([
    figma.loadFontAsync(fonts.regular),
    figma.loadFontAsync(fonts.medium),
    figma.loadFontAsync(fonts.semiBold),
    figma.loadFontAsync(fonts.bold)
  ]);

  const store = await getTokenStore();
  await createCleanPage(store);
  figma.notify("Trainer App Kit v0.3 Clean generated");
  figma.closePlugin();
};

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  figma.notify(`Trainer App Kit v0.3 failed: ${message}`, { error: true });
  figma.closePlugin(message);
});
