import { GoogleGenAI } from "@google/genai";

// Aceita várias chaves separadas por vírgula em GEMINI_API_KEYS (recomendado),
// ou uma única em GEMINI_API_KEY (compatibilidade com configuração antiga).
const chaves = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

let indiceAtual = 0;

function criarCliente(indice) {
  return new GoogleGenAI({ apiKey: chaves[indice] });
}

// Só lança erro aqui dentro (quando alguém REALMENTE tenta usar o Gemini),
// nunca na hora de importar o módulo — assim, se você só quiser usar outro
// provedor (Groq, GPT, etc), o app não quebra por falta de chave do Gemini.
export function getCliente() {
  if (chaves.length === 0) {
    throw new Error("Nenhuma chave do Gemini configurada (defina GEMINI_API_KEYS ou GEMINI_API_KEY no .env)");
  }
  return criarCliente(indiceAtual);
}

export function avancarChave() {
  indiceAtual = (indiceAtual + 1) % chaves.length;
  console.log(`🔑 Alternando para a chave de API #${indiceAtual + 1} de ${chaves.length}`);
  return criarCliente(indiceAtual);
}

export function totalChaves() {
  return chaves.length;
}
