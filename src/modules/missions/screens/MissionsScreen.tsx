import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';
import { AppScreen } from '@/components/ui/AppScreen';

export function MissionsScreen() {
  return (
    <AppScreen>
      <FeaturePlaceholder
        title='Missions'
        description='Listado de misiones disponibles con filtros por ciudad, tipo de desastre y estado.'
      />
    </AppScreen>
  );
}