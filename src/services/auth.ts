import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY =
  "@verdescan_usuario_logado";

const USUARIO_MASTER =
  "master";

const SENHA_MASTER =
  "verdescan2026";


export type UsuarioLogado = {
  usuario: string;
  nome: string;
  perfil: "MASTER";
};


// ============================================================
// LOGIN
// ============================================================

export async function fazerLogin(
  usuario: string,
  senha: string
): Promise<UsuarioLogado | null> {
  const usuarioNormalizado =
    usuario
      .trim()
      .toLowerCase();

  if (
    usuarioNormalizado !==
      USUARIO_MASTER ||
    senha !== SENHA_MASTER
  ) {
    return null;
  }


  const dados: UsuarioLogado = {
    usuario:
      USUARIO_MASTER,

    nome:
      "Operador Master",

    perfil:
      "MASTER",
  };


  await AsyncStorage.setItem(
    AUTH_KEY,
    JSON.stringify(
      dados
    )
  );


  return dados;
}


// ============================================================
// VERIFICAR LOGIN
// ============================================================

export async function carregarUsuarioLogado():
  Promise<UsuarioLogado | null> {

  try {
    const dados =
      await AsyncStorage.getItem(
        AUTH_KEY
      );


    if (!dados) {
      return null;
    }


    return JSON.parse(
      dados
    );

  } catch {
    return null;
  }
}


// ============================================================
// LOGOUT
// ============================================================

export async function fazerLogout() {
  await AsyncStorage.removeItem(
    AUTH_KEY
  );
}

