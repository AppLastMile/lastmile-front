import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';
import { AppScreen } from '@/components/ui/AppScreen';

export function HomeScreen() {
  return (
    <AppScreen>
      <FeaturePlaceholder
        title='Home'
        description='Vista inicial del voluntario con resumen de misiones activas y recomendaciones cercanas.'
      />
    </AppScreen>
  );
}