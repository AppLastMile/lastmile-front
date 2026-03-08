import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from '@tamagui/core';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import tamaguiConfig from '../../tamagui.config';

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme='light'>
          <StatusBar style='dark' />
          {children}
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}