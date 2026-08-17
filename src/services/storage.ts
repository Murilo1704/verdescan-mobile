import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Ocorrencia,
} from "../types/Ocorrencia";


// ============================================================
// CHAVES
// ============================================================

const STORAGE_KEY =
  "@verdescan_ocorrencias";


// Esta chave serve SOMENTE para limpar os dados antigos
// uma única vez antes da gravação do protótipo.
//
// Depois que executar uma vez, ela fica marcada como concluída
// e os novos registros NÃO serão apagados novamente.

const RESET_VIDEO_KEY =
  "@verdescan_reset_video_2026_08_17_v1";


// ============================================================
// RETENÇÃO
// ============================================================

const MESES_RETENCAO = 6;


// ============================================================
// RESET ÚNICO PARA A GRAVAÇÃO
// ============================================================

async function executarResetInicialSeNecessario() {
  try {
    const resetJaExecutado =
      await AsyncStorage.getItem(
        RESET_VIDEO_KEY
      );


    if (
      resetJaExecutado ===
      "CONCLUIDO"
    ) {
      return;
    }


    // Apaga somente as ocorrências.
    // Login e outras configurações permanecem.

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([])
    );


    await AsyncStorage.setItem(
      RESET_VIDEO_KEY,
      "CONCLUIDO"
    );


    console.log(
      "✅ VerdeScan: registros antigos apagados para a gravação."
    );

  } catch (error) {
    console.error(
      "Erro ao executar reset inicial:",
      error
    );
  }
}


// ============================================================
// VERIFICAR SE A OCORRÊNCIA EXPIROU
// ============================================================

function ocorrenciaAindaValida(
  ocorrencia: Ocorrencia
) {
  const dataOcorrencia =
    new Date(
      ocorrencia.data
    );


  // Se houver algum registro antigo com data inválida,
  // preferimos NÃO apagar automaticamente.

  if (
    Number.isNaN(
      dataOcorrencia.getTime()
    )
  ) {
    return true;
  }


  const dataLimite =
    new Date();


  dataLimite.setMonth(
    dataLimite.getMonth() -
      MESES_RETENCAO
  );


  return (
    dataOcorrencia.getTime() >=
    dataLimite.getTime()
  );
}


// ============================================================
// SALVAR LISTA COMPLETA
// ============================================================

export async function salvarOcorrencias(
  ocorrencias: Ocorrencia[]
) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        ocorrencias
      )
    );

  } catch (error) {
    console.error(
      "Erro ao salvar ocorrências:",
      error
    );

    throw error;
  }
}


// ============================================================
// CARREGAR
//
// Também executa:
// 1. reset inicial da gravação;
// 2. limpeza de registros com mais de 6 meses.
// ============================================================

export async function carregarOcorrencias():
  Promise<Ocorrencia[]> {

  try {
    // --------------------------------------------------------
    // RESET ÚNICO
    // --------------------------------------------------------

    await executarResetInicialSeNecessario();


    // --------------------------------------------------------
    // CARREGAR STORAGE
    // --------------------------------------------------------

    const dados =
      await AsyncStorage.getItem(
        STORAGE_KEY
      );


    if (!dados) {
      return [];
    }


    const dadosConvertidos =
      JSON.parse(
        dados
      );


    if (
      !Array.isArray(
        dadosConvertidos
      )
    ) {
      return [];
    }


    const ocorrencias =
      dadosConvertidos as
        Ocorrencia[];


    // --------------------------------------------------------
    // APAGAR AUTOMATICAMENTE > 6 MESES
    // --------------------------------------------------------

    const ocorrenciasValidas =
      ocorrencias.filter(
        ocorrenciaAindaValida
      );


    // Se alguma ocorrência expirou,
    // atualiza o AsyncStorage automaticamente.

    if (
      ocorrenciasValidas.length !==
      ocorrencias.length
    ) {
      await salvarOcorrencias(
        ocorrenciasValidas
      );


      console.log(
        `${
          ocorrencias.length -
          ocorrenciasValidas.length
        } ocorrência(s) antiga(s) removida(s) automaticamente.`
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
  ocorrencia: Ocorrencia
) {
  const ocorrencias =
    await carregarOcorrencias();


  const novaLista = [
    ...ocorrencias,
    ocorrencia,
  ];


  await salvarOcorrencias(
    novaLista
  );
}


// ============================================================
// REMOVER UMA OCORRÊNCIA
// ============================================================

export async function removerOcorrencia(
  id: string
) {
  const ocorrencias =
    await carregarOcorrencias();


  const novaLista =
    ocorrencias.filter(
      (ocorrencia) =>
        ocorrencia.id !== id
    );


  await salvarOcorrencias(
    novaLista
  );


  return novaLista;
}


// ============================================================
// ATUALIZAR UMA OCORRÊNCIA
// ============================================================

export async function atualizarOcorrencia(
  ocorrenciaAtualizada:
    Ocorrencia
) {
  const ocorrencias =
    await carregarOcorrencias();


  const novaLista =
    ocorrencias.map(
      (ocorrencia) =>
        ocorrencia.id ===
        ocorrenciaAtualizada.id
          ? ocorrenciaAtualizada
          : ocorrencia
    );


  await salvarOcorrencias(
    novaLista
  );


  return novaLista;
}


// ============================================================
// APAGAR TODAS
//
// Mantive essa função porque pode ser útil depois
// para testes ou uma tela administrativa.
// ============================================================

export async function limparTodasOcorrencias() {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([])
    );


    console.log(
      "✅ Todas as ocorrências foram removidas."
    );

  } catch (error) {
    console.error(
      "Erro ao limpar ocorrências:",
      error
    );

    throw error;
  }
}
