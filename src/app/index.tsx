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
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  carregarOcorrencias,
} from "../services/storage";

import {
  carregarUsuarioLogado,
  fazerLogout,
  UsuarioLogado,
} from "../services/auth";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


export default function HomeScreen() {
  const [
    ocorrencias,
    setOcorrencias,
  ] =
    useState<Ocorrencia[]>(
      []
    );

  const [
    usuario,
    setUsuario,
  ] =
    useState<UsuarioLogado | null>(
      null
    );


  // =========================================================
  // CARREGAR DADOS
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        const dados =
          await carregarOcorrencias();

        const usuarioAtual =
          await carregarUsuarioLogado();

        setOcorrencias(
          dados
        );

        setUsuario(
          usuarioAtual
        );
      }

      carregar();
    }, [])
  );


  // =========================================================
  // LOGOUT
  // =========================================================

  async function confirmarLogout() {
    if (
      Platform.OS ===
      "web"
    ) {
      const confirmar =
        window.confirm(
          "Deseja sair do VerdeScan?"
        );

      if (!confirmar) {
        return;
      }

      await sair();

      return;
    }


    Alert.alert(
      "Sair",
      "Deseja sair do VerdeScan?",
      [
        {
          text:
            "Cancelar",

          style:
            "cancel",
        },

        {
          text:
            "Sair",

          style:
            "destructive",

          onPress:
            sair,
        },
      ]
    );
  }


  async function sair() {
    await fazerLogout();

    router.replace(
      "/login"
    );
  }


  // =========================================================
  // CONTADORES REAIS
  // =========================================================

  const totalMonitorados =
    ocorrencias.length;


  const totalCriticos =
    ocorrencias.filter(
      (ocorrencia) =>
        ocorrencia.classe ===
        "CRITICO"
    ).length;


  const totalRodovias =
    new Set(
      ocorrencias.map(
        (ocorrencia) =>
          ocorrencia.rodovia
            .trim()
            .toUpperCase()
      )
    ).size;


  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }
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
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerTop
            }
          >
            <View
              style={
                styles.headerCopy
              }
            >
              <Text
                style={
                  styles.logo
                }
              >
                VERDESCAN
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                Monitoramento inteligente
                de vegetação
              </Text>
            </View>


            <TouchableOpacity
              style={
                styles.logoutButton
              }
              onPress={
                confirmarLogout
              }
            >
              <Text
                style={
                  styles.logoutButtonText
                }
              >
                Sair
              </Text>
            </TouchableOpacity>
          </View>


          <View
            style={
              styles.operatorBox
            }
          >
            <View
              style={
                styles.operatorAvatar
              }
            >
              <Text
                style={
                  styles.operatorAvatarText
                }
              >
                OM
              </Text>
            </View>


            <View>
              <Text
                style={
                  styles.operatorLabel
                }
              >
                Operador conectado
              </Text>

              <Text
                style={
                  styles.operatorName
                }
              >
                {usuario?.nome ??
                  "Operador Master"}
              </Text>
            </View>
          </View>
        </View>


        {/* ==================================================
            VISÃO GERAL
        ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Visão geral
        </Text>


        <View
          style={
            styles.cardsContainer
          }
        >
          <View
            style={
              styles.card
            }
          >
            <Text
              style={
                styles.cardNumber
              }
            >
              {
                totalMonitorados
              }
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
            style={
              styles.card
            }
          >
            <Text
              style={[
                styles.cardNumber,
                styles.criticalNumber,
              ]}
            >
              {
                totalCriticos
              }
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
          style={
            styles.sectionTitle
          }
        >
          Mapa de monitoramento
        </Text>


        <View
          style={
            styles.mapWrapper
          }
        >
          <MonitoramentoMap
            ocorrencias={
              ocorrencias
            }
          />
        </View>


        <View
          style={
            styles.legend
          }
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
            GESTÃO
        ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Gestão das ocorrências
        </Text>


        {/* TRECHOS MONITORADOS */}

        <TouchableOpacity
          style={
            styles.managementCard
          }
          onPress={() =>
            router.push(
              "/rodovias"
            )
          }
        >
          <View
            style={
              styles.managementLeft
            }
          >
            <View
              style={
                styles.roadIconBox
              }
            >
              <Text
                style={
                  styles.roadIcon
                }
              >
                R
              </Text>
            </View>


            <View
              style={
                styles.managementText
              }
            >
              <Text
                style={
                  styles.managementTitle
                }
              >
                Trechos monitorados
              </Text>

              <Text
                style={
                  styles.managementDescription
                }
              >
                Consulte o histórico
                agrupado por rodovia.
              </Text>

              <Text
                style={
                  styles.managementExtra
                }
              >
                {totalRodovias}{" "}
                {totalRodovias === 1
                  ? "rodovia registrada"
                  : "rodovias registradas"}
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


        {/* PONTOS PRIORITÁRIOS */}

        <TouchableOpacity
          style={[
            styles.managementCard,
            styles.secondManagementCard,
          ]}
          onPress={() =>
            router.push(
              "/prioridades"
            )
          }
        >
          <View
            style={
              styles.managementLeft
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
                styles.managementText
              }
            >
              <Text
                style={
                  styles.managementTitle
                }
              >
                Pontos prioritários
              </Text>

              <Text
                style={
                  styles.managementDescription
                }
              >
                Consulte ocorrências por
                período e exporte os dados
                em CSV.
              </Text>

              <Text
                style={
                  styles.managementExtraCritical
                }
              >
                {totalCriticos}{" "}
                {totalCriticos === 1
                  ? "ponto crítico"
                  : "pontos críticos"}
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
                {
                  totalMonitorados
                }
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
                Rodovias monitoradas
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {
                  totalRodovias
                }
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
                {
                  totalCriticos
                }
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}


// ============================================================
// ESTILOS
// ============================================================

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


    header: {
      backgroundColor:
        "#164B2A",

      paddingHorizontal: 22,

      paddingTop: 24,

      paddingBottom: 24,
    },


    headerTop: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      justifyContent:
        "space-between",
    },


    headerCopy: {
      flex: 1,

      paddingRight: 15,
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


    logoutButton: {
      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.30)",

      borderRadius: 10,

      paddingHorizontal: 15,

      paddingVertical: 9,

      backgroundColor:
        "rgba(255,255,255,0.10)",
    },


    logoutButtonText: {
      color:
        "#FFFFFF",

      fontSize: 13,

      fontWeight:
        "bold",
    },


    operatorBox: {
      marginTop: 20,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "rgba(255,255,255,0.09)",

      borderRadius: 13,

      padding: 12,
    },


    operatorAvatar: {
      width: 40,

      height: 40,

      borderRadius: 20,

      backgroundColor:
        "#21894A",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 11,
    },


    operatorAvatarText: {
      color:
        "#FFFFFF",

      fontWeight:
        "bold",

      fontSize: 13,
    },


    operatorLabel: {
      color:
        "#AAC7B3",

      fontSize: 11,
    },


    operatorName: {
      color:
        "#FFFFFF",

      fontSize: 14,

      fontWeight:
        "bold",

      marginTop: 2,
    },


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


    managementCard: {
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


    secondManagementCard: {
      marginTop: 12,
    },


    managementLeft: {
      flex: 1,

      flexDirection:
        "row",

      alignItems:
        "center",
    },


    managementText: {
      flex: 1,
    },


    roadIconBox: {
      width: 46,

      height: 46,

      borderRadius: 23,

      backgroundColor:
        "#E5F2E9",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 14,
    },


    roadIcon: {
      color:
        "#21894A",

      fontSize: 19,

      fontWeight:
        "bold",
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


    managementTitle: {
      fontSize: 17,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    managementDescription: {
      marginTop: 4,

      fontSize: 13,

      lineHeight: 18,

      color:
        "#6B756E",
    },


    managementExtra: {
      marginTop: 6,

      fontSize: 11,

      fontWeight:
        "600",

      color:
        "#21894A",
    },


    managementExtraCritical: {
      marginTop: 6,

      fontSize: 11,

      fontWeight:
        "600",

      color:
        "#D63E3E",
    },


    arrow: {
      fontSize: 32,

      color:
        "#21894A",

      marginLeft: 10,
    },


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

  