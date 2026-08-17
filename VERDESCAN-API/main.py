# ============================================================
# VERDESCAN API - V3.1.2
#
# Pipeline:
#
# FOTO
#   ↓
# SEGMENTADOR V3
#   ↓
# BACKGROUND / VEGETACAO_INTERESSE / ARVORE
#   ↓
# FOCO NA VEGETACAO
#   ↓
# CLASSIFICADOR ORDINAL V3.1
#   ↓
# P(acima de NORMAL)
# P(acima de ATENCAO)
#   ↓
# NORMAL / ATENCAO / CRITICO
#
# Regra principal:
# NORMAL -> ATENCAO = 50%
# ATENCAO -> CRITICO = 65%
#
# Regra operacional complementar:
# q1 >= 59%
# q2 >= 54%
# vegetacao entre 20% e 45%
# -> CRITICO
# ============================================================


# ============================================================
# IMPORTS
# ============================================================

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from pydantic import BaseModel


import tensorflow as tf
import numpy as np


from PIL import (
    Image,
    ImageOps,
    ImageFilter,
)


from io import BytesIO


import os
import json


from localizacao_rodovia import (
    localizar_rodovia_km,
    listar_rodovias,
)


# ============================================================
# CONFIGURACOES GERAIS
# ============================================================

VERSAO_API = "3.1.2"


# ============================================================
# TAMANHOS DOS MODELOS
# ============================================================

IMG_SEG_ALTURA = 256
IMG_SEG_LARGURA = 384

IMG_CLASS_ALTURA = 224
IMG_CLASS_LARGURA = 224


# ============================================================
# CLASSES
# ============================================================

CLASSES_SEGMENTACAO = [
    "BACKGROUND",
    "VEGETACAO_INTERESSE",
    "ARVORE",
]


CLASSES_CLASSIFICACAO = [
    "NORMAL",
    "ATENCAO",
    "CRITICO",
]


# ============================================================
# SEGURANCA
# ============================================================

MIN_VEGETACAO_INCONCLUSIVO = 1.0

MIN_VEGETACAO_REVISAO = 3.0

LIMIAR_CONFIANCA_REVISAO = 0.55


# ============================================================
# REGRA OPERACIONAL DE REFORCO PARA CRITICO
#
# IMPORTANTE:
#
# O limite principal do modelo continua sendo 65%.
#
# Esta regra atua somente em casos intermediarios que:
#
# - ja foram classificados como ATENCAO;
# - possuem q1 >= 59%;
# - possuem q2 >= 54%;
# - possuem entre 20% e 45% de vegetacao de interesse.
#
# O limite maximo de vegetacao ajuda a evitar que gramados
# muito extensos sejam promovidos automaticamente para CRITICO.
# ============================================================

REFORCO_CRITICO_Q1_MIN = 0.59

REFORCO_CRITICO_Q2_MIN = 0.54

REFORCO_CRITICO_VEGETACAO_MIN = 20.0

REFORCO_CRITICO_VEGETACAO_MAX = 45.0


# ============================================================
# CAMINHOS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)


MODELOS_DIR = os.path.join(
    BASE_DIR,
    "modelos"
)


CAMINHO_SEGMENTACAO = os.path.join(
    MODELOS_DIR,
    "VERDESCAN_SEGMENTACAO_FINAL_V3.keras"
)


CAMINHO_CLASSIFICACAO = os.path.join(
    MODELOS_DIR,
    "VERDESCAN_CLASSIFICADOR_ORDINAL_FINAL_V3_1.keras"
)


CAMINHO_CONFIG = os.path.join(
    MODELOS_DIR,
    "VERDESCAN_MODELOS_V3_1_CONFIG.json"
)


# ============================================================
# VERIFICAR ARQUIVOS
# ============================================================

def verificar_arquivo(
    caminho: str,
    nome: str
):

    if not os.path.exists(
        caminho
    ):

        raise FileNotFoundError(
            f"{nome} nao encontrado:\n"
            f"{caminho}"
        )


verificar_arquivo(
    CAMINHO_SEGMENTACAO,
    "Modelo de segmentacao"
)


verificar_arquivo(
    CAMINHO_CLASSIFICACAO,
    "Modelo classificador ordinal"
)


verificar_arquivo(
    CAMINHO_CONFIG,
    "Configuracao V3.1"
)


# ============================================================
# CARREGAR JSON
# ============================================================

print()
print("=" * 80)
print("VERDESCAN API V3.1.2")
print("=" * 80)


print(
    "\nCarregando configuracao V3.1..."
)


with open(
    CAMINHO_CONFIG,
    "r",
    encoding="utf-8"
) as arquivo:

    CONFIG_MODELOS = json.load(
        arquivo
    )


# ============================================================
# LER LIMIARES DO JSON
# ============================================================

try:

    LIMIAR_ATENCAO = float(
        CONFIG_MODELOS[
            "classificacao"
        ][
            "limiares"
        ][
            "normal_para_atencao"
        ]
    )


    LIMIAR_CRITICO = float(
        CONFIG_MODELOS[
            "classificacao"
        ][
            "limiares"
        ][
            "atencao_para_critico"
        ]
    )


except Exception as erro:

    raise RuntimeError(
        "Nao foi possivel ler os limiares "
        "do arquivo JSON V3.1."
    ) from erro


# ============================================================
# VALIDAR LIMIARES
# ============================================================

if not (
    0.0
    <
    LIMIAR_ATENCAO
    <
    1.0
):

    raise ValueError(
        "Limiar NORMAL -> ATENCAO invalido."
    )


if not (
    0.0
    <
    LIMIAR_CRITICO
    <
    1.0
):

    raise ValueError(
        "Limiar ATENCAO -> CRITICO invalido."
    )


print(
    "Configuracao carregada."
)


print(
    f"NORMAL -> ATENCAO: "
    f"{LIMIAR_ATENCAO * 100:.0f}%"
)


print(
    f"ATENCAO -> CRITICO principal: "
    f"{LIMIAR_CRITICO * 100:.0f}%"
)


print(
    f"Reforco CRITICO q1: "
    f"{REFORCO_CRITICO_Q1_MIN * 100:.0f}%"
)


print(
    f"Reforco CRITICO q2: "
    f"{REFORCO_CRITICO_Q2_MIN * 100:.0f}%"
)


print(
    "Vegetacao para reforco: "
    f"{REFORCO_CRITICO_VEGETACAO_MIN:.0f}% "
    "ate "
    f"{REFORCO_CRITICO_VEGETACAO_MAX:.0f}%"
)


# ============================================================
# CARREGAR SEGMENTADOR
# ============================================================

print()
print(
    "Carregando SEGMENTACAO FINAL V3..."
)


modelo_segmentacao = (
    tf.keras.models.load_model(
        CAMINHO_SEGMENTACAO,
        compile=False
    )
)


print(
    "Segmentacao V3 carregada."
)


print(
    "Input:",
    modelo_segmentacao.input_shape
)


print(
    "Output:",
    modelo_segmentacao.output_shape
)


# ============================================================
# CARREGAR CLASSIFICADOR ORDINAL
# ============================================================

print()
print(
    "Carregando CLASSIFICADOR ORDINAL FINAL V3.1..."
)


modelo_classificacao = (
    tf.keras.models.load_model(
        CAMINHO_CLASSIFICACAO,
        compile=False
    )
)


print(
    "Classificador ordinal V3.1 carregado."
)


print(
    "Input:",
    modelo_classificacao.input_shape
)


print(
    "Output:",
    modelo_classificacao.output_shape
)


# ============================================================
# VERIFICAR FORMATO DOS MODELOS
# ============================================================

if (
    modelo_segmentacao.input_shape[1:]
    !=
    (
        IMG_SEG_ALTURA,
        IMG_SEG_LARGURA,
        3
    )
):

    raise RuntimeError(
        "Input inesperado no modelo de segmentacao."
    )


if (
    modelo_classificacao.input_shape[1:]
    !=
    (
        IMG_CLASS_ALTURA,
        IMG_CLASS_LARGURA,
        3
    )
):

    raise RuntimeError(
        "Input inesperado no classificador V3.1."
    )


if (
    modelo_classificacao.output_shape[-1]
    !=
    2
):

    raise RuntimeError(
        "O classificador ordinal V3.1 "
        "deveria possuir exatamente 2 saidas."
    )


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(

    title="VerdeScan API",

    version=VERSAO_API,

    description=(
        "VerdeScan V3.1.2 - "
        "segmentacao semantica de vegetacao "
        "+ classificacao ordinal "
        "+ regra operacional de seguranca."
    ),
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "*"
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# MODELO DE REQUISICAO
# ============================================================

class LocalizarTrechoRequest(
    BaseModel
):

    rodovia: str

    km: float


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {

        "status":
            "online",

        "projeto":
            "VerdeScan",

        "versao":
            VERSAO_API,

        "pipeline":
            "V3.1.2",

        "segmentacao":
            "VERDESCAN_SEGMENTACAO_FINAL_V3",

        "classificacao":
            "VERDESCAN_CLASSIFICADOR_ORDINAL_FINAL_V3_1",

        "tipo_classificacao":
            "ordinal_com_regra_operacional",

        "limiares": {

            "normal_para_atencao":
                LIMIAR_ATENCAO,

            "atencao_para_critico":
                LIMIAR_CRITICO,
        },

        "reforco_critico": {

            "q1_min":
                REFORCO_CRITICO_Q1_MIN,

            "q2_min":
                REFORCO_CRITICO_Q2_MIN,

            "vegetacao_min":
                REFORCO_CRITICO_VEGETACAO_MIN,

            "vegetacao_max":
                REFORCO_CRITICO_VEGETACAO_MAX,
        },
    }


# ============================================================
# STATUS DOS MODELOS
# ============================================================

@app.get(
    "/status-modelos"
)
def status_modelos():

    return {

        "status":
            "sucesso",

        "versao":
            VERSAO_API,

        "pipeline":
            "V3.1.2",

        "segmentacao": {

            "arquivo":
                os.path.basename(
                    CAMINHO_SEGMENTACAO
                ),

            "input":
                modelo_segmentacao.input_shape,

            "output":
                modelo_segmentacao.output_shape,

            "classes":
                CLASSES_SEGMENTACAO,
        },


        "classificacao": {

            "arquivo":
                os.path.basename(
                    CAMINHO_CLASSIFICACAO
                ),

            "tipo":
                "ordinal",

            "input":
                modelo_classificacao.input_shape,

            "output":
                modelo_classificacao.output_shape,

            "classes":
                CLASSES_CLASSIFICACAO,

            "saidas": {

                "0":
                    "P(acima de NORMAL)",

                "1":
                    "P(acima de ATENCAO)",
            },

            "limiares": {

                "normal_para_atencao":
                    LIMIAR_ATENCAO,

                "atencao_para_critico":
                    LIMIAR_CRITICO,
            },

            "reforco_critico": {

                "q1_min":
                    REFORCO_CRITICO_Q1_MIN,

                "q2_min":
                    REFORCO_CRITICO_Q2_MIN,

                "vegetacao_min":
                    REFORCO_CRITICO_VEGETACAO_MIN,

                "vegetacao_max":
                    REFORCO_CRITICO_VEGETACAO_MAX,
            },
        },
    }


# ============================================================
# RODOVIAS SUPORTADAS
# ============================================================

@app.get(
    "/rodovias-suportadas"
)
def rodovias_suportadas():

    return {

        "status":
            "sucesso",

        "rodovias":
            listar_rodovias(),
    }


# ============================================================
# LOCALIZAR TRECHO
# ============================================================

@app.post(
    "/localizar-trecho"
)
def localizar_trecho(
    dados: LocalizarTrechoRequest
):

    resultado = localizar_rodovia_km(

        dados.rodovia,

        dados.km,
    )


    if resultado is None:

        raise HTTPException(

            status_code=404,

            detail=(
                "Nao foi possivel localizar esse trecho. "
                "Verifique se a rodovia esta cadastrada "
                "e se o KM esta dentro da faixa mapeada."
            ),
        )


    return {

        "status":
            "sucesso",

        **resultado,
    }


# ============================================================
# RESIZE COM PADDING
# ============================================================

def resize_com_padding(
    imagem: Image.Image,
    largura_destino: int,
    altura_destino: int,
    cor_fundo
):

    imagem = imagem.convert(
        "RGB"
    )


    imagem = ImageOps.pad(

        imagem,

        (
            largura_destino,
            altura_destino
        ),

        method=
            Image.Resampling.BILINEAR,

        color=
            cor_fundo,

        centering=(
            0.5,
            0.5
        ),
    )


    return imagem


# ============================================================
# PREPARAR SEGMENTACAO
# ============================================================

def preparar_segmentacao(
    imagem_pil: Image.Image
):

    imagem_seg_pil = resize_com_padding(

        imagem_pil,

        IMG_SEG_LARGURA,

        IMG_SEG_ALTURA,

        (
            0,
            0,
            0
        ),
    )


    imagem_seg_array = np.array(

        imagem_seg_pil,

        dtype=np.float32,
    )


    imagem_seg_batch = np.expand_dims(

        imagem_seg_array,

        axis=0,
    )


    return (
        imagem_seg_pil,
        imagem_seg_array,
        imagem_seg_batch,
    )


# ============================================================
# SEGMENTACAO
# ============================================================

def executar_segmentacao(
    imagem_batch: np.ndarray
):

    logits = modelo_segmentacao(

        imagem_batch,

        training=False
    )


    mascara = tf.argmax(

        logits,

        axis=-1
    )[0]


    mascara = (
        mascara
        .numpy()
        .astype(
            np.uint8
        )
    )


    return mascara


# ============================================================
# ESTATISTICAS DA SEGMENTACAO
# ============================================================

def calcular_estatisticas_segmentacao(
    mascara: np.ndarray
):

    total_pixels = int(
        mascara.size
    )


    pixels_background = int(
        np.sum(
            mascara == 0
        )
    )


    pixels_vegetacao = int(
        np.sum(
            mascara == 1
        )
    )


    pixels_arvore = int(
        np.sum(
            mascara == 2
        )
    )


    pct_background = (
        pixels_background
        /
        total_pixels
        *
        100
    )


    pct_vegetacao = (
        pixels_vegetacao
        /
        total_pixels
        *
        100
    )


    pct_arvore = (
        pixels_arvore
        /
        total_pixels
        *
        100
    )


    return {

        "background":
            pct_background,

        "vegetacao":
            pct_vegetacao,

        "arvore":
            pct_arvore,
    }


# ============================================================
# SUAVIZAR MASCARA
# ============================================================

def criar_mascara_vegetacao_suave(
    mascara_classes: np.ndarray
):

    mascara_binaria = (

        (
            mascara_classes
            ==
            1
        )
        .astype(
            np.uint8
        )
        *
        255
    )


    mascara_pil = Image.fromarray(
        mascara_binaria,
        mode="L"
    )


    mascara_suave_pil = (
        mascara_pil.filter(

            ImageFilter.GaussianBlur(
                radius=2.0
            )
        )
    )


    mascara_float = (

        np.array(
            mascara_suave_pil,
            dtype=np.float32
        )

        /

        255.0
    )


    mascara_float = np.clip(

        mascara_float,

        0.0,

        1.0
    )


    return mascara_float


# ============================================================
# PREPARAR IMAGEM PARA CLASSIFICADOR
# ============================================================

def preparar_classificador(
    imagem_segmentacao: np.ndarray,
    mascara_classes: np.ndarray
):

    mascara_float = (
        criar_mascara_vegetacao_suave(
            mascara_classes
        )
    )


    mascara_3d = (
        mascara_float[
            :,
            :,
            None
        ]
    )


    imagem_uint8 = (
        imagem_segmentacao
        .astype(
            np.uint8
        )
    )


    imagem_pil = Image.fromarray(
        imagem_uint8
    )


    imagem_cinza_pil = (
        imagem_pil.convert(
            "L"
        )
    )


    cinza = np.array(

        imagem_cinza_pil,

        dtype=np.float32
    )


    fundo = np.stack(

        [
            cinza,
            cinza,
            cinza
        ],

        axis=-1
    )


    fundo = (

        fundo
        *
        0.45

        +

        127.0
        *
        0.55
    )


    original = (
        imagem_segmentacao
        .astype(
            np.float32
        )
    )


    imagem_focada = (

        original
        *
        mascara_3d

        +

        fundo
        *
        (
            1.0
            -
            mascara_3d
        )
    )


    imagem_focada = np.clip(

        imagem_focada,

        0,

        255
    ).astype(
        np.uint8
    )


    imagem_focada_pil = Image.fromarray(
        imagem_focada
    )


    imagem_224_pil = resize_com_padding(

        imagem_focada_pil,

        IMG_CLASS_LARGURA,

        IMG_CLASS_ALTURA,

        (
            127,
            127,
            127
        ),
    )


    imagem_224_array = np.array(

        imagem_224_pil,

        dtype=np.float32
    )


    imagem_batch = np.expand_dims(

        imagem_224_array,

        axis=0
    )


    return (
        imagem_focada,
        imagem_224_array,
        imagem_batch,
    )


# ============================================================
# CLASSIFICADOR ORDINAL
# ============================================================

def executar_classificacao_ordinal(
    imagem_batch: np.ndarray
):

    logits = modelo_classificacao(

        imagem_batch,

        training=False
    )


    probabilidades_ordinais = (
        tf.nn.sigmoid(
            logits
        )[0]
        .numpy()
    )


    p_acima_normal = float(
        probabilidades_ordinais[
            0
        ]
    )


    p_acima_atencao = float(
        probabilidades_ordinais[
            1
        ]
    )


    # --------------------------------------------------------
    # CONSISTENCIA ORDINAL
    # --------------------------------------------------------

    p_acima_atencao = min(

        p_acima_atencao,

        p_acima_normal
    )


    # --------------------------------------------------------
    # DECISAO ORIGINAL DO MODELO
    # --------------------------------------------------------

    if (
        p_acima_normal
        <
        LIMIAR_ATENCAO
    ):

        classe = "NORMAL"


    elif (
        p_acima_atencao
        <
        LIMIAR_CRITICO
    ):

        classe = "ATENCAO"


    else:

        classe = "CRITICO"


    # --------------------------------------------------------
    # DISTRIBUICAO APROXIMADA
    # --------------------------------------------------------

    p_normal = (
        1.0
        -
        p_acima_normal
    )


    p_atencao = max(

        p_acima_normal
        -
        p_acima_atencao,

        0.0
    )


    p_critico = (
        p_acima_atencao
    )


    distribuicao = np.array(
        [
            p_normal,
            p_atencao,
            p_critico
        ],
        dtype=np.float32
    )


    soma = float(
        np.sum(
            distribuicao
        )
    )


    if soma > 0:

        distribuicao = (
            distribuicao
            /
            soma
        )


    # --------------------------------------------------------
    # CONFIANCA
    # --------------------------------------------------------

    if classe == "NORMAL":

        confianca_decisao = (
            1.0
            -
            p_acima_normal
        )


    elif classe == "ATENCAO":

        confianca_superior = (
            1.0
            -
            p_acima_atencao
        )


        confianca_decisao = min(

            p_acima_normal,

            confianca_superior
        )


    else:

        confianca_decisao = (
            p_acima_atencao
        )


    confianca_decisao = float(
        np.clip(
            confianca_decisao,
            0.0,
            1.0
        )
    )


    return {

        "classe":
            classe,

        "confianca":
            confianca_decisao,

        "p_acima_normal":
            p_acima_normal,

        "p_acima_atencao":
            p_acima_atencao,

        "prob_normal":
            float(
                distribuicao[
                    0
                ]
            ),

        "prob_atencao":
            float(
                distribuicao[
                    1
                ]
            ),

        "prob_critico":
            float(
                distribuicao[
                    2
                ]
            ),
    }


# ============================================================
# NIVEL DE CONFIANCA
# ============================================================

def definir_nivel_confianca(
    confianca: float
):

    if confianca >= 0.75:

        return "ALTA"


    if confianca >= 0.55:

        return "BOA"


    return "MODERADA"


# ============================================================
# RESULTADO INCONCLUSIVO
# ============================================================

def resultado_inconclusivo(
    estatisticas
):

    return {

        "status":
            "inconclusivo",

        "pipeline":
            "V3.1.2",

        "classe":
            "INCONCLUSIVO",

        "classe_modelo":
            "INCONCLUSIVO",

        "regra_operacional_aplicada":
            False,

        "confianca":
            0.0,

        "confianca_percentual":
            0.0,

        "nivel_confianca":
            "BAIXA",

        "revisao_recomendada":
            True,

        "motivo_revisao":
            (
                "Pouca vegetacao de interesse "
                "foi identificada na imagem."
            ),

        "vegetacao_total":
            round(
                estatisticas[
                    "vegetacao"
                ],
                2
            ),

        "vegetacao_interesse":
            round(
                estatisticas[
                    "vegetacao"
                ],
                2
            ),

        "arvore":
            round(
                estatisticas[
                    "arvore"
                ],
                2
            ),

        "background":
            round(
                estatisticas[
                    "background"
                ],
                2
            ),

        "ordinal": {

            "p_acima_normal":
                0.0,

            "p_acima_atencao":
                0.0,

            "limiar_atencao":
                LIMIAR_ATENCAO,

            "limiar_critico":
                LIMIAR_CRITICO,
        },

        "probabilidades": {

            "NORMAL":
                0.0,

            "ATENCAO":
                0.0,

            "CRITICO":
                0.0,
        },

        "probabilidades_percentuais": {

            "NORMAL":
                0.0,

            "ATENCAO":
                0.0,

            "CRITICO":
                0.0,
        },

        "vegetacao_baixa":
            0.0,

        "vegetacao_alta":
            0.0,

        "patches_analisados":
            0,
    }


# ============================================================
# PIPELINE COMPLETO V3.1.2
# ============================================================

def analisar_imagem(
    imagem_pil: Image.Image
):

    # ========================================================
    # 1. CORRIGIR ORIENTACAO EXIF
    # ========================================================

    imagem_pil = ImageOps.exif_transpose(
        imagem_pil
    )


    # ========================================================
    # 2. RGB
    # ========================================================

    imagem_pil = imagem_pil.convert(
        "RGB"
    )


    # ========================================================
    # 3. SEGMENTACAO
    # ========================================================

    (
        imagem_seg_pil,
        imagem_seg_array,
        imagem_seg_batch,
    ) = preparar_segmentacao(
        imagem_pil
    )


    mascara = executar_segmentacao(
        imagem_seg_batch
    )


    # ========================================================
    # 4. ESTATISTICAS
    # ========================================================

    estatisticas = (
        calcular_estatisticas_segmentacao(
            mascara
        )
    )


    pct_vegetacao = float(
        estatisticas[
            "vegetacao"
        ]
    )


    # ========================================================
    # 5. POUCA VEGETACAO
    # ========================================================

    if (
        pct_vegetacao
        <
        MIN_VEGETACAO_INCONCLUSIVO
    ):

        return resultado_inconclusivo(
            estatisticas
        )


    # ========================================================
    # 6. PREPARAR CLASSIFICADOR
    # ========================================================

    (
        imagem_focada,
        imagem_class_array,
        imagem_class_batch,
    ) = preparar_classificador(

        imagem_seg_array
        .astype(
            np.uint8
        ),

        mascara
    )


    # ========================================================
    # 7. CLASSIFICACAO ORDINAL
    # ========================================================

    resultado_ordinal = (
        executar_classificacao_ordinal(
            imagem_class_batch
        )
    )


    classe_modelo = resultado_ordinal[
        "classe"
    ]


    classe = classe_modelo


    confianca = float(
        resultado_ordinal[
            "confianca"
        ]
    )


    p_acima_normal = float(
        resultado_ordinal[
            "p_acima_normal"
        ]
    )


    p_acima_atencao = float(
        resultado_ordinal[
            "p_acima_atencao"
        ]
    )


    # ========================================================
    # 8. REGRA OPERACIONAL DE REFORCO
    # ========================================================

    regra_operacional_aplicada = False


    if (
        classe_modelo == "ATENCAO"

        and

        p_acima_normal
        >=
        REFORCO_CRITICO_Q1_MIN

        and

        p_acima_atencao
        >=
        REFORCO_CRITICO_Q2_MIN

        and

        REFORCO_CRITICO_VEGETACAO_MIN
        <=
        pct_vegetacao
        <=
        REFORCO_CRITICO_VEGETACAO_MAX
    ):

        classe = "CRITICO"

        regra_operacional_aplicada = True

        # Score conservador para o caso promovido.
        confianca = p_acima_atencao


    # ========================================================
    # 9. REVISAO
    # ========================================================

    motivos_revisao = []


    if regra_operacional_aplicada:

        motivos_revisao.append(
            (
                "Caso elevado a CRITICO pela "
                "regra operacional de seguranca."
            )
        )


    if (
        confianca
        <
        LIMIAR_CONFIANCA_REVISAO
    ):

        motivos_revisao.append(
            (
                "A classificacao possui "
                "confianca moderada."
            )
        )


    if (
        pct_vegetacao
        <
        MIN_VEGETACAO_REVISAO
    ):

        motivos_revisao.append(
            (
                "Pouca vegetacao de interesse "
                "foi encontrada na imagem."
            )
        )


    # --------------------------------------------------------
    # ATENCAO = zona intermediaria
    # --------------------------------------------------------

    if classe == "ATENCAO":

        distancia_normal = abs(
            p_acima_normal
            -
            LIMIAR_ATENCAO
        )


        distancia_critico = abs(
            p_acima_atencao
            -
            LIMIAR_CRITICO
        )


        if (
            distancia_normal
            <
            0.10

            or

            distancia_critico
            <
            0.10
        ):

            motivos_revisao.append(
                (
                    "Resultado proximo de um "
                    "dos limites operacionais."
                )
            )


    revisao_recomendada = (
        len(
            motivos_revisao
        )
        >
        0
    )


    motivo_revisao = (

        " ".join(
            motivos_revisao
        )

        if revisao_recomendada

        else
        None
    )


    # ========================================================
    # 10. RESULTADO FINAL
    # ========================================================

    return {

        "status":
            "sucesso",

        "pipeline":
            "V3.1.2",

        # ----------------------------------------------------
        # CLASSE FINAL UTILIZADA PELO APP
        # ----------------------------------------------------

        "classe":
            classe,

        # ----------------------------------------------------
        # CLASSE ORIGINAL DO MODELO
        # ----------------------------------------------------

        "classe_modelo":
            classe_modelo,

        # ----------------------------------------------------
        # REGRA OPERACIONAL
        # ----------------------------------------------------

        "regra_operacional_aplicada":
            regra_operacional_aplicada,

        "regra_operacional": {

            "q1_min":
                REFORCO_CRITICO_Q1_MIN,

            "q2_min":
                REFORCO_CRITICO_Q2_MIN,

            "vegetacao_min":
                REFORCO_CRITICO_VEGETACAO_MIN,

            "vegetacao_max":
                REFORCO_CRITICO_VEGETACAO_MAX,
        },

        # ----------------------------------------------------
        # CONFIANCA
        # ----------------------------------------------------

        "confianca":
            round(
                confianca,
                4
            ),

        "confianca_percentual":
            round(
                confianca
                *
                100,
                2
            ),

        "nivel_confianca":
            definir_nivel_confianca(
                confianca
            ),

        # ----------------------------------------------------
        # REVISAO
        # ----------------------------------------------------

        "revisao_recomendada":
            revisao_recomendada,

        "motivo_revisao":
            motivo_revisao,

        # ----------------------------------------------------
        # SEGMENTACAO
        # ----------------------------------------------------

        "vegetacao_total":
            round(
                estatisticas[
                    "vegetacao"
                ],
                2
            ),

        "vegetacao_interesse":
            round(
                estatisticas[
                    "vegetacao"
                ],
                2
            ),

        "arvore":
            round(
                estatisticas[
                    "arvore"
                ],
                2
            ),

        "background":
            round(
                estatisticas[
                    "background"
                ],
                2
            ),

        # ----------------------------------------------------
        # SAIDAS ORDINAIS
        # ----------------------------------------------------

        "ordinal": {

            "p_acima_normal":
                round(
                    p_acima_normal,
                    4
                ),

            "p_acima_normal_percentual":
                round(
                    p_acima_normal
                    *
                    100,
                    2
                ),

            "p_acima_atencao":
                round(
                    p_acima_atencao,
                    4
                ),

            "p_acima_atencao_percentual":
                round(
                    p_acima_atencao
                    *
                    100,
                    2
                ),

            "limiar_atencao":
                LIMIAR_ATENCAO,

            "limiar_atencao_percentual":
                round(
                    LIMIAR_ATENCAO
                    *
                    100,
                    2
                ),

            "limiar_critico":
                LIMIAR_CRITICO,

            "limiar_critico_percentual":
                round(
                    LIMIAR_CRITICO
                    *
                    100,
                    2
                ),
        },

        # ----------------------------------------------------
        # DISTRIBUICAO APROXIMADA
        # ----------------------------------------------------

        "probabilidades": {

            "NORMAL":
                round(
                    resultado_ordinal[
                        "prob_normal"
                    ],
                    4
                ),

            "ATENCAO":
                round(
                    resultado_ordinal[
                        "prob_atencao"
                    ],
                    4
                ),

            "CRITICO":
                round(
                    resultado_ordinal[
                        "prob_critico"
                    ],
                    4
                ),
        },


        "probabilidades_percentuais": {

            "NORMAL":
                round(
                    resultado_ordinal[
                        "prob_normal"
                    ]
                    *
                    100,
                    2
                ),

            "ATENCAO":
                round(
                    resultado_ordinal[
                        "prob_atencao"
                    ]
                    *
                    100,
                    2
                ),

            "CRITICO":
                round(
                    resultado_ordinal[
                        "prob_critico"
                    ]
                    *
                    100,
                    2
                ),
        },

        # ----------------------------------------------------
        # CAMPOS LEGADOS
        # ----------------------------------------------------

        "vegetacao_baixa":
            0.0,

        "vegetacao_alta":
            0.0,

        "patches_analisados":
            1,
    }


# ============================================================
# ENDPOINT /ANALISAR
# ============================================================

@app.post(
    "/analisar"
)
async def analisar(
    imagem: UploadFile = File(...)
):

    # ========================================================
    # VALIDAR TIPO
    # ========================================================

    if (

        imagem.content_type
        is None

        or

        not imagem.content_type.startswith(
            "image/"
        )
    ):

        raise HTTPException(

            status_code=400,

            detail=(
                "O arquivo enviado "
                "precisa ser uma imagem."
            ),
        )


    try:

        # ====================================================
        # LER IMAGEM
        # ====================================================

        conteudo = await imagem.read()


        if not conteudo:

            raise ValueError(
                "A imagem enviada esta vazia."
            )


        imagem_pil = Image.open(
            BytesIO(
                conteudo
            )
        )


        # ====================================================
        # PIPELINE
        # ====================================================

        resultado = analisar_imagem(
            imagem_pil
        )


        resultado[
            "arquivo"
        ] = imagem.filename


        return resultado


    except HTTPException:

        raise


    except Exception as erro:

        print()
        print("=" * 80)

        print(
            "ERRO NO PIPELINE VERDESCAN V3.1.2"
        )

        print("=" * 80)

        print(
            repr(
                erro
            )
        )

        print("=" * 80)
        print()


        raise HTTPException(

            status_code=500,

            detail=(
                "Erro ao processar a imagem "
                "no pipeline VerdeScan V3.1.2. "
                f"{type(erro).__name__}: "
                f"{str(erro)}"
            ),
        )

    