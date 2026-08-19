import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ListItemCell, Modal, Radio } from "@/components/ui";
import { THEME_OPTIONS } from "@/features/settings/themeOptions";
import { theme, useAppTheme, type ThemePreference } from "@/theme";

export default function AppearanceSheet() {
  const { preference, setPreference } = useAppTheme();

  const selectTheme = (nextPreference: ThemePreference) => {
    router.back();
    void setPreference(nextPreference);
  };

  return (
    <View style={styles.screen}>
      <Modal
        presentation="inline"
        title="Оформление"
        showSubline={false}
        showBodyText={false}
        showActions={false}
        onClose={() => router.back()}
        style={styles.modal}
      >
        <View style={styles.themeOptions} accessibilityRole="radiogroup">
          {THEME_OPTIONS.map((option, index) => (
            <ListItemCell
              key={option.value}
              title={option.label}
              subtitle={option.description}
              showSubtitle
              leading="none"
              selected={preference === option.value}
              trailingSlot={
                <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
                  <Radio selected={preference === option.value} showLabel={false} />
                </View>
              }
              groupPosition={index === 0 ? "first" : index === THEME_OPTIONS.length - 1 ? "last" : "middle"}
              surface="canvasSoft"
              accessibilityLabel={`${option.label}. ${option.description}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: preference === option.value }}
              onPress={() => selectTheme(option.value)}
            />
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    backgroundColor: theme.colors.background.canvas
  },
  modal: {
    width: "100%"
  },
  themeOptions: {
    alignSelf: "stretch",
    gap: theme.spacing.xxs
  }
});
