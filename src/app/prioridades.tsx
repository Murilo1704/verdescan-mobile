import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { carregarOcorrencias } from "../services/storage";
import { Ocorrencia } from "../types/Ocorrencia";

function prioridadeClasse(
  classe: Ocorrencia["classe"]
) {
  if (classe === "CRITICO") {
    return 3;
  }

  if (classe === "ATENCAO") {
    return 2;
  }

  return 1;
}

export default function PrioridadesScreen() {
  const [ocorrencias, setOcorrencias] =
    useState<Ocorrencia[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        const dados =
          await carregarOcorrencias();

        const agora = new Date();

        const mesAtual =
          agora.getMonth();

        const anoAtual =
          agora.getFullYear();

        const filtradas = dados.filter(
          (ocorrencia) => {
            const data =
              new Date(
                ocorrencia.data
              );

            return (
              data.getMonth() ===
                mesAtual &&
              data.getFullYear() ===
                anoAtual
            );
          }
        );

        filtradas.sort(
          (a, b) => {
            const prioridadeA =
              prioridadeClasse(
                a.classe
              );

            const prioridadeB =
              prioridadeClasse(
                b.classe
              );

            if (
              prioridadeA !==
              prioridadeB
            ) {
              return (
                prioridadeB -
                prioridadeA
              );
            }

            return (
              b.confianca -
              a.confianca
            );
          }
        );

        setOcorrencias(
          filtradas
        );
      }

      carregar();
    }, [])
  );

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
      >
        <View
          style={styles.header}
        >
          <Text
            style={styles.title}
          >
            Prioridades do mês
          </Text>

          <Text
            style={styles.subtitle}
          >
            Áreas com maior prioridade
            de intervenção
          </Text>
        </View>

        {ocorrencias.length ===
        0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyTitle}
            >
              Nenhuma ocorrência
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Ainda não existem
              análises registradas
              neste mês.
            </Text>
          </View>
        ) : (
          ocorrencias.map(
            (ocorrencia) => (
              <View
                key={
                  ocorrencia.id
                }
                style={
                  styles.card
                }
              >
                <View
                  style={
                    styles.cardLeft
                  }
                >
                  <Text
                    style={
                      styles.location
                    }
                  >
                    {
                      ocorrencia.rodovia
                    }{" "}
                    • KM{" "}
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
                      ocorrencia.data
                    }
                  </Text>

                  <Text
                    style={
                      styles.confidence
                    }
                  >
                    Confiança:{" "}
                    {(
                      ocorrencia.confianca *
                      100
                    ).toFixed(1)}
                    %
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,

                    ocorrencia.classe ===
                    "CRITICO"
                      ? styles.criticalBadge
                      : ocorrencia.classe ===
                          "ATENCAO"
                        ? styles.attentionBadge
                        : styles.normalBadge,
                  ]}
                >
                  <Text
                    style={
                      styles.badgeText
                    }
                  >
                    {
                      ocorrencia.classe
                    }
                  </Text>
                </View>
              </View>
            )
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

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

      paddingHorizontal: 20,
      paddingTop: 30,
      paddingBottom: 28,
    },

    title: {
      color: "#FFFFFF",
      fontSize: 26,
      fontWeight: "bold",
    },

    subtitle: {
      color: "#D8E7DC",
      marginTop: 5,
      fontSize: 14,
    },

    card: {
      marginHorizontal: 20,
      marginTop: 14,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,
      padding: 16,

      flexDirection: "row",
      justifyContent:
        "space-between",

      alignItems: "center",
    },

    cardLeft: {
      flex: 1,
      paddingRight: 10,
    },

    location: {
      fontSize: 17,
      fontWeight: "bold",
      color: "#1D2A21",
    },

    date: {
      marginTop: 5,
      color: "#6B756E",
      fontSize: 13,
    },

    confidence: {
      marginTop: 5,
      color: "#526157",
      fontSize: 13,
    },

    badge: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 20,
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
      color: "#FFFFFF",
      fontWeight: "bold",
      fontSize: 11,
    },

    emptyCard: {
      marginHorizontal: 20,
      marginTop: 24,
      backgroundColor:
        "#FFFFFF",

      padding: 24,
      borderRadius: 14,
      alignItems: "center",
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: "bold",
      color: "#1D2A21",
    },

    emptyText: {
      marginTop: 6,
      textAlign: "center",
      color: "#6B756E",
    },
  });