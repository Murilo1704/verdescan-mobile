import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { adicionarOcorrencia } from "../services/storage";
import { Ocorrencia } from "../types/Ocorrencia";


// ============================================================
// CONFIGURAÇÃO DA API
// ============================================================

// IP atual do notebook que está rodando a API.
// Se o IPv4 do notebook mudar no futuro,
// basta alterar somente esta linha.

const API_URL =
  "http://10.0.0.30:8000/analisar";


// ============================================================
// TIPOS
// ============================================================

type Localizacao = {
  latitude: number;
  longitude: number;
  precisao: number | null;
};


type ClasseAnalise =
  | "NORMAL"
  | "ATENCAO"
  | "CRITICO"
  | "INCONCLUSIVO";


type ResultadoAnalise = {
  classe: ClasseAnalise;

  confianca: number;

  vegetacaoTotal: number;

  vegetacaoBaixa: number;

  vegetacaoAlta: number;

  patchesAnalisados: number;

  probabilidadeNormal: number;

  probabilidadeAtencao: number;

  probabilidadeCritico: number;
};


type RespostaAPI = {
  status: string;

  classe: ClasseAnalise;

  confianca: number;

  confianca_percentual?: number;

  vegetacao_total: number;

  vegetacao_baixa: number;

  vegetacao_alta: number;

  background?: number;

  patches_analisados: number;

  probabilidades?: {
    ATENCAO?: number;
    CRITICO?: number;
    NORMAL?: number;
  };

  arquivo?: string;
};


// ============================================================
// TELA
// ============================================================

export default function AnaliseScreen() {
  const [fotoUri, setFotoUri] =
    useState<string | null>(null);

  const [origemFoto, setOrigemFoto] =
    useState<
      "camera" | "galeria" | null
    >(null);

  const [localizacao, setLocalizacao] =
    useState<Localizacao | null>(null);

  const [
    buscandoLocalizacao,
    setBuscandoLocalizacao,
  ] = useState(false);

  const [rodovia, setRodovia] =
    useState("");

  const [km, setKm] =
    useState("");

  const [resultado, setResultado] =
    useState<ResultadoAnalise | null>(
      null
    );

  const [analisando, setAnalisando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);


  // =========================================================
  // CÂMERA
  // =========================================================

  async function tirarFoto() {
    const permissao =
      await ImagePicker
        .requestCameraPermissionsAsync();

    if (!permissao.granted) {
      mostrarMensagem(
        "Permissão necessária",
        "O VerdeScan precisa acessar a câmera para registrar a vegetação."
      );

      return;
    }

    const resultadoFoto =
      await ImagePicker
        .launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
        });

    if (!resultadoFoto.canceled) {
      setFotoUri(
        resultadoFoto.assets[0].uri
      );

      setOrigemFoto(
        "camera"
      );

      setResultado(
        null
      );
    }
  }


  // =========================================================
  // GALERIA
  // =========================================================

  async function selecionarFoto() {
    const permissao =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      mostrarMensagem(
        "Permissão necessária",
        "O VerdeScan precisa acessar suas fotos."
      );

      return;
    }

    const resultadoFoto =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          quality: 0.8,
        });

    if (!resultadoFoto.canceled) {
      setFotoUri(
        resultadoFoto.assets[0].uri
      );

      setOrigemFoto(
        "galeria"
      );

      setResultado(
        null
      );
    }
  }


  // =========================================================
  // GPS
  // =========================================================

  async function capturarLocalizacao() {
    try {
      setBuscandoLocalizacao(
        true
      );

      const { status } =
        await Location
          .requestForegroundPermissionsAsync();

      if (
        status !== "granted"
      ) {
        mostrarMensagem(
          "Permissão necessária",
          "O VerdeScan precisa da localização para registrar onde a análise foi realizada."
        );

        return;
      }

      const posicao =
        await Location
          .getCurrentPositionAsync({
            accuracy:
              Location.Accuracy.High,
          });

      setLocalizacao({
        latitude:
          posicao.coords.latitude,

        longitude:
          posicao.coords.longitude,

        precisao:
          posicao.coords.accuracy,
      });

      setResultado(
        null
      );

    } catch (erro) {
      console.error(
        erro
      );

      mostrarMensagem(
        "Erro de localização",
        "Não foi possível obter sua localização."
      );

    } finally {
      setBuscandoLocalizacao(
        false
      );
    }
  }


  // =========================================================
  // MENSAGENS
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
  // VALIDAR KM
  // =========================================================

  function obterKmNumerico() {
    const kmNormalizado =
      km.replace(
        ",",
        "."
      );

    const valor =
      Number(
        kmNormalizado
      );

    if (
      Number.isNaN(valor) ||
      valor < 0
    ) {
      return null;
    }

    return valor;
  }


  // =========================================================
  // DESCOBRIR TIPO DA IMAGEM
  // =========================================================

  function obterMimeType(
    uri: string
  ) {
    const endereco =
      uri.toLowerCase();

    if (
      endereco.includes(
        ".png"
      )
    ) {
      return "image/png";
    }

    if (
      endereco.includes(
        ".webp"
      )
    ) {
      return "image/webp";
    }

    return "image/jpeg";
  }


  // =========================================================
  // CRIAR NOME DO ARQUIVO
  // =========================================================

  function obterNomeArquivo(
    uri: string
  ) {
    const partes =
      uri.split("/");

    const ultimo =
      partes[
        partes.length - 1
      ];

    if (
      ultimo &&
      ultimo.includes(".")
    ) {
      return ultimo;
    }

    return `verdescan_${Date.now()}.jpg`;
  }


  // =========================================================
  // ENVIAR FOTO PARA API
  // =========================================================

  async function enviarFotoParaAPI(
    uri: string
  ): Promise<RespostaAPI> {
    const formData =
      new FormData();

    const nomeArquivo =
      obterNomeArquivo(
        uri
      );

    const mimeType =
      obterMimeType(
        uri
      );


    // -------------------------------------------------------
    // WEB
    // -------------------------------------------------------

    if (
      Platform.OS === "web"
    ) {
      const respostaArquivo =
        await fetch(
          uri
        );

      const blob =
        await respostaArquivo
          .blob();

      formData.append(
        "imagem",
        blob,
        nomeArquivo
      );

    } else {

      // -----------------------------------------------------
      // IPHONE / ANDROID
      // -----------------------------------------------------

      formData.append(
        "imagem",
        {
          uri,
          name:
            nomeArquivo,
          type:
            mimeType,
        } as any
      );
    }


    // Timeout de 2 minutos.
    // Como os modelos estão rodando
    // pela CPU do notebook,
    // a primeira análise pode demorar.

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => {
          controller.abort();
        },
        120000
      );


    try {
      const resposta =
        await fetch(
          API_URL,
          {
            method: "POST",

            body:
              formData,

            signal:
              controller.signal,

            headers: {
              Accept:
                "application/json",
            },
          }
        );


      if (
        !resposta.ok
      ) {
        let detalhe =
          "Erro desconhecido";

        try {
          const erroJson =
            await resposta.json();

          detalhe =
            erroJson.detail ??
            JSON.stringify(
              erroJson
            );

        } catch {
          detalhe =
            await resposta.text();
        }

        throw new Error(
          `API ${resposta.status}: ${detalhe}`
        );
      }


      const dados =
        await resposta.json();

      return dados;

    } finally {
      clearTimeout(
        timeout
      );
    }
  }


  // =========================================================
  // ANALISAR OCORRÊNCIA
  // =========================================================

  async function analisarOcorrencia() {
    if (!fotoUri) {
      mostrarMensagem(
        "Foto necessária",
        "Registre uma foto da vegetação antes de continuar."
      );

      return;
    }


    if (!localizacao) {
      mostrarMensagem(
        "Localização necessária",
        "Capture a localização antes de continuar."
      );

      return;
    }


    if (
      !rodovia.trim()
    ) {
      mostrarMensagem(
        "Rodovia necessária",
        "Informe a rodovia onde a análise está sendo realizada."
      );

      return;
    }


    const kmNumerico =
      obterKmNumerico();

    if (
      kmNumerico === null
    ) {
      mostrarMensagem(
        "KM inválido",
        "Informe um KM válido."
      );

      return;
    }


    try {
      setAnalisando(
        true
      );

      setResultado(
        null
      );


      // =====================================================
      // CHAMADA REAL DA API
      // =====================================================

      const resposta =
        await enviarFotoParaAPI(
          fotoUri
        );


      console.log(
        "Resposta VerdeScan API:",
        resposta
      );


      // =====================================================
      // CASO INCONCLUSIVO
      // =====================================================

      if (
        resposta.status ===
          "inconclusivo" ||
        resposta.classe ===
          "INCONCLUSIVO"
      ) {
        setResultado({
          classe:
            "INCONCLUSIVO",

          confianca:
            0,

          vegetacaoTotal:
            resposta
              .vegetacao_total ??
            0,

          vegetacaoBaixa:
            resposta
              .vegetacao_baixa ??
            0,

          vegetacaoAlta:
            resposta
              .vegetacao_alta ??
            0,

          patchesAnalisados:
            resposta
              .patches_analisados ??
            0,

          probabilidadeNormal:
            0,

          probabilidadeAtencao:
            0,

          probabilidadeCritico:
            0,
        });


        mostrarMensagem(
          "Análise inconclusiva",
          "A inteligência artificial não encontrou vegetação suficiente para realizar uma classificação confiável. Tente tirar outra foto mais próxima da vegetação."
        );

        return;
      }


      // =====================================================
      // VALIDAR CLASSE
      // =====================================================

      if (
        resposta.classe !==
          "NORMAL" &&
        resposta.classe !==
          "ATENCAO" &&
        resposta.classe !==
          "CRITICO"
      ) {
        throw new Error(
          "A API retornou uma classe inválida."
        );
      }


      // =====================================================
      // SALVAR RESULTADO NA TELA
      // =====================================================

      setResultado({
        classe:
          resposta.classe,

        confianca:
          resposta.confianca,

        vegetacaoTotal:
          resposta
            .vegetacao_total,

        vegetacaoBaixa:
          resposta
            .vegetacao_baixa,

        vegetacaoAlta:
          resposta
            .vegetacao_alta,

        patchesAnalisados:
          resposta
            .patches_analisados,

        probabilidadeNormal:
          resposta
            .probabilidades
            ?.NORMAL ??
          0,

        probabilidadeAtencao:
          resposta
            .probabilidades
            ?.ATENCAO ??
          0,

        probabilidadeCritico:
          resposta
            .probabilidades
            ?.CRITICO ??
          0,
      });


    } catch (erro: any) {
      console.error(
        "Erro na análise:",
        erro
      );


      let mensagem =
        "Não foi possível analisar a imagem.";

      if (
        erro?.name ===
        "AbortError"
      ) {
        mensagem =
          "A análise demorou mais que o esperado. Verifique se a API está rodando no notebook e tente novamente.";

      } else if (
        erro?.message
      ) {
        mensagem =
          erro.message;
      }


      mostrarMensagem(
        "Erro na análise",
        mensagem
      );

    } finally {
      setAnalisando(
        false
      );
    }
  }


  // =========================================================
  // SALVAR OCORRÊNCIA
  // =========================================================

  async function salvarOcorrencia() {
    if (
      !resultado ||
      !fotoUri ||
      !localizacao
    ) {
      return;
    }


    if (
      resultado.classe ===
      "INCONCLUSIVO"
    ) {
      mostrarMensagem(
        "Análise inconclusiva",
        "Uma análise inconclusiva não pode ser salva como ocorrência."
      );

      return;
    }


    const kmNumerico =
      obterKmNumerico();

    if (
      kmNumerico === null
    ) {
      return;
    }


    try {
      setSalvando(
        true
      );


      const novaOcorrencia: Ocorrencia =
        {
          id:
            `${Date.now()}`,

          data:
            new Date()
              .toISOString(),

          rodovia:
            rodovia
              .trim()
              .toUpperCase(),

          km:
            kmNumerico,

          latitude:
            localizacao
              .latitude,

          longitude:
            localizacao
              .longitude,

          classe:
            resultado
              .classe,

          confianca:
            resultado
              .confianca,

          status:
            "PENDENTE",

          imagem:
            fotoUri,
        };


      await adicionarOcorrencia(
        novaOcorrencia
      );


      mostrarMensagem(
        "Ocorrência salva",
        "A análise foi registrada com sucesso."
      );


      router.replace(
        "/prioridades"
      );

    } catch (erro) {
      console.error(
        erro
      );

      mostrarMensagem(
        "Erro",
        "Não foi possível salvar a ocorrência."
      );

    } finally {
      setSalvando(
        false
      );
    }
  }


  // =========================================================
  // CONTROLE DOS BOTÕES
  // =========================================================

  const kmValido =
    obterKmNumerico() !==
    null;


  const podeAnalisar =
    fotoUri !== null &&
    localizacao !== null &&
    rodovia
      .trim()
      .length > 0 &&
    km
      .trim()
      .length > 0 &&
    kmValido &&
    !analisando;


  const resultadoValido =
    resultado !== null &&
    resultado.classe !==
      "INCONCLUSIVO";


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
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backButton
              }
            >
              ‹ Voltar
            </Text>
          </TouchableOpacity>


          <Text
            style={
              styles.title
            }
          >
            Nova análise
          </Text>


          <Text
            style={
              styles.subtitle
            }
          >
            Registre uma nova
            ocorrência de vegetação
          </Text>
        </View>


        {/* ==================================================
            1. FOTO
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            1. Foto da vegetação
          </Text>


          <View
            style={
              styles.card
            }
          >
            {fotoUri ? (
              <>
                <Image
                  source={{
                    uri:
                      fotoUri,
                  }}
                  style={
                    styles.previewImage
                  }
                />


                <View
                  style={
                    styles.successRow
                  }
                >
                  <View
                    style={
                      styles.successPoint
                    }
                  />

                  <Text
                    style={
                      styles.successText
                    }
                  >
                    Foto registrada
                  </Text>
                </View>


                <Text
                  style={
                    styles.photoOrigin
                  }
                >
                  {origemFoto ===
                  "camera"
                    ? "Foto tirada pela câmera"
                    : "Imagem selecionada da galeria"}
                </Text>


                <TouchableOpacity
                  style={
                    styles.primaryPhotoButton
                  }
                  onPress={
                    tirarFoto
                  }
                  disabled={
                    analisando
                  }
                >
                  <Text
                    style={
                      styles.primaryPhotoButtonText
                    }
                  >
                    Tirar nova foto
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={
                    styles.secondaryButton
                  }
                  onPress={
                    selecionarFoto
                  }
                  disabled={
                    analisando
                  }
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Escolher outra da
                    galeria
                  </Text>
                </TouchableOpacity>
              </>

            ) : (
              <>
                <Text
                  style={
                    styles.icon
                  }
                >
                  📷
                </Text>


                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Registre a vegetação
                </Text>


                <Text
                  style={
                    styles.cardText
                  }
                >
                  Tire uma foto no local
                  ou escolha uma imagem
                  existente para realizar
                  a análise.
                </Text>


                <TouchableOpacity
                  style={
                    styles.primaryPhotoButton
                  }
                  onPress={
                    tirarFoto
                  }
                >
                  <Text
                    style={
                      styles.primaryPhotoButtonText
                    }
                  >
                    Tirar foto agora
                  </Text>
                </TouchableOpacity>


                <TouchableOpacity
                  style={
                    styles.secondaryButton
                  }
                  onPress={
                    selecionarFoto
                  }
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Escolher da galeria
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>


        {/* ==================================================
            2. LOCALIZAÇÃO
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            2. Localização GPS
          </Text>


          <View
            style={
              styles.card
            }
          >
            {!localizacao ? (
              <>
                <Text
                  style={
                    styles.icon
                  }
                >
                  📍
                </Text>


                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Localização ainda não
                  capturada
                </Text>


                <Text
                  style={
                    styles.cardText
                  }
                >
                  O VerdeScan registrará
                  latitude, longitude e
                  precisão do GPS.
                </Text>


                <TouchableOpacity
                  style={
                    styles.secondaryButton
                  }
                  onPress={
                    capturarLocalizacao
                  }
                  disabled={
                    buscandoLocalizacao
                  }
                >
                  {buscandoLocalizacao ? (
                    <View
                      style={
                        styles.loadingRow
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color="#21894A"
                      />

                      <Text
                        style={
                          styles.secondaryButtonText
                        }
                      >
                        Obtendo localização...
                      </Text>
                    </View>

                  ) : (
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      Capturar localização
                    </Text>
                  )}
                </TouchableOpacity>
              </>

            ) : (
              <>
                <View
                  style={
                    styles.successRow
                  }
                >
                  <View
                    style={
                      styles.successPoint
                    }
                  />

                  <Text
                    style={
                      styles.successText
                    }
                  >
                    Localização capturada
                  </Text>
                </View>


                <View
                  style={
                    styles.locationData
                  }
                >
                  <View
                    style={
                      styles.locationItem
                    }
                  >
                    <Text
                      style={
                        styles.locationLabel
                      }
                    >
                      Latitude
                    </Text>

                    <Text
                      style={
                        styles.locationValue
                      }
                    >
                      {localizacao.latitude.toFixed(
                        6
                      )}
                    </Text>
                  </View>


                  <View
                    style={
                      styles.locationDivider
                    }
                  />


                  <View
                    style={
                      styles.locationItem
                    }
                  >
                    <Text
                      style={
                        styles.locationLabel
                      }
                    >
                      Longitude
                    </Text>

                    <Text
                      style={
                        styles.locationValue
                      }
                    >
                      {localizacao.longitude.toFixed(
                        6
                      )}
                    </Text>
                  </View>
                </View>


                <View
                  style={
                    styles.accuracyBox
                  }
                >
                  <Text
                    style={
                      styles.accuracyLabel
                    }
                  >
                    Precisão estimada
                  </Text>

                  <Text
                    style={
                      styles.accuracyValue
                    }
                  >
                    {localizacao.precisao !==
                    null
                      ? `${Math.round(
                          localizacao.precisao
                        )} metros`
                      : "Não disponível"}
                  </Text>
                </View>


                <TouchableOpacity
                  style={
                    styles.secondaryButton
                  }
                  onPress={
                    capturarLocalizacao
                  }
                  disabled={
                    analisando
                  }
                >
                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Atualizar localização
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>


        {/* ==================================================
            3. RODOVIA E KM
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            3. Trecho da rodovia
          </Text>


          <View
            style={[
              styles.card,
              styles.formCard,
            ]}
          >
            <Text
              style={
                styles.inputLabel
              }
            >
              Rodovia
            </Text>


            <TextInput
              style={
                styles.input
              }
              value={
                rodovia
              }
              onChangeText={(
                texto
              ) => {
                setRodovia(
                  texto
                );

                setResultado(
                  null
                );
              }}
              placeholder=
                "Ex.: SP-330"
              placeholderTextColor=
                "#9AA39C"
              autoCapitalize=
                "characters"
              editable={
                !analisando
              }
            />


            <Text
              style={[
                styles.inputLabel,
                styles.secondInputLabel,
              ]}
            >
              KM
            </Text>


            <TextInput
              style={
                styles.input
              }
              value={
                km
              }
              onChangeText={(
                texto
              ) => {
                setKm(
                  texto
                );

                setResultado(
                  null
                );
              }}
              placeholder=
                "Ex.: 105"
              placeholderTextColor=
                "#9AA39C"
              keyboardType=
                "decimal-pad"
              editable={
                !analisando
              }
            />


            <Text
              style={
                styles.fieldHelp
              }
            >
              Essas informações serão
              utilizadas no mapa, na lista
              de prioridades e no arquivo
              CSV.
            </Text>
          </View>
        </View>


        {/* ==================================================
            4. CLASSIFICAÇÃO
        ================================================== */}

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            4. Classificação
          </Text>


          <View
            style={
              styles.card
            }
          >

            {/* CARREGANDO */}

            {analisando ? (
              <>
                <ActivityIndicator
                  size="large"
                  color="#21894A"
                />

                <Text
                  style={
                    styles.analyzingTitle
                  }
                >
                  Analisando imagem...
                </Text>

                <Text
                  style={
                    styles.cardText
                  }
                >
                  A imagem está sendo
                  processada pelos modelos
                  de segmentação e
                  classificação.
                </Text>

                <Text
                  style={
                    styles.processingText
                  }
                >
                  Isso pode levar alguns
                  segundos.
                </Text>
              </>

            ) : resultado ? (
              <>

                {/* RESULTADO */}

                <Text
                  style={
                    styles.resultLabel
                  }
                >
                  Resultado da análise
                </Text>


                <View
                  style={[
                    styles.resultBadge,

                    resultado.classe ===
                    "CRITICO"
                      ? styles.resultCritical
                      : resultado.classe ===
                        "ATENCAO"
                        ? styles.resultAttention
                        : resultado.classe ===
                          "NORMAL"
                          ? styles.resultNormal
                          : styles.resultInconclusive,
                  ]}
                >
                  <Text
                    style={
                      styles.resultBadgeText
                    }
                  >
                    {resultado.classe ===
                    "ATENCAO"
                      ? "ATENÇÃO"
                      : resultado.classe ===
                        "CRITICO"
                        ? "CRÍTICO"
                        : resultado.classe}
                  </Text>
                </View>


                {resultado.classe !==
                  "INCONCLUSIVO" && (
                  <Text
                    style={
                      styles.resultConfidence
                    }
                  >
                    Confiança:{" "}
                    {(
                      resultado.confianca *
                      100
                    ).toFixed(
                      2
                    )}
                    %
                  </Text>
                )}


                {/* DADOS SEGMENTAÇÃO */}

                <View
                  style={
                    styles.aiDetails
                  }
                >
                  <Text
                    style={
                      styles.aiDetailsTitle
                    }
                  >
                    Detalhes da análise
                  </Text>


                  <View
                    style={
                      styles.aiDetailRow
                    }
                  >
                    <Text
                      style={
                        styles.aiDetailLabel
                      }
                    >
                      Vegetação detectada
                    </Text>

                    <Text
                      style={
                        styles.aiDetailValue
                      }
                    >
                      {resultado.vegetacaoTotal.toFixed(
                        2
                      )}
                      %
                    </Text>
                  </View>


                  <View
                    style={
                      styles.aiDetailRow
                    }
                  >
                    <Text
                      style={
                        styles.aiDetailLabel
                      }
                    >
                      Vegetação baixa
                    </Text>

                    <Text
                      style={
                        styles.aiDetailValue
                      }
                    >
                      {resultado.vegetacaoBaixa.toFixed(
                        2
                      )}
                      %
                    </Text>
                  </View>


                  <View
                    style={
                      styles.aiDetailRow
                    }
                  >
                    <Text
                      style={
                        styles.aiDetailLabel
                      }
                    >
                      Vegetação alta
                    </Text>

                    <Text
                      style={
                        styles.aiDetailValue
                      }
                    >
                      {resultado.vegetacaoAlta.toFixed(
                        2
                      )}
                      %
                    </Text>
                  </View>


                  <View
                    style={
                      styles.aiDetailRow
                    }
                  >
                    <Text
                      style={
                        styles.aiDetailLabel
                      }
                    >
                      Regiões analisadas
                    </Text>

                    <Text
                      style={
                        styles.aiDetailValue
                      }
                    >
                      {resultado.patchesAnalisados}
                    </Text>
                  </View>
                </View>


                {/* PROBABILIDADES */}

                {resultado.classe !==
                  "INCONCLUSIVO" && (
                  <View
                    style={
                      styles.probabilityBox
                    }
                  >
                    <Text
                      style={
                        styles.aiDetailsTitle
                      }
                    >
                      Probabilidades
                    </Text>


                    <Text
                      style={
                        styles.probabilityText
                      }
                    >
                      Normal:{" "}
                      {(
                        resultado.probabilidadeNormal *
                        100
                      ).toFixed(
                        2
                      )}
                      %
                    </Text>


                    <Text
                      style={
                        styles.probabilityText
                      }
                    >
                      Atenção:{" "}
                      {(
                        resultado.probabilidadeAtencao *
                        100
                      ).toFixed(
                        2
                      )}
                      %
                    </Text>


                    <Text
                      style={
                        styles.probabilityText
                      }
                    >
                      Crítico:{" "}
                      {(
                        resultado.probabilidadeCritico *
                        100
                      ).toFixed(
                        2
                      )}
                      %
                    </Text>
                  </View>
                )}

              </>

            ) : (
              <>

                {/* AGUARDANDO */}

                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Aguardando análise
                </Text>


                <Text
                  style={
                    styles.cardText
                  }
                >
                  A inteligência artificial
                  classificará o trecho de
                  acordo com a vegetação
                  identificada na imagem.
                </Text>


                <View
                  style={
                    styles.statusRow
                  }
                >
                  <View
                    style={
                      styles.statusItem
                    }
                  >
                    <View
                      style={[
                        styles.statusPoint,
                        styles.green,
                      ]}
                    />

                    <Text
                      style={
                        styles.statusLabel
                      }
                    >
                      Normal
                    </Text>
                  </View>


                  <View
                    style={
                      styles.statusItem
                    }
                  >
                    <View
                      style={[
                        styles.statusPoint,
                        styles.yellow,
                      ]}
                    />

                    <Text
                      style={
                        styles.statusLabel
                      }
                    >
                      Atenção
                    </Text>
                  </View>


                  <View
                    style={
                      styles.statusItem
                    }
                  >
                    <View
                      style={[
                        styles.statusPoint,
                        styles.red,
                      ]}
                    />

                    <Text
                      style={
                        styles.statusLabel
                      }
                    >
                      Crítico
                    </Text>
                  </View>
                </View>


                <Text
                  style={
                    styles.heightRules
                  }
                >
                  Normal: até 10 cm{"\n"}
                  Atenção: acima de 10 até
                  30 cm{"\n"}
                  Crítico: acima de 30 cm
                </Text>
              </>
            )}
          </View>
        </View>


        {/* ==================================================
            BOTÃO ANALISAR
        ================================================== */}

        {!resultado && (
          <TouchableOpacity
            style={[
              styles.analyzeButton,

              !podeAnalisar &&
              styles.analyzeButtonDisabled,
            ]}
            disabled={
              !podeAnalisar
            }
            onPress={
              analisarOcorrencia
            }
          >

            {analisando ? (
              <View
                style={
                  styles.loadingRow
                }
              >
                <ActivityIndicator
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.analyzeButtonText
                  }
                >
                  Analisando...
                </Text>
              </View>

            ) : (
              <Text
                style={
                  styles.analyzeButtonText
                }
              >
                Analisar ocorrência
              </Text>
            )}

          </TouchableOpacity>
        )}


        {/* ==================================================
            SALVAR
        ================================================== */}

        {resultadoValido && (
          <TouchableOpacity
            style={
              styles.saveButton
            }
            onPress={
              salvarOcorrencia
            }
            disabled={
              salvando
            }
          >
            {salvando ? (
              <ActivityIndicator
                color="#FFFFFF"
              />

            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                Salvar ocorrência
              </Text>
            )}
          </TouchableOpacity>
        )}


        {/* ==================================================
            REFAZER INCONCLUSIVO
        ================================================== */}

        {resultado?.classe ===
          "INCONCLUSIVO" && (
          <TouchableOpacity
            style={
              styles.retryButton
            }
            onPress={() => {
              setResultado(
                null
              );
            }}
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Tentar outra análise
            </Text>
          </TouchableOpacity>
        )}


        {/* ==================================================
            AJUDA
        ================================================== */}

        {!podeAnalisar &&
          !resultado &&
          !analisando && (
            <Text
              style={
                styles.helpText
              }
            >
              Registre uma foto, capture
              sua localização e informe a
              rodovia e o KM para
              continuar.
            </Text>
          )}


        {podeAnalisar &&
          !resultado &&
          !analisando && (
            <Text
              style={
                styles.readyText
              }
            >
              Todos os dados foram
              preenchidos. A ocorrência
              está pronta para análise.
            </Text>
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
      paddingBottom: 50,
    },

    header: {
      backgroundColor:
        "#164B2A",

      paddingHorizontal: 20,

      paddingTop: 28,

      paddingBottom: 26,
    },

    backButton: {
      color:
        "#D8E7DC",

      fontSize: 16,

      marginBottom: 16,
    },

    title: {
      color:
        "#FFFFFF",

      fontSize: 26,

      fontWeight:
        "bold",
    },

    subtitle: {
      marginTop: 5,

      fontSize: 14,

      color:
        "#D8E7DC",
    },

    section: {
      marginTop: 24,

      paddingHorizontal: 20,
    },

    sectionTitle: {
      fontSize: 19,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom: 12,
    },

    card: {
      backgroundColor:
        "#FFFFFF",

      borderRadius: 16,

      padding: 24,

      alignItems:
        "center",
    },

    formCard: {
      alignItems:
        "stretch",
    },

    icon: {
      fontSize: 38,

      marginBottom: 12,
    },

    cardTitle: {
      fontSize: 17,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      textAlign:
        "center",
    },

    cardText: {
      marginTop: 7,

      fontSize: 14,

      color:
        "#667168",

      textAlign:
        "center",

      lineHeight: 20,
    },

    previewImage: {
      width:
        "100%",

      height: 220,

      borderRadius: 12,

      marginBottom: 14,
    },

    successRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    successPoint: {
      width: 10,

      height: 10,

      borderRadius: 5,

      backgroundColor:
        "#21894A",

      marginRight: 7,
    },

    successText: {
      fontSize: 15,

      fontWeight:
        "bold",

      color:
        "#21894A",
    },

    photoOrigin: {
      fontSize: 12,

      color:
        "#6B756E",

      marginTop: 5,
    },

    primaryPhotoButton: {
      marginTop: 18,

      backgroundColor:
        "#21894A",

      borderRadius: 10,

      paddingVertical: 13,

      paddingHorizontal: 28,

      minWidth: 210,

      alignItems:
        "center",
    },

    primaryPhotoButtonText: {
      color:
        "#FFFFFF",

      fontSize: 15,

      fontWeight:
        "bold",
    },

    secondaryButton: {
      marginTop: 12,

      backgroundColor:
        "#E5F2E9",

      borderRadius: 10,

      paddingVertical: 12,

      paddingHorizontal: 24,

      minWidth: 190,

      alignItems:
        "center",
    },

    secondaryButtonText: {
      color:
        "#21894A",

      fontSize: 15,

      fontWeight:
        "bold",
    },

    loadingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
    },

    locationData: {
      flexDirection:
        "row",

      width:
        "100%",

      backgroundColor:
        "#F4F7F4",

      borderRadius: 12,

      paddingVertical: 16,

      marginTop: 18,
    },

    locationItem: {
      flex: 1,

      alignItems:
        "center",
    },

    locationDivider: {
      width: 1,

      backgroundColor:
        "#D5DDD7",
    },

    locationLabel: {
      fontSize: 12,

      color:
        "#6B756E",
    },

    locationValue: {
      marginTop: 5,

      fontSize: 15,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },

    accuracyBox: {
      marginTop: 12,

      alignItems:
        "center",
    },

    accuracyLabel: {
      fontSize: 12,

      color:
        "#6B756E",
    },

    accuracyValue: {
      marginTop: 3,

      fontSize: 14,

      fontWeight:
        "600",

      color:
        "#1D2A21",
    },

    inputLabel: {
      fontSize: 14,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom: 7,
    },

    secondInputLabel: {
      marginTop: 18,
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

    fieldHelp: {
      marginTop: 15,

      fontSize: 12,

      lineHeight: 18,

      color:
        "#778078",
    },

    statusRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      width:
        "100%",

      marginTop: 20,
    },

    statusItem: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    statusPoint: {
      width: 11,

      height: 11,

      borderRadius: 6,

      marginRight: 6,
    },

    green: {
      backgroundColor:
        "#2E9D50",
    },

    yellow: {
      backgroundColor:
        "#E0A82E",
    },

    red: {
      backgroundColor:
        "#D63E3E",
    },

    statusLabel: {
      fontSize: 13,

      color:
        "#526157",
    },

    heightRules: {
      marginTop: 20,

      fontSize: 12,

      color:
        "#778078",

      textAlign:
        "center",

      lineHeight: 19,
    },

    analyzeButton: {
      marginHorizontal: 20,

      marginTop: 28,

      backgroundColor:
        "#21894A",

      paddingVertical: 16,

      borderRadius: 14,

      alignItems:
        "center",
    },

    analyzeButtonDisabled: {
      backgroundColor:
        "#A7B6AA",
    },

    analyzeButtonText: {
      color:
        "#FFFFFF",

      fontSize: 17,

      fontWeight:
        "bold",
    },

    saveButton: {
      marginHorizontal: 20,

      marginTop: 28,

      backgroundColor:
        "#164B2A",

      paddingVertical: 16,

      borderRadius: 14,

      alignItems:
        "center",
    },

    saveButtonText: {
      color:
        "#FFFFFF",

      fontSize: 17,

      fontWeight:
        "bold",
    },

    retryButton: {
      marginHorizontal: 20,

      marginTop: 20,

      backgroundColor:
        "#E5F2E9",

      paddingVertical: 15,

      borderRadius: 14,

      alignItems:
        "center",
    },

    retryButtonText: {
      color:
        "#21894A",

      fontSize: 16,

      fontWeight:
        "bold",
    },

    helpText: {
      marginHorizontal: 30,

      marginTop: 12,

      color:
        "#778078",

      fontSize: 12,

      textAlign:
        "center",
    },

    readyText: {
      marginHorizontal: 30,

      marginTop: 12,

      color:
        "#21894A",

      fontSize: 12,

      fontWeight:
        "600",

      textAlign:
        "center",
    },

    resultLabel: {
      fontSize: 13,

      color:
        "#6B756E",
    },

    resultBadge: {
      marginTop: 12,

      paddingHorizontal: 22,

      paddingVertical: 10,

      borderRadius: 24,
    },

    resultNormal: {
      backgroundColor:
        "#2E9D50",
    },

    resultAttention: {
      backgroundColor:
        "#E0A82E",
    },

    resultCritical: {
      backgroundColor:
        "#D63E3E",
    },

    resultInconclusive: {
      backgroundColor:
        "#7A817C",
    },

    resultBadgeText: {
      color:
        "#FFFFFF",

      fontSize: 18,

      fontWeight:
        "bold",
    },

    resultConfidence: {
      marginTop: 10,

      color:
        "#526157",

      fontSize: 14,

      fontWeight:
        "600",
    },

    analyzingTitle: {
      marginTop: 15,

      fontSize: 18,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },

    processingText: {
      marginTop: 12,

      fontSize: 12,

      color:
        "#778078",

      textAlign:
        "center",
    },

    aiDetails: {
      width:
        "100%",

      marginTop: 24,

      backgroundColor:
        "#F4F7F4",

      borderRadius: 12,

      padding: 16,
    },

    aiDetailsTitle: {
      fontSize: 14,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom: 10,
    },

    aiDetailRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginTop: 8,
    },

    aiDetailLabel: {
      fontSize: 13,

      color:
        "#667168",
    },

    aiDetailValue: {
      fontSize: 13,

      fontWeight:
        "bold",

      color:
        "#1D2A21",
    },

    probabilityBox: {
      width:
        "100%",

      marginTop: 14,

      borderWidth: 1,

      borderColor:
        "#E1E7E2",

      borderRadius: 12,

      padding: 16,
    },

    probabilityText: {
      fontSize: 13,

      color:
        "#526157",

      marginTop: 5,
    },

  });
  