import OpenAI from "openai";

let client = null;
const MODELO = process.env.GROQ_MODELO || "llama-3.3-70b-versatile";

export const nome = "Groq";

export function disponivel() {
  return Boolean(process.env.GROQ_API_KEY);
}

function garantirCliente() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return client;
}

function paraFormatoOpenAI(mensagensSimples, systemPrompt) {
  return [
    { role: "system", content: systemPrompt },
    ...mensagensSimples.map((m) => ({ role: m.role, content: m.texto })),
  ];
}

export async function gerarResposta({ mensagensSimples, systemPrompt, ferramentas, executor }) {
  const client = garantirCliente();

  const ferramentasFormatadas = ferramentas.map((f) => ({
    type: "function",
    function: { name: f.name, description: f.description, parameters: f.input_schema },
  }));

  const mensagens = paraFormatoOpenAI(mensagensSimples, systemPrompt);

  let resposta = await client.chat.completions.create({
    model: MODELO,
    messages: mensagens,
    ...(ferramentasFormatadas.length > 0 ? { tools: ferramentasFormatadas } : {}),
  });

  let mensagemResposta = resposta.choices[0].message;

  while (mensagemResposta.tool_calls && mensagemResposta.tool_calls.length > 0) {
    mensagens.push(mensagemResposta);

    for (const chamada of mensagemResposta.tool_calls) {
      const nomeFuncao = chamada.function.name;
      const args = JSON.parse(chamada.function.arguments || "{}");
      console.log(`\n🔧 [Groq] Chamando: ${nomeFuncao}(${JSON.stringify(args)})`);

      let resultado;
      try {
        resultado = await executor(nomeFuncao, args);
      } catch (erro) {
        resultado = { erro: erro.message };
      }
      console.log(`✅ Resultado de ${nomeFuncao}:`, resultado);

      mensagens.push({
        role: "tool",
        tool_call_id: chamada.id,
        content: JSON.stringify(resultado),
      });
    }

    resposta = await client.chat.completions.create({
      model: MODELO,
      messages: mensagens,
      ...(ferramentasFormatadas.length > 0 ? { tools: ferramentasFormatadas } : {}),
    });
    mensagemResposta = resposta.choices[0].message;
  }

  return mensagemResposta.content || "";
}
