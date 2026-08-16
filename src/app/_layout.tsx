import {
  Stack,
  router,
  useSegments,
} from "expo-router";

import {
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";

import {
  carregarUsuarioLogado,
} from "../services/auth";


export default function RootLayout() {
  const segments =
    useSegments();

  const [
    verificando,
    setVerificando,
  ] =
    useState(true);

  const [
    autenticado,
    setAutenticado,
  ] =
    useState(false);


  // =========================================================
  // VERIFICAR LOGIN
  // =========================================================

  useEffect(() => {
    async function verificarLogin() {
      const usuario =
        await carregarUsuarioLogado();

      setAutenticado(
        usuario !== null
      );

      setVerificando(
        false
      );
    }

    verificarLogin();
  }, [
    segments,
  ]);


  // =========================================================
  // CONTROLAR ACESSO ÀS TELAS
  // =========================================================

  useEffect(() => {
    if (
      verificando
    ) {
      return;
    }

    const estaNoLogin =
      segments[0] ===
      "login";


    // Não autenticado
    if (
      !autenticado &&
      !estaNoLogin
    ) {
      router.replace(
        "/login"
      );

      return;
    }


    // Já autenticado e tentou abrir login
    if (
      autenticado &&
      estaNoLogin
    ) {
      router.replace(
        "/"
      );
    }

  }, [
    autenticado,
    verificando,
    segments,
  ]);


  // =========================================================
  // CARREGAMENTO
  // =========================================================

  if (
    verificando
  ) {
    return (
      <View
        style={
          styles.loading
        }
      >
        <ActivityIndicator
          size="large"
          color="#21894A"
        />
      </View>
    );
  }


  // =========================================================
  // TELAS DO APP
  // =========================================================

  return (
    <Stack
      screenOptions={{
        headerShown:
          false,
      }}
    >
      <Stack.Screen
        name="login"
      />

      <Stack.Screen
        name="index"
      />

      <Stack.Screen
        name="analise"
      />

      <Stack.Screen
        name="prioridades"
      />

     <Stack.Screen
        name="rodovias"
    />

      <Stack.Screen
        name="trecho-detalhes"
      />
    </Stack>
  );
}


const styles =
  StyleSheet.create({

    loading: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#F4F7F4",
    },

  });

