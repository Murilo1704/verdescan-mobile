export type Ocorrencia = {
  id: string;
  data: string;

  rodovia: string;
  km: number;

  latitude: number;
  longitude: number;

  classe: "NORMAL" | "ATENCAO" | "CRITICO";
  confianca: number;

  status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";

  imagem?: string;
};