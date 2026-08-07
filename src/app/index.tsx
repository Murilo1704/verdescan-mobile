import { router } from "expo-router";
import MonitoramentoMap from "../components/MonitoramentoMap";

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
          <Text style={styles.logo}>
            VERDESCAN
          </Text>

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

        <View style={styles.mapWrapper}>
          <MonitoramentoMap />
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendPoint,
                styles.greenPoint,
              ]}
            />

            <Text style={styles.legendText}>
              Normal
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendPoint,
                styles.yellowPoint,
              ]}
            />

            <Text style={styles.legendText}>
              Atenção
            </Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendPoint,
                styles.redPoint,
              ]}
            />

            <Text style={styles.legendText}>
              Crítico
            </Text>
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

  mapWrapper: {
    marginHorizontal: 20,
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 22,
    marginTop: 12,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  legendPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
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

  legendText: {
    fontSize: 13,
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

