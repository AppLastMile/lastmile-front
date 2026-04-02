import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";

type AppScreenProps = PropsWithChildren<{
  scrollable?: boolean;
}>;

export function AppScreen({ children, scrollable = false }: AppScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-brand-50">
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4">{children}</View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-50">
      <View className="flex-1 p-4 gap-4">{children}</View>
    </SafeAreaView>
  );
}
