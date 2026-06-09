import { useEffect, useState } from "react";
import { Keyboard, Platform, useWindowDimensions, type KeyboardEvent } from "react-native";

function getKeyboardInset(event: KeyboardEvent, windowHeight: number) {
  if (Platform.OS === "android") {
    return event.endCoordinates.height;
  }

  return Math.max(0, windowHeight - event.endCoordinates.screenY);
}

export function useKeyboardInset() {
  const { height } = useWindowDimensions();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillChangeFrame" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(getKeyboardInset(event, height));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [height]);

  return keyboardInset;
}
