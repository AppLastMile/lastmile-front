import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';
import { AppScreen } from '@/components/ui/AppScreen';

export function MapScreen() {
  return (
    <AppScreen scrollable={false}>
      <FeaturePlaceholder
        title='Map'
        description='Vista de mapa con OpenStreetMap para explorar misiones cercanas y rutas de navegacion.'
      />
    </AppScreen>
  );
}