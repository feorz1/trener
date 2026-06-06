import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import {
  ListItemCell,
  getListItemCellSelectedGroupPosition,
  type ListItemCellLeading,
  type ListItemCellState,
  type ListItemCellTrailing
} from "./ListItemCell";

const leadingOptions: ListItemCellLeading[] = ["none", "avatar", "icon"];
const trailingOptions: ListItemCellTrailing[] = ["none", "button", "checkbox", "radio", "icon", "switch", "badge", "text"];
const states: ListItemCellState[] = ["default", "pressed", "disabled"];
const groupedItems = [
  { id: "bank", title: "Bank transfer", subtitle: "Wise account" },
  { id: "card", title: "Payment card", subtitle: "Visa ending 4242" },
  { id: "balance", title: "Balance", subtitle: "Available now" }
];

const meta = {
  title: "Components/List Item Cell",
  component: ListItemCell,
  args: {
    title: "Bank transfer",
    eyebrow: "Payment method",
    subtitle: "Sent 12GBP",
    leading: "avatar",
    trailing: "icon",
    state: "default",
    selected: false,
    showEyebrow: true,
    showSubtitle: true
  },
  argTypes: {
    leading: {
      control: "select",
      options: leadingOptions
    },
    trailing: {
      control: "select",
      options: trailingOptions
    },
    state: {
      control: "select",
      options: states
    },
    selected: {
      control: "boolean"
    },
    showEyebrow: {
      control: "boolean"
    },
    showSubtitle: {
      control: "boolean"
    }
  }
} satisfies Meta<typeof ListItemCell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => {
    const [selected, setSelected] = useState(Boolean(args.selected));

    return (
      <View style={styles.storyFrame}>
        <ListItemCell {...args} selected={selected} onSelectedChange={setSelected} />
      </View>
    );
  }
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={[styles.storyFrame, { gap: theme.spacing.lg }]}>
      <ListItemCell eyebrow="Payment method" title="Bank transfer" subtitle="Wise account" trailing="button" buttonLabel="Change" />
      <ListItemCell title="Vanessa Luke" subtitle="Sent 12GBP" trailing="checkbox" />
      <ListItemCell title="EUR" subtitle="Euro" trailing="radio" />
      <ListItemCell title="Address" subtitle="134 Hon Road, Sydney" trailing="icon" trailingIconName="edit" />
      <ListItemCell title="Allow notifications" showSubtitle={false} trailing="switch" selected />
      <ListItemCell title="Spent this month" subtitle="20.45 GBP" trailing="none" />
      <ListItemCell title="Connect an account" subtitle="Link one of your other banks" trailing="icon" state="disabled" />
      <ListItemCell title="To your SGD balance" subtitle="Cancelled" trailing="text" trailingText="1 SGD" />
    </View>
  )
};

export const GroupedSelection: Story = {
  render: () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(["bank", "card"]);
    const selectedIdSet = new Set(selectedIds);

    const toggle = (id: string) => {
      setSelectedIds((current) => (current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]));
    };

    return (
      <View style={[styles.storyFrame, { gap: theme.spacing.xxs }]}>
        {groupedItems.map((item, index) => {
          const selected = selectedIdSet.has(item.id);
          const previousSelected = index > 0 && selectedIdSet.has(groupedItems[index - 1].id);
          const nextSelected = index < groupedItems.length - 1 && selectedIdSet.has(groupedItems[index + 1].id);

          return (
            <ListItemCell
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              trailing="checkbox"
              selected={selected}
              groupPosition={getListItemCellSelectedGroupPosition(selected, previousSelected, nextSelected)}
              onPress={() => toggle(item.id)}
              onSelectedChange={() => toggle(item.id)}
            />
          );
        })}
      </View>
    );
  }
};

const styles = {
  storyFrame: {
    width: 390,
    maxWidth: "100%" as const
  }
};
