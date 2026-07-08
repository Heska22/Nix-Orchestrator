import "dotenv/config";
import readline from "readline";
import { getDefinicoesFerramentas, getExecutorPorNome } from "./registro_bots.js";
import { getSystemPromptPersonalidade } from "./personalidade.js";
import { carregarMemoria, atualizarMemoriaComTroca } from "./memoria.js";
import { iniciarAgendador } from "./agendador.js";
import { enviarMensagemProativa } from "./canal_saida.js";
import { gerarRespostaComFallback, nomesProvedoresAtivos } from "./gerenciador_provedores.js";

// Em modo CLI, tratamos como um único usuário. Se conectar no WhatsApp,
// troque isso pelo número da pessoa (ex: req.body.From no webhook da Twilio),
// assim cada pessoa tem sua própria memória.
const USUARIO_ID = process.env.USUARIO_ID || "usuario_padrao";

const definicoesBots = getDefinicoesFerramentas();

if (definicoesBots.length === 0) {
  console.log(
    "⚠️  Nenhum bot registrado ainda. Copie bots/_template_bot.js, crie o seu, " +
      "e registre ele em registro_bots.js para o orquestrador poder usá-lo.\n"
  );
}

console.log(`🔌 Provedores de IA ativos (em ordem de prioridade): ${nomesProvedoresAtivos().join(" → ") || "nenhum!"}\n`);

// Ponte entre o nome de uma ferramenta chamada pelo modelo e o bot de verdade.
async function executarBot(nomeBot, args) {
  const executor = getExecutorPorNome(nomeBot);
  if (!executor) {
    return { erro: `Bot "${nomeBot}" não encontrado.` };
  }
  return executor(args);
}

function montarSystemPrompt(memoria) {
  return [
    "Você é um assistente orquestrador com personalidade própria — não é um robô genérico.",
    getSystemPromptPersonalidade(),
    "",
    "O que você sabe sobre a pessoa (memória de longo prazo):",
    memoria.resumo || "(ainda não sei nada sobre ela, essa é uma das primeiras conversas)",
    "",
    "Você tem acesso a vários bots/ferramentas especializados. Quando o pedido precisar de algum deles, chame a ferramenta apropriada.",
    "Você pode chamar mais de um bot em sequência para resolver pedidos compostos.",
    "Depois de ter todas as informações necessárias, responda de forma natural, no seu próprio estilo, em português.",
  ].join("\n");
}

// historico aqui é uma lista simples: [{ role: "user" | "assistant", texto: "..." }]
// Cada provedor converte isso pro formato dele por baixo dos panos.
async function processarMensagem(historico, systemPrompt) {
  const respostaTexto = await gerarRespostaComFallback({
    mensagensSimples: historico,
    systemPrompt,
    ferramentas: definicoesBots,
    executor: executarBot,
  });

  historico.push({ role: "assistant", texto: respostaTexto });
  return respostaTexto;
}

// Usado pelo agendador para o bot gerar uma mensagem sozinho, sem pergunta prévia da pessoa.
// Tem acesso aos mesmos bots/ferramentas da conversa normal (ex: pode pesquisar na web
// antes de decidir se vale a pena falar com você).
async function gerarMensagemProativa(motivo) {
  const memoria = carregarMemoria(USUARIO_ID);
  const systemPrompt = montarSystemPrompt(memoria);

  return gerarRespostaComFallback({
    mensagensSimples: [
      {
        role: "user",
        texto: `[SISTEMA INTERNO — a pessoa não disse nada agora, você está tomando a iniciativa de falar com ela] Motivo: ${motivo}`,
      },
    ],
    systemPrompt,
    ferramentas: definicoesBots,
    executor: executarBot,
  });
}

// --- Interface de linha de comando para testar ---
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const historico = [];

console.log("🤖 Bot Orquestrador iniciado! Digite sua mensagem (ou 'sair' para encerrar).\n");

// Inicia a "vida própria" do bot — ele pode falar com você sem você chamar primeiro.
iniciarAgendador({
  gerarMensagemProativa,
  enviarMensagemProativa,
  usuarioId: USUARIO_ID,
});

function perguntar() {
  rl.question("Você: ", async (mensagem) => {
    if (mensagem.trim().toLowerCase() === "sair") {
      rl.close();
      return;
    }

    const memoria = carregarMemoria(USUARIO_ID);
    const systemPrompt = montarSystemPrompt(memoria);

    historico.push({ role: "user", texto: mensagem });
    process.stdout.write("💭 pensando...\r");

    try {
      const respostaFinal = await processarMensagem(historico, systemPrompt);
      console.log(`\nOrquestrador: ${respostaFinal}\n`);

      // Atualiza a memória em segundo plano, sem travar a próxima pergunta
      atualizarMemoriaComTroca(USUARIO_ID, mensagem, respostaFinal).catch((erro) =>
        console.error("Erro ao atualizar memória:", erro.message)
      );
    } catch (erro) {
      console.error("Erro:", erro.message);
    }

    perguntar();
  });
}

perguntar();
