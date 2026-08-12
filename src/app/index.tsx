import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  useCallback,
  useState,
} from "react";

import MonitoramentoMap from "../components/MonitoramentoMap";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { carregarOcorrencias } from "../services/storage";
import { Ocorrencia } from "../types/Ocorrencia";


export default function HomeScreen() {
  const [
    ocorrencias,
    setOcorrencias,
  ] = useState<Ocorrencia[]>([]);


  // =========================================================
  // CARREGAR OCORRÊNCIAS SEMPRE QUE VOLTAR PARA A HOME
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        const dados =
          await carregarOcorrencias();

        setOcorrencias(
          dados
        );
      }

      carregar();
    }, [])
  );


  // =========================================================
  // CONTADORES
  // =========================================================

  const totalMonitorados =
    ocorrencias.length;

  const totalCriticos =
    ocorrencias.filter(
      (ocorrencia) =>
        ocorrencia.classe ===
        "CRITICO"
    ).length;


  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={styles.header}
        >
          <Text
            style={styles.logo}
          >
            VERDESCAN
          </Text>

          <Text
            style={styles.subtitle}
          >
            Monitoramento inteligente
            de vegetação
          </Text>
        </View>


        {/* ==================================================
            VISÃO GERAL
        ================================================== */}

        <Text
          style={styles.sectionTitle}
        >
          Visão geral
        </Text>


        <View
          style={
            styles.cardsContainer
          }
        >
          <View
            style={styles.card}
          >
            <Text
              style={
                styles.cardNumber
              }
            >
              {totalMonitorados}
            </Text>

            <Text
              style={
                styles.cardLabel
              }
            >
              Pontos monitorados
            </Text>
          </View>


          <View
            style={styles.card}
          >
            <Text
              style={[
                styles.cardNumber,
                styles.criticalNumber,
              ]}
            >
              {totalCriticos}
            </Text>

            <Text
              style={
                styles.cardLabel
              }
            >
              Pontos críticos
            </Text>
          </View>
        </View>


        {/* ==================================================
            MAPA
        ================================================== */}

        <Text
          style={styles.sectionTitle}
        >
          Mapa de monitoramento
        </Text>


        <View
          style={styles.mapWrapper}
        >
          <MonitoramentoMap />
        </View>


        {/* ==================================================
            LEGENDA
        ================================================== */}

        <View
          style={styles.legend}
        >
          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendPoint,
                styles.greenPoint,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Normal
            </Text>
          </View>


          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendPoint,
                styles.yellowPoint,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Atenção
            </Text>
          </View>


          <View
            style={
              styles.legendItem
            }
          >
            <View
              style={[
                styles.legendPoint,
                styles.redPoint,
              ]}
            />

            <Text
              style={
                styles.legendText
              }
            >
              Crítico
            </Text>
          </View>
        </View>


        {/* ==================================================
            NOVA ANÁLISE
        ================================================== */}

        <TouchableOpacity
          style={
            styles.analyzeButton
          }
          onPress={() =>
            router.push(
              "/analise"
            )
          }
        >
          <Text
            style={
              styles.analyzeButtonText
            }
          >
            + Nova análise
          </Text>
        </TouchableOpacity>


        {/* ==================================================
            PONTOS PRIORITÁRIOS
        ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Gestão das ocorrências
        </Text>


        <TouchableOpacity
          style={
            styles.priorityAccessCard
          }
          onPress={() =>
            router.push(
              "/prioridades"
            )
          }
        >
          <View
            style={
              styles.priorityAccessLeft
            }
          >
            <View
              style={
                styles.priorityIconBox
              }
            >
              <Text
                style={
                  styles.priorityIcon
                }
              >
                !
              </Text>
            </View>


            <View
              style={
                styles.priorityAccessText
              }
            >
              <Text
                style={
                  styles.priorityAccessTitle
                }
              >
                Pontos prioritários
              </Text>

              <Text
                style={
                  styles.priorityAccessDescription
                }
              >
                Consulte ocorrências por
                período e exporte os dados
                em CSV.
              </Text>
            </View>
          </View>


          <Text
            style={
              styles.arrow
            }
          >
            ›
          </Text>
        </TouchableOpacity>


        {/* ==================================================
            RESUMO
        ================================================== */}

        {totalMonitorados > 0 && (
          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryTitle
              }
            >
              Resumo das ocorrências
            </Text>


            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Total registrado
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {totalMonitorados}
              </Text>
            </View>


            <View
              style={
                styles.summaryRow
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Pontos críticos
              </Text>

              <Text
                style={[
                  styles.summaryValue,
                  styles.summaryCritical,
                ]}
              >
                {totalCriticos}
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}


// ===========================================================
// ESTILOS
// ===========================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,

      backgroundColor:
        "#F4F7F4",
    },


    content: {
      paddingBottom: 40,
    },


    // =======================================================
    // HEADER
    // =======================================================

    header: {
      backgroundColor:
        "#164B2A",

      paddingHorizontal: 22,

      paddingTop: 30,

      paddingBottom: 28,
    },


    logo: {
      fontSize: 28,

      fontWeight:
        "bold",

      color:
        "#FFFFFF",
    },


    subtitle: {
      fontSize: 14,

      color:
        "#D8E7DC",

      marginTop: 4,
    },


    // =======================================================
    // TÍTULOS
    // =======================================================

    sectionTitle: {
      fontSize: 20,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginHorizontal: 20,

      marginTop: 24,

      marginBottom: 12,
    },


    // =======================================================
    // CARDS VISÃO GERAL
    // =======================================================

    cardsContainer: {
      flexDirection:
        "row",

      gap: 12,

      paddingHorizontal: 20,
    },


    card: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",

      padding: 18,

      borderRadius: 14,
    },


    cardNumber: {
      fontSize: 28,

      fontWeight:
        "bold",

      color:
        "#21894A",
    },


    criticalNumber: {
      color:
        "#D63E3E",
    },


    cardLabel: {
      fontSize: 14,

      color:
        "#5B665E",

      marginTop: 4,
    },


    // =======================================================
    // MAPA
    // =======================================================

    mapWrapper: {
      marginHorizontal: 20,
    },


    legend: {
      flexDirection:
        "row",

      justifyContent:
        "center",

      gap: 22,

      marginTop: 12,
    },


    legendItem: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },


    legendPoint: {
      width: 10,

      height: 10,

      borderRadius: 5,

      marginRight: 6,
    },


    greenPoint: {
      backgroundColor:
        "#2E9D50",
    },


    yellowPoint: {
      backgroundColor:
        "#E0A82E",
    },


    redPoint: {
      backgroundColor:
        "#D63E3E",
    },


    legendText: {
      fontSize: 13,

      color:
        "#526157",
    },


    // =======================================================
    // NOVA ANÁLISE
    // =======================================================

    analyzeButton: {
      marginHorizontal: 20,

      marginTop: 18,

      backgroundColor:
        "#21894A",

      paddingVertical: 16,

      borderRadius: 14,

      alignItems:
        "center",
    },


    analyzeButtonText: {
      color:
        "#FFFFFF",

      fontSize: 17,

      fontWeight:
        "bold",
    },


    // =======================================================
    // ACESSO AOS PONTOS PRIORITÁRIOS
    // =======================================================

    priorityAccessCard: {
      marginHorizontal: 20,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 18,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },


    priorityAccessLeft: {
      flex: 1,

      flexDirection:
        "row",

      alignItems:
        "center",
    },


    priorityIconBox: {
      width: 46,

      height: 46,

      borderRadius: 23,

      backgroundColor:
        "#FDEAEA",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 14,
    },


    priorityIcon: {
      color:
        "#D63E3E",

      fontSize: 22,

      fontWeight:
        "bold",
    },


    priorityAccessText: {
      flex: 1,
    },


    priorityAccessTitle: {
      fontSize: 17,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    priorityAccessDescription: {
      marginTop: 4,

      fontSize: 13,

      lineHeight: 18,

      color:
        "#6B756E",
    },


    arrow: {
      fontSize: 32,

      color:
        "#21894A",

      marginLeft: 10,
    },


    // =======================================================
    // RESUMO
    // =======================================================

    summaryCard: {
      marginHorizontal: 20,

      marginTop: 14,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      padding: 18,
    },


    summaryTitle: {
      fontSize: 15,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom: 8,
    },


    summaryRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      paddingVertical: 7,
    },


    summaryLabel: {
      fontSize: 13,

      color:
        "#6B756E",
    },


    summaryValue: {
      fontSize: 14,

      fontWeight:
        "bold",

      color:
        "#21894A",
    },


    summaryCritical: {
      color:
        "#D63E3E",
    },

  });
  