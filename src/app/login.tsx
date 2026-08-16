import {
  router,
} from "expo-router";

import {
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  fazerLogin,
} from "../services/auth";


export default function LoginScreen() {
  const [
    usuario,
    setUsuario,
  ] =
    useState("");

  const [
    senha,
    setSenha,
  ] =
    useState("");

  const [
    carregando,
    setCarregando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState("");


  // =========================================================
  // LOGIN
  // =========================================================

  async function entrar() {
    if (
      !usuario.trim() ||
      !senha
    ) {
      setErro(
        "Informe o usuário e a senha."
      );

      return;
    }


    try {
      setCarregando(
        true
      );

      setErro(
        ""
      );


      const resultado =
        await fazerLogin(
          usuario,
          senha
        );


      if (!resultado) {
        setErro(
          "Usuário ou senha incorretos."
        );

        return;
      }


      router.replace(
        "/"
      );

    } catch (error) {
      console.error(
        error
      );


      if (
        Platform.OS ===
        "web"
      ) {
        alert(
          "Não foi possível realizar o login."
        );

      } else {
        Alert.alert(
          "Erro",
          "Não foi possível realizar o login."
        );
      }

    } finally {
      setCarregando(
        false
      );
    }
  }


  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <KeyboardAvoidingView
        style={
          styles.keyboardContainer
        }
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >

        <View
          style={
            styles.backgroundCircleTop
          }
        />

        <View
          style={
            styles.backgroundCircleBottom
          }
        />


        <View
          style={
            styles.card
          }
        >

          <View
            style={
              styles.logoBox
            }
          >
            <Text
              style={
                styles.logoLetter
              }
            >
              V
            </Text>
          </View>


          <Text
            style={
              styles.title
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


          <View
            style={
              styles.divider
            }
          />


          {/* USUÁRIO */}

          <Text
            style={
              styles.label
            }
          >
            Usuário
          </Text>


          <TextInput
            style={
              styles.input
            }
            value={
              usuario
            }
            onChangeText={(
              texto
            ) => {
              setUsuario(
                texto
              );

              setErro(
                ""
              );
            }}
            placeholder=
              "Digite seu usuário"
            placeholderTextColor=
              "#8C9990"
            autoCapitalize=
              "none"
            autoCorrect={
              false
            }
            editable={
              !carregando
            }
          />


          {/* SENHA */}

          <Text
            style={[
              styles.label,
              styles.secondLabel,
            ]}
          >
            Senha
          </Text>


          <TextInput
            style={
              styles.input
            }
            value={
              senha
            }
            onChangeText={(
              texto
            ) => {
              setSenha(
                texto
              );

              setErro(
                ""
              );
            }}
            placeholder=
              "Digite sua senha"
            placeholderTextColor=
              "#8C9990"
            secureTextEntry
            autoCapitalize=
              "none"
            autoCorrect={
              false
            }
            editable={
              !carregando
            }
            onSubmitEditing={
              entrar
            }
          />


          {/* CREDENCIAIS DE DEMONSTRAÇÃO */}

          <View
            style={
              styles.demoBox
            }
          >
            <Text
              style={
                styles.demoTitle
              }
            >
              Acesso de demonstração
            </Text>

            <Text
              style={
                styles.demoText
              }
            >
              Usuário: master
            </Text>

            <Text
              style={
                styles.demoText
              }
            >
              Senha: verdescan2026
            </Text>
          </View>


          {erro.length > 0 && (
            <View
              style={
                styles.errorBox
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {erro}
              </Text>
            </View>
          )}


          <TouchableOpacity
            style={[
              styles.loginButton,

              carregando &&
                styles.loginButtonDisabled,
            ]}
            onPress={
              entrar
            }
            disabled={
              carregando
            }
          >
            {carregando ? (
              <ActivityIndicator
                color="#FFFFFF"
              />

            ) : (
              <Text
                style={
                  styles.loginButtonText
                }
              >
                Entrar
              </Text>
            )}
          </TouchableOpacity>


          <Text
            style={
              styles.footerText
            }
          >
            Acesso destinado aos
            operadores do sistema
          </Text>

        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        "#0A4B2C",
    },

    keyboardContainer: {
      flex: 1,
      justifyContent:
        "center",
      paddingHorizontal: 22,
      overflow:
        "hidden",
    },

    backgroundCircleTop: {
      position:
        "absolute",
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor:
        "rgba(255,255,255,0.05)",
      top: -150,
      right: -100,
    },

    backgroundCircleBottom: {
      position:
        "absolute",
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor:
        "rgba(83,190,120,0.18)",
      bottom: -100,
      left: -80,
    },

    card: {
      width:
        "100%",
      maxWidth: 460,
      alignSelf:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 24,
      paddingHorizontal: 26,
      paddingVertical: 32,
    },

    logoBox: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignSelf:
        "center",
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#21894A",
      marginBottom: 18,
    },

    logoLetter: {
      color:
        "#FFFFFF",
      fontSize: 34,
      fontWeight:
        "900",
    },

    title: {
      fontSize: 29,
      fontWeight:
        "900",
      color:
        "#163021",
      textAlign:
        "center",
    },

    subtitle: {
      marginTop: 6,
      color:
        "#6B786F",
      fontSize: 14,
      textAlign:
        "center",
    },

    divider: {
      height: 1,
      backgroundColor:
        "#E6ECE8",
      marginVertical: 25,
    },

    label: {
      color:
        "#34483B",
      fontSize: 13,
      fontWeight:
        "700",
      marginBottom: 7,
    },

    secondLabel: {
      marginTop: 17,
    },

    input: {
      width:
        "100%",
      borderWidth: 1,
      borderColor:
        "#D4E0D8",
      backgroundColor:
        "#F8FAF8",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 15,
      color:
        "#163021",
    },

    demoBox: {
      marginTop: 18,
      backgroundColor:
        "#F1F8F3",
      borderWidth: 1,
      borderColor:
        "#CFE4D5",
      borderRadius: 12,
      padding: 14,
    },

    demoTitle: {
      color:
        "#196B3B",
      fontSize: 12,
      fontWeight:
        "bold",
      marginBottom: 6,
    },

    demoText: {
      color:
        "#526157",
      fontSize: 13,
      marginTop: 2,
    },

    errorBox: {
      marginTop: 16,
      backgroundColor:
        "#FDECEC",
      borderRadius: 10,
      padding: 12,
    },

    errorText: {
      color:
        "#B63232",
      fontSize: 13,
      fontWeight:
        "600",
      textAlign:
        "center",
    },

    loginButton: {
      marginTop: 24,
      backgroundColor:
        "#21894A",
      paddingVertical: 15,
      borderRadius: 13,
      alignItems:
        "center",
    },

    loginButtonDisabled: {
      opacity: 0.65,
    },

    loginButtonText: {
      color:
        "#FFFFFF",
      fontSize: 16,
      fontWeight:
        "bold",
    },

    footerText: {
      marginTop: 20,
      fontSize: 11,
      color:
        "#8B968E",
      textAlign:
        "center",
    },

  });

  