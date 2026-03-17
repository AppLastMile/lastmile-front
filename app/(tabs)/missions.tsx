import { View, Text, FlatList, Pressable, StyleSheet, Modal } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";

const missionsData = [
  {
    id: "1",
    title: "Entrega de alimentos",
    campaign: "Banco de Alimentos",
    location: "Bogotá",
    description: "Distribuir alimentos a familias vulnerables."
  },
  {
    id: "2",
    title: "Recolección de ropa",
    campaign: "Abrigo Solidario",
    location: "Medellín",
    description: "Recolectar ropa para comunidades necesitadas."
  },
  {
    id: "3",
    title: "Apoyo logístico",
    campaign: "Comunidad Activa",
    location: "Cali",
    description: "Organizar recursos para campañas comunitarias."
  }
];

export default function MissionsScreen() {

  const [acceptedMissions, setAcceptedMissions] = useState([]);
  const [detailMission, setDetailMission] = useState(null);
  const [confirmMission, setConfirmMission] = useState(null);

  const acceptMission = () => {

    setAcceptedMissions([...acceptedMissions, confirmMission]);
    setConfirmMission(null);
  };

  return (
    <View style={styles.container}>

      {/* PANEL IZQUIERDO */}
      <View style={styles.leftPanel}>

        <Text style={styles.title}>Misiones disponibles</Text>

        <FlatList
          data={missionsData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (

            <View style={styles.card}>

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

              {/* ICONO DETALLE */}
              <Pressable
                style={styles.detailButton}
                onPress={() => setDetailMission(item)}
              >
                <FontAwesome5 name="info-circle" size={18} color="#177240" />
              </Pressable>

              {/* BOTON ACEPTAR */}
              <Pressable
                style={styles.acceptButton}
                onPress={() => setConfirmMission(item)}
              >
                <Text style={styles.acceptText}>
                  Aceptar
                </Text>
              </Pressable>

            </View>

          )}
        />

      </View>


      {/* PANEL DERECHO */}
      <View style={styles.rightPanel}>

        <Text style={styles.title}>Mis misiones</Text>

        {acceptedMissions.length === 0 && (
          <Text style={{ color: "#777" }}>
            Aún no has aceptado misiones
          </Text>
        )}

        {acceptedMissions.map((mission) => (

          <View key={mission.id} style={styles.myMissionCard}>

            <Text style={styles.cardTitle}>
              {mission.title}
            </Text>

            <Text style={styles.campaign}>
              {mission.campaign}
            </Text>

            <Text style={styles.location}>
              {mission.location}
            </Text>

          </View>

        ))}

      </View>


      {/* MODAL DETALLE */}
      <Modal
        visible={detailMission !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackground}>

          <View style={styles.modalContainer}>

            {detailMission && (
              <>
                <Text style={styles.modalTitle}>
                  {detailMission.title}
                </Text>

                <Text style={styles.label}>Campaña</Text>
                <Text style={styles.text}>{detailMission.campaign}</Text>

                <Text style={styles.label}>Descripción</Text>
                <Text style={styles.text}>{detailMission.description}</Text>

                <Text style={styles.label}>Ubicación</Text>
                <Text style={styles.text}>{detailMission.location}</Text>

                <Pressable
                  style={styles.modalButton}
                  onPress={() => setDetailMission(null)}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Cerrar
                  </Text>
                </Pressable>
              </>
            )}

          </View>

        </View>
      </Modal>


      {/* MODAL CONFIRMAR */}
      <Modal
        visible={confirmMission !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackground}>

          <View style={styles.modalContainer}>

            {confirmMission && (
              <>
                <Text style={styles.modalTitle}>
                  Confirmar misión
                </Text>

                <Text style={styles.text}>
                  ¿Quieres unirte a la misión:
                </Text>

                <Text style={{ fontWeight: "bold", marginTop: 5 }}>
                  {confirmMission.title}
                </Text>

                <Pressable
                  style={styles.modalButton}
                  onPress={acceptMission}
                >
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Confirmar
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setConfirmMission(null)}
                >
                  <Text>Cancelar</Text>
                </Pressable>
              </>
            )}

          </View>

        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f5f6f7"
  },

  leftPanel: {
    flex: 2,
    padding: 20
  },

  rightPanel: {
    flex: 1,
    padding: 20,
    borderLeftWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff"
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#e7f3ec",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600"
  },

  campaign: {
    color: "#177240",
    fontSize: 13
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3
  },

  location: {
    color: "#777"
  },

  detailButton: {
    marginRight: 10
  },

  acceptButton: {
    backgroundColor: "#177240",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },

  acceptText: {
    color: "#fff",
    fontWeight: "600"
  },

  myMissionCard: {
    backgroundColor: "#f1f1f1",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },

  modalContainer: {
    width: 350,
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10
  },

  label: {
    fontWeight: "600",
    marginTop: 10
  },

  text: {
    color: "#555"
  },

  modalButton: {
    backgroundColor: "#177240",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20
  },

  cancelButton: {
    alignItems: "center",
    marginTop: 10
  }

});