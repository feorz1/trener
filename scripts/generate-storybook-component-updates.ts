import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const components = [
  {
    name: "Action",
    files: ["src/components/ui/Action.tsx", "src/components/ui/Action.stories.tsx", "docs/design-system/components/action.md"]
  },
  {
    name: "Modal",
    files: ["src/components/ui/Modal.tsx", "src/components/ui/Modal.stories.tsx", "docs/design-system/components/modal.md"]
  },
  {
    name: "Card",
    files: ["src/components/ui/Card.tsx", "src/components/ui/Card.stories.tsx", "docs/design-system/components/card.md"]
  },
  {
    name: "Search",
    files: ["src/components/ui/Search.tsx", "src/components/ui/Search.stories.tsx"]
  },
  {
    name: "Chip",
    files: ["src/components/ui/Chip.tsx", "src/components/ui/Chip.stories.tsx"]
  },
  {
    name: "StateSelect",
    files: ["src/components/ui/StateSelect.tsx", "src/components/ui/StateSelect.stories.tsx"]
  },
  {
    name: "DateCell",
    files: ["src/components/ui/DateCell.tsx", "src/components/ui/DateCell.stories.tsx"]
  },
  {
    name: "Divider",
    files: ["src/components/ui/Divider.tsx", "src/components/ui/Divider.stories.tsx", "src/components/ui/Divider.docs.md"]
  },
  {
    name: "Approach",
    files: ["src/components/ui/Approach.tsx", "src/components/ui/Approach.stories.tsx"]
  },
  {
    name: "ChipsList",
    files: ["src/components/ui/ChipsList.tsx", "src/components/ui/ChipsList.stories.tsx"]
  },
  {
    name: "ListItemGym",
    files: ["src/components/ui/ListItemGym.tsx", "src/components/ui/ListItemGym.stories.tsx"]
  },
  {
    name: "Set",
    files: ["src/components/ui/Set.tsx", "src/components/ui/Set.stories.tsx"]
  },
  {
    name: "SuperSet",
    files: ["src/components/ui/SuperSet.tsx", "src/components/ui/SuperSet.stories.tsx"]
  },
  {
    name: "CalendarDayStrip",
    files: [
      "src/components/calendar/CalendarDayStrip.tsx",
      "src/components/calendar/CalendarDayStrip.stories.tsx",
      "docs/design-system/components/calendar-day-strip.md"
    ]
  },
  {
    name: "ProgressBar",
    files: ["src/components/ui/ProgressBar.tsx", "src/components/ui/ProgressBar.stories.tsx", "docs/design-system/components/progress-bar.md"]
  },
  {
    name: "Alert",
    files: ["src/components/ui/Alert.tsx", "src/components/ui/Alert.stories.tsx", "docs/design-system/components/alert.md"]
  },
  {
    name: "Button",
    files: ["src/components/ui/Button.tsx", "src/components/ui/Button.stories.tsx", "docs/design-system/components/button.md"]
  },
  {
    name: "Navigation",
    files: ["src/components/ui/Navigation.tsx", "src/components/ui/Navigation.stories.tsx"]
  },
  {
    name: "Header",
    files: ["src/components/ui/Header.tsx", "src/components/ui/Header.stories.tsx"]
  },
  {
    name: "Select",
    files: ["src/components/ui/Select.tsx", "src/components/ui/Select.stories.tsx"]
  },
  {
    name: "Loader",
    files: ["src/components/ui/Loader.tsx", "src/components/ui/Loader.stories.tsx", "docs/design-system/components/loader.md"]
  },
  {
    name: "Icon",
    files: ["src/components/ui/Icon.tsx", "src/components/ui/Icon.stories.tsx", "docs/design-system/components/icon.md"]
  },
  {
    name: "Avatar",
    files: ["src/components/ui/Avatar.tsx", "src/components/ui/Avatar.stories.tsx", "docs/design-system/components/avatar.md"]
  },
  {
    name: "ListItemCell",
    files: ["src/components/ui/ListItemCell.tsx", "src/components/ui/ListItemCell.stories.tsx", "docs/design-system/components/list-item-cell.md"]
  },
  {
    name: "Badge",
    files: ["src/components/ui/Badge.tsx", "src/components/ui/Badge.stories.tsx", "docs/design-system/components/badge.md"]
  },
  {
    name: "Checkbox",
    files: ["src/components/ui/Checkbox.tsx", "src/components/ui/Checkbox.stories.tsx", "docs/design-system/components/checkbox.md"]
  },
  {
    name: "Radio",
    files: ["src/components/ui/Radio.tsx", "src/components/ui/Radio.stories.tsx", "docs/design-system/components/radio.md"]
  },
  {
    name: "Input",
    files: ["src/components/ui/Input.tsx", "src/components/ui/Input.stories.tsx", "docs/design-system/components/input.md"]
  },
  {
    name: "SegmentedControl",
    files: [
      "src/components/ui/SegmentedControl.tsx",
      "src/components/ui/SegmentedControl.stories.tsx",
      "docs/design-system/components/segmented-control.md"
    ]
  },
  {
    name: "TextArea",
    files: ["src/components/ui/TextArea.tsx", "src/components/ui/TextArea.stories.tsx", "docs/design-system/components/text-area.md"]
  },
  {
    name: "Variant",
    files: ["src/components/ui/Variant.tsx", "src/components/ui/Variant.stories.tsx", "src/components/ui/Variant.docs.md"]
  },
  {
    name: "Switch",
    files: ["src/components/ui/Switch.tsx", "src/components/ui/Switch.stories.tsx", "docs/design-system/components/switch.md"]
  }
] as const;

const formatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Moscow"
});

function formatUpdatedAt(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.hour}:${parts.minute} ${parts.day}.${parts.month}`;
}

async function getLatestMtime(files: readonly string[]) {
  const times = await Promise.all(
    files.map(async (file) => {
      try {
        const fileStat = await stat(path.join(repoRoot, file));
        return fileStat.mtimeMs;
      } catch {
        return 0;
      }
    })
  );

  return new Date(Math.max(...times, 0));
}

async function main() {
  const updates = Object.fromEntries(
    await Promise.all(components.map(async (component) => [component.name, formatUpdatedAt(await getLatestMtime(component.files))]))
  );

  const outputPath = path.join(repoRoot, "src/storybook/componentUpdates.ts");
  const output = `// Generated by scripts/generate-storybook-component-updates.ts. Do not edit manually.\n\nexport const componentUpdates = ${JSON.stringify(
    updates,
    null,
    2
  )} as const;\n`;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
}

void main();
