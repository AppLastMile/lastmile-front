import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";

export default function MissionDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="hands-helping" size={30} color="#177240" />
        <Text style={styles.title}>Misión #{id}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Campaña</Text>
        <Text style={styles.text}>Banco de Alimentos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Descripción</Text>
        <Text style={styles.text}>
          Ayudar en la distribución de alimentos a familias de la comunidad.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Ubicación</Text>

        <View style={styles.row}>
          <FontAwesome5 name="map-marker-alt" size={16} color="#666" />
          <Text style={styles.text}>Centro comunitario</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Horario</Text>
        <Text style={styles.text}>Sábado 9:00 AM - 1:00 PM</Text>
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.push(`/missions/accept?id=${id}`)}
      >
        <Text style={styles.buttonText}>Aceptar misión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6f7",
  },

  header: {
    alignItems: "center",
    marginBottom: 25,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
  },

  label: {
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },

  text: {
    color: "#555",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  button: {
    backgroundColor: "#177240",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});