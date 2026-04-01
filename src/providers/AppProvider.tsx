import type { PropsWithChildren } from "react";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "@tamagui/core";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { GlobalLogoutButton } from "@/components/common/GlobalLogoutButton";
import { AuthSessionProvider } from "@/modules/auth/context/AuthSessionContext";
import tamaguiConfig from "../../tamagui.config";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <AuthSessionProvider>
            <StatusBar style="dark" />
            {children}
            <GlobalLogoutButton />
          </AuthSessionProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
