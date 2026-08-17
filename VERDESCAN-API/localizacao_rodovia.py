# ============================================================
# VERDESCAN
# LOCALIZAÇÃO POR RODOVIA + KM - V2
#
# Objetivos:
# 1. Trabalhar somente com rodovias ligadas à operação Motiva
#    no Estado de São Paulo.
# 2. Validar se o KM informado pertence a um trecho suportado.
# 3. Tentar localizar o KM usando geocodificação online.
# 4. Ajustar ("snap") o ponto para cima da geometria real da
#    rodovia usando dados do OpenStreetMap / Overpass.
# 5. Manter compatibilidade com o endpoint /localizar-trecho
#    já usado pelo app.
#
# IMPORTANTE:
# - O cálculo por rodovia + KM continua sendo uma estimativa.
# - A posição final fica muito mais coerente visualmente porque
#   o ponto é ajustado para a própria rodovia quando o OSM
#   consegue retornar a geometria.
# - Se a internet/OSM estiver indisponível, há fallback local
#   para rodovias que possuem marcos cadastrados.
# ============================================================


from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import json
import math
import re
import time

from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


# ============================================================
# TIPOS
# ============================================================

PontoRodovia = Dict[str, float]
ResultadoLocalizacao = Dict[str, object]
FaixaKm = Tuple[float, float]


# ============================================================
# CONFIGURAÇÕES DE REDE
# ============================================================

USER_AGENT = (
    "VerdeScan-FIAP/3.1 "
    "(projeto academico de monitoramento de vegetacao)"
)

NOMINATIM_URL = (
    "https://nominatim.openstreetmap.org/search"
)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

TIMEOUT_HTTP = 10

# Raio inicial para procurar a rodovia ao redor do ponto
# aproximado retornado pela geocodificação.
RAIO_SNAP_METROS = 12000

# Se o ponto mais próximo da geometria estiver absurdamente
# distante, preferimos não aceitar o snap.
DISTANCIA_MAXIMA_SNAP_METROS = 15000


# ============================================================
# CACHE EM MEMÓRIA
# ============================================================

_CACHE_LOCALIZACAO: Dict[
    Tuple[str, float],
    ResultadoLocalizacao
] = {}

_CACHE_GEOCODIFICACAO: Dict[
    Tuple[str, float],
    Optional[Tuple[float, float]]
] = {}


# ============================================================
# RODOVIAS MOTIVA - SÃO PAULO
#
# As faixas abaixo representam os trechos de concessões
# utilizados pelo VerdeScan.
#
# Quando uma mesma rodovia aparece em mais de uma concessão,
# as faixas são agrupadas no mesmo código.
# ============================================================

RODOVIAS_MOTIVA: Dict[str, Dict[str, Any]] = {

    # --------------------------------------------------------
    # MOTIVA AUTOBAN
    # --------------------------------------------------------

    "SP-330": {
        "nome": "Rodovia Anhanguera",
        "concessionarias": [
            "Motiva AutoBAn",
        ],
        "faixas": [
            (11.460, 158.500),
        ],
        "aliases": [
            "SP330",
            "SP 330",
            "ANHANGUERA",
            "RODOVIA ANHANGUERA",
            "VIA ANHANGUERA",
        ],
        "consultas": [
            "Rodovia Anhanguera",
            "SP-330",
        ],
        "osm_refs": [
            "SP-330",
            "SP 330",
        ],
        "osm_nomes": [
            "Anhanguera",
        ],
    },

    "SP-348": {
        "nome": "Rodovia dos Bandeirantes",
        "concessionarias": [
            "Motiva AutoBAn",
        ],
        "faixas": [
            (13.360, 173.032),
        ],
        "aliases": [
            "SP348",
            "SP 348",
            "BANDEIRANTES",
            "RODOVIA DOS BANDEIRANTES",
            "RODOVIA BANDEIRANTES",
        ],
        "consultas": [
            "Rodovia dos Bandeirantes",
            "SP-348",
        ],
        "osm_refs": [
            "SP-348",
            "SP 348",
        ],
        "osm_nomes": [
            "Bandeirantes",
        ],
    },

    "SP-300": {
        "nome": "Rodovia Dom Gabriel Paulino Bueno Couto",
        "concessionarias": [
            "Motiva AutoBAn",
        ],
        "faixas": [
            (62.000, 64.600),
        ],
        "aliases": [
            "SP300",
            "SP 300",
            "DOM GABRIEL",
            "DOM GABRIEL PAULINO BUENO COUTO",
        ],
        "consultas": [
            "Rodovia Dom Gabriel Paulino Bueno Couto",
            "SP-300",
        ],
        "osm_refs": [
            "SP-300",
            "SP 300",
        ],
        "osm_nomes": [
            "Gabriel Paulino",
            "Dom Gabriel",
        ],
    },

    "SPI-102/330": {
        "nome": "Rodovia Adalberto Panzan",
        "concessionarias": [
            "Motiva AutoBAn",
        ],
        "faixas": [
            (0.000, 7.540),
        ],
        "aliases": [
            "SPI102/330",
            "SPI 102/330",
            "SPI-102-330",
            "ADALBERTO PANZAN",
            "RODOVIA ADALBERTO PANZAN",
        ],
        "consultas": [
            "Rodovia Adalberto Panzan",
            "SPI-102/330",
        ],
        "osm_refs": [
            "SPI-102/330",
            "SPI 102/330",
        ],
        "osm_nomes": [
            "Adalberto Panzan",
        ],
    },


    # --------------------------------------------------------
    # MOTIVA RODOANEL
    # --------------------------------------------------------

    "SP-021": {
        "nome": "Rodoanel Mário Covas - Trecho Oeste",
        "concessionarias": [
            "Motiva RodoAnel",
        ],
        "faixas": [
            (0.000, 29.300),
        ],
        "aliases": [
            "SP021",
            "SP 021",
            "SP-21",
            "SP21",
            "RODOANEL",
            "RODOANEL MARIO COVAS",
            "RODOANEL MÁRIO COVAS",
            "MARIO COVAS",
            "MÁRIO COVAS",
        ],
        "consultas": [
            "Rodoanel Mario Covas trecho oeste",
            "SP-021",
        ],
        "osm_refs": [
            "SP-021",
            "SP 021",
        ],
        "osm_nomes": [
            "Rodoanel",
            "Mário Covas",
            "Mario Covas",
        ],
    },


    # --------------------------------------------------------
    # MOTIVA SPVIAS
    # --------------------------------------------------------

    "SP-127": {
        "nome": (
            "Rodovia Antônio Romano Schincariol / "
            "Francisco da Silva Pontes"
        ),
        "concessionarias": [
            "Motiva SPVias",
        ],
        "faixas": [
            (105.900, 148.350),
            (158.300, 213.150),
        ],
        "aliases": [
            "SP127",
            "SP 127",
            "ANTONIO ROMANO SCHINCARIOL",
            "ANTÔNIO ROMANO SCHINCARIOL",
            "FRANCISCO DA SILVA PONTES",
        ],
        "consultas": [
            "Rodovia Antonio Romano Schincariol",
            "Rodovia Francisco da Silva Pontes",
            "SP-127",
        ],
        "osm_refs": [
            "SP-127",
            "SP 127",
        ],
        "osm_nomes": [
            "Romano Schincariol",
            "Francisco da Silva Pontes",
        ],
    },

    "SP-255": {
        "nome": "Rodovia João Mellão",
        "concessionarias": [
            "Motiva SPVias",
        ],
        "faixas": [
            (237.770, 288.190),
        ],
        "aliases": [
            "SP255",
            "SP 255",
            "JOAO MELLAO",
            "JOÃO MELLÃO",
            "RODOVIA JOAO MELLAO",
            "RODOVIA JOÃO MELLÃO",
        ],
        "consultas": [
            "Rodovia Joao Mellao",
            "SP-255",
        ],
        "osm_refs": [
            "SP-255",
            "SP 255",
        ],
        "osm_nomes": [
            "João Mellão",
            "Joao Mellao",
        ],
    },

    "SP-258": {
        "nome": "Rodovia Francisco Alves Negrão",
        "concessionarias": [
            "Motiva SPVias",
        ],
        "faixas": [
            (222.800, 342.670),
        ],
        "aliases": [
            "SP258",
            "SP 258",
            "FRANCISCO ALVES NEGRAO",
            "FRANCISCO ALVES NEGRÃO",
        ],
        "consultas": [
            "Rodovia Francisco Alves Negrao",
            "SP-258",
        ],
        "osm_refs": [
            "SP-258",
            "SP 258",
        ],
        "osm_nomes": [
            "Francisco Alves Negrão",
            "Francisco Alves Negrao",
        ],
    },


    # --------------------------------------------------------
    # RAPOSO / CASTELLO
    #
    # SP-270 e SP-280 aparecem em mais de uma operação Motiva.
    # --------------------------------------------------------

    "SP-270": {
        "nome": "Rodovia Raposo Tavares",
        "concessionarias": [
            "Motiva Sorocabana",
            "Motiva SPVias",
        ],
        "faixas": [
            (34.070, 59.435),
            (63.265, 87.655),
            (88.675, 168.210),
        ],
        "aliases": [
            "SP270",
            "SP 270",
            "RAPOSO",
            "RAPOSO TAVARES",
            "RODOVIA RAPOSO TAVARES",
        ],
        "consultas": [
            "Rodovia Raposo Tavares",
            "SP-270",
        ],
        "osm_refs": [
            "SP-270",
            "SP 270",
        ],
        "osm_nomes": [
            "Raposo Tavares",
        ],
    },

    "SP-280": {
        "nome": "Rodovia Castello Branco",
        "concessionarias": [
            "Motiva Sorocabana",
            "Motiva SPVias",
        ],
        "faixas": [
            (54.140, 79.740),
            (129.600, 315.034),
        ],
        "aliases": [
            "SP280",
            "SP 280",
            "CASTELLO",
            "CASTELO",
            "CASTELLO BRANCO",
            "CASTELO BRANCO",
            "RODOVIA CASTELLO BRANCO",
            "RODOVIA CASTELO BRANCO",
        ],
        "consultas": [
            "Rodovia Castello Branco",
            "Rodovia Castelo Branco",
            "SP-280",
        ],
        "osm_refs": [
            "SP-280",
            "SP 280",
        ],
        "osm_nomes": [
            "Castello Branco",
            "Castelo Branco",
        ],
    },


    # --------------------------------------------------------
    # MOTIVA SOROCABANA
    # --------------------------------------------------------

    "SP-075": {
        "nome": "Rodovia Senador José Ermírio de Moraes",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 15.695),
        ],
        "aliases": [
            "SP075",
            "SP 075",
            "CASTELINHO",
            "SENADOR JOSE ERMIRIO DE MORAES",
            "SENADOR JOSÉ ERMÍRIO DE MORAES",
        ],
        "consultas": [
            "Rodovia Senador Jose Ermirio de Moraes",
            "Castelinho",
            "SP-075",
        ],
        "osm_refs": [
            "SP-075",
            "SP 075",
        ],
        "osm_nomes": [
            "Ermírio de Moraes",
            "Ermirio de Moraes",
            "Castelinho",
        ],
    },

    "SP-079": {
        "nome": (
            "Rodovia Raimundo Antunes Soares / "
            "Padre Guilherme Hovel-Svd / "
            "Tenente Celestino Américo"
        ),
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (97.650, 213.665),
        ],
        "aliases": [
            "SP079",
            "SP 079",
            "RAIMUNDO ANTUNES SOARES",
            "PADRE GUILHERME HOVEL",
            "TENENTE CELESTINO AMERICO",
            "TENENTE CELESTINO AMÉRICO",
        ],
        "consultas": [
            "SP-079",
            "Rodovia Raimundo Antunes Soares",
        ],
        "osm_refs": [
            "SP-079",
            "SP 079",
        ],
        "osm_nomes": [
            "Raimundo Antunes",
            "Guilherme Hovel",
            "Celestino Américo",
            "Celestino Americo",
        ],
    },

    "SP-250": {
        "nome": (
            "Rodovia Bunjiro Nakao / "
            "José de Carvalho / Nestor Fogaça"
        ),
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (45.000, 68.700),
            (70.994, 101.180),
            (102.280, 176.550),
        ],
        "aliases": [
            "SP250",
            "SP 250",
            "BUNJIRO NAKAO",
            "JOSE DE CARVALHO",
            "JOSÉ DE CARVALHO",
            "NESTOR FOGACA",
            "NESTOR FOGAÇA",
        ],
        "consultas": [
            "SP-250",
            "Rodovia Bunjiro Nakao",
            "Rodovia Nestor Fogaca",
        ],
        "osm_refs": [
            "SP-250",
            "SP 250",
        ],
        "osm_nomes": [
            "Bunjiro Nakao",
            "José de Carvalho",
            "Jose de Carvalho",
            "Nestor Fogaça",
            "Nestor Fogaca",
        ],
    },

    "SP-264": {
        "nome": (
            "Rodovia João Leme dos Santos / "
            "Francisco José Ayub"
        ),
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (102.050, 143.535),
        ],
        "aliases": [
            "SP264",
            "SP 264",
            "JOAO LEME DOS SANTOS",
            "JOÃO LEME DOS SANTOS",
            "FRANCISCO JOSE AYUB",
            "FRANCISCO JOSÉ AYUB",
        ],
        "consultas": [
            "SP-264",
            "Rodovia Joao Leme dos Santos",
        ],
        "osm_refs": [
            "SP-264",
            "SP 264",
        ],
        "osm_nomes": [
            "João Leme",
            "Joao Leme",
            "Francisco José Ayub",
            "Francisco Jose Ayub",
        ],
    },

    "SPA-160/250": {
        "nome": "Rodovia José de Almeida Rosa",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 15.900),
        ],
        "aliases": [
            "SPA160/250",
            "SPA 160/250",
            "SPA-160-250",
            "JOSE DE ALMEIDA ROSA",
            "JOSÉ DE ALMEIDA ROSA",
        ],
        "consultas": [
            "Rodovia Jose de Almeida Rosa",
            "SPA-160/250",
        ],
        "osm_refs": [
            "SPA-160/250",
            "SPA 160/250",
        ],
        "osm_nomes": [
            "José de Almeida Rosa",
            "Jose de Almeida Rosa",
        ],
    },

    "SPA-103/079": {
        "nome": "Rodovia Doutor Miguel Affonso Ferreira de Castilho",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 2.495),
        ],
        "aliases": [
            "SPA103/079",
            "SPA 103/079",
            "SPA-103-079",
            "MIGUEL AFFONSO FERREIRA DE CASTILHO",
        ],
        "consultas": [
            "Rodovia Miguel Affonso Ferreira de Castilho",
            "SPA-103/079",
        ],
        "osm_refs": [
            "SPA-103/079",
            "SPA 103/079",
        ],
        "osm_nomes": [
            "Miguel Affonso Ferreira de Castilho",
        ],
    },

    "SPA-104/079": {
        "nome": "Rodovia João Guimarães",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 11.000),
        ],
        "aliases": [
            "SPA104/079",
            "SPA 104/079",
            "SPA-104-079",
            "JOAO GUIMARAES",
            "JOÃO GUIMARÃES",
        ],
        "consultas": [
            "Rodovia Joao Guimaraes",
            "SPA-104/079",
        ],
        "osm_refs": [
            "SPA-104/079",
            "SPA 104/079",
        ],
        "osm_nomes": [
            "João Guimarães",
            "Joao Guimaraes",
        ],
    },

    "SPA-053/280": {
        "nome": "Rodovia Lívio Tagliassachi",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 9.000),
        ],
        "aliases": [
            "SPA053/280",
            "SPA 053/280",
            "SPA-053-280",
            "LIVIO TAGLIASSACHI",
            "LÍVIO TAGLIASSACHI",
        ],
        "consultas": [
            "Rodovia Livio Tagliassachi",
            "SPA-053/280",
        ],
        "osm_refs": [
            "SPA-053/280",
            "SPA 053/280",
        ],
        "osm_nomes": [
            "Lívio Tagliassachi",
            "Livio Tagliassachi",
        ],
    },

    "SPI-091/270": {
        "nome": "Rodovia Dr. Celso Charuri",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 6.700),
        ],
        "aliases": [
            "SPI091/270",
            "SPI 091/270",
            "SPI-091-270",
            "CELSO CHARURI",
            "DR CELSO CHARURI",
        ],
        "consultas": [
            "Rodovia Celso Charuri",
            "SPI-091/270",
        ],
        "osm_refs": [
            "SPI-091/270",
            "SPI 091/270",
        ],
        "osm_nomes": [
            "Celso Charuri",
        ],
    },

    "SPI-087/270": {
        "nome": "Contorno Brigadeiro Tobias",
        "concessionarias": [
            "Motiva Sorocabana",
        ],
        "faixas": [
            (0.000, 2.000),
        ],
        "aliases": [
            "SPI087/270",
            "SPI 087/270",
            "SPI-087-270",
            "CONTORNO BRIGADEIRO TOBIAS",
            "BRIGADEIRO TOBIAS",
        ],
        "consultas": [
            "Contorno Brigadeiro Tobias",
            "SPI-087/270",
        ],
        "osm_refs": [
            "SPI-087/270",
            "SPI 087/270",
        ],
        "osm_nomes": [
            "Brigadeiro Tobias",
        ],
    },


    # --------------------------------------------------------
    # MOTIVA RIOSP - TRECHOS EM SÃO PAULO
    # --------------------------------------------------------

    "BR-116": {
        "nome": "Rodovia Presidente Dutra",
        "concessionarias": [
            "Motiva RioSP",
        ],
        "faixas": [
            (0.000, 230.600),
        ],
        "aliases": [
            "BR116",
            "BR 116",
            "DUTRA",
            "VIA DUTRA",
            "PRESIDENTE DUTRA",
            "RODOVIA PRESIDENTE DUTRA",
        ],
        "consultas": [
            "Rodovia Presidente Dutra",
            "Via Dutra",
            "BR-116",
        ],
        "osm_refs": [
            "BR-116",
            "BR 116",
        ],
        "osm_nomes": [
            "Presidente Dutra",
            "Via Dutra",
        ],
    },

    "BR-101": {
        "nome": "Rodovia Rio-Santos",
        "concessionarias": [
            "Motiva RioSP",
        ],
        "faixas": [
            (0.000, 52.100),
        ],
        "aliases": [
            "BR101",
            "BR 101",
            "RIO SANTOS",
            "RIO-SANTOS",
            "RODOVIA RIO SANTOS",
            "RODOVIA RIO-SANTOS",
        ],
        "consultas": [
            "Rodovia Rio-Santos Ubatuba",
            "BR-101 Ubatuba",
        ],
        "osm_refs": [
            "BR-101",
            "BR 101",
        ],
        "osm_nomes": [
            "Rio-Santos",
            "Rio Santos",
        ],
    },


    # --------------------------------------------------------
    # RENOVIAS
    # --------------------------------------------------------

    "SP-340": {
        "nome": (
            "Rodovia Governador Adhemar Pereira de Barros / "
            "Deputado Mário Beni / "
            "Professor Boanerges Nogueira de Lima / "
            "Prefeito José André de Lima"
        ),
        "concessionarias": [
            "Renovias / Motiva",
        ],
        "faixas": [
            (114.100, 281.770),
        ],
        "aliases": [
            "SP340",
            "SP 340",
            "CAMPINAS MOCOCA",
            "ADHEMAR PEREIRA DE BARROS",
            "MARIO BENI",
            "MÁRIO BENI",
        ],
        "consultas": [
            "SP-340",
            "Rodovia Adhemar Pereira de Barros",
        ],
        "osm_refs": [
            "SP-340",
            "SP 340",
        ],
        "osm_nomes": [
            "Adhemar Pereira de Barros",
            "Mário Beni",
            "Mario Beni",
        ],
    },

    "SP-342": {
        "nome": "Rodovia Governador Dr. Adhemar Pereira de Barros",
        "concessionarias": [
            "Renovias / Motiva",
        ],
        "faixas": [
            (171.500, 251.150),
        ],
        "aliases": [
            "SP342",
            "SP 342",
            "MOGI GUACU AGUAS DA PRATA",
            "MOGI GUAÇU ÁGUAS DA PRATA",
        ],
        "consultas": [
            "SP-342",
            "Rodovia Adhemar Pereira de Barros Mogi Guacu",
        ],
        "osm_refs": [
            "SP-342",
            "SP 342",
        ],
        "osm_nomes": [
            "Adhemar Pereira de Barros",
        ],
    },

    "SP-344": {
        "nome": "Rodovia Vereador Rubens Leme Asprino / Dom Tomás Vaquero",
        "concessionarias": [
            "Renovias / Motiva",
        ],
        "faixas": [
            (200.100, 242.600),
        ],
        "aliases": [
            "SP344",
            "SP 344",
            "RUBENS LEME ASPRINO",
            "DOM TOMAS VAQUERO",
            "DOM TOMÁS VAQUERO",
        ],
        "consultas": [
            "SP-344",
            "Rodovia Dom Tomas Vaquero",
        ],
        "osm_refs": [
            "SP-344",
            "SP 344",
        ],
        "osm_nomes": [
            "Rubens Leme Asprino",
            "Tomás Vaquero",
            "Tomas Vaquero",
        ],
    },

    "SP-350": {
        "nome": "Rodovia Deputado Eduardo Vicente Nasser",
        "concessionarias": [
            "Renovias / Motiva",
        ],
        "faixas": [
            (238.412, 272.100),
        ],
        "aliases": [
            "SP350",
            "SP 350",
            "EDUARDO VICENTE NASSER",
        ],
        "consultas": [
            "SP-350",
            "Rodovia Eduardo Vicente Nasser",
        ],
        "osm_refs": [
            "SP-350",
            "SP 350",
        ],
        "osm_nomes": [
            "Eduardo Vicente Nasser",
        ],
    },

    "SP-215": {
        "nome": "Rodovia Hélio Moreira Salles",
        "concessionarias": [
            "Renovias / Motiva",
        ],
        "faixas": [
            (29.755, 49.940),
        ],
        "aliases": [
            "SP215",
            "SP 215",
            "HELIO MOREIRA SALLES",
            "HÉLIO MOREIRA SALLES",
        ],
        "consultas": [
            "SP-215",
            "Rodovia Helio Moreira Salles",
        ],
        "osm_refs": [
            "SP-215",
            "SP 215",
        ],
        "osm_nomes": [
            "Hélio Moreira Salles",
            "Helio Moreira Salles",
        ],
    },
}


# ============================================================
# BASE LOCAL DE MARCOS
#
# Mantemos os marcos antigos da SP-330 porque eles fornecem
# um fallback muito útil quando Nominatim/Overpass falham.
#
# Para KM abaixo do primeiro marco ou acima do último,
# o código pode EXTRAPOLAR usando os dois marcos mais próximos,
# desde que o KM ainda esteja dentro da faixa Motiva.
#
# Isso resolve, por exemplo, SP-330 KM 20, que antes falhava
# porque a antiga base começava no KM 65,7.
# ============================================================

BASE_RODOVIAS: Dict[
    str,
    List[PontoRodovia]
] = {

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
# ALIASES
# ============================================================

def _normalizar_texto_simples(
    texto: str
) -> str:

    texto = (
        texto
        .strip()
        .upper()
    )

    texto = " ".join(
        texto.split()
    )

    return texto


ALIASES_RODOVIAS: Dict[str, str] = {}


for codigo, dados in RODOVIAS_MOTIVA.items():

    ALIASES_RODOVIAS[
        _normalizar_texto_simples(
            codigo
        )
    ] = codigo

    for alias in dados.get(
        "aliases",
        []
    ):

        ALIASES_RODOVIAS[
            _normalizar_texto_simples(
                str(alias)
            )
        ] = codigo


# ============================================================
# NORMALIZAR NOME DA RODOVIA
# ============================================================

def normalizar_rodovia(
    rodovia: str
) -> str:

    if not rodovia:
        return ""

    texto = _normalizar_texto_simples(
        rodovia
    )

    if texto in ALIASES_RODOVIAS:

        return ALIASES_RODOVIAS[
            texto
        ]


    # --------------------------------------------------------
    # FORMAS COMO:
    #
    # SP330
    # SP 330
    # SP-330
    # BR116
    # BR 116
    # SPA160/250
    # SPI102/330
    # --------------------------------------------------------

    compacto = (
        texto
        .replace(
            " ",
            ""
        )
    )

    padroes = [

        (
            r"^(SP|BR)-?(\d{2,3})$",
            lambda m:
                f"{m.group(1)}-{int(m.group(2)):03d}",
        ),

        (
            r"^(SPA|SPI)-?(\d{2,3})[/-](\d{2,3})$",
            lambda m:
                (
                    f"{m.group(1)}-"
                    f"{int(m.group(2)):03d}/"
                    f"{int(m.group(3)):03d}"
                ),
        ),
    ]


    for padrao, formatador in padroes:

        correspondencia = re.match(
            padrao,
            compacto
        )

        if correspondencia:

            candidato = formatador(
                correspondencia
            )

            if candidato in RODOVIAS_MOTIVA:

                return candidato


    return texto


# ============================================================
# FAIXAS DE KM
# ============================================================

def _km_esta_em_faixa(
    codigo_rodovia: str,
    km: float
) -> bool:

    dados = RODOVIAS_MOTIVA.get(
        codigo_rodovia
    )

    if not dados:
        return False

    for inicio, fim in dados.get(
        "faixas",
        []
    ):

        if (
            inicio - 0.001
            <=
            km
            <=
            fim + 0.001
        ):

            return True

    return False


def _faixa_do_km(
    codigo_rodovia: str,
    km: float
) -> Optional[FaixaKm]:

    dados = RODOVIAS_MOTIVA.get(
        codigo_rodovia
    )

    if not dados:
        return None

    for inicio, fim in dados.get(
        "faixas",
        []
    ):

        if (
            inicio - 0.001
            <=
            km
            <=
            fim + 0.001
        ):

            return (
                float(inicio),
                float(fim),
            )

    return None


# ============================================================
# HTTP JSON
# ============================================================

def _baixar_json(
    url: str,
    parametros: Optional[
        Dict[str, Any]
    ] = None,
    timeout: int = TIMEOUT_HTTP,
) -> Any:

    if parametros:

        url = (
            url
            +
            "?"
            +
            urlencode(
                parametros
            )
        )

    requisicao = Request(

        url,

        headers={
            "User-Agent":
                USER_AGENT,

            "Accept":
                "application/json",
        },
    )

    with urlopen(
        requisicao,
        timeout=timeout
    ) as resposta:

        conteudo = resposta.read()

    return json.loads(
        conteudo.decode(
            "utf-8"
        )
    )


# ============================================================
# GEOCODIFICAÇÃO POR RODOVIA + KM
#
# Tenta encontrar algum endereço/POI indexado próximo ao KM.
#
# Depois o ponto ainda será ajustado para cima da rodovia.
# ============================================================

def _buscar_geocodificacao(
    codigo_rodovia: str,
    km: float
) -> Optional[
    Tuple[float, float]
]:

    chave = (
        codigo_rodovia,
        round(
            km,
            3
        ),
    )

    if chave in _CACHE_GEOCODIFICACAO:

        return _CACHE_GEOCODIFICACAO[
            chave
        ]


    dados_rodovia = RODOVIAS_MOTIVA[
        codigo_rodovia
    ]


    consultas: List[str] = []


    for nome in dados_rodovia.get(
        "consultas",
        []
    ):

        consultas.append(

            (
                f"{nome}, km {km:g}, "
                "São Paulo, Brasil"
            )
        )


    consultas.append(

        (
            f"{codigo_rodovia}, "
            f"km {km:g}, "
            "São Paulo, Brasil"
        )
    )


    for consulta in consultas:

        try:

            resultados = _baixar_json(

                NOMINATIM_URL,

                {
                    "q":
                        consulta,

                    "format":
                        "jsonv2",

                    "limit":
                        5,

                    "countrycodes":
                        "br",
                },
            )


            if not isinstance(
                resultados,
                list
            ):

                continue


            for item in resultados:

                try:

                    latitude = float(
                        item[
                            "lat"
                        ]
                    )

                    longitude = float(
                        item[
                            "lon"
                        ]
                    )

                except (
                    KeyError,
                    TypeError,
                    ValueError,
                ):

                    continue


                # Limites amplos do Estado de São Paulo.
                if not (
                    -25.5
                    <=
                    latitude
                    <=
                    -19.5
                    and
                    -53.5
                    <=
                    longitude
                    <=
                    -44.0
                ):

                    continue


                resultado = (
                    latitude,
                    longitude,
                )


                _CACHE_GEOCODIFICACAO[
                    chave
                ] = resultado


                return resultado


        except (
            URLError,
            HTTPError,
            TimeoutError,
            json.JSONDecodeError,
            OSError,
        ):

            continue


        # Evita bombardear o serviço em caso de várias tentativas.
        time.sleep(
            0.15
        )


    _CACHE_GEOCODIFICACAO[
        chave
    ] = None


    return None


# ============================================================
# INTERPOLAÇÃO / EXTRAPOLAÇÃO LOCAL
# ============================================================

def interpolar(
    km_desejado: float,
    ponto_a: PontoRodovia,
    ponto_b: PontoRodovia,
) -> ResultadoLocalizacao:

    km_a = float(
        ponto_a[
            "km"
        ]
    )

    km_b = float(
        ponto_b[
            "km"
        ]
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


    if km_b == km_a:

        return {
            "latitude":
                latitude_a,

            "longitude":
                longitude_a,
        }


    proporcao = (

        (
            km_desejado
            -
            km_a
        )

        /

        (
            km_b
            -
            km_a
        )
    )


    latitude = (

        latitude_a

        +

        (
            latitude_b
            -
            latitude_a
        )

        *
        proporcao
    )


    longitude = (

        longitude_a

        +

        (
            longitude_b
            -
            longitude_a
        )

        *
        proporcao
    )


    return {

        "latitude":
            latitude,

        "longitude":
            longitude,
    }


def _estimar_pelos_marcos(
    codigo_rodovia: str,
    km: float
) -> Optional[
    Tuple[
        float,
        float,
        float,
        float,
        str,
    ]
]:

    pontos = sorted(

        BASE_RODOVIAS.get(
            codigo_rodovia,
            []
        ),

        key=lambda item:
            float(
                item[
                    "km"
                ]
            ),
    )


    if len(pontos) < 2:
        return None


    # --------------------------------------------------------
    # KM EXATAMENTE IGUAL A UM MARCO
    # --------------------------------------------------------

    for ponto in pontos:

        km_ponto = float(
            ponto[
                "km"
            ]
        )


        if abs(
            km_ponto
            -
            km
        ) < 0.001:

            return (

                float(
                    ponto[
                        "latitude"
                    ]
                ),

                float(
                    ponto[
                        "longitude"
                    ]
                ),

                km_ponto,

                km_ponto,

                "REFERENCIA",
            )


    # --------------------------------------------------------
    # ANTES DO PRIMEIRO MARCO
    #
    # Usa os dois primeiros para extrapolar.
    # --------------------------------------------------------

    if (
        km
        <
        float(
            pontos[0][
                "km"
            ]
        )
    ):

        ponto_a = pontos[0]
        ponto_b = pontos[1]

        coordenadas = interpolar(
            km,
            ponto_a,
            ponto_b,
        )

        return (

            float(
                coordenadas[
                    "latitude"
                ]
            ),

            float(
                coordenadas[
                    "longitude"
                ]
            ),

            float(
                ponto_a[
                    "km"
                ]
            ),

            float(
                ponto_b[
                    "km"
                ]
            ),

            "EXTRAPOLADA",
        )


    # --------------------------------------------------------
    # DEPOIS DO ÚLTIMO MARCO
    # --------------------------------------------------------

    if (
        km
        >
        float(
            pontos[-1][
                "km"
            ]
        )
    ):

        ponto_a = pontos[-2]
        ponto_b = pontos[-1]

        coordenadas = interpolar(
            km,
            ponto_a,
            ponto_b,
        )

        return (

            float(
                coordenadas[
                    "latitude"
                ]
            ),

            float(
                coordenadas[
                    "longitude"
                ]
            ),

            float(
                ponto_a[
                    "km"
                ]
            ),

            float(
                ponto_b[
                    "km"
                ]
            ),

            "EXTRAPOLADA",
        )


    # --------------------------------------------------------
    # ENTRE DOIS MARCOS
    # --------------------------------------------------------

    for indice in range(
        len(
            pontos
        )
        -
        1
    ):

        ponto_a = pontos[
            indice
        ]

        ponto_b = pontos[
            indice
            +
            1
        ]


        km_a = float(
            ponto_a[
                "km"
            ]
        )

        km_b = float(
            ponto_b[
                "km"
            ]
        )


        if (
            km_a
            <=
            km
            <=
            km_b
        ):

            coordenadas = interpolar(
                km,
                ponto_a,
                ponto_b,
            )


            distancia = abs(
                km_b
                -
                km_a
            )


            if distancia <= 30:
                qualidade = "BOA"

            elif distancia <= 80:
                qualidade = "MEDIA"

            else:
                qualidade = "BAIXA"


            return (

                float(
                    coordenadas[
                        "latitude"
                    ]
                ),

                float(
                    coordenadas[
                        "longitude"
                    ]
                ),

                km_a,

                km_b,

                qualidade,
            )


    return None


# ============================================================
# GEOMETRIA
# ============================================================

def _haversine_metros(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:

    raio_terra = 6371000.0


    phi1 = math.radians(
        lat1
    )

    phi2 = math.radians(
        lat2
    )


    delta_phi = math.radians(
        lat2
        -
        lat1
    )

    delta_lambda = math.radians(
        lon2
        -
        lon1
    )


    a = (

        math.sin(
            delta_phi
            /
            2
        )
        **
        2

        +

        math.cos(
            phi1
        )

        *
        math.cos(
            phi2
        )

        *
        math.sin(
            delta_lambda
            /
            2
        )
        **
        2
    )


    c = (
        2
        *
        math.atan2(
            math.sqrt(
                a
            ),
            math.sqrt(
                1
                -
                a
            )
        )
    )


    return (
        raio_terra
        *
        c
    )


def _ponto_mais_proximo_segmento(
    latitude_ponto: float,
    longitude_ponto: float,
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> Tuple[
    float,
    float
]:

    # --------------------------------------------------------
    # PROJEÇÃO LOCAL EQUIRETANGULAR
    #
    # Para poucos quilômetros funciona muito bem e é mais
    # que suficiente para fazer o snap visual no mapa.
    # --------------------------------------------------------

    latitude_referencia = math.radians(
        latitude_ponto
    )


    fator_lon = math.cos(
        latitude_referencia
    )


    px = (
        longitude_ponto
        *
        fator_lon
    )

    py = latitude_ponto


    ax = (
        longitude_a
        *
        fator_lon
    )

    ay = latitude_a


    bx = (
        longitude_b
        *
        fator_lon
    )

    by = latitude_b


    dx = (
        bx
        -
        ax
    )

    dy = (
        by
        -
        ay
    )


    denominador = (
        dx
        *
        dx
        +
        dy
        *
        dy
    )


    if denominador <= 0:

        return (
            latitude_a,
            longitude_a,
        )


    t = (

        (
            (
                px
                -
                ax
            )
            *
            dx
        )

        +

        (
            (
                py
                -
                ay
            )
            *
            dy
        )

    ) / denominador


    t = max(
        0.0,
        min(
            1.0,
            t
        )
    )


    x = (
        ax
        +
        t
        *
        dx
    )

    y = (
        ay
        +
        t
        *
        dy
    )


    longitude = (
        x
        /
        fator_lon
        if abs(
            fator_lon
        ) > 1e-9
        else longitude_ponto
    )


    return (
        y,
        longitude,
    )


# ============================================================
# OVERPASS
# ============================================================

def _escapar_regex_overpass(
    texto: str
) -> str:

    return re.escape(
        texto
    )


def _montar_query_overpass(
    codigo_rodovia: str,
    latitude: float,
    longitude: float,
    raio: int,
) -> str:

    dados = RODOVIAS_MOTIVA[
        codigo_rodovia
    ]


    blocos: List[str] = []


    for referencia in dados.get(
        "osm_refs",
        []
    ):

        referencia_regex = (
            _escapar_regex_overpass(
                str(
                    referencia
                )
            )
        )


        blocos.append(

            (
                f'way["highway"]'
                f'["ref"~"{referencia_regex}",i]'
                f'(around:{raio},'
                f'{latitude},{longitude});'
            )
        )


    for nome in dados.get(
        "osm_nomes",
        []
    ):

        nome_regex = (
            _escapar_regex_overpass(
                str(
                    nome
                )
            )
        )


        blocos.append(

            (
                f'way["highway"]'
                f'["name"~"{nome_regex}",i]'
                f'(around:{raio},'
                f'{latitude},{longitude});'
            )
        )


    return (

        "[out:json]"
        "[timeout:12];"
        "("
        +
        "".join(
            blocos
        )
        +
        ");"
        "out geom;"
    )


def _consultar_overpass(
    query: str
) -> Optional[
    Dict[str, Any]
]:

    corpo = urlencode(
        {
            "data":
                query
        }
    ).encode(
        "utf-8"
    )


    for endpoint in OVERPASS_ENDPOINTS:

        try:

            requisicao = Request(

                endpoint,

                data=corpo,

                method="POST",

                headers={
                    "User-Agent":
                        USER_AGENT,

                    "Content-Type":
                        (
                            "application/"
                            "x-www-form-urlencoded"
                        ),

                    "Accept":
                        "application/json",
                },
            )


            with urlopen(
                requisicao,
                timeout=TIMEOUT_HTTP
            ) as resposta:

                conteudo = (
                    resposta
                    .read()
                    .decode(
                        "utf-8"
                    )
                )


            dados = json.loads(
                conteudo
            )


            if isinstance(
                dados,
                dict
            ):

                return dados


        except (
            URLError,
            HTTPError,
            TimeoutError,
            json.JSONDecodeError,
            OSError,
        ):

            continue


    return None


# ============================================================
# SNAP PARA A RODOVIA
# ============================================================

def _snap_para_rodovia(
    codigo_rodovia: str,
    latitude_aproximada: float,
    longitude_aproximada: float,
) -> Optional[
    Tuple[
        float,
        float,
        float,
    ]
]:

    query = _montar_query_overpass(

        codigo_rodovia,

        latitude_aproximada,

        longitude_aproximada,

        RAIO_SNAP_METROS,
    )


    dados = _consultar_overpass(
        query
    )


    if not dados:
        return None


    elementos = dados.get(
        "elements",
        []
    )


    melhor_ponto: Optional[
        Tuple[
            float,
            float
        ]
    ] = None


    melhor_distancia = float(
        "inf"
    )


    for elemento in elementos:

        geometria = elemento.get(
            "geometry"
        )


        if (
            not isinstance(
                geometria,
                list
            )
            or
            len(
                geometria
            )
            <
            2
        ):

            continue


        for indice in range(
            len(
                geometria
            )
            -
            1
        ):

            ponto_a = geometria[
                indice
            ]

            ponto_b = geometria[
                indice
                +
                1
            ]


            try:

                lat_a = float(
                    ponto_a[
                        "lat"
                    ]
                )

                lon_a = float(
                    ponto_a[
                        "lon"
                    ]
                )

                lat_b = float(
                    ponto_b[
                        "lat"
                    ]
                )

                lon_b = float(
                    ponto_b[
                        "lon"
                    ]
                )

            except (
                KeyError,
                TypeError,
                ValueError,
            ):

                continue


            (
                lat_candidata,
                lon_candidata,
            ) = (
                _ponto_mais_proximo_segmento(
                    latitude_aproximada,
                    longitude_aproximada,
                    lat_a,
                    lon_a,
                    lat_b,
                    lon_b,
                )
            )


            distancia = (
                _haversine_metros(
                    latitude_aproximada,
                    longitude_aproximada,
                    lat_candidata,
                    lon_candidata,
                )
            )


            if (
                distancia
                <
                melhor_distancia
            ):

                melhor_distancia = (
                    distancia
                )

                melhor_ponto = (
                    lat_candidata,
                    lon_candidata,
                )


    if melhor_ponto is None:
        return None


    if (
        melhor_distancia
        >
        DISTANCIA_MAXIMA_SNAP_METROS
    ):

        return None


    return (

        float(
            melhor_ponto[
                0
            ]
        ),

        float(
            melhor_ponto[
                1
            ]
        ),

        float(
            melhor_distancia
        ),
    )


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
    # NORMALIZAR
    # --------------------------------------------------------

    codigo_rodovia = (
        normalizar_rodovia(
            rodovia
        )
    )


    if (
        codigo_rodovia
        not in
        RODOVIAS_MOTIVA
    ):

        return None


    # --------------------------------------------------------
    # KM
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


    if not math.isfinite(
        km_numero
    ):

        return None


    if km_numero < 0:
        return None


    # --------------------------------------------------------
    # VALIDAR TRECHO MOTIVA
    # --------------------------------------------------------

    if not _km_esta_em_faixa(
        codigo_rodovia,
        km_numero
    ):

        return None


    chave_cache = (

        codigo_rodovia,

        round(
            km_numero,
            3
        ),
    )


    if chave_cache in _CACHE_LOCALIZACAO:

        return dict(
            _CACHE_LOCALIZACAO[
                chave_cache
            ]
        )


    faixa = _faixa_do_km(
        codigo_rodovia,
        km_numero
    )


    if faixa is None:
        return None


    km_faixa_inicio = float(
        faixa[
            0
        ]
    )

    km_faixa_fim = float(
        faixa[
            1
        ]
    )


    dados_rodovia = RODOVIAS_MOTIVA[
        codigo_rodovia
    ]


    latitude_aproximada: Optional[
        float
    ] = None

    longitude_aproximada: Optional[
        float
    ] = None


    origem_base = ""
    qualidade_base = "MEDIA"


    km_referencia_anterior = (
        km_faixa_inicio
    )

    km_referencia_posterior = (
        km_faixa_fim
    )


    # ========================================================
    # 1. TENTAR GEOCODIFICAÇÃO
    # ========================================================

    geocodificacao = (
        _buscar_geocodificacao(
            codigo_rodovia,
            km_numero
        )
    )


    if geocodificacao:

        (
            latitude_aproximada,
            longitude_aproximada,
        ) = geocodificacao


        origem_base = (
            "GEOCODIFICACAO_RODOVIA_KM"
        )

        qualidade_base = "BOA"


    # ========================================================
    # 2. FALLBACK PARA MARCOS LOCAIS
    # ========================================================

    if (
        latitude_aproximada
        is None
        or
        longitude_aproximada
        is None
    ):

        estimativa_local = (
            _estimar_pelos_marcos(
                codigo_rodovia,
                km_numero
            )
        )


        if estimativa_local:

            (
                latitude_aproximada,
                longitude_aproximada,
                km_ref_a,
                km_ref_b,
                qualidade_local,
            ) = estimativa_local


            km_referencia_anterior = (
                km_ref_a
            )

            km_referencia_posterior = (
                km_ref_b
            )


            origem_base = (
                "INTERPOLACAO_LOCAL"
            )


            if qualidade_local == (
                "REFERENCIA"
            ):

                qualidade_base = (
                    "REFERENCIA"
                )

            elif qualidade_local == (
                "BOA"
            ):

                qualidade_base = "BOA"

            elif qualidade_local == (
                "EXTRAPOLADA"
            ):

                qualidade_base = "MEDIA"

            else:

                qualidade_base = (
                    qualidade_local
                )


    # ========================================================
    # 3. SEM NENHUMA ESTIMATIVA
    # ========================================================

    if (
        latitude_aproximada
        is None
        or
        longitude_aproximada
        is None
    ):

        return None


    # ========================================================
    # 4. SNAP PARA A GEOMETRIA REAL DA RODOVIA
    # ========================================================

    snap = _snap_para_rodovia(

        codigo_rodovia,

        latitude_aproximada,

        longitude_aproximada,
    )


    if snap:

        (
            latitude_final,
            longitude_final,
            distancia_snap,
        ) = snap


        origem = (
            "RODOVIA_KM_OSM"
        )


        # Quando conseguimos encaixar na geometria da pista,
        # marcamos como qualidade alta para exibição do mapa.
        qualidade = "ALTA"


        distancia_ajuste_metros = (
            round(
                distancia_snap,
                1
            )
        )


    else:

        latitude_final = (
            latitude_aproximada
        )

        longitude_final = (
            longitude_aproximada
        )


        origem = origem_base


        qualidade = (
            qualidade_base
        )


        distancia_ajuste_metros = None


    # ========================================================
    # RESULTADO
    # ========================================================

    resultado: ResultadoLocalizacao = {

        "rodovia":
            codigo_rodovia,

        "nome_rodovia":
            dados_rodovia[
                "nome"
            ],

        "concessionarias":
            dados_rodovia[
                "concessionarias"
            ],

        "km":
            round(
                km_numero,
                3
            ),

        "latitude":
            round(
                float(
                    latitude_final
                ),
                7
            ),

        "longitude":
            round(
                float(
                    longitude_final
                ),
                7
            ),

        "origem":
            origem,

        "aproximada":
            True,

        "qualidade":
            qualidade,

        "km_referencia_anterior":
            round(
                float(
                    km_referencia_anterior
                ),
                3
            ),

        "km_referencia_posterior":
            round(
                float(
                    km_referencia_posterior
                ),
                3
            ),

        "faixa_motiva_inicio":
            round(
                km_faixa_inicio,
                3
            ),

        "faixa_motiva_fim":
            round(
                km_faixa_fim,
                3
            ),

        "ajustada_para_rodovia":
            bool(
                snap
            ),

        "distancia_ajuste_metros":
            distancia_ajuste_metros,
    }


    _CACHE_LOCALIZACAO[
        chave_cache
    ] = dict(
        resultado
    )


    return resultado


# ============================================================
# LISTAR RODOVIAS SUPORTADAS
# ============================================================

def listar_rodovias():

    # Mantém compatibilidade com a versão anterior:
    # retorna apenas os códigos das rodovias.

    return sorted(
        RODOVIAS_MOTIVA.keys()
    )


# ============================================================
# LISTA DETALHADA
#
# Endpoint/tela futura pode usar esta função se quiser exibir
# nome, concessionária e faixas de KM.
# ============================================================

def listar_rodovias_detalhadas():

    resultado = []


    for codigo in sorted(
        RODOVIAS_MOTIVA.keys()
    ):

        dados = RODOVIAS_MOTIVA[
            codigo
        ]


        resultado.append({

            "codigo":
                codigo,

            "nome":
                dados[
                    "nome"
                ],

            "concessionarias":
                dados[
                    "concessionarias"
                ],

            "faixas_km": [
                {
                    "inicio":
                        inicio,

                    "fim":
                        fim,
                }

                for (
                    inicio,
                    fim
                )
                in dados[
                    "faixas"
                ]
            ],
        })


    return resultado


# ============================================================
# ALIAS EXPLÍCITO PARA LISTA DE CÓDIGOS
# ============================================================

def listar_codigos_rodovias():

    return listar_rodovias()


# ============================================================
# TESTE LOCAL
# ============================================================

if __name__ == "__main__":

    print(
        "\nVERDESCAN - LOCALIZAÇÃO V2\n"
    )


    testes = [

        {
            "rodovia":
                "SP-330",

            "km":
                20,
        },

        {
            "rodovia":
                "SP330",

            "km":
                120,
        },

        {
            "rodovia":
                "Anhanguera",

            "km":
                89,
        },

        {
            "rodovia":
                "SP-270",

            "km":
                120,
        },

        {
            "rodovia":
                "SP-021",

            "km":
                18,
        },
    ]


    for teste in testes:

        print(
            "-" * 70
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


        try:

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


        except Exception as erro:

            resultado = {
                "erro":
                    repr(
                        erro
                    )
            }


        print(
            "Resultado:",
            resultado
        )


    print(
        "\nRodovias suportadas:"
    )


    for codigo in listar_rodovias():

        print(
            codigo,
            "-",
            RODOVIAS_MOTIVA[
                codigo
            ][
                "nome"
            ]
        )
        