import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const definicao = {
  name: "bot_pesquisa_web",
  description:
    "Pesquisa informações atuais na internet. Use sempre que o usuário perguntar sobre algo recente, " +
    "notícias, preços, eventos atuais, ou qualquer coisa que possa ter mudado recentemente e que você não tem certeza.",
  input_schema: {
    type: "object",
    properties: {
      pergunta: {
        type: "string",
        description: "A pergunta ou tópico a ser pesquisado na web, o mais específico possível.",
      },
    },
    required: ["pergunta"],
  },
};

export async function executar({ pergunta }) {
  const resposta = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: pergunta }] }],
    config: {
      systemInstruction:
        "Você é um assistente de pesquisa. Use a busca do Google para responder de forma direta e objetiva, " +
        "citando de onde veio a informação quando possível.",
      tools: [{ googleSearch: {} }],
    },
  });

  const parts = resposta.candidates[0].content.parts || [];
  const textoResposta = parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n");

  // Extrai as fontes usadas na busca (grounding), se houver
  const fontes = [];
  const grounding = resposta.candidates[0].groundingMetadata;
  if (grounding && grounding.groundingChunks) {
    for (const chunk of grounding.groundingChunks) {
      if (chunk.web && chunk.web.uri && !fontes.includes(chunk.web.uri)) {
        fontes.push(chunk.web.uri);
      }
    }
  }

  return { resposta: textoResposta, fontes };
}
