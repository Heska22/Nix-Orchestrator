import * as gemini from "./provedores/provedor_gemini.js";
import * as groq from "./provedores/provedor_groq.js";
import * as openai from "./provedores/provedor_openai.js";

// ORDEM DE PRIORIDADE: o primeiro da lista é tentado primeiro.
// Gemini e Groq são gratuitos — ficam antes do GPT (pago) de propósito.
// Adicione/reordene aqui se plugar outros provedores no futuro.
const todosProvedores = [gemini, groq, openai];

function provedoresConfigurados() {
  return todosProvedores.filter((p) => p.disponivel());
}

export function nomesProvedoresAtivos() {
  return provedoresConfigurados().map((p) => p.nome);
}

// Tenta cada provedor disponível em ordem. Se um falhar (erro de rede, limite
// de requisições esgotado mesmo após rotacionar chaves, chave inválida, etc),
// cai automaticamente para o próximo.
export async function gerarRespostaComFallback(parametros) {
  const provedores = provedoresConfigurados();

  if (provedores.length === 0) {
    throw new Error(
      "Nenhum provedor de IA configurado. Defina GEMINI_API_KEYS/GEMINI_API_KEY e/ou OPENAI_API_KEY no .env"
    );
  }

  let ultimoErro;

  for (const provedor of provedores) {
    try {
      return await provedor.gerarResposta(parametros);
    } catch (erro) {
      console.log(`⚠️  ${provedor.nome} falhou (${erro.message}).`);
      ultimoErro = erro;
    }
  }

  console.log("❌ Todos os provedores configurados falharam.");
  throw ultimoErro;
}
