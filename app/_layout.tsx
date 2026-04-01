import { Stack } from "expo-router";
import Toast from "react-native-toast-message";

import { AppProvider } from "@/providers/AppProvider";

import "../global.css";

export default function RootLayout() {
  return (
    <AppProvider>
      <>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }} />

        <Toast />
      </>
    </AppProvider>
  );
}
