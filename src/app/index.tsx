import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>VERDESCAN</Text>

          <Text style={styles.subtitle}>
            Monitoramento inteligente de vegetação
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Visão geral
        </Text>

        <View style={styles.cardsContainer}>
          <View style={styles.card}>
            <Text style={styles.cardNumber}>
              12
            </Text>

            <Text style={styles.cardLabel}>
              Pontos monitorados
            </Text>
          </View>

          <View style={styles.card}>
            <Text
              style={[
                styles.cardNumber,
                styles.criticalNumber,
              ]}
            >
              3
            </Text>

            <Text style={styles.cardLabel}>
              Pontos críticos
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Mapa de monitoramento
        </Text>

        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapTitle}>
            Mapa VerdeScan
          </Text>

          <Text style={styles.mapDescription}>
            Aqui serão exibidos os pontos registrados pelas análises.
          </Text>

          <View style={styles.points}>
            <View style={styles.pointContainer}>
              <View
                style={[
                  styles.point,
                  styles.greenPoint,
                ]}
              />

              <Text style={styles.pointLabel}>
                Normal
              </Text>
            </View>

            <View style={styles.pointContainer}>
              <View
                style={[
                  styles.point,
                  styles.yellowPoint,
                ]}
              />

              <Text style={styles.pointLabel}>
                Atenção
              </Text>
            </View>

            <View style={styles.pointContainer}>
              <View
                style={[
                  styles.point,
                  styles.redPoint,
                ]}
              />

              <Text style={styles.pointLabel}>
                Crítico
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() => router.push("/analise")}
        >
          <Text style={styles.analyzeButtonText}>
            + Nova análise
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Pontos prioritários
        </Text>

        <View style={styles.priorityCard}>
          <View>
            <Text style={styles.priorityLocation}>
              SP-280 • KM 42
            </Text>

            <Text style={styles.priorityDate}>
              Última análise: hoje
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              styles.redBadge,
            ]}
          >
            <Text style={styles.statusText}>
              CRÍTICO
            </Text>
          </View>
        </View>

        <View style={styles.priorityCard}>
          <View>
            <Text style={styles.priorityLocation}>
              SP-330 • KM 89
            </Text>

            <Text style={styles.priorityDate}>
              Última análise: ontem
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              styles.redBadge,
            ]}
          >
            <Text style={styles.statusText}>
              CRÍTICO
            </Text>
          </View>
        </View>

        <View style={styles.priorityCard}>
          <View>
            <Text style={styles.priorityLocation}>
              SP-348 • KM 55
            </Text>

            <Text style={styles.priorityDate}>
              Última análise: 2 dias atrás
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              styles.yellowBadge,
            ]}
          >
            <Text style={styles.statusText}>
              ATENÇÃO
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    backgroundColor: "#164B2A",
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 28,
  },

  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    fontSize: 14,
    color: "#D8E7DC",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1D2A21",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },

  cardsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
  },

  cardNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#21894A",
  },

  criticalNumber: {
    color: "#D63E3E",
  },

  cardLabel: {
    fontSize: 14,
    color: "#5B665E",
    marginTop: 4,
  },

  mapPlaceholder: {
    marginHorizontal: 20,
    height: 260,
    borderRadius: 16,
    backgroundColor: "#DDE9DF",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  mapTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#164B2A",
  },

  mapDescription: {
    marginTop: 8,
    fontSize: 14,
    color: "#526157",
    textAlign: "center",
  },

  points: {
    flexDirection: "row",
    gap: 24,
    marginTop: 26,
  },

  pointContainer: {
    alignItems: "center",
  },

  point: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },

  greenPoint: {
    backgroundColor: "#2E9D50",
  },

  yellowPoint: {
    backgroundColor: "#E0A82E",
  },

  redPoint: {
    backgroundColor: "#D63E3E",
  },

  pointLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#526157",
  },

  analyzeButton: {
    marginHorizontal: 20,
    marginTop: 18,
    backgroundColor: "#21894A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  priorityCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  priorityLocation: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1D2A21",
  },

  priorityDate: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B756E",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  redBadge: {
    backgroundColor: "#D63E3E",
  },

  yellowBadge: {
    backgroundColor: "#E0A82E",
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

