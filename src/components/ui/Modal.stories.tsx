import type { Meta, StoryObj } from "@storybook/react-native";
import { View } from "react-native";
import { theme } from "@/theme";
import { ListItemCell } from "./ListItemCell";
import { Modal, type ModalProps } from "./Modal";

const actionLayouts = ["single", "stacked", "inline", "triple"] as const;

const meta = {
  title: "Components/Modal",
  component: Modal,
  args: {
    title: "This is the header",
    subline: "Subline",
    showSubline: true,
    subheader: "This is a subheader",
    description: "This is the body of the modal.",
    showBodyText: true,
    actionLayout: "single",
    showCloseButton: true
  },
  argTypes: {
    actionLayout: {
      control: "select",
      options: actionLayouts
    },
    showCloseButton: {
      control: "boolean"
    },
    showSubline: {
      control: "boolean"
    },
    showBodyText: {
      control: "boolean"
    }
  }
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

function ModalWithCell(args: ModalProps) {
  return (
    <View style={styles.storyFrame}>
      <Modal {...args}>
        <ListItemCell eyebrow="Payment method" title="Bank transfer" subtitle="Wise account" trailing="icon" />
      </Modal>
    </View>
  );
}

export const Playground: Story = {
  render: (args) => <ModalWithCell {...args} />
};

export const CanonicalVariants: Story = {
  render: () => (
    <View style={[styles.storyFrame, { gap: theme.spacing.lg }]}>
      <Modal actionLayout="single">
        <ListItemCell eyebrow="Payment method" title="Bank transfer" subtitle="Wise account" trailing="icon" />
      </Modal>
      <Modal actionLayout="stacked" />
      <Modal actionLayout="inline" />
    </View>
  )
};

const styles = {
  storyFrame: {
    width: theme.sizes.modalWidth,
    maxWidth: "100%" as const
  }
};
