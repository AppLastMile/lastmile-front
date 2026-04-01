import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { useAuthSession } from "@/modules/auth/context/AuthSessionContext";

function getRoleLabel(role?: string) {
  if (role === "organizer") return "Organizador";
  if (role === "donor") return "Donante";
  if (role === "volunteer") return "Voluntario";
  return "Sin sesión";
}

function getInitial(email?: string) {
  if (!email) return "?";
  return email.charAt(0).toUpperCase();
}

export function ProfileScreen() {
  const router = useRouter();
  const { currentUser, logout } = useAuthSession();

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  const roleLabel = getRoleLabel(currentUser?.role);

  return (
    <AppScreen>
      <View className="flex-1 gap-6">
        {/* 🔵 HEADER */}
        <Text className="text-3xl font-extrabold text-[#15325c]">Perfil</Text>

        {/* 👤 CARD PRINCIPAL */}
        <View
          className="bg-white rounded-2xl p-5 items-center"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* AVATAR */}
          <View className="w-20 h-20 rounded-full bg-[#1f5fe0] items-center justify-center">
            <Text className="text-white text-2xl font-bold">
              {getInitial(currentUser?.email)}
            </Text>
          </View>

          {/* EMAIL */}
          <Text className="mt-4 text-lg font-bold text-[#173761]">
            {currentUser?.email ?? "Usuario no autenticado"}
          </Text>

          {/* ROL BADGE */}
          <View className="mt-2 bg-[#e8f0ff] px-3 py-1 rounded-full">
            <Text className="text-sm font-semibold text-[#1f5fe0]">
              {roleLabel}
            </Text>
          </View>
        </View>

        {/* 📄 INFO ADICIONAL */}
        <View className="bg-white rounded-2xl p-4">
          <Text className="text-sm text-[#526887]">
            Sesión activa en la aplicación. Desde aquí puedes cerrar sesión de
            forma segura.
          </Text>
        </View>

        {/* 🔴 LOGOUT */}
        <Pressable
          className="rounded-2xl bg-[#cf3a4a] py-4 items-center active:opacity-90"
          onPress={handleLogout}
        >
          <Text className="text-white font-semibold text-base">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
