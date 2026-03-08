import { SafeAreaView, Text, View } from 'react-native';

import { OrganizerBottomTabs } from '@/modules/organizer/components/OrganizerBottomTabs';

export function OrganizerLogisticsScreen() {
  return (
    <SafeAreaView className='flex-1 bg-[#eef4ff] p-4'>
      <View className='rounded-2xl border border-[#dce8ff] bg-white p-5'>
        <Text className='text-xs font-semibold uppercase tracking-[1px] text-[#4f6487]'>
          Modulo Organizador
        </Text>
        <Text className='mt-2 text-xl font-extrabold text-[#14243f]'>Logistica</Text>
        <Text className='mt-2 text-sm leading-6 text-[#5c7396]'>
          Proximo paso: crear puntos de recogida, asignar envios y vincular voluntarios para la distribucion.
        </Text>
      </View>

      <OrganizerBottomTabs activeTab='logistica' />
    </SafeAreaView>
  );
}
