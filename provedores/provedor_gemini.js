import { getCliente, avancarChave, totalChaves } from "../rotador_chaves.js";

let ai = null;
const MODELO = "gemini-2.5-flash-lite";

export const nome = "Gemini";

// Só considera este provedor "disponível" se houver chave configurada
export function disponivel() {
  return Boolean(process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY);
}

function garantirCliente() {
  if (!ai) ai = getCliente();
  return ai;
}

async function comRetry(funcaoChamada, tentativasRestantes = totalChaves() + 2) {
  try {
    return await funcaoChamada();
  } catch (erro) {
    const mensagem = erro?.message || "";
    const eLimiteDeRequisicoes = mensagem.includes("429") || mensagem.includes("RESOURCE_EXHAUSTED");
    const eSobrecarga = mensagem.includes("503") || mensagem.includes("UNAVAILABLE");

    if ((eLimiteDeRequisicoes || eSobrecarga) && tentativasRestantes > 0) {
      if (eLimiteDeRequisicoes && totalChaves() > 1) {
        ai = avancarChave();
        return comRetry(funcaoChamada, tentativasRestantes - 1);
      }
      // Sobrecarga temporária do modelo (não é problema da sua cota) — só espera um pouco e tenta de novo.
      const espera = 5000;
      console.log(`⏳ Modelo sobrecarregado, aguardando ${espera / 1000}s para tentar de novo...`);
      await new Promise((resolve) => setTimeout(resolve, espera));
      return comRetry(funcaoChamada, tentativasRestantes - 1);
    }
    throw erro;
  }
}

function paraFormatoGemini(mensagensSimples) {
  return mensagensSimples.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.texto }],
  }));
}

// Interface universal: recebe mensagens simples + ferramentas + um executor,
// resolve sozinho qualquer chamada de ferramenta internamente, e devolve só o texto final.
export async function gerarResposta({ mensagensSimples, systemPrompt, ferramentas, executor }) {
  garantirCliente();

  const ferramentasGemini =
    ferramentas.length > 0
      ? [
          {
            functionDeclarations: ferramentas.map((f) => ({
              name: f.name,
              description: f.description,
              parameters: f.input_schema,
            })),
          },
        ]
      : undefined;

  const historico = paraFormatoGemini(mensagensSimples);

  const chamar = () =>
    ai.models.generateContent({
      model: MODELO,
      contents: historico,
      config: {
        systemInstruction: systemPrompt,
        ...(ferramentasGemini ? { tools: ferramentasGemini } : {}),
      },
    });

  let resposta = await comRetry(chamar);
  let parts = resposta.candidates[0].content.parts || [];

  while (parts.some((p) => p.functionCall)) {
    historico.push({ role: "model", parts });

    const respostasFuncoes = [];
    for (const parte of parts) {
      if (!parte.functionCall) continue;
      const { name, args } = parte.functionCall;
      console.log(`\n🔧 [Gemini] Chamando: ${name}(${JSON.stringify(args)})`);

      let resultado;
      try {
        resultado = await executor(name, args);
      } catch (erro) {
        resultado = { erro: erro.message };
      }
      console.log(`✅ Resultado de ${name}:`, resultado);

      respostasFuncoes.push({ functionResponse: { name, response: resultado } });
    }

    historico.push({ role: "function", parts: respostasFuncoes });
    resposta = await comRetry(chamar);
    parts = resposta.candidates[0].content.parts || [];
  }

  return parts
    .filter((p) => p.text)
    .map((p) => p.text)
    .join("\n");
}
