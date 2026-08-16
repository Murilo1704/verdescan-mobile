import {
  router,
} from "expo-router";

import {
  useEffect,
  useRef,
} from "react";

import {
  StyleSheet,
  View,
} from "react-native";

import MapView, {
  Marker,
} from "react-native-maps";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


type Props = {
  ocorrencias: Ocorrencia[];
};


export default function MonitoramentoMap({
  ocorrencias,
}: Props) {
  const mapRef =
    useRef<MapView | null>(
      null
    );


  // =========================================================
  // SOMENTE PONTOS COM GPS VÁLIDO
  // =========================================================

  const pontosValidos =
    ocorrencias.filter(
      (ocorrencia) =>
        Number.isFinite(
          Number(
            ocorrencia.latitude
          )
        ) &&
        Number.isFinite(
          Number(
            ocorrencia.longitude
          )
        ) &&
        !(
          Number(
            ocorrencia.latitude
          ) === 0 &&
          Number(
            ocorrencia.longitude
          ) === 0
        )
    );


  // =========================================================
  // CENTRALIZAR MAPA QUANDO OS DADOS MUDAREM
  // =========================================================

  useEffect(() => {
    if (
      pontosValidos.length ===
      0
    ) {
      return;
    }

    const coordenadas =
      pontosValidos.map(
        (ocorrencia) => ({
          latitude:
            Number(
              ocorrencia.latitude
            ),

          longitude:
            Number(
              ocorrencia.longitude
            ),
        })
      );

    const timer =
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          coordenadas,
          {
            edgePadding: {
              top: 70,
              right: 70,
              bottom: 70,
              left: 70,
            },

            animated: true,
          }
        );
      }, 400);

    return () =>
      clearTimeout(timer);
  }, [ocorrencias]);


  // =========================================================
  // COR DO PONTO
  // =========================================================

  function corMarcador(
    classe:
      Ocorrencia["classe"]
  ) {
    if (
      classe ===
      "CRITICO"
    ) {
      return "#D63E3E";
    }

    if (
      classe ===
      "ATENCAO"
    ) {
      return "#E0A82E";
    }

    return "#2E9D50";
  }


  // =========================================================
  // TEXTO DA CLASSIFICAÇÃO
  // =========================================================

  function descricaoClasse(
    classe:
      Ocorrencia["classe"]
  ) {
    if (
      classe ===
      "CRITICO"
    ) {
      return "Vegetação crítica";
    }

    if (
      classe ===
      "ATENCAO"
    ) {
      return "Vegetação requer atenção";
    }

    return "Vegetação normal";
  }


  // =========================================================
  // REGIÃO INICIAL
  // =========================================================

  const primeiraOcorrencia =
    pontosValidos[0];

  const regiaoInicial = {
    latitude:
      primeiraOcorrencia
        ? Number(
            primeiraOcorrencia.latitude
          )
        : -23.5505,

    longitude:
      primeiraOcorrencia
        ? Number(
            primeiraOcorrencia.longitude
          )
        : -46.6333,

    latitudeDelta:
      primeiraOcorrencia
        ? 0.08
        : 0.3,

    longitudeDelta:
      primeiraOcorrencia
        ? 0.08
        : 0.3,
  };


  // =========================================================
  // MAPA
  // =========================================================

  return (
    <View
      style={
        styles.container
      }
    >
      <MapView
        ref={
          mapRef
        }

        style={
          styles.map
        }

        initialRegion={
          regiaoInicial
        }

        showsUserLocation={
          true
        }

        showsMyLocationButton={
          true
        }
      >

        {/* ===============================================
            APENAS OCORRÊNCIAS REAIS
        =============================================== */}

        {pontosValidos.map(
          (ocorrencia) => (
            <Marker
              key={
                ocorrencia.id
              }

              coordinate={{
                latitude:
                  Number(
                    ocorrencia.latitude
                  ),

                longitude:
                  Number(
                    ocorrencia.longitude
                  ),
              }}

              pinColor={
                corMarcador(
                  ocorrencia.classe
                )
              }

              title={
                `${ocorrencia.rodovia} • KM ${ocorrencia.km}`
              }

              description={
                descricaoClasse(
                  ocorrencia.classe
                )
              }

              onCalloutPress={() =>
                router.push({
                  pathname:
                    "/trecho-detalhes",

                  params: {
                    rodovia:
                      ocorrencia.rodovia,
                  },
                })
              }
            />
          )
        )}

      </MapView>
    </View>
  );
}


const styles =
  StyleSheet.create({

    container: {
      width: "100%",

      height: 300,

      borderRadius: 16,

      overflow:
        "hidden",

      backgroundColor:
        "#DDE9DF",
    },


    map: {
      width: "100%",

      height: "100%",
    },

  });
  