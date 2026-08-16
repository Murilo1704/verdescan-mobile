# ============================================================
# VERDESCAN
# LOCALIZAÇÃO APROXIMADA POR RODOVIA + KM
# ============================================================

from typing import Dict, List, Optional


# ============================================================
# TIPOS
# ============================================================

PontoRodovia = Dict[str, float]

ResultadoLocalizacao = Dict[
    str,
    object
]


# ============================================================
# BASE DE PONTOS DE REFERÊNCIA
# ============================================================
#
# IMPORTANTE:
#
# Esses pontos servem como MARCOS DE REFERÊNCIA.
#
# Quando o usuário informar um KM que esteja entre dois
# pontos conhecidos, o sistema calcula uma posição
# aproximada entre eles.
#
# Exemplo:
#
# KM 89 -------- KM 114
#          KM 100
#
# O sistema calcula aproximadamente onde o KM 100
# estaria entre os dois pontos.
#
# ============================================================


BASE_RODOVIAS: Dict[
    str,
    List[PontoRodovia]
] = {

    # ========================================================
    # SP-330 - RODOVIA ANHANGUERA
    # ========================================================

    "SP-330": [

        {
            "km": 65.7,
            "latitude": -23.14661033,
            "longitude": -46.93950856,
        },

        {
            "km": 89.0,
            "latitude": -22.953472,
            "longitude": -47.045417,
        },

        {
            "km": 114.0,
            "latitude": -22.8015435,
            "longitude": -47.2221363,
        },

        {
            "km": 163.0,
            "latitude": -22.4115908,
            "longitude": -47.3908018,
        },

        {
            "km": 373.0,
            "latitude": -20.64427586,
            "longitude": -47.88023923,
        },

    ],

}


# ============================================================
# NOMES ALTERNATIVOS DAS RODOVIAS
# ============================================================

ALIASES_RODOVIAS = {

    "SP330":
        "SP-330",

    "SP 330":
        "SP-330",

    "SP-330":
        "SP-330",

    "ANHANGUERA":
        "SP-330",

    "RODOVIA ANHANGUERA":
        "SP-330",

    "VIA ANHANGUERA":
        "SP-330",

}


# ============================================================
# NORMALIZAR NOME DA RODOVIA
# ============================================================

def normalizar_rodovia(
    rodovia: str
) -> str:

    if not rodovia:
        return ""

    texto = (
        rodovia
        .strip()
        .upper()
    )

    texto = " ".join(
        texto.split()
    )

    if texto in ALIASES_RODOVIAS:
        return ALIASES_RODOVIAS[
            texto
        ]

    # --------------------------------------------------------
    # TRANSFORMAR SP330 EM SP-330
    # --------------------------------------------------------

    texto_sem_espaco = (
        texto
        .replace(
            " ",
            ""
        )
    )

    if (
        texto_sem_espaco
        .startswith(
            "SP"
        )
    ):

        numero = (
            texto_sem_espaco
            .replace(
                "SP-",
                ""
            )
            .replace(
                "SP",
                ""
            )
        )

        if numero.isdigit():

            return (
                f"SP-{numero}"
            )

    return texto


# ============================================================
# INTERPOLAÇÃO
# ============================================================
#
# Calcula uma posição entre dois pontos.
#
# Exemplo:
#
# KM 90  = ponto A
# KM 100 = ponto B
#
# Usuário informou KM 95.
#
# Então:
#
# proporção = 0.5
#
# Resultado fica aproximadamente no meio.
#
# ============================================================

def interpolar(
    km_desejado: float,
    ponto_a: PontoRodovia,
    ponto_b: PontoRodovia,
) -> ResultadoLocalizacao:

    km_a = float(
        ponto_a["km"]
    )

    km_b = float(
        ponto_b["km"]
    )

    latitude_a = float(
        ponto_a[
            "latitude"
        ]
    )

    latitude_b = float(
        ponto_b[
            "latitude"
        ]
    )

    longitude_a = float(
        ponto_a[
            "longitude"
        ]
    )

    longitude_b = float(
        ponto_b[
            "longitude"
        ]
    )


    # --------------------------------------------------------
    # EVITAR DIVISÃO POR ZERO
    # --------------------------------------------------------

    if km_b == km_a:

        return {

            "latitude":
                latitude_a,

            "longitude":
                longitude_a,

        }


    # --------------------------------------------------------
    # PROPORÇÃO ENTRE OS DOIS MARCOS
    # --------------------------------------------------------

    proporcao = (
        km_desejado -
        km_a
    ) / (
        km_b -
        km_a
    )


    # --------------------------------------------------------
    # LATITUDE
    # --------------------------------------------------------

    latitude = (
        latitude_a +
        (
            latitude_b -
            latitude_a
        ) *
        proporcao
    )


    # --------------------------------------------------------
    # LONGITUDE
    # --------------------------------------------------------

    longitude = (
        longitude_a +
        (
            longitude_b -
            longitude_a
        ) *
        proporcao
    )


    return {

        "latitude":
            latitude,

        "longitude":
            longitude,

    }


# ============================================================
# DESCOBRIR QUALIDADE DA ESTIMATIVA
# ============================================================

def calcular_qualidade(
    ponto_a: PontoRodovia,
    ponto_b: PontoRodovia,
) -> str:

    distancia_referencias = abs(
        float(
            ponto_b["km"]
        ) -
        float(
            ponto_a["km"]
        )
    )


    # --------------------------------------------------------
    # QUANTO MAIS PRÓXIMOS OS MARCOS,
    # MELHOR A ESTIMATIVA
    # --------------------------------------------------------

    if (
        distancia_referencias <=
        30
    ):
        return "BOA"


    if (
        distancia_referencias <=
        80
    ):
        return "MEDIA"


    return "BAIXA"


# ============================================================
# LOCALIZAR RODOVIA + KM
# ============================================================

def localizar_rodovia_km(
    rodovia: str,
    km: float,
) -> Optional[
    ResultadoLocalizacao
]:

    # --------------------------------------------------------
    # NORMALIZAR RODOVIA
    # --------------------------------------------------------

    codigo_rodovia = (
        normalizar_rodovia(
            rodovia
        )
    )


    # --------------------------------------------------------
    # VALIDAR KM
    # --------------------------------------------------------

    try:

        km_numero = float(
            km
        )

    except (
        TypeError,
        ValueError,
    ):

        return None


    if km_numero < 0:
        return None


    # --------------------------------------------------------
    # VERIFICAR SE A RODOVIA EXISTE NA BASE
    # --------------------------------------------------------

    if (
        codigo_rodovia
        not in
        BASE_RODOVIAS
    ):

        return None


    pontos = sorted(
        BASE_RODOVIAS[
            codigo_rodovia
        ],
        key=lambda item:
            item["km"],
    )


    if not pontos:
        return None


    # ========================================================
    # KM EXATAMENTE IGUAL A UM MARCO
    # ========================================================

    for ponto in pontos:

        if abs(
            float(
                ponto["km"]
            ) -
            km_numero
        ) < 0.001:

            return {

                "rodovia":
                    codigo_rodovia,

                "km":
                    km_numero,

                "latitude":
                    float(
                        ponto[
                            "latitude"
                        ]
                    ),

                "longitude":
                    float(
                        ponto[
                            "longitude"
                        ]
                    ),

                "origem":
                    "RODOVIA_KM",

                "aproximada":
                    False,

                "qualidade":
                    "REFERENCIA",

                "km_referencia_anterior":
                    float(
                        ponto[
                            "km"
                        ]
                    ),

                "km_referencia_posterior":
                    float(
                        ponto[
                            "km"
                        ]
                    ),

            }


    # ========================================================
    # ENCONTRAR OS DOIS PONTOS MAIS PRÓXIMOS
    # ========================================================

    for indice in range(
        len(pontos) - 1
    ):

        ponto_a = (
            pontos[indice]
        )

        ponto_b = (
            pontos[
                indice + 1
            ]
        )


        km_a = float(
            ponto_a["km"]
        )

        km_b = float(
            ponto_b["km"]
        )


        if (
            km_a <=
            km_numero <=
            km_b
        ):

            coordenadas = (
                interpolar(
                    km_numero,
                    ponto_a,
                    ponto_b,
                )
            )


            qualidade = (
                calcular_qualidade(
                    ponto_a,
                    ponto_b,
                )
            )


            return {

                "rodovia":
                    codigo_rodovia,

                "km":
                    km_numero,

                "latitude":
                    round(
                        float(
                            coordenadas[
                                "latitude"
                            ]
                        ),
                        7,
                    ),

                "longitude":
                    round(
                        float(
                            coordenadas[
                                "longitude"
                            ]
                        ),
                        7,
                    ),

                "origem":
                    "RODOVIA_KM",

                "aproximada":
                    True,

                "qualidade":
                    qualidade,

                "km_referencia_anterior":
                    km_a,

                "km_referencia_posterior":
                    km_b,

            }


    # ========================================================
    # KM FORA DA ÁREA MAPEADA
    # ========================================================

    return None


# ============================================================
# LISTAR RODOVIAS SUPORTADAS
# ============================================================

def listar_rodovias():
    return list(
        BASE_RODOVIAS.keys()
    )


# ============================================================
# TESTE LOCAL
# ============================================================
#
# Esse trecho só executa se você rodar diretamente:
#
# python localizacao_rodovia.py
#
# Ele NÃO executa quando o arquivo for importado pelo main.py.
#
# ============================================================

if __name__ == "__main__":

    print(
        "\nVERDESCAN - Teste de localização\n"
    )


    testes = [

        {
            "rodovia":
                "SP-330",

            "km":
                89,
        },

        {
            "rodovia":
                "SP-330",

            "km":
                100,
        },

        {
            "rodovia":
                "Anhanguera",

            "km":
                110,
        },

        {
            "rodovia":
                "SP330",

            "km":
                150,
        },

    ]


    for teste in testes:

        resultado = (
            localizar_rodovia_km(
                teste[
                    "rodovia"
                ],
                teste[
                    "km"
                ],
            )
        )


        print(
            "--------------------------------"
        )

        print(
            "Rodovia:",
            teste[
                "rodovia"
            ]
        )

        print(
            "KM:",
            teste[
                "km"
            ]
        )

        print(
            "Resultado:",
            resultado
        )
        