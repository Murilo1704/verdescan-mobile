import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { carregarOcorrencias } from "../services/storage";
import { Ocorrencia } from "../types/Ocorrencia";

type ResumoRodovia = {
  rodovia: string;
  total: number;
  criticos: number;
  atencao: number;
  normais: number;
  pendentes: number;
  kmInicial: number;
  kmFinal: number;
};

export default function RodoviasScreen() {
  const [
    ocorrencias,
    setOcorrencias,
  ] = useState<Ocorrencia[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        const dados =
          await carregarOcorrencias();

        setOcorrencias(dados);
      }

      carregar();
    }, [])
  );

  const rodovias = useMemo(() => {
    const mapa = new Map<
      string,
      Ocorrencia[]
    >();

    ocorrencias.forEach(
      (ocorrencia) => {
        const nome =
          ocorrencia.rodovia
            ?.trim()
            .toUpperCase() ||
          "RODOVIA NÃO INFORMADA";

        const lista =
          mapa.get(nome) || [];

        lista.push(ocorrencia);

        mapa.set(
          nome,
          lista
        );
      }
    );

    const resultado: ResumoRodovia[] =
      Array.from(
        mapa.entries()
      ).map(
        ([rodovia, lista]) => {
          const kms = lista.map(
            (item) =>
              Number(item.km)
          );

          return {
            rodovia,

            total:
              lista.length,

            criticos:
              lista.filter(
                (item) =>
                  item.classe ===
                  "CRITICO"
              ).length,

            atencao:
              lista.filter(
                (item) =>
                  item.classe ===
                  "ATENCAO"
              ).length,

            normais:
              lista.filter(
                (item) =>
                  item.classe ===
                  "NORMAL"
              ).length,

            pendentes:
              lista.filter(
                (item) =>
                  item.status !==
                  "CONCLUIDO"
              ).length,

            kmInicial:
              Math.min(...kms),

            kmFinal:
              Math.max(...kms),
          };
        }
      );

    return resultado.sort(
      (a, b) => {
        if (
          b.criticos !==
          a.criticos
        ) {
          return (
            b.criticos -
            a.criticos
          );
        }

        if (
          b.atencao !==
          a.atencao
        ) {
          return (
            b.atencao -
            a.atencao
          );
        }

        return (
          b.total -
          a.total
        );
      }
    );
  }, [ocorrencias]);

  const totalCriticos =
    ocorrencias.filter(
      (item) =>
        item.classe ===
        "CRITICO"
    ).length;

  const totalPendentes =
    ocorrencias.filter(
      (item) =>
        item.status !==
        "CONCLUIDO"
    ).length;

  function abrirRodovia(
    rodovia: string
  ) {
    router.push({
      pathname:
        "/trecho-detalhes",

      params: {
        rodovia,
      },
    });
  }

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
        {/* CABEÇALHO */}

        <View
          style={
            styles.header
          }
        >
          <TouchableOpacity
            onPress={() =>
              router.replace("/")
            }
          >
            <Text
              style={
                styles.voltar
              }
            >
              ← Voltar
            </Text>
          </TouchableOpacity>

          <Text
            style={
              styles.titulo
            }
          >
            Rodovias
          </Text>

          <Text
            style={
              styles.subtitulo
            }
          >
            Trechos monitorados
            pelo VERDESCAN
          </Text>
        </View>

        {/* RESUMO */}

        <View
          style={
            styles.resumoContainer
          }
        >
          <View
            style={
              styles.resumoCard
            }
          >
            <Text
              style={
                styles.resumoNumero
              }
            >
              {rodovias.length}
            </Text>

            <Text
              style={
                styles.resumoTexto
              }
            >
              Rodovias
            </Text>
          </View>

          <View
            style={
              styles.resumoCard
            }
          >
            <Text
              style={[
                styles.resumoNumero,
                styles.vermelho,
              ]}
            >
              {totalCriticos}
            </Text>

            <Text
              style={
                styles.resumoTexto
              }
            >
              Críticos
            </Text>
          </View>

          <View
            style={
              styles.resumoCard
            }
          >
            <Text
              style={[
                styles.resumoNumero,
                styles.azul,
              ]}
            >
              {totalPendentes}
            </Text>

            <Text
              style={
                styles.resumoTexto
              }
            >
              Abertos
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Trechos monitorados
        </Text>

        {/* SEM DADOS */}

        {rodovias.length ===
        0 ? (
          <View
            style={
              styles.semDados
            }
          >
            <Text
              style={
                styles.semDadosTitulo
              }
            >
              Nenhuma rodovia
              cadastrada
            </Text>

            <Text
              style={
                styles.semDadosTexto
              }
            >
              Faça uma nova
              análise para
              adicionar um
              trecho ao
              monitoramento.
            </Text>

            <TouchableOpacity
              style={
                styles.botaoAnalise
              }
              onPress={() =>
                router.push(
                  "/analise"
                )
              }
            >
              <Text
                style={
                  styles.botaoAnaliseTexto
                }
              >
                + Nova análise
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          rodovias.map(
            (item) => (
              <TouchableOpacity
                key={
                  item.rodovia
                }
                style={
                  styles.cardRodovia
                }
                onPress={() =>
                  abrirRodovia(
                    item.rodovia
                  )
                }
                activeOpacity={
                  0.8
                }
              >
                <View
                  style={
                    styles.cardTopo
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.nomeRodovia
                      }
                    >
                      {
                        item.rodovia
                      }
                    </Text>

                    <Text
                      style={
                        styles.km
                      }
                    >
                      KM{" "}
                      {
                        item.kmInicial
                      }{" "}
                      até KM{" "}
                      {
                        item.kmFinal
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.seta
                    }
                  >
                    ›
                  </Text>
                </View>

                <View
                  style={
                    styles.divisor
                  }
                />

                <View
                  style={
                    styles.dadosLinha
                  }
                >
                  <View
                    style={
                      styles.dado
                    }
                  >
                    <Text
                      style={
                        styles.dadoNumero
                      }
                    >
                      {
                        item.total
                      }
                    </Text>

                    <Text
                      style={
                        styles.dadoTexto
                      }
                    >
                      Pontos
                    </Text>
                  </View>

                  <View
                    style={
                      styles.dado
                    }
                  >
                    <Text
                      style={[
                        styles.dadoNumero,
                        styles.vermelho,
                      ]}
                    >
                      {
                        item.criticos
                      }
                    </Text>

                    <Text
                      style={
                        styles.dadoTexto
                      }
                    >
                      Críticos
                    </Text>
                  </View>

                  <View
                    style={
                      styles.dado
                    }
                  >
                    <Text
                      style={[
                        styles.dadoNumero,
                        styles.amarelo,
                      ]}
                    >
                      {
                        item.atencao
                      }
                    </Text>

                    <Text
                      style={
                        styles.dadoTexto
                      }
                    >
                      Atenção
                    </Text>
                  </View>

                  <View
                    style={
                      styles.dado
                    }
                  >
                    <Text
                      style={[
                        styles.dadoNumero,
                        styles.verde,
                      ]}
                    >
                      {
                        item.normais
                      }
                    </Text>

                    <Text
                      style={
                        styles.dadoTexto
                      }
                    >
                      Normal
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.rodapeCard
                  }
                >
                  <Text
                    style={
                      styles.pendentes
                    }
                  >
                    {
                      item.pendentes
                    }{" "}
                    ocorrência
                    {item.pendentes !==
                    1
                      ? "s"
                      : ""}{" "}
                    em aberto
                  </Text>

                  <Text
                    style={
                      styles.detalhes
                    }
                  >
                    Ver detalhes
                  </Text>
                </View>
              </TouchableOpacity>
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

      paddingTop: 16,

      paddingBottom: 24,
    },

    voltar: {
      color: "#D8E7DC",

      fontSize: 14,

      fontWeight: "700",

      marginBottom: 14,
    },

    titulo: {
      color: "#FFFFFF",

      fontSize: 28,

      fontWeight: "900",
    },

    subtitulo: {
      color: "#D8E7DC",

      fontSize: 13,

      marginTop: 4,
    },

    resumoContainer: {
      flexDirection: "row",

      gap: 10,

      paddingHorizontal: 20,

      marginTop: 18,
    },

    resumoCard: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      paddingVertical: 15,

      alignItems: "center",
    },

    resumoNumero: {
      color: "#21894A",

      fontSize: 23,

      fontWeight: "900",
    },

    resumoTexto: {
      color: "#6B756E",

      fontSize: 11,

      marginTop: 3,
    },

    sectionTitle: {
      color: "#1D2A21",

      fontSize: 19,

      fontWeight: "800",

      marginHorizontal: 20,

      marginTop: 24,

      marginBottom: 12,
    },

    cardRodovia: {
      marginHorizontal: 20,

      marginBottom: 13,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 17,
    },

    cardTopo: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      alignItems: "center",
    },

    nomeRodovia: {
      color: "#1D2A21",

      fontSize: 19,

      fontWeight: "900",
    },

    km: {
      color: "#6B756E",

      fontSize: 12,

      marginTop: 4,
    },

    seta: {
      color: "#21894A",

      fontSize: 32,

      fontWeight: "400",
    },

    divisor: {
      height: 1,

      backgroundColor:
        "#EDF0ED",

      marginVertical: 14,
    },

    dadosLinha: {
      flexDirection: "row",
    },

    dado: {
      flex: 1,

      alignItems: "center",
    },

    dadoNumero: {
      color: "#344139",

      fontSize: 17,

      fontWeight: "900",
    },

    dadoTexto: {
      color: "#7A847D",

      fontSize: 9,

      marginTop: 2,
    },

    rodapeCard: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      alignItems: "center",

      marginTop: 16,
    },

    pendentes: {
      color: "#6B756E",

      fontSize: 11,
    },

    detalhes: {
      color: "#21894A",

      fontSize: 11,

      fontWeight: "800",
    },

    vermelho: {
      color: "#D63E3E",
    },

    amarelo: {
      color: "#C98E11",
    },

    verde: {
      color: "#21894A",
    },

    azul: {
      color: "#2F6FB5",
    },

    semDados: {
      marginHorizontal: 20,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 24,

      alignItems: "center",
    },

    semDadosTitulo: {
      color: "#1D2A21",

      fontSize: 17,

      fontWeight: "800",
    },

    semDadosTexto: {
      color: "#6B756E",

      fontSize: 12,

      lineHeight: 18,

      textAlign: "center",

      marginTop: 7,
    },

    botaoAnalise: {
      marginTop: 17,

      backgroundColor:
        "#21894A",

      borderRadius: 11,

      paddingHorizontal: 18,

      paddingVertical: 11,
    },

    botaoAnaliseTexto: {
      color: "#FFFFFF",

      fontSize: 13,

      fontWeight: "800",
    },
  });
  