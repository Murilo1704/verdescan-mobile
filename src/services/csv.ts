import { Ocorrencia } from "../types/Ocorrencia";

function escaparCSV(valor: unknown) {
  const texto = String(
    valor ?? ""
  );

  if (
    texto.includes(",") ||
    texto.includes('"') ||
    texto.includes("\n")
  ) {
    return `"${texto.replace(
      /"/g,
      '""'
    )}"`;
  }

  return texto;
}

export function gerarCSV(
  ocorrencias: Ocorrencia[]
) {
  const cabecalho = [
    "Data",
    "Rodovia",
    "KM",
    "Latitude",
    "Longitude",
    "Classe",
    "Confianca",
    "Status",
  ];

  const linhas = ocorrencias.map(
    (ocorrencia) => [
      ocorrencia.data,
      ocorrencia.rodovia,
      ocorrencia.km,
      ocorrencia.latitude,
      ocorrencia.longitude,
      ocorrencia.classe,
      (
        ocorrencia.confianca * 100
      ).toFixed(2) + "%",
      ocorrencia.status,
    ]
  );

  return [
    cabecalho,
    ...linhas,
  ]
    .map((linha) =>
      linha
        .map(escaparCSV)
        .join(",")
    )
    .join("\n");
}