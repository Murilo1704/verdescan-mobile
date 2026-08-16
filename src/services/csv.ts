import { Ocorrencia } from "../types/Ocorrencia";


// ============================================================
// FORMATAR DATA E HORA
// ============================================================

function formatarDataHora(
  dataIso: string
) {
  const data =
    new Date(dataIso);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return dataIso;
  }

  return data.toLocaleString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",

      hour: "2-digit",
      minute: "2-digit",

      hour12: false,
    }
  );
}


// ============================================================
// FORMATAR CLASSE
// ============================================================

function formatarClasse(
  classe: Ocorrencia["classe"]
) {
  if (
    classe === "CRITICO"
  ) {
    return "CRÍTICO";
  }

  if (
    classe === "ATENCAO"
  ) {
    return "ATENÇÃO";
  }

  return "NORMAL";
}


// ============================================================
// FORMATAR STATUS
// ============================================================

function formatarStatus(
  status: Ocorrencia["status"]
) {
  if (
    status === "EM_ANDAMENTO"
  ) {
    return "EM ANDAMENTO";
  }

  if (
    status === "CONCLUIDO"
  ) {
    return "CONCLUÍDO";
  }

  return "PENDENTE";
}


// ============================================================
// PROTEGER CAMPO CSV
// ============================================================

function campoCSV(
  valor:
    | string
    | number
    | null
    | undefined
) {
  const texto =
    String(
      valor ?? ""
    );

  return `"${texto.replace(
    /"/g,
    '""'
  )}"`;
}


// ============================================================
// GERAR CSV
// ============================================================

export function gerarCSV(
  ocorrencias: Ocorrencia[]
) {
  const cabecalho = [
    "Data e hora",
    "Rodovia",
    "KM",
    "Latitude",
    "Longitude",
    "Classificação",
    "Confiança",
    "Status",
  ];


  const linhas =
    ocorrencias.map(
      (ocorrencia) => {

        const confianca =
          `${(
            ocorrencia.confianca *
            100
          ).toFixed(2)}%`;


        return [
          formatarDataHora(
            ocorrencia.data
          ),

          ocorrencia.rodovia,

          ocorrencia.km,

          ocorrencia.latitude,

          ocorrencia.longitude,

          formatarClasse(
            ocorrencia.classe
          ),

          confianca,

          formatarStatus(
            ocorrencia.status
          ),
        ]
          .map(
            campoCSV
          )
          .join(";");
      }
    );


  return [
    cabecalho
      .map(
        campoCSV
      )
      .join(";"),

    ...linhas,

  ].join("\n");
}
