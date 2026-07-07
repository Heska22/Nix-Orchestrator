import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ARQUIVO_MEMORIA = path.join(process.cwd(), "memoria", "dados.json");

function garantirArquivo() {
  const pasta = path.dirname(ARQUIVO_MEMORIA);
  if (!fs.existsSync(pasta)) {
    fs.mkdirSync(pasta, { recursive: true });
  }
  if (!fs.existsSync(ARQUIVO_MEMORIA)) {
    fs.writeFileSync(ARQUIVO_MEMORIA, JSON.stringify({}, null, 2));
  }
}

function lerTudo() {
  garantirArquivo();
  return JSON.parse(fs.readFileSync(ARQUIVO_MEMORIA, "utf-8"));
}

function salvarTudo(dados) {
  garantirArquivo();
  fs.writeFileSync(ARQUIVO_MEMORIA, JSON.stringify(dados, null, 2));
}

// Retorna a memória de um usuário específico (cada número/ID tem a sua)
export function carregarMemoria(usuarioId) {
  const dados = lerTudo();
  return dados[usuarioId] || { resumo: "", ultimaInteracao: null };
}

export function salvarMemoria(usuarioId, memoria) {
  const dados = lerTudo();
  dados[usuarioId] = memoria;
  salvarTudo(dados);
}

// Depois de cada troca de mensagens, atualiza o resumo de longo prazo usando a própria IA.
// Isso roda em segundo plano (não trava a resposta ao usuário).
export async function atualizarMemoriaComTroca(usuarioId, mensagemUsuario, respostaBot) {
  const memoriaAtual = carregarMemoria(usuarioId);

  const resposta = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Resumo atual:\n${memoriaAtual.resumo || "(vazio, ainda não sei nada sobre a pessoa)"}\n\nNova troca:\nPessoa: ${mensagemUsuario}\nBot: ${respostaBot}\n\nGere o resumo atualizado.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction:
        "Você atualiza um resumo de memória de longo prazo sobre uma pessoa, com base numa nova troca de mensagens. " +
        "Guarde SOMENTE fatos e preferências relevantes e duradouras (nome, gostos, rotina, projetos, contexto de vida). " +
        "NÃO inclua conversa comum, perguntas triviais ou coisas sem importância. " +
        "Responda APENAS com o resumo atualizado, em texto corrido, no máximo 8 linhas.",
    },
  });

  const novoResumo = resposta.candidates[0].content.parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n");

  memoriaAtual.resumo = novoResumo;
  memoriaAtual.ultimaInteracao = new Date().toISOString();
  salvarMemoria(usuarioId, memoriaAtual);
}
