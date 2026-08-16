import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


const STORAGE_KEY =
  "@verdescan_ocorrencias";


// ============================================================
// VALIDAR OCORRÊNCIA
// ============================================================

function ocorrenciaValida(
  item: any
): item is Ocorrencia {
  if (
    !item ||
    typeof item !==
      "object"
  ) {
    return false;
  }


  // ---------------------------------------------------------
  // DADOS OBRIGATÓRIOS DA VERSÃO ATUAL
  // ---------------------------------------------------------

  if (
    typeof item.id !==
      "string"
  ) {
    return false;
  }


  if (
    typeof item.data !==
      "string"
  ) {
    return false;
  }


  if (
    typeof item.rodovia !==
      "string" ||
    item.rodovia
      .trim()
      .length === 0
  ) {
    return false;
  }


  if (
    typeof item.km !==
      "number" ||
    !Number.isFinite(
      item.km
    )
  ) {
    return false;
  }


  if (
    typeof item.latitude !==
      "number" ||
    !Number.isFinite(
      item.latitude
    )
  ) {
    return false;
  }


  if (
    typeof item.longitude !==
      "number" ||
    !Number.isFinite(
      item.longitude
    )
  ) {
    return false;
  }


  if (
    item.classe !==
      "NORMAL" &&
    item.classe !==
      "ATENCAO" &&
    item.classe !==
      "CRITICO"
  ) {
    return false;
  }


  return true;
}


// ============================================================
// NORMALIZAR OCORRÊNCIA
// ============================================================

function normalizarOcorrencia(
  item: Ocorrencia
): Ocorrencia {
  return {
    ...item,

    rodovia:
      item.rodovia
        .trim()
        .toUpperCase(),

    km:
      Number(
        item.km
      ),

    latitude:
      Number(
        item.latitude
      ),

    longitude:
      Number(
        item.longitude
      ),

    confianca:
      Number(
        item.confianca ??
        0
      ),

    status:
      item.status ??
      "PENDENTE",
  };
}


// ============================================================
// SALVAR TODAS
// ============================================================

export async function salvarOcorrencias(
  ocorrencias:
    Ocorrencia[]
) {
  try {
    const validas =
      ocorrencias
        .filter(
          ocorrenciaValida
        )
        .map(
          normalizarOcorrencia
        );


    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        validas
      )
    );

  } catch (error) {
    console.error(
      "Erro ao salvar ocorrências:",
      error
    );
  }
}


// ============================================================
// CARREGAR
// ============================================================

export async function carregarOcorrencias():
  Promise<Ocorrencia[]> {

  try {
    const dados =
      await AsyncStorage
        .getItem(
          STORAGE_KEY
        );


    if (!dados) {
      return [];
    }


    const parsed =
      JSON.parse(
        dados
      );


    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [];
    }


    // -------------------------------------------------------
    // REMOVE AUTOMATICAMENTE REGISTROS DE VERSÕES ANTIGAS
    // QUE NÃO POSSUEM O FORMATO ATUAL
    // -------------------------------------------------------

    const ocorrenciasValidas =
      parsed
        .filter(
          ocorrenciaValida
        )
        .map(
          normalizarOcorrencia
        );


    // -------------------------------------------------------
    // SE EXISTIAM DADOS ANTIGOS,
    // LIMPA O STORAGE AUTOMATICAMENTE
    // -------------------------------------------------------

    if (
      ocorrenciasValidas.length !==
      parsed.length
    ) {
      console.log(
        "VerdeScan: registros antigos incompatíveis foram removidos."
      );


      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          ocorrenciasValidas
        )
      );
    }


    return ocorrenciasValidas;

  } catch (error) {
    console.error(
      "Erro ao carregar ocorrências:",
      error
    );

    return [];
  }
}


// ============================================================
// ADICIONAR
// ============================================================

export async function adicionarOcorrencia(
  ocorrencia:
    Ocorrencia
) {
  const ocorrencias =
    await carregarOcorrencias();


  if (
    !ocorrenciaValida(
      ocorrencia
    )
  ) {
    throw new Error(
      "Tentativa de salvar uma ocorrência inválida."
    );
  }


  const nova =
    normalizarOcorrencia(
      ocorrencia
    );


  const atualizadas = [
    nova,
    ...ocorrencias,
  ];


  await salvarOcorrencias(
    atualizadas
  );


  return atualizadas;
}


// ============================================================
// REMOVER
// ============================================================

export async function removerOcorrencia(
  id: string
) {
  const ocorrencias =
    await carregarOcorrencias();


  const atualizadas =
    ocorrencias.filter(
      (item) =>
        item.id !==
        id
    );


  await salvarOcorrencias(
    atualizadas
  );


  return atualizadas;
}
