# Tech Stack

- TypeScript + React 19 + React Native 0.81 + Expo SDK 54.
- Routing: Expo Router (`expo-router/entry`, routes under `app/`).
- UI: React Native StyleSheet components using `src/theme` tokens; Storybook React Native is configured for mobile/web previews.
- Native/mobile helpers include `react-native-reanimated`, `react-native-gesture-handler`, `react-native-sortables`, `react-native-keyboard-controller`, `react-native-safe-area-context`, `react-native-svg`, Expo Haptics, Expo Font, AsyncStorage.
- Package scripts use npm; `postinstall` runs `patch-package`.