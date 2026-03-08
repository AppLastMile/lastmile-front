import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';
import { AppScreen } from '@/components/ui/AppScreen';

export function CreateMissionScreen() {
  return (
    <AppScreen>
      <FeaturePlaceholder
        title='Create Mission'
        description='Formulario para que organizadores creen nuevas misiones con ubicacion y recursos requeridos.'
      />
    </AppScreen>
  );
}