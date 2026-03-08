import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';
import { AppScreen } from '@/components/ui/AppScreen';

export function ProfileScreen() {
  return (
    <AppScreen>
      <FeaturePlaceholder
        title='Profile'
        description='Pantalla de perfil con edicion de datos, historial de participacion y estadisticas personales.'
      />
    </AppScreen>
  );
}