from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import tensorflow as tf
from tensorflow import keras

import numpy as np

from PIL import Image
from io import BytesIO

import os

from localizacao_rodovia import (
    localizar_rodovia_km,
    listar_rodovias,
)


# ============================================================
# CONFIGURAÇÕES GERAIS
# ============================================================

IMG_SEG_ALTURA = 288
IMG_SEG_LARGURA = 512

IMG_CLASS_ALTURA = 224
IMG_CLASS_LARGURA = 224

MIN_VEGETACAO = 5.0

CLASSES_CLASSIFICACAO = [
    "ATENCAO",
    "CRITICO",
    "NORMAL",
]


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
    "verdescan_segmentacao_final.keras"
)

CAMINHO_CLASSIFICACAO = os.path.join(
    MODELOS_DIR,
    "verdescan_mobilenetv2_final.keras"
)


# ============================================================
# LOSS PERSONALIZADA DO MODELO DE SEGMENTAÇÃO
# ============================================================

CLASS_WEIGHTS_SEG = tf.constant(
    [
        0.47,
        2.47,
        1.00,
    ],
    dtype=tf.float32
)


def weighted_sparse_crossentropy(
    y_true,
    y_pred
):
    y_true = tf.squeeze(
        y_true,
        axis=-1
    )

    y_true = tf.cast(
        y_true,
        tf.int32
    )

    loss = (
        tf.keras.losses
        .sparse_categorical_crossentropy(
            y_true,
            y_pred,
            from_logits=True
        )
    )

    pesos = tf.gather(
        CLASS_WEIGHTS_SEG,
        y_true
    )

    loss = loss * pesos

    return tf.reduce_mean(
        loss
    )


# ============================================================
# CARREGAR MODELOS
# ============================================================

print(
    "Carregando modelo de segmentação..."
)

modelo_segmentacao = keras.models.load_model(
    CAMINHO_SEGMENTACAO,
    custom_objects={
        "weighted_sparse_crossentropy":
            weighted_sparse_crossentropy
    }
)

print(
    "Modelo de segmentação carregado."
)

print(
    "Carregando modelo de classificação..."
)

modelo_classificacao = keras.models.load_model(
    CAMINHO_CLASSIFICACAO
)

print(
    "Modelo de classificação carregado."
)


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="VerdeScan API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MODELO DE REQUISIÇÃO - LOCALIZAÇÃO POR RODOVIA + KM
# ============================================================

class LocalizarTrechoRequest(BaseModel):
    rodovia: str
    km: float


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "status": "online",
        "projeto": "VerdeScan",
        "segmentacao": "carregada",
        "classificacao": "carregada"
    }


# ============================================================
# RODOVIAS SUPORTADAS
# ============================================================

@app.get("/rodovias-suportadas")
def rodovias_suportadas():
    return {
        "status": "sucesso",
        "rodovias": listar_rodovias(),
    }


# ============================================================
# LOCALIZAR TRECHO POR RODOVIA + KM
# ============================================================

@app.post("/localizar-trecho")
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
                "Não foi possível localizar esse trecho. "
                "Verifique se a rodovia está cadastrada e se "
                "o KM está dentro da faixa atualmente mapeada."
            )
        )

    return {
        "status": "sucesso",
        **resultado,
    }


# ============================================================
# PIPELINE V3
# ============================================================

def analisar_imagem(
    imagem_pil: Image.Image
):

    # --------------------------------------------------------
    # 1. IMAGEM ORIGINAL
    # --------------------------------------------------------

    imagem_pil = imagem_pil.convert(
        "RGB"
    )

    imagem_original = np.array(
        imagem_pil
    )

    altura_original, largura_original = (
        imagem_original.shape[:2]
    )


    # --------------------------------------------------------
    # 2. PREPARAR PARA SEGMENTAÇÃO
    # --------------------------------------------------------

    imagem_seg = imagem_pil.resize(
        (
            IMG_SEG_LARGURA,
            IMG_SEG_ALTURA
        )
    )

    imagem_seg = np.array(
        imagem_seg,
        dtype=np.float32
    ) / 255.0

    imagem_seg_batch = np.expand_dims(
        imagem_seg,
        axis=0
    )


    # --------------------------------------------------------
    # 3. SEGMENTAÇÃO
    # --------------------------------------------------------

    logits_seg = modelo_segmentacao.predict(
        imagem_seg_batch,
        verbose=0
    )

    mascara = np.argmax(
        logits_seg[0],
        axis=-1
    )


    # --------------------------------------------------------
    # 4. ESTATÍSTICAS DA SEGMENTAÇÃO
    # --------------------------------------------------------

    total_pixels = mascara.size

    pixels_background = np.sum(
        mascara == 0
    )

    pixels_low = np.sum(
        mascara == 1
    )

    pixels_high = np.sum(
        mascara == 2
    )

    pct_background = (
        pixels_background
        / total_pixels
        * 100
    )

    pct_low = (
        pixels_low
        / total_pixels
        * 100
    )

    pct_high = (
        pixels_high
        / total_pixels
        * 100
    )

    pct_vegetacao = (
        pct_low + pct_high
    )


    # --------------------------------------------------------
    # 5. SEGURANÇA
    # --------------------------------------------------------

    if pct_vegetacao < MIN_VEGETACAO:

        return {
            "status": "inconclusivo",
            "classe": "INCONCLUSIVO",
            "confianca": 0.0,

            "vegetacao_total":
                round(
                    pct_vegetacao,
                    2
                ),

            "vegetacao_baixa":
                round(
                    pct_low,
                    2
                ),

            "vegetacao_alta":
                round(
                    pct_high,
                    2
                ),

            "background":
                round(
                    pct_background,
                    2
                ),

            "patches_analisados": 0,

            "probabilidades": {
                "ATENCAO": 0.0,
                "CRITICO": 0.0,
                "NORMAL": 0.0
            }
        }


    # --------------------------------------------------------
    # 6. MÁSCARA BINÁRIA DE VEGETAÇÃO
    # --------------------------------------------------------

    mask_binaria = (
        (mascara == 1) |
        (mascara == 2)
    ).astype(
        np.uint8
    )

    mask_pil = Image.fromarray(
        mask_binaria * 255
    )

    mask_pil = mask_pil.resize(
        (
            largura_original,
            altura_original
        ),
        Image.Resampling.NEAREST
    )

    mask_original = (
        np.array(mask_pil) > 0
    )


    # --------------------------------------------------------
    # 7. DIVIDIR IMAGEM EM PATCHES
    # --------------------------------------------------------

    linhas = 3
    colunas = 4

    altura_patch = (
        altura_original
        // linhas
    )

    largura_patch = (
        largura_original
        // colunas
    )

    probabilidades_patches = []

    patches_validos = 0


    for linha in range(linhas):

        for coluna in range(colunas):

            y1 = (
                linha
                * altura_patch
            )

            y2 = (
                altura_original
                if linha == linhas - 1
                else (
                    linha + 1
                ) * altura_patch
            )

            x1 = (
                coluna
                * largura_patch
            )

            x2 = (
                largura_original
                if coluna == colunas - 1
                else (
                    coluna + 1
                ) * largura_patch
            )


            patch_img = (
                imagem_original[
                    y1:y2,
                    x1:x2
                ]
            )

            patch_mask = (
                mask_original[
                    y1:y2,
                    x1:x2
                ]
            )


            # -----------------------------------------------
            # COBERTURA DE VEGETAÇÃO
            # -----------------------------------------------

            cobertura = (
                np.mean(
                    patch_mask
                )
                * 100
            )

            if cobertura < 30:
                continue


            # -----------------------------------------------
            # PREPARAR PATCH
            # -----------------------------------------------

            patch_pil = (
                Image.fromarray(
                    patch_img
                )
            )

            patch_pil = patch_pil.resize(
                (
                    IMG_CLASS_LARGURA,
                    IMG_CLASS_ALTURA
                )
            )

            patch_array = np.array(
                patch_pil,
                dtype=np.float32
            )

            patch_batch = np.expand_dims(
                patch_array,
                axis=0
            )


            # -----------------------------------------------
            # CLASSIFICAÇÃO
            # -----------------------------------------------

            pred = (
                modelo_classificacao.predict(
                    patch_batch,
                    verbose=0
                )[0]
            )

            probabilidades_patches.append(
                pred
            )

            patches_validos += 1


    # --------------------------------------------------------
    # 8. GARANTIR PATCHES SUFICIENTES
    # --------------------------------------------------------

    if len(
        probabilidades_patches
    ) < 2:

        return {
            "status": "inconclusivo",
            "classe": "INCONCLUSIVO",
            "confianca": 0.0,

            "vegetacao_total":
                round(
                    pct_vegetacao,
                    2
                ),

            "vegetacao_baixa":
                round(
                    pct_low,
                    2
                ),

            "vegetacao_alta":
                round(
                    pct_high,
                    2
                ),

            "background":
                round(
                    pct_background,
                    2
                ),

            "patches_analisados":
                patches_validos,

            "probabilidades": {
                "ATENCAO": 0.0,
                "CRITICO": 0.0,
                "NORMAL": 0.0
            }
        }


    # --------------------------------------------------------
    # 9. COMBINAR RESULTADOS
    # --------------------------------------------------------

    probabilidades_patches = (
        np.array(
            probabilidades_patches
        )
    )

    prob_final = np.median(
        probabilidades_patches,
        axis=0
    )

    soma = np.sum(
        prob_final
    )

    if soma > 0:
        prob_final = (
            prob_final
            / soma
        )


    indice = np.argmax(
        prob_final
    )

    classe = (
        CLASSES_CLASSIFICACAO[
            indice
        ]
    )

    confianca = float(
        prob_final[
            indice
        ]
    )


    # --------------------------------------------------------
    # 10. RESULTADO FINAL
    # --------------------------------------------------------

    return {
        "status": "sucesso",

        "classe":
            classe,

        "confianca":
            round(
                confianca,
                4
            ),

        "confianca_percentual":
            round(
                confianca
                * 100,
                2
            ),

        "vegetacao_total":
            round(
                pct_vegetacao,
                2
            ),

        "vegetacao_baixa":
            round(
                pct_low,
                2
            ),

        "vegetacao_alta":
            round(
                pct_high,
                2
            ),

        "background":
            round(
                pct_background,
                2
            ),

        "patches_analisados":
            patches_validos,

        "probabilidades": {
            "ATENCAO":
                round(
                    float(
                        prob_final[0]
                    ),
                    4
                ),

            "CRITICO":
                round(
                    float(
                        prob_final[1]
                    ),
                    4
                ),

            "NORMAL":
                round(
                    float(
                        prob_final[2]
                    ),
                    4
                ),
        }
    }


# ============================================================
# ENDPOINT DE ANÁLISE
# ============================================================

@app.post("/analisar")
async def analisar(
    imagem: UploadFile = File(...)
):

    # --------------------------------------------------------
    # VALIDAR TIPO
    # --------------------------------------------------------

    if (
        imagem.content_type
        is None
        or not
        imagem.content_type.startswith(
            "image/"
        )
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "O arquivo enviado precisa ser uma imagem."
            )
        )


    try:

        # ----------------------------------------------------
        # LER IMAGEM
        # ----------------------------------------------------

        conteudo = await imagem.read()

        imagem_pil = Image.open(
            BytesIO(
                conteudo
            )
        )


        # ----------------------------------------------------
        # EXECUTAR PIPELINE V3
        # ----------------------------------------------------

        resultado = analisar_imagem(
            imagem_pil
        )

        resultado[
            "arquivo"
        ] = imagem.filename

        return resultado


    except Exception as erro:

        print(
            "Erro durante análise:",
            erro
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Erro ao processar "
                "a imagem."
            )
        )

    