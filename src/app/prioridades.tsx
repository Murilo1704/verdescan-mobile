import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  useCallback,
  useState,
} from "react";

import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  File,
  Paths,
} from "expo-file-system";

import * as Sharing from "expo-sharing";

import {
  carregarOcorrencias,
} from "../services/storage";

import {
  gerarCSV,
} from "../services/csv";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


// ============================================================
// PRIORIDADE DAS CLASSES
// ============================================================

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


// ============================================================
// FORMATAR DATA
// ============================================================

function formatarData(
  dataIso: string
) {
  const data =
    new Date(dataIso);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return dataIso;
  }

  return data.toLocaleDateString(
    "pt-BR"
  );
}


// ============================================================
// TEXTO DD/MM/AAAA → DATE
// ============================================================

function converterData(
  texto: string,
  fimDoDia = false
) {
  const partes =
    texto
      .trim()
      .split("/");

  if (
    partes.length !== 3
  ) {
    return null;
  }

  const dia =
    Number(partes[0]);

  const mes =
    Number(partes[1]);

  let ano =
    Number(partes[2]);


  // Permite digitar:
  // 01/07/26
  // ou
  // 01/07/2026

  if (
    partes[2].length === 2
  ) {
    ano += 2000;
  }


  if (
    !Number.isInteger(dia) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(ano)
  ) {
    return null;
  }


  const data =
    new Date(
      ano,
      mes - 1,
      dia,
      fimDoDia ? 23 : 0,
      fimDoDia ? 59 : 0,
      fimDoDia ? 59 : 0,
      fimDoDia ? 999 : 0
    );


  // Evita aceitar datas impossíveis,
  // como 31/02/2026.

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }


  return data;
}


// ============================================================
// PERÍODO PADRÃO = MÊS ATUAL
// ============================================================

function obterPeriodoPadrao() {
  const hoje =
    new Date();

  const primeiroDia =
    new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      1
    );

  const ultimoDia =
    new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      0
    );


  const formatar = (
    data: Date
  ) => {
    const dia =
      String(
        data.getDate()
      ).padStart(
        2,
        "0"
      );

    const mes =
      String(
        data.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const ano =
      data.getFullYear();

    return `${dia}/${mes}/${ano}`;
  };


  return {
    inicio:
      formatar(
        primeiroDia
      ),

    fim:
      formatar(
        ultimoDia
      ),
  };
}


// ============================================================
// TELA
// ============================================================

export default function PrioridadesScreen() {
  const periodoPadrao =
    obterPeriodoPadrao();


  const [
    todasOcorrencias,
    setTodasOcorrencias,
  ] =
    useState<Ocorrencia[]>(
      []
    );


  const [
    ocorrenciasFiltradas,
    setOcorrenciasFiltradas,
  ] =
    useState<Ocorrencia[]>(
      []
    );


  const [
    dataInicial,
    setDataInicial,
  ] =
    useState(
      periodoPadrao.inicio
    );


  const [
    dataFinal,
    setDataFinal,
  ] =
    useState(
      periodoPadrao.fim
    );


  const [
    exportando,
    setExportando,
  ] =
    useState(false);


  // =========================================================
  // ORDENAR
  // =========================================================

  function ordenarOcorrencias(
    lista: Ocorrencia[]
  ) {
    return [...lista].sort(
      (a, b) => {
        const prioridadeA =
          prioridadeClasse(
            a.classe
          );

        const prioridadeB =
          prioridadeClasse(
            b.classe
          );


        // Primeiro:
        // CRÍTICO → ATENÇÃO → NORMAL

        if (
          prioridadeA !==
          prioridadeB
        ) {
          return (
            prioridadeB -
            prioridadeA
          );
        }


        // Mesma classe:
        // maior confiança primeiro

        if (
          a.confianca !==
          b.confianca
        ) {
          return (
            b.confianca -
            a.confianca
          );
        }


        // Depois:
        // mais recente primeiro

        return (
          new Date(
            b.data
          ).getTime() -
          new Date(
            a.data
          ).getTime()
        );
      }
    );
  }


  // =========================================================
  // FILTRAR
  // =========================================================

  function aplicarFiltro(
    dados = todasOcorrencias
  ) {
    const inicio =
      converterData(
        dataInicial,
        false
      );

    const fim =
      converterData(
        dataFinal,
        true
      );


    if (
      !inicio ||
      !fim
    ) {
      mostrarMensagem(
        "Data inválida",
        "Informe as datas no formato DD/MM/AAAA. Exemplo: 01/07/2026."
      );

      return;
    }


    if (
      inicio.getTime() >
      fim.getTime()
    ) {
      mostrarMensagem(
        "Período inválido",
        "A data inicial não pode ser posterior à data final."
      );

      return;
    }


    const filtradas =
      dados.filter(
        (ocorrencia) => {
          const data =
            new Date(
              ocorrencia.data
            );

          const timestamp =
            data.getTime();


          return (
            timestamp >=
              inicio.getTime() &&
            timestamp <=
              fim.getTime()
          );
        }
      );


    setOcorrenciasFiltradas(
      ordenarOcorrencias(
        filtradas
      )
    );
  }


  // =========================================================
  // CARREGAR STORAGE
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        const dados =
          await carregarOcorrencias();

        setTodasOcorrencias(
          dados
        );


        const inicio =
          converterData(
            dataInicial,
            false
          );

        const fim =
          converterData(
            dataFinal,
            true
          );


        if (
          !inicio ||
          !fim
        ) {
          setOcorrenciasFiltradas(
            ordenarOcorrencias(
              dados
            )
          );

          return;
        }


        const filtradas =
          dados.filter(
            (ocorrencia) => {
              const data =
                new Date(
                  ocorrencia.data
                );

              return (
                data.getTime() >=
                  inicio.getTime() &&
                data.getTime() <=
                  fim.getTime()
              );
            }
          );


        setOcorrenciasFiltradas(
          ordenarOcorrencias(
            filtradas
          )
        );
      }


      carregar();
    }, [])
  );


  // =========================================================
  // MENSAGEM
  // =========================================================

  function mostrarMensagem(
    titulo: string,
    mensagem: string
  ) {
    if (
      Platform.OS === "web"
    ) {
      alert(
        `${titulo}\n\n${mensagem}`
      );

      return;
    }


    Alert.alert(
      titulo,
      mensagem
    );
  }


  // =========================================================
  // VOLTAR
  // =========================================================

  function voltarInicio() {
    router.replace("/");
  }


  // =========================================================
  // EXPORTAR CSV
  // =========================================================

  async function exportarCSV() {
    if (
      ocorrenciasFiltradas.length ===
      0
    ) {
      mostrarMensagem(
        "Nenhum dado",
        "Não existem ocorrências no período selecionado para exportar."
      );

      return;
    }


    try {
      setExportando(
        true
      );


      // Usa exatamente os dados
      // filtrados na tela.

      const conteudoCSV =
        gerarCSV(
          ocorrenciasFiltradas
        );


      // BOM UTF-8 ajuda Excel
      // a reconhecer acentos corretamente.

      const csvFinal =
        `\uFEFF${conteudoCSV}`;


      // =====================================================
      // WEB
      // =====================================================

      if (
        Platform.OS === "web"
      ) {
        const blob =
          new Blob(
            [csvFinal],
            {
              type:
                "text/csv;charset=utf-8;",
            }
          );


        const url =
          URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            "a"
          );


        link.href =
          url;

        link.download =
          `verdescan_${dataInicial.replace(
            /\//g,
            "-"
          )}_a_${dataFinal.replace(
            /\//g,
            "-"
          )}.csv`;


        document.body.appendChild(
          link
        );


        link.click();


        document.body.removeChild(
          link
        );


        URL.revokeObjectURL(
          url
        );


        mostrarMensagem(
          "CSV gerado",
          "O arquivo CSV do período selecionado foi gerado com sucesso."
        );


        return;
      }


      // =====================================================
      // IPHONE / ANDROID
      // =====================================================

      const nomeArquivo =
        `verdescan_${Date.now()}.csv`;


      const arquivo =
        new File(
          Paths.cache,
          nomeArquivo
        );


      arquivo.create();


      arquivo.write(
        csvFinal
      );


      const compartilhamentoDisponivel =
        await Sharing
          .isAvailableAsync();


      if (
        !compartilhamentoDisponivel
      ) {
        mostrarMensagem(
          "Compartilhamento indisponível",
          "Não foi possível abrir as opções de compartilhamento neste dispositivo."
        );

        return;
      }


      await Sharing.shareAsync(
        arquivo.uri
      );


    } catch (erro) {
      console.error(
        "Erro ao exportar CSV:",
        erro
      );


      mostrarMensagem(
        "Erro ao exportar",
        "Não foi possível gerar o arquivo CSV."
      );


    } finally {
      setExportando(
        false
      );
    }
  }


  // =========================================================
  // CONTADORES
  // =========================================================

  const totalCriticos =
    ocorrenciasFiltradas.filter(
      (item) =>
        item.classe ===
        "CRITICO"
    ).length;


  const totalAtencao =
    ocorrenciasFiltradas.filter(
      (item) =>
        item.classe ===
        "ATENCAO"
    ).length;


  const totalNormal =
    ocorrenciasFiltradas.filter(
      (item) =>
        item.classe ===
        "NORMAL"
    ).length;


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
        keyboardShouldPersistTaps=
          "handled"
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={
              voltarInicio
            }
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              ← Início
            </Text>
          </Pressable>


          <Text
            style={
              styles.title
            }
          >
            Pontos prioritários
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            Consulte e exporte as
            ocorrências por período
          </Text>
        </View>


        {/* ==================================================
            FILTRO DE PERÍODO
        ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Período
        </Text>


        <View
          style={
            styles.filterCard
          }
        >

          <Text
            style={
              styles.inputLabel
            }
          >
            Data inicial
          </Text>


          <TextInput
            style={
              styles.input
            }
            value={
              dataInicial
            }
            onChangeText={
              setDataInicial
            }
            placeholder=
              "01/07/2026"
            placeholderTextColor=
              "#9AA39C"
            keyboardType=
              "numbers-and-punctuation"
          />


          <Text
            style={[
              styles.inputLabel,
              styles.secondLabel,
            ]}
          >
            Data final
          </Text>


          <TextInput
            style={
              styles.input
            }
            value={
              dataFinal
            }
            onChangeText={
              setDataFinal
            }
            placeholder=
              "31/07/2026"
            placeholderTextColor=
              "#9AA39C"
            keyboardType=
              "numbers-and-punctuation"
          />


          <Text
            style={
              styles.dateHelp
            }
          >
            Formato: DD/MM/AAAA
          </Text>


          <TouchableOpacity
            style={
              styles.filterButton
            }
            onPress={() =>
              aplicarFiltro()
            }
          >
            <Text
              style={
                styles.filterButtonText
              }
            >
              Aplicar período
            </Text>
          </TouchableOpacity>

        </View>


        {/* ==================================================
            RESUMO
        ================================================== */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Resumo do período
        </Text>


        <View
          style={
            styles.summaryContainer
          }
        >

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={[
                styles.summaryNumber,
                styles.redText,
              ]}
            >
              {totalCriticos}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Críticos
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
                styles.yellowText,
              ]}
            >
              {totalAtencao}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Atenção
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
                styles.greenText,
              ]}
            >
              {totalNormal}
            </Text>

            <Text
              style={
                styles.summaryLabel
              }
            >
              Normais
            </Text>
          </View>

        </View>


        {/* ==================================================
            EXPORTAR
        ================================================== */}

        <TouchableOpacity
          style={[
            styles.exportButton,

            ocorrenciasFiltradas.length ===
              0 &&
              styles.exportButtonDisabled,
          ]}
          disabled={
            exportando ||
            ocorrenciasFiltradas.length ===
              0
          }
          onPress={
            exportarCSV
          }
        >
          <Text
            style={
              styles.exportButtonText
            }
          >
            {exportando
              ? "Gerando CSV..."
              : "Exportar período em CSV"}
          </Text>
        </TouchableOpacity>


        <Text
          style={
            styles.exportHelp
          }
        >
          O arquivo inclui data,
          rodovia, KM, latitude,
          longitude, classificação,
          confiança e status.
        </Text>


        {/* ==================================================
            LISTA
        ================================================== */}

        <View
          style={
            styles.listTitleRow
          }
        >
          <Text
            style={
              styles.sectionTitleNoMargin
            }
          >
            Ocorrências
          </Text>

          <Text
            style={
              styles.totalText
            }
          >
            {
              ocorrenciasFiltradas.length
            }{" "}
            registros
          </Text>
        </View>


        {ocorrenciasFiltradas.length ===
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
              Nenhuma ocorrência
            </Text>


            <Text
              style={
                styles.emptyText
              }
            >
              Não foram encontradas
              análises no período
              selecionado.
            </Text>
          </View>

        ) : (

          ocorrenciasFiltradas.map(
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
                    {formatarData(
                      ocorrencia.data
                    )}
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
                    ).toFixed(
                      1
                    )}
                    %
                  </Text>


                  <Text
                    style={
                      styles.statusLabel
                    }
                  >
                    Status:{" "}
                    {
                      ocorrencia.status
                    }
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
                    {ocorrencia.classe ===
                    "CRITICO"
                      ? "CRÍTICO"
                      : ocorrencia.classe ===
                        "ATENCAO"
                        ? "ATENÇÃO"
                        : "NORMAL"}
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

      paddingHorizontal: 20,

      paddingTop: 20,

      paddingBottom: 28,
    },


    backButton: {
      alignSelf:
        "flex-start",

      marginBottom: 20,

      paddingVertical: 8,

      paddingHorizontal: 12,

      backgroundColor:
        "rgba(255,255,255,0.12)",

      borderRadius: 10,
    },


    backButtonText: {
      color:
        "#FFFFFF",

      fontSize: 15,

      fontWeight:
        "600",
    },


    title: {
      color:
        "#FFFFFF",

      fontSize: 26,

      fontWeight:
        "bold",
    },


    subtitle: {
      color:
        "#D8E7DC",

      marginTop: 5,

      fontSize: 14,
    },


    sectionTitle: {
      fontSize: 19,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginHorizontal: 20,

      marginTop: 24,

      marginBottom: 12,
    },


    filterCard: {
      marginHorizontal: 20,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 18,
    },


    inputLabel: {
      fontSize: 14,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom: 7,
    },


    secondLabel: {
      marginTop: 16,
    },


    input: {
      width:
        "100%",

      backgroundColor:
        "#F4F7F4",

      borderWidth: 1,

      borderColor:
        "#D8E0DA",

      borderRadius: 10,

      paddingHorizontal: 14,

      paddingVertical: 13,

      fontSize: 16,

      color:
        "#1D2A21",
    },


    dateHelp: {
      marginTop: 10,

      fontSize: 12,

      color:
        "#778078",
    },


    filterButton: {
      marginTop: 18,

      backgroundColor:
        "#21894A",

      borderRadius: 12,

      paddingVertical: 14,

      alignItems:
        "center",
    },


    filterButtonText: {
      color:
        "#FFFFFF",

      fontSize: 15,

      fontWeight:
        "bold",
    },


    summaryContainer: {
      flexDirection:
        "row",

      paddingHorizontal: 20,

      gap: 10,
    },


    summaryCard: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 12,

      paddingVertical: 15,

      alignItems:
        "center",
    },


    summaryNumber: {
      fontSize: 23,

      fontWeight:
        "bold",
    },


    summaryLabel: {
      marginTop: 3,

      fontSize: 12,

      color:
        "#6B756E",
    },


    redText: {
      color:
        "#D63E3E",
    },


    yellowText: {
      color:
        "#E0A82E",
    },


    greenText: {
      color:
        "#2E9D50",
    },


    exportButton: {
      marginHorizontal: 20,

      marginTop: 24,

      backgroundColor:
        "#164B2A",

      paddingVertical: 16,

      borderRadius: 14,

      alignItems:
        "center",
    },


    exportButtonDisabled: {
      opacity: 0.45,
    },


    exportButtonText: {
      color:
        "#FFFFFF",

      fontSize: 16,

      fontWeight:
        "bold",
    },


    exportHelp: {
      marginHorizontal: 28,

      marginTop: 9,

      fontSize: 12,

      lineHeight: 17,

      textAlign:
        "center",

      color:
        "#778078",
    },


    listTitleRow: {
      marginHorizontal: 20,

      marginTop: 28,

      marginBottom: 4,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },


    sectionTitleNoMargin: {
      fontSize: 19,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    totalText: {
      fontSize: 12,

      color:
        "#778078",
    },


    card: {
      marginHorizontal: 20,

      marginTop: 12,

      backgroundColor:
        "#FFFFFF",

      borderRadius: 14,

      padding: 16,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },


    cardLeft: {
      flex: 1,

      paddingRight: 10,
    },


    location: {
      fontSize: 17,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    date: {
      marginTop: 5,

      color:
        "#6B756E",

      fontSize: 13,
    },


    confidence: {
      marginTop: 5,

      color:
        "#526157",

      fontSize: 13,
    },


    statusLabel: {
      marginTop: 4,

      color:
        "#778078",

      fontSize: 12,
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
      color:
        "#FFFFFF",

      fontWeight:
        "bold",

      fontSize: 11,
    },


    emptyCard: {
      marginHorizontal: 20,

      marginTop: 18,

      backgroundColor:
        "#FFFFFF",

      padding: 24,

      borderRadius: 14,

      alignItems:
        "center",
    },


    emptyTitle: {
      fontSize: 17,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },


    emptyText: {
      marginTop: 6,

      textAlign:
        "center",

      color:
        "#6B756E",
    },

  });

  