import { FeaturePlaceholder } from '@/components/common/FeaturePlaceholder';
import { AppScreen } from '@/components/ui/AppScreen';

export function LoginScreen() {
  return (
    <AppScreen>
      <FeaturePlaceholder
        title='Login'
        description='Pantalla base para autenticacion. Aqui va el formulario de acceso y la logica de sesion.'
      />
    </AppScreen>
  );
}