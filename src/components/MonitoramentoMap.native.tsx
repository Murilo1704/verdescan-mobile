import MapView, { Marker } from "react-native-maps";
import { StyleSheet, View } from "react-native";

export default function MonitoramentoMap() {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -23.5505,
          longitude: -46.6333,
          latitudeDelta: 0.3,
          longitudeDelta: 0.3,
        }}
      >
        <Marker
          coordinate={{
            latitude: -23.5505,
            longitude: -46.6333,
          }}
          title="SP-280 • KM 42"
          description="Vegetação em estado crítico"
          pinColor="red"
        />

        <Marker
          coordinate={{
            latitude: -23.5205,
            longitude: -46.6033,
          }}
          title="SP-330 • KM 89"
          description="Vegetação requer atenção"
          pinColor="orange"
        />

        <Marker
          coordinate={{
            latitude: -23.5805,
            longitude: -46.6633,
          }}
          title="SP-348 • KM 55"
          description="Vegetação em nível normal"
          pinColor="green"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
  },

  map: {
    width: "100%",
    height: "100%",
  },
});
