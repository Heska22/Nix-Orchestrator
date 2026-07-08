import OpenAI from "openai";

let client = null;
const MODELO = process.env.OPENAI_MODELO || "gpt-4o-mini";

export const nome = "OpenAI (GPT)";

export function disponivel() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function garantirCliente() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

  const ferramentasOpenAI = ferramentas.map((f) => ({
    type: "function",
    function: { name: f.name, description: f.description, parameters: f.input_schema },
  }));

  const mensagens = paraFormatoOpenAI(mensagensSimples, systemPrompt);

  let resposta = await client.chat.completions.create({
    model: MODELO,
    messages: mensagens,
    ...(ferramentasOpenAI.length > 0 ? { tools: ferramentasOpenAI } : {}),
  });

  let mensagemResposta = resposta.choices[0].message;

  while (mensagemResposta.tool_calls && mensagemResposta.tool_calls.length > 0) {
    mensagens.push(mensagemResposta);

    for (const chamada of mensagemResposta.tool_calls) {
      const nomeFuncao = chamada.function.name;
      const args = JSON.parse(chamada.function.arguments || "{}");
      console.log(`\n🔧 [GPT] Chamando: ${nomeFuncao}(${JSON.stringify(args)})`);

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
      ...(ferramentasOpenAI.length > 0 ? { tools: ferramentasOpenAI } : {}),
    });
    mensagemResposta = resposta.choices[0].message;
  }

  return mensagemResposta.content || "";
}
