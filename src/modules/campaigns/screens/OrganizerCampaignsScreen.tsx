import { Pressable, SafeAreaView, Text, View } from 'react-native';

import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';

export function OrganizerCampaignsScreen() {
  return (
    <SafeAreaView className='flex-1 bg-[#eef4ff]'>
      <View className='flex-1 px-4 pt-6'>
        <Pressable
          className='rounded-2xl bg-[#1f5fe0] px-5 py-4 active:opacity-90'
          onPress={() => {}}
          style={{
            shadowColor: '#1f5fe0',
            shadowOpacity: 0.25,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <Text className='text-center text-base font-extrabold tracking-[0.3px] text-white'>
            Crear campaña
          </Text>
        </Pressable>
      </View>

      <OrganizerBottomTabs activeTab='campanas' />
    </SafeAreaView>
  );
}
