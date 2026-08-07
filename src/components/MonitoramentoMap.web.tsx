import {
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function MonitoramentoMap() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Mapa VerdeScan
      </Text>

      <Text style={styles.description}>
        O mapa interativo com os pontos das análises está disponível
        no aplicativo mobile.
      </Text>

      <View style={styles.points}>
        <View style={styles.pointItem}>
          <View style={[styles.point, styles.green]} />
          <Text style={styles.label}>Normal</Text>
        </View>

        <View style={styles.pointItem}>
          <View style={[styles.point, styles.yellow]} />
          <Text style={styles.label}>Atenção</Text>
        </View>

        <View style={styles.pointItem}>
          <View style={[styles.point, styles.red]} />
          <Text style={styles.label}>Crítico</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    backgroundColor: "#DDE9DF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#164B2A",
  },

  description: {
    marginTop: 8,
    fontSize: 14,
    color: "#526157",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 420,
  },

  points: {
    flexDirection: "row",
    gap: 28,
    marginTop: 26,
  },

  pointItem: {
    alignItems: "center",
  },

  point: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  green: {
    backgroundColor: "#2E9D50",
  },

  yellow: {
    backgroundColor: "#E0A82E",
  },

  red: {
    backgroundColor: "#D63E3E",
  },

  label: {
    marginTop: 6,
    color: "#526157",
    fontSize: 12,
  },
});

