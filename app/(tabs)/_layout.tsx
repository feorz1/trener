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
        <Icon src={require("../../assets/tabs/home.png")} />
        <Label>Главная</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <Icon src={require("../../assets/tabs/clients.png")} />
        <Label>Клиенты</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon src={require("../../assets/tabs/settings.png")} />
        <Label>Настройки</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
