import type { Preview } from "@storybook/react-native";
import type { ComponentType } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { theme } from "../src/theme";

const webPreviewPadding = 200;

const preview: Preview = {
  decorators: [
    (Story: ComponentType) => (
      <ScrollView style={styles.canvas} contentContainerStyle={styles.canvasContent}>
        <View style={styles.previewSurface}>
          <Story />
        </View>
      </ScrollView>
    )
  ],
  parameters: {
    controls: {
      expanded: true
    }
  }
};

export default preview;

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: theme.colors.background.canvasSoft
  },
  canvasContent: {
    alignItems: "flex-start",
    padding: theme.spacing.xl
  },
  previewSurface: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    padding: webPreviewPadding,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.background.canvas
  }
});
