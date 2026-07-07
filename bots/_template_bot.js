// TEMPLATE — copie este arquivo, renomeie e edite para criar um novo bot.
// Depois é só registrar em registro_bots.js (veja instruções no README).

export const definicao = {
  name: "bot_nome_aqui", // nome único, sem espaços (o modelo usa isso para chamar o bot)
  description:
    "Descreva AQUI, de forma clara e específica, o que esse bot faz e quando ele deve ser usado. " +
    "Quanto melhor essa descrição, melhor o orquestrador vai saber quando chamá-lo.",
  input_schema: {
    type: "object",
    properties: {
      // Defina os parâmetros que esse bot precisa receber. Exemplo:
      // parametro_exemplo: {
      //   type: "string",
      //   description: "Explique o que é esse parâmetro",
      // },
    },
    required: [], // liste aqui os parâmetros obrigatórios, ex: ["parametro_exemplo"]
  },
};

export async function executar(parametros) {
  // Aqui entra a lógica real do bot. Pode ser:
  // - Chamar outra IA (outro modelo/prompt da Anthropic)
  // - Chamar uma API externa (fetch)
  // - Rodar um script/lógica sua
  // - Consultar um banco de dados

  return {
    status: "ainda não implementado",
    recebido: parametros,
  };
}
