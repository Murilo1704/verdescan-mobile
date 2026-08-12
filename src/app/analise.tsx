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

type Localizacao = {
  latitude: number;
  longitude: number;
  precisao: number | null;
};

type ResultadoAnalise = {
  classe: "NORMAL" | "ATENCAO" | "CRITICO";
  confianca: number;
};

export default function AnaliseScreen() {
  const [fotoUri, setFotoUri] =
    useState<string | null>(null);

  const [origemFoto, setOrigemFoto] =
    useState<"camera" | "galeria" | null>(
      null
    );

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

  const [salvando, setSalvando] =
    useState(false);

  // =========================================================
  // CÂMERA
  // =========================================================

  async function tirarFoto() {
    const permissao =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      mostrarMensagem(
        "Permissão necessária",
        "O VerdeScan precisa acessar a câmera para registrar a vegetação."
      );

      return;
    }

    const resultadoFoto =
      await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

    if (!resultadoFoto.canceled) {
      setFotoUri(
        resultadoFoto.assets[0].uri
      );

      setOrigemFoto("camera");

      // Se trocar a foto, a análise anterior
      // deixa de ser válida.
      setResultado(null);
    }
  }

  // =========================================================
  // GALERIA
  // =========================================================

  async function selecionarFoto() {
    const permissao =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissao.granted) {
      mostrarMensagem(
        "Permissão necessária",
        "O VerdeScan precisa acessar suas fotos."
      );

      return;
    }

    const resultadoFoto =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

    if (!resultadoFoto.canceled) {
      setFotoUri(
        resultadoFoto.assets[0].uri
      );

      setOrigemFoto("galeria");

      setResultado(null);
    }
  }

  // =========================================================
  // GPS
  // =========================================================

  async function capturarLocalizacao() {
    try {
      setBuscandoLocalizacao(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        mostrarMensagem(
          "Permissão necessária",
          "O VerdeScan precisa da localização para registrar onde a análise foi realizada."
        );

        return;
      }

      const posicao =
        await Location.getCurrentPositionAsync(
          {
            accuracy:
              Location.Accuracy.High,
          }
        );

      setLocalizacao({
        latitude:
          posicao.coords.latitude,

        longitude:
          posicao.coords.longitude,

        precisao:
          posicao.coords.accuracy,
      });
    } catch (erro) {
      console.error(erro);

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
    if (Platform.OS === "web") {
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
      km.replace(",", ".");

    const valor = Number(
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
  // ANALISAR
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

    if (!rodovia.trim()) {
      mostrarMensagem(
        "Rodovia necessária",
        "Informe a rodovia onde a análise está sendo realizada."
      );

      return;
    }

    const kmNumerico =
      obterKmNumerico();

    if (kmNumerico === null) {
      mostrarMensagem(
        "KM inválido",
        "Informe um KM válido."
      );

      return;
    }

    /*
      =======================================================
      PRÓXIMO PASSO:
      AQUI VAMOS ENVIAR fotoUri PARA A API DO VERDESCAN.

      Exemplo futuro:

      const resposta = await analisarImagemAPI(fotoUri);

      setResultado({
        classe: resposta.classe,
        confianca: resposta.confianca,
      });

      =======================================================
    */

    mostrarMensagem(
      "Dados preparados",
      "Foto, GPS, rodovia e KM estão prontos. No próximo passo vamos conectar esta tela à API da inteligência artificial."
    );
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

    const kmNumerico =
      obterKmNumerico();

    if (kmNumerico === null) {
      return;
    }

    try {
      setSalvando(true);

      const novaOcorrencia: Ocorrencia =
        {
          id: `${Date.now()}`,

          data:
            new Date().toISOString(),

          rodovia:
            rodovia
              .trim()
              .toUpperCase(),

          km: kmNumerico,

          latitude:
            localizacao.latitude,

          longitude:
            localizacao.longitude,

          classe:
            resultado.classe,

          confianca:
            resultado.confianca,

          status: "PENDENTE",

          imagem: fotoUri,
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
      console.error(erro);

      mostrarMensagem(
        "Erro",
        "Não foi possível salvar a ocorrência."
      );
    } finally {
      setSalvando(false);
    }
  }

  // =========================================================
  // CONTROLE DO BOTÃO
  // =========================================================

  const kmValido =
    obterKmNumerico() !== null;

  const podeAnalisar =
    fotoUri !== null &&
    localizacao !== null &&
    rodovia.trim().length > 0 &&
    km.trim().length > 0 &&
    kmValido;

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backButton}
            >
              ‹ Voltar
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Nova análise
          </Text>

          <Text
            style={styles.subtitle}
          >
            Registre uma nova ocorrência
            de vegetação
          </Text>
        </View>

        {/* ===============================================
            1. FOTO
        =============================================== */}

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            1. Foto da vegetação
          </Text>

          <View style={styles.card}>
            {fotoUri ? (
              <>
                <Image
                  source={{
                    uri: fotoUri,
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
                  onPress={tirarFoto}
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
                  style={styles.icon}
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
                  onPress={tirarFoto}
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

        {/* ===============================================
            2. LOCALIZAÇÃO
        =============================================== */}

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            2. Localização GPS
          </Text>

          <View style={styles.card}>
            {!localizacao ? (
              <>
                <Text
                  style={styles.icon}
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

        {/* ===============================================
            3. RODOVIA E KM
        =============================================== */}

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
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
              style={styles.inputLabel}
            >
              Rodovia
            </Text>

            <TextInput
              style={styles.input}
              value={rodovia}
              onChangeText={(texto) => {
                setRodovia(texto);
                setResultado(null);
              }}
              placeholder="Ex.: SP-330"
              placeholderTextColor="#9AA39C"
              autoCapitalize="characters"
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
              style={styles.input}
              value={km}
              onChangeText={(texto) => {
                setKm(texto);
                setResultado(null);
              }}
              placeholder="Ex.: 105"
              placeholderTextColor="#9AA39C"
              keyboardType="decimal-pad"
            />

            <Text
              style={styles.fieldHelp}
            >
              Essas informações serão
              utilizadas no mapa, na lista
              de prioridades e no arquivo
              CSV.
            </Text>
          </View>
        </View>

        {/* ===============================================
            4. CLASSIFICAÇÃO
        =============================================== */}

        <View style={styles.section}>
          <Text
            style={styles.sectionTitle}
          >
            4. Classificação
          </Text>

          <View style={styles.card}>
            {resultado ? (
              <>
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
                        : styles.resultNormal,
                  ]}
                >
                  <Text
                    style={
                      styles.resultBadgeText
                    }
                  >
                    {
                      resultado.classe
                    }
                  </Text>
                </View>

                <Text
                  style={
                    styles.resultConfidence
                  }
                >
                  Confiança:{" "}
                  {(
                    resultado.confianca *
                    100
                  ).toFixed(2)}
                  %
                </Text>
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

        {/* ===============================================
            ANALISAR
        =============================================== */}

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
            <Text
              style={
                styles.analyzeButtonText
              }
            >
              Analisar ocorrência
            </Text>
          </TouchableOpacity>
        )}

        {/* ===============================================
            SALVAR
        =============================================== */}

        {resultado && (
          <TouchableOpacity
            style={
              styles.saveButton
            }
            onPress={
              salvarOcorrencia
            }
            disabled={salvando}
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

        {/* AJUDA */}

        {!podeAnalisar &&
          !resultado && (
            <Text
              style={styles.helpText}
            >
              Registre uma foto, capture
              sua localização e informe a
              rodovia e o KM para
              continuar.
            </Text>
          )}

        {podeAnalisar &&
          !resultado && (
            <Text
              style={styles.readyText}
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

// ===========================================================
// ESTILOS
// ===========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },

  content: {
    paddingBottom: 50,
  },

  header: {
    backgroundColor: "#164B2A",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 26,
  },

  backButton: {
    color: "#D8E7DC",
    fontSize: 16,
    marginBottom: 16,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "bold",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
    color: "#D8E7DC",
  },

  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#1D2A21",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },

  formCard: {
    alignItems: "stretch",
  },

  icon: {
    fontSize: 38,
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1D2A21",
    textAlign: "center",
  },

  cardText: {
    marginTop: 7,
    fontSize: 14,
    color: "#667168",
    textAlign: "center",
    lineHeight: 20,
  },

  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
  },

  successRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  successPoint: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#21894A",
    marginRight: 7,
  },

  successText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#21894A",
  },

  photoOrigin: {
    fontSize: 12,
    color: "#6B756E",
    marginTop: 5,
  },

  primaryPhotoButton: {
    marginTop: 18,
    backgroundColor: "#21894A",
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 28,
    minWidth: 210,
    alignItems: "center",
  },

  primaryPhotoButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },

  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#E5F2E9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 190,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#21894A",
    fontSize: 15,
    fontWeight: "bold",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  locationData: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#F4F7F4",
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 18,
  },

  locationItem: {
    flex: 1,
    alignItems: "center",
  },

  locationDivider: {
    width: 1,
    backgroundColor: "#D5DDD7",
  },

  locationLabel: {
    fontSize: 12,
    color: "#6B756E",
  },

  locationValue: {
    marginTop: 5,
    fontSize: 15,
    fontWeight: "bold",
    color: "#1D2A21",
  },

  accuracyBox: {
    marginTop: 12,
    alignItems: "center",
  },

  accuracyLabel: {
    fontSize: 12,
    color: "#6B756E",
  },

  accuracyValue: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: "600",
    color: "#1D2A21",
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1D2A21",
    marginBottom: 7,
  },

  secondInputLabel: {
    marginTop: 18,
  },

  input: {
    width: "100%",
    backgroundColor: "#F4F7F4",
    borderWidth: 1,
    borderColor: "#D8E0DA",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#1D2A21",
  },

  fieldHelp: {
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    color: "#778078",
  },

  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },

  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusPoint: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 6,
  },

  green: {
    backgroundColor: "#2E9D50",
  },

  yellow: {
    backgroundColor: "#E0A82E",
  },

  red: {
    backgroundColor: "#D63E3E",
  },

  statusLabel: {
    fontSize: 13,
    color: "#526157",
  },

  heightRules: {
    marginTop: 20,
    fontSize: 12,
    color: "#778078",
    textAlign: "center",
    lineHeight: 19,
  },

  analyzeButton: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: "#21894A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  analyzeButtonDisabled: {
    backgroundColor: "#A7B6AA",
  },

  analyzeButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  saveButton: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: "#164B2A",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },

  helpText: {
    marginHorizontal: 30,
    marginTop: 12,
    color: "#778078",
    fontSize: 12,
    textAlign: "center",
  },

  readyText: {
    marginHorizontal: 30,
    marginTop: 12,
    color: "#21894A",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  resultLabel: {
    fontSize: 13,
    color: "#6B756E",
  },

  resultBadge: {
    marginTop: 12,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 24,
  },

  resultNormal: {
    backgroundColor: "#2E9D50",
  },

  resultAttention: {
    backgroundColor: "#E0A82E",
  },

  resultCritical: {
    backgroundColor: "#D63E3E",
  },

  resultBadgeText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },

  resultConfidence: {
    marginTop: 10,
    color: "#526157",
    fontSize: 14,
  },
});
