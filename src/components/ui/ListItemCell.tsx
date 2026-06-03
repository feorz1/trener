import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import { theme } from "@/theme";
import { Avatar, type AvatarType } from "./Avatar";
import { Badge, type BadgeTone } from "./Badge";
import { Button } from "./Button";
import { Checkbox, type CheckboxState } from "./Checkbox";
import { Icon, type IconName } from "./Icon";
import { Radio, type RadioState } from "./Radio";
import { Switch } from "./Switch";

export type ListItemCellState = "default" | "pressed" | "disabled";
export type ListItemCellLeading = "none" | "avatar" | "icon";
export type ListItemCellTrailing = "none" | "button" | "checkbox" | "radio" | "icon" | "switch" | "badge" | "text";

export type ListItemCellProps = Omit<PressableProps, "children" | "disabled" | "style"> & {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  trailingText?: string;
  leading?: ListItemCellLeading;
  trailing?: ListItemCellTrailing;
  state?: ListItemCellState;
  disabled?: boolean;
  selected?: boolean;
  showEyebrow?: boolean;
  showSubtitle?: boolean;
  avatarType?: AvatarType;
  avatarSource?: ImageSourcePropType;
  avatarInitials?: string;
  leadingIconName?: IconName;
  trailingIconName?: IconName;
  buttonLabel?: string;
  badgeLabel?: string;
  badgeTone?: BadgeTone;
  checkboxState?: CheckboxState;
  radioState?: RadioState;
  onSelectedChange?: (selected: boolean) => void;
  leadingSlot?: ReactNode;
  trailingSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ListItemCell({
  title,
  eyebrow,
  subtitle,
  trailingText,
  leading = "avatar",
  trailing = "none",
  state = "default",
  disabled,
  selected = false,
  showEyebrow = Boolean(eyebrow),
  showSubtitle = Boolean(subtitle),
  avatarType = "icon",
  avatarSource,
  avatarInitials = "JW",
  leadingIconName = "workout",
  trailingIconName = "chevron right",
  buttonLabel = "Small",
  badgeLabel = "Badge",
  badgeTone = "neutral",
  checkboxState = "default",
  radioState = "default",
  onSelectedChange,
  leadingSlot,
  trailingSlot,
  style,
  accessibilityLabel,
  ...pressableProps
}: ListItemCellProps) {
  const isDisabled = disabled || state === "disabled";
  const textColor = isDisabled ? theme.colors.content.mute : theme.colors.content.ink;
  const secondaryColor = isDisabled ? theme.colors.content.mute : theme.colors.content.body;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={pressableProps.onPress ? "button" : undefined}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.root,
        selected && styles.selected,
        state === "pressed" && styles.pressed,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style
      ]}
    >
      {leadingSlot ?? renderLeading({ leading, avatarType, avatarSource, avatarInitials, leadingIconName, isDisabled })}

      <View style={styles.content}>
        {showEyebrow && eyebrow ? <Text style={[styles.eyebrow, { color: secondaryColor }]}>{eyebrow}</Text> : null}
        <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
          {title}
        </Text>
        {showSubtitle && subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: secondaryColor }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailingSlot ??
        renderTrailing({
          trailing,
          trailingText,
          trailingIconName,
          buttonLabel,
          badgeLabel,
          badgeTone,
          selected,
          isDisabled,
          checkboxState,
          radioState,
          onSelectedChange
        })}
    </Pressable>
  );
}

function renderLeading({
  leading,
  avatarType,
  avatarSource,
  avatarInitials,
  leadingIconName,
  isDisabled
}: {
  leading: ListItemCellLeading;
  avatarType: AvatarType;
  avatarSource?: ImageSourcePropType;
  avatarInitials: string;
  leadingIconName: IconName;
  isDisabled: boolean;
}) {
  if (leading === "none") return null;

  if (leading === "icon") {
    return (
      <View style={[styles.leadingIcon, isDisabled && styles.slotDisabled]}>
        <Icon name={leadingIconName} size={theme.sizes.listItemCellIcon} color={theme.colors.content.inkDeep} />
      </View>
    );
  }

  return <Avatar type={avatarType} size={40} source={avatarSource} initials={avatarInitials} iconName={leadingIconName} />;
}

function renderTrailing({
  trailing,
  trailingText,
  trailingIconName,
  buttonLabel,
  badgeLabel,
  badgeTone,
  selected,
  isDisabled,
  checkboxState,
  radioState,
  onSelectedChange
}: {
  trailing: ListItemCellTrailing;
  trailingText?: string;
  trailingIconName: IconName;
  buttonLabel: string;
  badgeLabel: string;
  badgeTone: BadgeTone;
  selected: boolean;
  isDisabled: boolean;
  checkboxState: CheckboxState;
  radioState: RadioState;
  onSelectedChange?: (selected: boolean) => void;
}) {
  if (trailing === "none") return null;
  if (trailing === "button") return <Button type="secondaryNeutral" size="small" label={buttonLabel} disabled={isDisabled} />;
  if (trailing === "checkbox") return <Checkbox selected={selected} state={isDisabled ? "disabled" : checkboxState} showLabel={false} onChange={onSelectedChange} />;
  if (trailing === "radio") return <Radio selected={selected} state={isDisabled ? "disabled" : radioState} showLabel={false} onChange={onSelectedChange} />;
  if (trailing === "switch") return <Switch selected={selected} disabled={isDisabled} onChange={onSelectedChange} />;
  if (trailing === "badge") return <Badge label={badgeLabel} tone={badgeTone} />;
  if (trailing === "text") return <Text style={[styles.trailingText, isDisabled && styles.disabledText]}>{trailingText}</Text>;

  return <Icon name={trailingIconName} size={theme.sizes.listItemCellIcon} color={isDisabled ? theme.colors.content.mute : theme.colors.content.inkDeep} />;
}

const styles = StyleSheet.create({
  root: {
    minHeight: theme.sizes.listItemCellMinHeight,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  },
  pressed: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  selected: {
    backgroundColor: theme.colors.content.primaryPale
  },
  disabled: {
    opacity: 0.62
  },
  content: {
    flex: 1,
    minWidth: theme.spacing[0]
  },
  eyebrow: {
    ...theme.typography.body.sm
  },
  title: {
    ...theme.typography.body.mdStrong
  },
  subtitle: {
    ...theme.typography.body.sm
  },
  leadingIcon: {
    width: theme.sizes.avatar40,
    height: theme.sizes.avatar40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.sizes.avatarRingStroke,
    borderColor: theme.colors.background.canvasSoft,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.background.canvas
  },
  slotDisabled: {
    backgroundColor: theme.colors.background.canvasSoft
  },
  trailingText: {
    ...theme.typography.body.sm,
    color: theme.colors.content.body
  },
  disabledText: {
    color: theme.colors.content.mute
  }
});
