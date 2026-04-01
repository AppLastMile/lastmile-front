import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback, useRef } from "react";
import * as Location from "expo-location";

import { useTracking } from "@/modules/map/hooks/useTracking";
import { useSocketTracking } from "@/modules/map/hooks/useSocketTracking";
import { getPickupPoints } from "@/services/api/logisticsService";

export function MapScreen() {
  const { pickupPointId, shipmentId } = useLocalSearchParams();

  const mapRef = useRef<MapView | null>(null);

  // 🔥 convertir params a number
  const shipmentIdNum = shipmentId ? Number(shipmentId) : undefined;
  const pickupPointIdNum = pickupPointId ? Number(pickupPointId) : undefined;

  const [region, setRegion] = useState({
    latitude: 4.6097,
    longitude: -74.0817,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [pickupPoint, setPickupPoint] = useState<any>(null);

  const [volunteers, setVolunteers] = useState<{
    [key: string]: { latitude: number; longitude: number };
  }>({});

  // =========================
  // 🔥 TRACKING REAL
  // =========================
  useTracking(shipmentIdNum);

  const handleTracking = useCallback((data: any) => {
    if (!data.userId) return;

    setVolunteers((prev) => ({
      ...prev,
      [data.userId]: {
        latitude: data.lat,
        longitude: data.lng,
      },
    }));
  }, []);

  useSocketTracking(shipmentIdNum ?? 0, handleTracking);

  // =========================
  // 📦 CARGAR PICKUP POINT REAL
  // =========================
  useEffect(() => {
    async function loadPickupPoint() {
      try {
        if (!pickupPointIdNum) return;

        const res = await getPickupPoints();

        const point = res.data.find((p: any) => p.id === pickupPointIdNum);

        if (!point) return;

        setPickupPoint(point);

        setRegion({
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (e) {
        console.log("❌ error cargando pickup point", e);
      }
    }

    loadPickupPoint();
  }, [pickupPointIdNum]);

  // =========================
  // 📍 UBICACIÓN USUARIO
  // =========================
  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        console.log("❌ permiso de ubicación denegado");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});

      const { latitude, longitude } = location.coords;

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setRegion(newRegion);
      setCurrentLocation({ latitude, longitude });
    };

    getLocation();
  }, []);

  // =========================
  // 🧠 AJUSTAR CÁMARA
  // =========================
  useEffect(() => {
    const coords = [
      ...(pickupPoint
        ? [{ latitude: pickupPoint.latitude, longitude: pickupPoint.longitude }]
        : []),
      ...(currentLocation ? [currentLocation] : []),
      ...Object.values(volunteers),
    ];

    if (coords.length < 2) return;

    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: {
        top: 100,
        right: 100,
        bottom: 100,
        left: 100,
      },
      animated: true,
    });
  }, [pickupPoint, currentLocation, volunteers]);

  // 🔍 DEBUG
  console.log("📦 shipmentId:", shipmentIdNum);
  console.log("📍 pickupPointId:", pickupPointIdNum);
  console.log("👥 volunteers:", Object.keys(volunteers).length);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
      >
        {/* 🔵 TU UBICACIÓN */}
        {currentLocation && (
          <Marker coordinate={currentLocation} title="Tú" pinColor="blue" />
        )}

        {/* 🟢 PUNTO REAL */}
        {pickupPoint && (
          <Marker
            coordinate={{
              latitude: pickupPoint.latitude,
              longitude: pickupPoint.longitude,
            }}
            title={pickupPoint.name}
            pinColor="green"
          />
        )}

        {/* 🔴 VOLUNTARIOS */}
        {Object.entries(volunteers).map(([userId, location]) => (
          <Marker
            key={userId}
            coordinate={location}
            title={`Voluntario ${userId}`}
            pinColor="red"
          />
        ))}
      </MapView>
    </View>
  );
}
