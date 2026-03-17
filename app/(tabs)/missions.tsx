import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const missions = [
  {
    id: "1",
    title: "Entrega de alimentos",
    campaign: "Campaña Banco de Alimentos",
    location: "Bogotá",
  },
  {
    id: "2",
    title: "Recolección de ropa",
    campaign: "Campaña Abrigo Solidario",
    location: "Medellín",
  },
  {
    id: "3",
    title: "Apoyo logístico",
    campaign: "Campaña Comunidad Activa",
    location: "Cali",
  },
];

export default function MissionsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Misiones disponibles</Text>

      <FlatList
        data={missions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/missions/${item.id}`)}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5 name="hands-helping" size={18} color="#177240" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>

              <Text style={styles.campaign}>
                {item.campaign}
              </Text>

              <View style={styles.locationRow}>
                <FontAwesome5 name="map-marker-alt" size={14} color="#777" />
                <Text style={styles.location}>{item.location}</Text>
              </View>
            </View>

            <FontAwesome5 name="chevron-right" size={16} color="#aaa" />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f6f7",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#e7f3ec",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  campaign: {
    color: "#177240",
    fontSize: 13,
    marginTop: 2,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  location: {
    marginLeft: 6,
    color: "#777",
  },
});