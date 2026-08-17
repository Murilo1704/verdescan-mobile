import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";

import {
  useCallback,
  useState,
} from "react";

import {
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  carregarOcorrencias,
  removerOcorrencia,
} from "../services/storage";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


// ============================================================
// FORMATAR DATA
// ============================================================

function formatarDataHora(
  dataIso: string
) {
  const data =
    new Date(
      dataIso
    );


  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return dataIso;
  }


  return data.toLocaleString(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,
    }
  );
}


// ============================================================
// CLASSE
// ============================================================

function nomeClasse(
  classe:
    Ocorrencia["classe"]
) {
  if (
    classe ===
    "CRITICO"
  ) {
    return "CRÍTICO";
  }


  if (
    classe ===
    "ATENCAO"
  ) {
    return "ATENÇÃO";
  }


  return "NORMAL";
}


// ============================================================
// STATUS
// ============================================================

function nomeStatus(
  status:
    Ocorrencia["status"]
) {
  if (
    status ===
    "EM_ANDAMENTO"
  ) {
    return "EM ANDAMENTO";
  }


  if (
    status ===
    "CONCLUIDO"
  ) {
    return "CONCLUÍDO";
  }


  return "PENDENTE";
}


// ============================================================
// TELA
// ============================================================

export default function TrechoDetalhesScreen() {

  const params =
    useLocalSearchParams<{
      rodovia?: string;
    }>();


  const rodovia =
    typeof params.rodovia ===
    "string"
      ? params.rodovia
      : "";


  const [
    ocorrencias,
    setOcorrencias,
  ] =
    useState<Ocorrencia[]>(
      []
    );


  // ==========================================================
  // CARREGAR HISTÓRICO
  // ==========================================================

  const carregar = useCallback(
    async () => {

      const dados =
        await carregarOcorrencias();


      const filtradas =
        dados
          .filter(
            (item) =>
              item.rodovia
                .trim()
                .toUpperCase() ===
              rodovia
                .trim()
                .toUpperCase()
          )
          .sort(
            (a, b) =>
              new Date(
                b.data
              ).getTime() -
              new Date(
                a.data
              ).getTime()
          );


      setOcorrencias(
        filtradas
      );

    },
    [
      rodovia,
    ]
  );


  useFocusEffect(
    useCallback(() => {

      carregar();

    }, [
      carregar,
    ])
  );


  // ==========================================================
  // EXCLUIR
  // ==========================================================

  async function excluirOcorrencia(
    id: string
  ) {
    try {

      await removerOcorrencia(
        id
      );


      setOcorrencias(
        (dadosAtuais) =>
          dadosAtuais.filter(
            (item) =>
              item.id !== id
          )
      );


    } catch (error) {

      console.error(
        "Erro ao excluir ocorrência:",
        error
      );


      if (
        Platform.OS ===
        "web"
      ) {
        alert(
          "Não foi possível excluir a ocorrência."
        );

        return;
      }


      Alert.alert(
        "Erro",
        "Não foi possível excluir a ocorrência."
      );
    }
  }


  // ==========================================================
  // CONFIRMAR EXCLUSÃO
  // ==========================================================

  function confirmarExclusao(
    ocorrencia:
      Ocorrencia
  ) {

    const mensagem =
      `Deseja excluir a ocorrência da ${rodovia} no KM ${ocorrencia.km}?`;


    if (
      Platform.OS ===
      "web"
    ) {

      const confirmou =
        window.confirm(
          mensagem
        );


      if (
        confirmou
      ) {
        excluirOcorrencia(
          ocorrencia.id
        );
      }


      return;
    }


    Alert.alert(
      "Excluir ocorrência",
      mensagem,
      [
        {
          text:
            "Cancelar",

          style:
            "cancel",
        },

        {
          text:
            "Excluir",

          style:
            "destructive",

          onPress:
            () =>
              excluirOcorrencia(
                ocorrencia.id
              ),
        },
      ]
    );
  }


  // ==========================================================
  // RESUMO
  // ==========================================================

  const totalCriticos =
    ocorrencias.filter(
      (item) =>
        item.classe ===
        "CRITICO"
    ).length;


  // ==========================================================
  // INTERFACE
  // ==========================================================

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

        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >

          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >

            <Text
              style={
                styles.backButtonText
              }
            >
              ← Trechos
            </Text>

          </Pressable>


          <Text
            style={
              styles.title
            }
          >
            {rodovia}
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            Histórico de análises da rodovia
          </Text>

        </View>


        {/* RESUMO */}

        <View
          style={
            styles.summaryRow
          }
        >

          <View
            style={
              styles.summaryCard
            }
          >

            <Text
              style={
                styles.summaryNumber
              }
            >
              {
                ocorrencias.length
              }
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Análises
            </Text>

          </View>


          <View
            style={
              styles.summaryCard
            }
          >

            <Text
              style={[
                styles.summaryNumber,
                styles.criticalNumber,
              ]}
            >
              {
                totalCriticos
              }
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Críticas
            </Text>

          </View>

        </View>


        {/* HISTÓRICO */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Histórico
        </Text>


        {
          ocorrencias.length ===
          0 ? (

            <View
              style={
                styles.emptyCard
              }
            >

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Nenhuma análise encontrada
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Novas análises desta rodovia aparecerão aqui.
              </Text>

            </View>

          ) : (

            ocorrencias.map(
              (
                ocorrencia
              ) => (

                <View
                  key={
                    ocorrencia.id
                  }
                  style={
                    styles.card
                  }
                >

                  {/* TOPO */}

                  <View
                    style={
                      styles.cardTop
                    }
                  >

                    <View>

                      <Text
                        style={
                          styles.km
                        }
                      >
                        KM{" "}
                        {
                          ocorrencia.km
                        }
                      </Text>


                      <Text
                        style={
                          styles.date
                        }
                      >
                        {
                          formatarDataHora(
                            ocorrencia.data
                          )
                        }
                      </Text>

                    </View>


                    <View
                      style={[
                        styles.badge,

                        ocorrencia.classe ===
                        "CRITICO"
                          ?
                          styles.criticalBadge

                          :

                          ocorrencia.classe ===
                          "ATENCAO"
                            ?
                            styles.attentionBadge

                            :
                            styles.normalBadge,
                      ]}
                    >

                      <Text
                        style={
                          styles.badgeText
                        }
                      >
                        {
                          nomeClasse(
                            ocorrencia.classe
                          )
                        }
                      </Text>

                    </View>

                  </View>


                  {/* DETALHES */}

                  <View
                    style={
                      styles.detailsBox
                    }
                  >

                    <View
                      style={
                        styles.detailRow
                      }
                    >

                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Confiança IA
                      </Text>


                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          (
                            ocorrencia
                              .confianca *
                            100
                          ).toFixed(
                            2
                          )
                        }
                        %
                      </Text>

                    </View>


                    <View
                      style={
                        styles.detailRow
                      }
                    >

                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Status
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          nomeStatus(
                            ocorrencia.status
                          )
                        }
                      </Text>

                    </View>


                    <View
                      style={
                        styles.detailRow
                      }
                    >

                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Latitude
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          ocorrencia.latitude
                            .toFixed(
                              6
                            )
                        }
                      </Text>

                    </View>


                    <View
                      style={
                        styles.detailRow
                      }
                    >

                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Longitude
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          ocorrencia.longitude
                            .toFixed(
                              6
                            )
                        }
                      </Text>

                    </View>

                  </View>


                  {/* FOTO */}

                  {
                    ocorrencia.imagem &&
                    (
                      <Image
                        source={{
                          uri:
                            ocorrencia.imagem,
                        }}
                        style={
                          styles.image
                        }
                      />
                    )
                  }


                  {/* EXCLUIR */}

                  <Pressable
                    style={
                      styles.deleteButton
                    }
                    onPress={() =>
                      confirmarExclusao(
                        ocorrencia
                      )
                    }
                  >

                    <Text
                      style={
                        styles.deleteButtonText
                      }
                    >
                      Excluir ocorrência
                    </Text>

                  </Pressable>

                </View>

              )
            )
          )
        }

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
      flex:
        1,

      backgroundColor:
        "#F4F7F4",
    },


    content: {
      paddingBottom:
        40,
    },


    header: {
      backgroundColor:
        "#164B2A",

      paddingHorizontal:
        20,

      paddingTop:
        20,

      paddingBottom:
        28,
    },


    backButton: {
      alignSelf:
        "flex-start",

      marginBottom:
        18,

      paddingVertical:
        8,

      paddingHorizontal:
        12,

      backgroundColor:
        "rgba(255,255,255,0.12)",

      borderRadius:
        10,
    },


    backButtonText: {
      color:
        "#FFFFFF",

      fontSize:
        15,

      fontWeight:
        "600",
    },


    title: {
      color:
        "#FFFFFF",

      fontSize:
        24,

      fontWeight:
        "bold",
    },


    subtitle: {
      marginTop:
        5,

      color:
        "#D8E7DC",

      fontSize:
        14,
    },


    summaryRow: {
      flexDirection:
        "row",

      paddingHorizontal:
        20,

      gap:
        12,

      marginTop:
        22,
    },


    summaryCard: {
      flex:
        1,

      backgroundColor:
        "#FFFFFF",

      padding:
        17,

      borderRadius:
        14,
    },


    summaryNumber: {
      fontSize:
        25,

      fontWeight:
        "bold",

      color:
        "#21894A",
    },


    criticalNumber: {
      color:
        "#D63E3E",
    },


    summaryLabel: {
      marginTop:
        3,

      fontSize:
        13,

      color:
        "#6B756E",
    },


    sectionTitle: {
      marginHorizontal:
        20,

      marginTop:
        24,

      marginBottom:
        12,

      fontSize:
        19,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    card: {
      marginHorizontal:
        20,

      marginBottom:
        14,

      backgroundColor:
        "#FFFFFF",

      borderRadius:
        16,

      padding:
        17,
    },


    cardTop: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",
    },


    km: {
      fontSize:
        18,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    date: {
      marginTop:
        4,

      fontSize:
        12,

      color:
        "#6B756E",
    },


    badge: {
      paddingHorizontal:
        10,

      paddingVertical:
        7,

      borderRadius:
        20,
    },


    criticalBadge: {
      backgroundColor:
        "#D63E3E",
    },


    attentionBadge: {
      backgroundColor:
        "#E0A82E",
    },


    normalBadge: {
      backgroundColor:
        "#2E9D50",
    },


    badgeText: {
      color:
        "#FFFFFF",

      fontSize:
        11,

      fontWeight:
        "bold",
    },


    detailsBox: {
      marginTop:
        15,

      backgroundColor:
        "#F7F9F7",

      borderRadius:
        12,

      padding:
        13,
    },


    detailRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      paddingVertical:
        5,
    },


    detailLabel: {
      color:
        "#6B756E",

      fontSize:
        12,
    },


    detailValue: {
      color:
        "#1D2A21",

      fontSize:
        12,

      fontWeight:
        "bold",
    },


    image: {
      width:
        "100%",

      height:
        180,

      marginTop:
        14,

      borderRadius:
        12,
    },


    deleteButton: {
      marginTop:
        16,

      borderWidth:
        1,

      borderColor:
        "#D63E3E",

      backgroundColor:
        "#FFF5F5",

      borderRadius:
        10,

      paddingVertical:
        12,

      alignItems:
        "center",
    },


    deleteButtonText: {
      color:
        "#C73232",

      fontSize:
        14,

      fontWeight:
        "bold",
    },


    emptyCard: {
      marginHorizontal:
        20,

      backgroundColor:
        "#FFFFFF",

      padding:
        24,

      borderRadius:
        14,

      alignItems:
        "center",
    },


    emptyTitle: {
      fontSize:
        16,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    emptyText: {
      marginTop:
        6,

      color:
        "#6B756E",

      fontSize:
        13,

      textAlign:
        "center",
    },

  });

  