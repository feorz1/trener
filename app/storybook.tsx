import { Platform } from "react-native";
import StorybookUIRoot from "../.rnstorybook";
import { MobileStorybook } from "@/storybook/MobileStorybook";

export default function StorybookRoute() {
  if (Platform.OS === "web") {
    return <StorybookUIRoot />;
  }

  return <MobileStorybook />;
}
