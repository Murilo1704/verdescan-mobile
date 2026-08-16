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

import {
  adicionarOcorrencia,
} from "../services/storage";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


// ============================================================
// API
// ============================================================

const API_BASE_URL =
  "http://10.0.0.30:8000";

const API_ANALISE_URL =
  `${API_BASE_URL}/analisar`;

const API_LOCALIZACAO_URL =
  `${API_BASE_URL}/localizar-trecho`;


// ============================================================
// TIPOS
// ============================================================

type Localizacao = {
  latitude: number;
  longitude: number;
  precisao: number | null;
};


type OrigemFoto =
  | "camera"
  | "galeria"
  | null;


type OrigemLocalizacao =
  | "FOTO"
  | "GPS_ATUAL"
  | "MANUAL"
  | "RODOVIA_KM"
  | null;


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


type RespostaLocalizacao = {
  status: string;

  rodovia: string;

  km: number;

  latitude: number;

  longitude: number;

  origem: string;

  aproximada: boolean;

  qualidade:
    | "REFERENCIA"
    | "BOA"
    | "MEDIA"
    | "BAIXA"
    | string;

  km_referencia_anterior: number;

  km_referencia_posterior: number;
};


// ============================================================
// EXIF - FUNÇÕES AUXILIARES
// ============================================================

function normalizarNomeChave(
  chave: string
) {
  return chave
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toUpperCase();
}


function obterValorExif(
  exif:
    Record<string, any> |
    null |
    undefined,

  nomes: string[]
) {
  if (!exif) {
    return undefined;
  }


  const nomesNormalizados =
    nomes.map(
      normalizarNomeChave
    );


  for (
    const [chave, valor]
    of Object.entries(exif)
  ) {
    const chaveNormalizada =
      normalizarNomeChave(
        chave
      );


    if (
      nomesNormalizados.includes(
        chaveNormalizada
      )
    ) {
      return valor;
    }
  }


  return undefined;
}


// ============================================================
// CONVERTER VALORES EXIF
// ============================================================

function converterRacional(
  valor: any
): number | null {

  if (
    typeof valor ===
      "number" &&
    Number.isFinite(
      valor
    )
  ) {
    return valor;
  }


  if (
    typeof valor ===
    "string"
  ) {
    const texto =
      valor.trim();


    if (!texto) {
      return null;
    }


    if (
      texto.includes("/")
    ) {
      const partes =
        texto.split("/");


      if (
        partes.length === 2
      ) {
        const numerador =
          Number(
            partes[0]
          );

        const denominador =
          Number(
            partes[1]
          );


        if (
          Number.isFinite(
            numerador
          ) &&
          Number.isFinite(
            denominador
          ) &&
          denominador !== 0
        ) {
          return (
            numerador /
            denominador
          );
        }
      }
    }


    const numero =
      Number(
        texto.replace(
          ",",
          "."
        )
      );


    if (
      Number.isFinite(
        numero
      )
    ) {
      return numero;
    }
  }


  if (
    valor &&
    typeof valor ===
      "object"
  ) {
    const numerador =
      Number(
        valor.numerator ??
        valor.numerador
      );

    const denominador =
      Number(
        valor.denominator ??
        valor.denominador
      );


    if (
      Number.isFinite(
        numerador
      ) &&
      Number.isFinite(
        denominador
      ) &&
      denominador !== 0
    ) {
      return (
        numerador /
        denominador
      );
    }
  }


  return null;
}


// ============================================================
// CONVERTER COORDENADA EXIF
// ============================================================

function converterCoordenadaExif(
  valor: any
): number | null {

  if (
    typeof valor ===
      "number" &&
    Number.isFinite(
      valor
    )
  ) {
    return valor;
  }


  if (
    Array.isArray(
      valor
    )
  ) {

    if (
      valor.length >= 3
    ) {
      const graus =
        converterRacional(
          valor[0]
        );

      const minutos =
        converterRacional(
          valor[1]
        );

      const segundos =
        converterRacional(
          valor[2]
        );


      if (
        graus !== null &&
        minutos !== null &&
        segundos !== null
      ) {
        return (
          Math.abs(
            graus
          ) +
          minutos / 60 +
          segundos / 3600
        );
      }
    }


    if (
      valor.length === 1
    ) {
      return converterRacional(
        valor[0]
      );
    }
  }


  if (
    typeof valor ===
    "string"
  ) {
    const texto =
      valor.trim();


    if (!texto) {
      return null;
    }


    if (
      /^-?\d+([.,]\d+)?$/.test(
        texto
      )
    ) {
      const numero =
        Number(
          texto.replace(
            ",",
            "."
          )
        );


      return Number.isFinite(
        numero
      )
        ? numero
        : null;
    }


    const partes =
      texto
        .replace(
          /[°'"]/g,
          " "
        )
        .split(
          /[\s,]+/
        )
        .filter(
          Boolean
        );


    if (
      partes.length >= 3
    ) {
      const graus =
        converterRacional(
          partes[0]
        );

      const minutos =
        converterRacional(
          partes[1]
        );

      const segundos =
        converterRacional(
          partes[2]
        );


      if (
        graus !== null &&
        minutos !== null &&
        segundos !== null
      ) {
        return (
          Math.abs(
            graus
          ) +
          minutos / 60 +
          segundos / 3600
        );
      }
    }
  }


  return null;
}


// ============================================================
// EXTRAIR GPS DA FOTO
// ============================================================

function extrairLocalizacaoExif(
  exif:
    Record<string, any> |
    null |
    undefined
): Localizacao | null {

  if (!exif) {
    return null;
  }


  const valorLatitude =
    obterValorExif(
      exif,
      [
        "latitude",
        "gpslatitude",
      ]
    );


  const valorLongitude =
    obterValorExif(
      exif,
      [
        "longitude",
        "gpslongitude",
      ]
    );


  let latitude =
    converterCoordenadaExif(
      valorLatitude
    );

  let longitude =
    converterCoordenadaExif(
      valorLongitude
    );


  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }


  const latitudeRef =
    String(
      obterValorExif(
        exif,
        [
          "gpslatituderef",
          "latituderef",
        ]
      ) ??
      ""
    )
      .trim()
      .toUpperCase();


  const longitudeRef =
    String(
      obterValorExif(
        exif,
        [
          "gpslongituderef",
          "longituderef",
        ]
      ) ??
      ""
    )
      .trim()
      .toUpperCase();


  if (
    latitudeRef === "S"
  ) {
    latitude =
      -Math.abs(
        latitude
      );
  }


  if (
    latitudeRef === "N"
  ) {
    latitude =
      Math.abs(
        latitude
      );
  }


  if (
    longitudeRef === "W"
  ) {
    longitude =
      -Math.abs(
        longitude
      );
  }


  if (
    longitudeRef === "E"
  ) {
    longitude =
      Math.abs(
        longitude
      );
  }


  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }


  return {
    latitude,
    longitude,
    precisao:
      null,
  };
}


// ============================================================
// TELA
// ============================================================

export default function AnaliseScreen() {

  const [
    fotoUri,
    setFotoUri,
  ] =
    useState<string | null>(
      null
    );


  const [
    origemFoto,
    setOrigemFoto,
  ] =
    useState<OrigemFoto>(
      null
    );


  const [
    localizacao,
    setLocalizacao,
  ] =
    useState<Localizacao | null>(
      null
    );


  const [
    origemLocalizacao,
    setOrigemLocalizacao,
  ] =
    useState<OrigemLocalizacao>(
      null
    );


  const [
    qualidadeLocalizacao,
    setQualidadeLocalizacao,
  ] =
    useState<string | null>(
      null
    );


  const [
    rodovia,
    setRodovia,
  ] =
    useState("");


  const [
    km,
    setKm,
  ] =
    useState("");


  const [
    latitudeManual,
    setLatitudeManual,
  ] =
    useState("");


  const [
    longitudeManual,
    setLongitudeManual,
  ] =
    useState("");


  const [
    resultado,
    setResultado,
  ] =
    useState<ResultadoAnalise | null>(
      null
    );


  const [
    analisando,
    setAnalisando,
  ] =
    useState(false);


  const [
    salvando,
    setSalvando,
  ] =
    useState(false);


  const [
    buscandoLocalizacao,
    setBuscandoLocalizacao,
  ] =
    useState(false);


// ============================================================
// MENSAGEM
// ============================================================

  function mostrarMensagem(
    titulo: string,
    mensagem: string
  ) {

    if (
      Platform.OS ===
      "web"
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


// ============================================================
// LIMPAR RESULTADO
// ============================================================

  function limparResultado() {
    setResultado(
      null
    );
  }


// ============================================================
// LIMPAR LOCALIZAÇÃO CALCULADA
// ============================================================

  function limparLocalizacaoCalculada() {

    if (
      origemLocalizacao ===
      "RODOVIA_KM" ||
      origemLocalizacao ===
      "MANUAL"
    ) {
      setLocalizacao(
        null
      );

      setOrigemLocalizacao(
        null
      );

      setQualidadeLocalizacao(
        null
      );
    }
  }


// ============================================================
// CÂMERA
// ============================================================

  async function tirarFoto() {

    const permissao =
      await ImagePicker
        .requestCameraPermissionsAsync();


    if (
      !permissao.granted
    ) {
      mostrarMensagem(
        "Permissão necessária",
        "O VerdeScan precisa acessar a câmera."
      );

      return;
    }


    const resultadoFoto =
      await ImagePicker
        .launchCameraAsync({
          allowsEditing:
            false,

          quality:
            0.8,

          exif:
            true,
        });


    if (
      resultadoFoto.canceled
    ) {
      return;
    }


    const asset =
      resultadoFoto.assets[0];


    setFotoUri(
      asset.uri
    );

    setOrigemFoto(
      "camera"
    );

    setResultado(
      null
    );

    setLocalizacao(
      null
    );

    setOrigemLocalizacao(
      null
    );

    setQualidadeLocalizacao(
      null
    );


    // --------------------------------------------------------
    // TENTA GPS ATUAL
    // --------------------------------------------------------

    try {

      setBuscandoLocalizacao(
        true
      );


      const {
        status,
      } =
        await Location
          .requestForegroundPermissionsAsync();


      if (
        status !==
        "granted"
      ) {
        return;
      }


      const posicao =
        await Location
          .getCurrentPositionAsync({
            accuracy:
              Location
                .Accuracy
                .High,
          });


      setLocalizacao({
        latitude:
          posicao.coords
            .latitude,

        longitude:
          posicao.coords
            .longitude,

        precisao:
          posicao.coords
            .accuracy,
      });


      setOrigemLocalizacao(
        "GPS_ATUAL"
      );


      setQualidadeLocalizacao(
        "GPS"
      );


    } catch (
      erro
    ) {
      console.log(
        "GPS atual indisponível:",
        erro
      );

    } finally {

      setBuscandoLocalizacao(
        false
      );
    }
  }


// ============================================================
// GALERIA
// ============================================================

  async function selecionarFoto() {

    const permissao =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();


    if (
      !permissao.granted
    ) {
      mostrarMensagem(
        "Permissão necessária",
        "O VerdeScan precisa acessar suas fotos."
      );

      return;
    }


    const resultadoFoto =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes: [
            "images",
          ],

          allowsEditing:
            false,

          quality:
            0.8,

          exif:
            true,
        });


    if (
      resultadoFoto.canceled
    ) {
      return;
    }


    const asset =
      resultadoFoto.assets[0];


    setFotoUri(
      asset.uri
    );


    setOrigemFoto(
      "galeria"
    );


    setResultado(
      null
    );


    setLocalizacao(
      null
    );


    setOrigemLocalizacao(
      null
    );


    setQualidadeLocalizacao(
      null
    );


    console.log(
      "EXIF DA FOTO:",
      asset.exif
    );


    const gpsFoto =
      extrairLocalizacaoExif(
        asset.exif as
          Record<string, any> |
          null |
          undefined
      );


    if (
      gpsFoto
    ) {

      setLocalizacao(
        gpsFoto
      );


      setOrigemLocalizacao(
        "FOTO"
      );


      setQualidadeLocalizacao(
        "GPS DA FOTO"
      );


      mostrarMensagem(
        "Localização encontrada",
        "O VerdeScan encontrou as coordenadas salvas na própria foto."
      );


      return;
    }


    mostrarMensagem(
      "Foto sem GPS",
      "Nenhum problema. Informe a rodovia e o KM. O VerdeScan estimará automaticamente onde fica o ponto. Latitude e longitude também podem ser informadas opcionalmente."
    );
  }


// ============================================================
// KM
// ============================================================

  function obterKmNumerico() {

    const valor =
      Number(
        km
          .trim()
          .replace(
            ",",
            "."
          )
      );


    if (
      !Number.isFinite(
        valor
      ) ||
      valor < 0
    ) {
      return null;
    }


    return valor;
  }


// ============================================================
// COORDENADAS MANUAIS
// ============================================================

  function obterLocalizacaoManual():
    Localizacao |
    null {

    const latTexto =
      latitudeManual.trim();

    const lngTexto =
      longitudeManual.trim();


    // Nenhum dos dois preenchidos

    if (
      !latTexto &&
      !lngTexto
    ) {
      return null;
    }


    // Apenas um preenchido

    if (
      !latTexto ||
      !lngTexto
    ) {
      throw new Error(
        "Para usar coordenadas manuais, informe latitude e longitude."
      );
    }


    const latitude =
      Number(
        latTexto.replace(
          ",",
          "."
        )
      );


    const longitude =
      Number(
        lngTexto.replace(
          ",",
          "."
        )
      );


    if (
      !Number.isFinite(
        latitude
      ) ||
      latitude < -90 ||
      latitude > 90
    ) {
      throw new Error(
        "Latitude inválida."
      );
    }


    if (
      !Number.isFinite(
        longitude
      ) ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error(
        "Longitude inválida."
      );
    }


    return {
      latitude,
      longitude,
      precisao:
        null,
    };
  }


// ============================================================
// LOCALIZAR POR RODOVIA + KM
// ============================================================

  async function localizarPorRodoviaKm(
    rodoviaInformada: string,
    kmInformado: number
  ):
    Promise<{
      localizacao: Localizacao;
      qualidade: string;
    }> {

    const resposta =
      await fetch(
        API_LOCALIZACAO_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify({
              rodovia:
                rodoviaInformada
                  .trim()
                  .toUpperCase(),

              km:
                kmInformado,
            }),
        }
      );


    if (
      !resposta.ok
    ) {

      let mensagem =
        "Não foi possível localizar o trecho.";


      try {

        const erro =
          await resposta.json();


        mensagem =
          erro.detail ??
          mensagem;


      } catch {
        // mantém mensagem padrão
      }


      throw new Error(
        mensagem
      );
    }


    const dados:
      RespostaLocalizacao =
      await resposta.json();


    return {

      localizacao: {
        latitude:
          dados.latitude,

        longitude:
          dados.longitude,

        precisao:
          null,
      },

      qualidade:
        dados.aproximada
          ? dados.qualidade
          : "REFERÊNCIA EXATA",

    };
  }


// ============================================================
// RESOLVER LOCALIZAÇÃO
// ============================================================

  async function resolverLocalizacao():
    Promise<Localizacao> {

    // --------------------------------------------------------
    // 1. GPS DA FOTO
    // --------------------------------------------------------

    if (
      origemLocalizacao ===
        "FOTO" &&
      localizacao
    ) {
      return localizacao;
    }


    // --------------------------------------------------------
    // 2. GPS ATUAL DA CÂMERA
    // --------------------------------------------------------

    if (
      origemLocalizacao ===
        "GPS_ATUAL" &&
      localizacao
    ) {
      return localizacao;
    }


    // --------------------------------------------------------
    // 3. LATITUDE / LONGITUDE OPCIONAIS
    // --------------------------------------------------------

    const manual =
      obterLocalizacaoManual();


    if (
      manual
    ) {

      setLocalizacao(
        manual
      );


      setOrigemLocalizacao(
        "MANUAL"
      );


      setQualidadeLocalizacao(
        "COORDENADAS INFORMADAS"
      );


      return manual;
    }


    // --------------------------------------------------------
    // 4. RODOVIA + KM
    // --------------------------------------------------------

    const kmNumerico =
      obterKmNumerico();


    if (
      !rodovia.trim()
    ) {
      throw new Error(
        "Informe a rodovia."
      );
    }


    if (
      kmNumerico ===
      null
    ) {
      throw new Error(
        "Informe um KM válido."
      );
    }


    setBuscandoLocalizacao(
      true
    );


    try {

      const resultadoLocalizacao =
        await localizarPorRodoviaKm(
          rodovia,
          kmNumerico
        );


      setLocalizacao(
        resultadoLocalizacao
          .localizacao
      );


      setOrigemLocalizacao(
        "RODOVIA_KM"
      );


      setQualidadeLocalizacao(
        resultadoLocalizacao
          .qualidade
      );


      return (
        resultadoLocalizacao
          .localizacao
      );


    } finally {

      setBuscandoLocalizacao(
        false
      );
    }
  }


// ============================================================
// MIME
// ============================================================

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


    if (
      endereco.includes(
        ".heic"
      ) ||
      endereco.includes(
        ".heif"
      )
    ) {
      return "image/heic";
    }


    return "image/jpeg";
  }


// ============================================================
// NOME ARQUIVO
// ============================================================

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


    return (
      `verdescan_${Date.now()}.jpg`
    );
  }


// ============================================================
// ENVIAR CNN
// ============================================================

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


    if (
      Platform.OS ===
      "web"
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
          API_ANALISE_URL,
          {
            method:
              "POST",

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


      return (
        await resposta.json()
      );


    } finally {

      clearTimeout(
        timeout
      );
    }
  }


// ============================================================
// ANALISAR
// ============================================================

  async function analisarOcorrencia() {

    if (
      !fotoUri
    ) {

      mostrarMensagem(
        "Foto necessária",
        "Selecione ou tire uma foto."
      );

      return;
    }


    if (
      !rodovia.trim()
    ) {

      mostrarMensagem(
        "Rodovia necessária",
        "Informe a rodovia."
      );

      return;
    }


    const kmNumerico =
      obterKmNumerico();


    if (
      kmNumerico ===
      null
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
      // PRIMEIRO RESOLVE A LOCALIZAÇÃO
      // =====================================================

      await resolverLocalizacao();


      // =====================================================
      // DEPOIS EXECUTA A CNN
      // =====================================================

      const resposta =
        await enviarFotoParaAPI(
          fotoUri
        );


      console.log(
        "Resposta VerdeScan:",
        resposta
      );


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
          "A IA não encontrou vegetação suficiente para classificar o trecho."
        );


        return;
      }


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


    } catch (
      erro: any
    ) {

      console.error(
        "Erro na análise:",
        erro
      );


      let mensagem =
        erro?.message ??
        "Não foi possível realizar a análise.";


      if (
        erro?.name ===
        "AbortError"
      ) {

        mensagem =
          "A análise demorou demais. Verifique se a API está ligada.";
      }


      mostrarMensagem(
        "Erro",
        mensagem
      );


    } finally {

      setAnalisando(
        false
      );
    }
  }


// ============================================================
// SALVAR
// ============================================================

  async function salvarOcorrencia() {

    if (
      !resultado ||
      resultado.classe ===
        "INCONCLUSIVO" ||
      !fotoUri ||
      !localizacao
    ) {

      mostrarMensagem(
        "Dados incompletos",
        "Não foi possível salvar a ocorrência."
      );

      return;
    }


    const kmNumerico =
      obterKmNumerico();


    if (
      kmNumerico ===
      null
    ) {
      return;
    }


    try {

      setSalvando(
        true
      );


      const novaOcorrencia:
        Ocorrencia = {

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
        "A ocorrência foi adicionada ao mapa do VerdeScan."
      );


      // =====================================================
      // VOLTA PARA HOME
      // O useFocusEffect RECARRREGA O MAPA
      // =====================================================

      router.replace(
        "/"
      );


    } catch (
      erro: any
    ) {

      console.error(
        erro
      );


      mostrarMensagem(
        "Erro",
        erro?.message ??
        "Não foi possível salvar."
      );


    } finally {

      setSalvando(
        false
      );
    }
  }


// ============================================================
// CONTROLES
// ============================================================

  const kmValido =
    obterKmNumerico() !==
    null;


  const podeAnalisar =
    fotoUri !==
      null &&

    rodovia
      .trim()
      .length >
      0 &&

    km
      .trim()
      .length >
      0 &&

    kmValido &&

    !analisando;


// ============================================================
// TEXTO ORIGEM LOCALIZAÇÃO
// ============================================================

  function textoOrigemLocalizacao() {

    if (
      origemLocalizacao ===
      "FOTO"
    ) {
      return "GPS da própria foto";
    }


    if (
      origemLocalizacao ===
      "GPS_ATUAL"
    ) {
      return "GPS atual do aparelho";
    }


    if (
      origemLocalizacao ===
      "MANUAL"
    ) {
      return "Coordenadas informadas pelo operador";
    }


    if (
      origemLocalizacao ===
      "RODOVIA_KM"
    ) {
      return "Estimativa baseada na rodovia e no KM";
    }


    return "Será definida antes da análise";
  }


// ============================================================
// INTERFACE
// ============================================================

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


        {/* HEADER */}

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
            Registre uma nova ocorrência de vegetação
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


                <Text
                  style={
                    styles.successText
                  }
                >
                  ✓ Foto registrada
                </Text>


                <Text
                  style={
                    styles.smallText
                  }
                >
                  {origemFoto ===
                  "camera"
                    ? "Foto tirada agora"
                    : "Imagem selecionada da galeria"}
                </Text>


                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }

                  onPress={
                    tirarFoto
                  }
                >

                  <Text
                    style={
                      styles.primaryButtonText
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
                >

                  <Text
                    style={
                      styles.secondaryButtonText
                    }
                  >
                    Escolher outra da galeria
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
                  Tire uma foto ou selecione uma imagem existente.
                </Text>


                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }

                  onPress={
                    tirarFoto
                  }
                >

                  <Text
                    style={
                      styles.primaryButtonText
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
            2. TRECHO
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
            2. Trecho da rodovia
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
              Rodovia *
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

                limparResultado();

                limparLocalizacaoCalculada();
              }}

              placeholder=
                "Ex.: SP-330"

              placeholderTextColor=
                "#9AA39C"

              autoCapitalize=
                "characters"
            />


            <Text
              style={[
                styles.inputLabel,
                styles.secondInputLabel,
              ]}
            >
              KM *
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

                limparResultado();

                limparLocalizacaoCalculada();
              }}

              placeholder=
                "Ex.: 100"

              placeholderTextColor=
                "#9AA39C"

              keyboardType=
                "decimal-pad"
            />

          </View>

        </View>


        {/* ==================================================
            3. LOCALIZAÇÃO
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
            3. Localização
          </Text>


          <View
            style={[
              styles.card,
              styles.formCard,
            ]}
          >

            <View
              style={
                styles.locationStatus
              }
            >

              <Text
                style={
                  styles.locationStatusTitle
                }
              >
                📍 {
                  localizacao
                    ? "Localização definida"
                    : "Localização será identificada automaticamente"
                }
              </Text>


              <Text
                style={
                  styles.locationStatusText
                }
              >
                {
                  textoOrigemLocalizacao()
                }
              </Text>


              {qualidadeLocalizacao && (
                <Text
                  style={
                    styles.qualityText
                  }
                >
                  Qualidade: {
                    qualidadeLocalizacao
                  }
                </Text>
              )}

            </View>


            {localizacao && (

              <View
                style={
                  styles.coordinatesBox
                }
              >

                <Text
                  style={
                    styles.coordinateText
                  }
                >
                  Latitude: {
                    localizacao
                      .latitude
                      .toFixed(
                        6
                      )
                  }
                </Text>


                <Text
                  style={
                    styles.coordinateText
                  }
                >
                  Longitude: {
                    localizacao
                      .longitude
                      .toFixed(
                        6
                      )
                  }
                </Text>

              </View>

            )}


            <View
              style={
                styles.optionalBox
              }
            >

              <Text
                style={
                  styles.optionalTitle
                }
              >
                Coordenadas exatas (opcional)
              </Text>


              <Text
                style={
                  styles.optionalHelp
                }
              >
                Se você souber a latitude e longitude exatas,
                pode informá-las para melhorar a precisão.
                Caso contrário, deixe os campos vazios e o
                VerdeScan usará a rodovia e o KM.
              </Text>


              <Text
                style={
                  styles.inputLabel
                }
              >
                Latitude
              </Text>


              <TextInput
                style={
                  styles.input
                }

                value={
                  latitudeManual
                }

                onChangeText={(
                  texto
                ) => {

                  setLatitudeManual(
                    texto
                  );

                  limparResultado();

                  limparLocalizacaoCalculada();
                }}

                placeholder=
                  "-22.8866235"

                placeholderTextColor=
                  "#9AA39C"

                keyboardType=
                  "numbers-and-punctuation"
              />


              <Text
                style={[
                  styles.inputLabel,
                  styles.secondInputLabel,
                ]}
              >
                Longitude
              </Text>


              <TextInput
                style={
                  styles.input
                }

                value={
                  longitudeManual
                }

                onChangeText={(
                  texto
                ) => {

                  setLongitudeManual(
                    texto
                  );

                  limparResultado();

                  limparLocalizacaoCalculada();
                }}

                placeholder=
                  "-47.1231735"

                placeholderTextColor=
                  "#9AA39C"

                keyboardType=
                  "numbers-and-punctuation"
              />

            </View>


            {buscandoLocalizacao && (

              <View
                style={
                  styles.loadingLocation
                }
              >

                <ActivityIndicator
                  size="small"
                  color="#21894A"
                />


                <Text
                  style={
                    styles.loadingLocationText
                  }
                >
                  Localizando trecho...
                </Text>

              </View>

            )}

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

            {analisando ? (
              <>

                <ActivityIndicator
                  size="large"
                  color="#21894A"
                />


                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Analisando imagem...
                </Text>

              </>

            ) : resultado ? (
              <>

                <Text
                  style={
                    styles.resultLabel
                  }
                >
                  Resultado
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
                    {
                      resultado.classe ===
                      "CRITICO"
                        ? "CRÍTICO"
                        : resultado.classe ===
                          "ATENCAO"
                          ? "ATENÇÃO"
                          : resultado.classe
                    }
                  </Text>

                </View>


                {resultado.classe !==
                  "INCONCLUSIVO" && (
                  <Text
                    style={
                      styles.confidence
                    }
                  >
                    Confiança: {
                      (
                        resultado
                          .confianca *
                        100
                      ).toFixed(
                        2
                      )
                    }%
                  </Text>
                )}


                <View
                  style={
                    styles.aiBox
                  }
                >

                  <Text
                    style={
                      styles.aiText
                    }
                  >
                    Vegetação detectada: {
                      resultado
                        .vegetacaoTotal
                        .toFixed(
                          2
                        )
                    }%
                  </Text>


                  <Text
                    style={
                      styles.aiText
                    }
                  >
                    Vegetação baixa: {
                      resultado
                        .vegetacaoBaixa
                        .toFixed(
                          2
                        )
                    }%
                  </Text>


                  <Text
                    style={
                      styles.aiText
                    }
                  >
                    Vegetação alta: {
                      resultado
                        .vegetacaoAlta
                        .toFixed(
                          2
                        )
                    }%
                  </Text>


                  <Text
                    style={
                      styles.aiText
                    }
                  >
                    Regiões analisadas: {
                      resultado
                        .patchesAnalisados
                    }
                  </Text>

                </View>

              </>

            ) : (
              <>

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
                  A IA classificará a vegetação como Normal,
                  Atenção ou Crítico.
                </Text>


                <Text
                  style={
                    styles.rules
                  }
                >
                  Normal: até 10 cm{"\n"}
                  Atenção: 10 a 30 cm{"\n"}
                  Crítico: acima de 30 cm
                </Text>

              </>
            )}

          </View>

        </View>


        {/* ANALISAR */}

        {!resultado && (

          <TouchableOpacity
            style={[
              styles.analyzeButton,

              !podeAnalisar &&
                styles.disabledButton,
            ]}

            disabled={
              !podeAnalisar
            }

            onPress={
              analisarOcorrencia
            }
          >

            {analisando ? (

              <ActivityIndicator
                color="#FFFFFF"
              />

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


        {/* SALVAR */}

        {resultado &&
          resultado.classe !==
            "INCONCLUSIVO" && (

          <TouchableOpacity
            style={
              styles.saveButton
            }

            disabled={
              salvando
            }

            onPress={
              salvarOcorrencia
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


        {/* REFAZER */}

        {resultado?.classe ===
          "INCONCLUSIVO" && (

          <TouchableOpacity
            style={
              styles.secondaryBottomButton
            }

            onPress={() =>
              setResultado(
                null
              )
            }
          >

            <Text
              style={
                styles.secondaryBottomButtonText
              }
            >
              Tentar outra análise
            </Text>

          </TouchableOpacity>

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
      paddingBottom:
        50,
    },


    header: {
      backgroundColor:
        "#164B2A",

      paddingHorizontal:
        20,

      paddingTop:
        28,

      paddingBottom:
        26,
    },


    backButton: {
      color:
        "#D8E7DC",

      fontSize:
        16,

      marginBottom:
        16,
    },


    title: {
      color:
        "#FFFFFF",

      fontSize:
        26,

      fontWeight:
        "bold",
    },


    subtitle: {
      marginTop:
        5,

      fontSize:
        14,

      color:
        "#D8E7DC",
    },


    section: {
      marginTop:
        24,

      paddingHorizontal:
        20,
    },


    sectionTitle: {
      fontSize:
        19,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom:
        12,
    },


    card: {
      backgroundColor:
        "#FFFFFF",

      borderRadius:
        16,

      padding:
        22,

      alignItems:
        "center",
    },


    formCard: {
      alignItems:
        "stretch",
    },


    icon: {
      fontSize:
        38,

      textAlign:
        "center",

      marginBottom:
        10,
    },


    cardTitle: {
      fontSize:
        17,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      textAlign:
        "center",

      marginTop:
        10,
    },


    cardText: {
      marginTop:
        7,

      fontSize:
        14,

      color:
        "#667168",

      textAlign:
        "center",

      lineHeight:
        20,
    },


    previewImage: {
      width:
        "100%",

      height:
        220,

      borderRadius:
        12,

      marginBottom:
        14,
    },


    successText: {
      fontSize:
        15,

      fontWeight:
        "bold",

      color:
        "#21894A",

      textAlign:
        "center",
    },


    smallText: {
      marginTop:
        5,

      color:
        "#6B756E",

      fontSize:
        12,

      textAlign:
        "center",
    },


    primaryButton: {
      marginTop:
        18,

      backgroundColor:
        "#21894A",

      borderRadius:
        10,

      paddingVertical:
        13,

      paddingHorizontal:
        25,

      alignItems:
        "center",
    },


    primaryButtonText: {
      color:
        "#FFFFFF",

      fontSize:
        15,

      fontWeight:
        "bold",
    },


    secondaryButton: {
      marginTop:
        12,

      backgroundColor:
        "#E5F2E9",

      borderRadius:
        10,

      paddingVertical:
        12,

      paddingHorizontal:
        22,

      alignItems:
        "center",
    },


    secondaryButtonText: {
      color:
        "#21894A",

      fontSize:
        14,

      fontWeight:
        "bold",
    },


    inputLabel: {
      fontSize:
        14,

      fontWeight:
        "bold",

      color:
        "#1D2A21",

      marginBottom:
        7,
    },


    secondInputLabel: {
      marginTop:
        18,
    },


    input: {
      width:
        "100%",

      backgroundColor:
        "#F4F7F4",

      borderWidth:
        1,

      borderColor:
        "#D8E0DA",

      borderRadius:
        10,

      paddingHorizontal:
        14,

      paddingVertical:
        13,

      fontSize:
        16,

      color:
        "#1D2A21",
    },


    locationStatus: {
      backgroundColor:
        "#EAF5ED",

      borderRadius:
        12,

      padding:
        14,
    },


    locationStatusTitle: {
      color:
        "#164B2A",

      fontSize:
        14,

      fontWeight:
        "bold",
    },


    locationStatusText: {
      marginTop:
        5,

      color:
        "#526157",

      fontSize:
        12,

      lineHeight:
        17,
    },


    qualityText: {
      marginTop:
        5,

      color:
        "#21894A",

      fontSize:
        11,

      fontWeight:
        "600",
    },


    coordinatesBox: {
      marginTop:
        12,

      backgroundColor:
        "#F4F7F4",

      padding:
        12,

      borderRadius:
        10,
    },


    coordinateText: {
      color:
        "#526157",

      fontSize:
        12,

      marginVertical:
        2,
    },


    optionalBox: {
      marginTop:
        18,

      borderTopWidth:
        1,

      borderTopColor:
        "#E1E7E2",

      paddingTop:
        18,
    },


    optionalTitle: {
      color:
        "#1D2A21",

      fontSize:
        14,

      fontWeight:
        "bold",
    },


    optionalHelp: {
      color:
        "#778078",

      fontSize:
        12,

      lineHeight:
        18,

      marginTop:
        5,

      marginBottom:
        16,
    },


    loadingLocation: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop:
        15,

      gap:
        8,
    },


    loadingLocationText: {
      color:
        "#21894A",

      fontSize:
        12,

      fontWeight:
        "600",
    },


    resultLabel: {
      color:
        "#6B756E",

      fontSize:
        13,
    },


    resultBadge: {
      marginTop:
        12,

      paddingHorizontal:
        22,

      paddingVertical:
        10,

      borderRadius:
        24,
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

      fontSize:
        18,

      fontWeight:
        "bold",
    },


    confidence: {
      color:
        "#526157",

      fontSize:
        14,

      fontWeight:
        "600",

      marginTop:
        10,
    },


    aiBox: {
      width:
        "100%",

      backgroundColor:
        "#F4F7F4",

      borderRadius:
        12,

      padding:
        15,

      marginTop:
        20,
    },


    aiText: {
      color:
        "#526157",

      fontSize:
        12,

      marginVertical:
        3,
    },


    rules: {
      color:
        "#778078",

      fontSize:
        12,

      lineHeight:
        19,

      textAlign:
        "center",

      marginTop:
        20,
    },


    analyzeButton: {
      marginHorizontal:
        20,

      marginTop:
        28,

      backgroundColor:
        "#21894A",

      paddingVertical:
        16,

      borderRadius:
        14,

      alignItems:
        "center",
    },


    disabledButton: {
      backgroundColor:
        "#A7B6AA",
    },


    analyzeButtonText: {
      color:
        "#FFFFFF",

      fontSize:
        17,

      fontWeight:
        "bold",
    },


    saveButton: {
      marginHorizontal:
        20,

      marginTop:
        28,

      backgroundColor:
        "#164B2A",

      paddingVertical:
        16,

      borderRadius:
        14,

      alignItems:
        "center",
    },


    saveButtonText: {
      color:
        "#FFFFFF",

      fontSize:
        17,

      fontWeight:
        "bold",
    },


    secondaryBottomButton: {
      marginHorizontal:
        20,

      marginTop:
        20,

      backgroundColor:
        "#E5F2E9",

      paddingVertical:
        15,

      borderRadius:
        14,

      alignItems:
        "center",
    },


    secondaryBottomButtonText: {
      color:
        "#21894A",

      fontSize:
        16,

      fontWeight:
        "bold",
    },

  });

  