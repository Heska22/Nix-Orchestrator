// Este arquivo é o "catálogo" de bots que o orquestrador conhece.
// Para adicionar um novo bot:
// 1. Crie um arquivo em /bots/seu_bot.js exportando `definicao` e `executar` (siga o padrão dos exemplos).
// 2. Importe ele aqui embaixo e adicione no array `bots`.

import * as botPesquisaWeb from "./bots/bot_pesquisa_web.js";

// Importe outros bots aqui conforme for criando, ex:
// import * as botEscritor from "./bots/bot_escritor.js";

export const bots = [
  botPesquisaWeb,
  // botEscritor,
];

export function getDefinicoesFerramentas() {
  return bots.map((bot) => bot.definicao);
}

export function getExecutorPorNome(nome) {
  const bot = bots.find((b) => b.definicao.name === nome);
  return bot ? bot.executar : null;
}
