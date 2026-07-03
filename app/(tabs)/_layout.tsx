import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { theme } from "@/theme";

export default function TrainerTabsLayout() {
  return (
    <NativeTabs
      backgroundColor={theme.colors.background.glass}
      blurEffect="systemMaterialLight"
      disableTransparentOnScrollEdge
      iconColor={{
        default: theme.colors.content.inkDeep,
        selected: theme.colors.content.inkDeep
      }}
      labelStyle={{
        default: {
          color: theme.colors.content.inkDeep,
          fontSize: theme.typography.captionStrong.fontSize,
          fontWeight: theme.typography.captionStrong.fontWeight
        },
        selected: {
          color: theme.colors.content.inkDeep,
          fontSize: theme.typography.captionStrong.fontSize,
          fontWeight: theme.typography.captionStrong.fontWeight
        }
      }}
      minimizeBehavior="never"
      shadowColor={theme.colors.background.glassOverlay}
      tintColor={theme.colors.content.inkDeep}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Главная</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Клиенты</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Настройки</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
