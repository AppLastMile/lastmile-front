import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { AppScreen } from "@/components/ui/AppScreen";

export default function AcceptMissionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const handleConfirm = () => {
    router.replace("/(tabs)/missions");
  };

  return (
    <AppScreen>
      <View
        style={{
          flex: 1,
          padding: 16,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          ¿Aceptar misión?
        </Text>

        <Text
          style={{
            marginTop: 12,
            textAlign: "center",
            color: "gray",
          }}
        >
          Estás a punto de aceptar esta misión y comprometerte a realizarla.
        </Text>

        {/* BOTÓN CONFIRMAR */}
        <Pressable
          onPress={handleConfirm}
          style={{
            marginTop: 30,
            backgroundColor: "#16a34a",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Confirmar</Text>
        </Pressable>

        {/* BOTÓN CANCELAR */}
        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#ccc",
          }}
        >
          <Text>Cancelar</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
