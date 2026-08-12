import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ocorrencia } from "../types/Ocorrencia";

const STORAGE_KEY = "@verdescan_ocorrencias";

export async function salvarOcorrencias(
  ocorrencias: Ocorrencia[]
) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(ocorrencias)
    );
  } catch (error) {
    console.error(
      "Erro ao salvar ocorrências:",
      error
    );
  }
}

export async function carregarOcorrencias(): Promise<
  Ocorrencia[]
> {
  try {
    const dados = await AsyncStorage.getItem(
      STORAGE_KEY
    );

    if (!dados) {
      return [];
    }

    return JSON.parse(dados);
  } catch (error) {
    console.error(
      "Erro ao carregar ocorrências:",
      error
    );

    return [];
  }
}

export async function adicionarOcorrencia(
  ocorrencia: Ocorrencia
) {
  const ocorrencias =
    await carregarOcorrencias();

  const atualizadas = [
    ocorrencia,
    ...ocorrencias,
  ];

  await salvarOcorrencias(
    atualizadas
  );

  return atualizadas;
}

export async function removerOcorrencia(
  id: string
) {
  const ocorrencias =
    await carregarOcorrencias();

  const atualizadas =
    ocorrencias.filter(
      (item) => item.id !== id
    );

  await salvarOcorrencias(
    atualizadas
  );

  return atualizadas;
}