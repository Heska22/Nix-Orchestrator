import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import readline from "readline";
import { getDefinicoesFerramentas, getExecutorPorNome } from "./registro_bots.js";
import { getSystemPromptPersonalidade } from "./personalidade.js";
import { carregarMemoria, atualizarMemoriaComTroca } from "./memoria.js";
import { iniciarAgendador } from "./agendador.js";
import { enviarMensagemProativa } from "./canal_saida.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELO = "gemini-2.5-flash-lite"; // maior limite de requisições/min no tier gratuito

// Tenta de novo automaticamente se bater no limite de requisições (erro 429),
// esperando o tempo que a própria API pede antes de tentar de novo.
async function comRetry(funcaoChamada, tentativasRestantes = 3) {
  try {
    return await funcaoChamada();
  } catch (erro) {
    const mensagem = erro?.message || "";
    const eLimiteDeRequisicoes = mensagem.includes("429") || mensagem.includes("RESOURCE_EXHAUSTED");

    if (eLimiteDeRequisicoes && tentativasRestantes > 0) {
      const match = mensagem.match(/retryDelay":"(\d+(?:\.\d+)?)s/);
      const segundosEspera = match ? Math.ceil(parseFloat(match[1])) + 1 : 15;

      console.log(`⏳ Limite de requisições atingido, aguardando ${segundosEspera}s para tentar de novo...`);
      await new Promise((resolve) => setTimeout(resolve, segundosEspera * 1000));

      return comRetry(funcaoChamada, tentativasRestantes - 1);
    }

    throw erro;
  }
}

// Em modo CLI, tratamos como um único usuário. Se conectar no WhatsApp,
// troque isso pelo número da pessoa (ex: req.body.From no webhook da Twilio),
// assim cada pessoa tem sua própria memória.
const USUARIO_ID = process.env.USUARIO_ID || "usuario_padrao";

// Os bots são definidos no formato { name, description, input_schema }.
// O Gemini espera "parameters" em vez de "input_schema" — convertemos aqui.
const definicoesBots = getDefinicoesFerramentas();
const ferramentasGemini =
  definicoesBots.length > 0
    ? [
        {
          functionDeclarations: definicoesBots.map((b) => ({
            name: b.name,
            description: b.description,
            parameters: b.input_schema,
          })),
        },
      ]
    : undefined;

if (definicoesBots.length === 0) {
  console.log(
    "⚠️  Nenhum bot registrado ainda. Copie bots/_template_bot.js, crie o seu, " +
      "e registre ele em registro_bots.js para o orquestrador poder usá-lo.\n"
  );
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

async function chamarGemini(historico, systemPrompt) {
  return comRetry(() =>
    ai.models.generateContent({
      model: MODELO,
      contents: historico,
      config: {
        systemInstruction: systemPrompt,
        ...(ferramentasGemini ? { tools: ferramentasGemini } : {}),
      },
    })
  );
}

async function processarMensagem(historico, systemPrompt) {
  let resposta = await chamarGemini(historico, systemPrompt);
  let parts = resposta.candidates[0].content.parts || [];

  while (parts.some((p) => p.functionCall)) {
    historico.push({ role: "model", parts });

    const respostasFuncoes = [];

    for (const parte of parts) {
      if (!parte.functionCall) continue;

      const { name, args } = parte.functionCall;
      console.log(`\n🔧 Chamando: ${name}(${JSON.stringify(args)})`);

      const executor = getExecutorPorNome(name);
      let resultado;

      if (!executor) {
        resultado = { erro: `Bot "${name}" não encontrado.` };
      } else {
        try {
          resultado = await executor(args);
        } catch (erro) {
          resultado = { erro: `Erro ao executar ${name}: ${erro.message}` };
        }
      }

      console.log(`✅ Resultado de ${name}:`, resultado);

      respostasFuncoes.push({
        functionResponse: { name, response: resultado },
      });
    }

    historico.push({ role: "function", parts: respostasFuncoes });

    resposta = await chamarGemini(historico, systemPrompt);
    parts = resposta.candidates[0].content.parts || [];
  }

  const textoFinal = parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n");

  historico.push({ role: "model", parts });

  return textoFinal;
}

// Usado pelo agendador para o bot gerar uma mensagem sozinho, sem pergunta prévia da pessoa.
async function gerarMensagemProativa(motivo) {
  const memoria = carregarMemoria(USUARIO_ID);
  const systemPrompt = montarSystemPrompt(memoria);

  const resposta = await comRetry(() =>
    ai.models.generateContent({
      model: MODELO,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `[SISTEMA INTERNO — a pessoa não disse nada agora, você está tomando a iniciativa de falar com ela] Motivo: ${motivo}`,
            },
          ],
        },
      ],
      config: { systemInstruction: systemPrompt },
    })
  );

  return resposta.candidates[0].content.parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n");
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

    historico.push({ role: "user", parts: [{ text: mensagem }] });

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
