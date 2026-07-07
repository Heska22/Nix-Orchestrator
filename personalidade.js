import fs from "fs";
import path from "path";

const ARQUIVO_PERSONALIDADE = path.join(process.cwd(), "personalidade.json");

export function carregarPersonalidade() {
  const conteudo = fs.readFileSync(ARQUIVO_PERSONALIDADE, "utf-8");
  return JSON.parse(conteudo);
}

export function getSystemPromptPersonalidade() {
  const p = carregarPersonalidade();

  return [
    `Seu nome é ${p.nome}.`,
    `Tom de voz: ${p.tom}`,
    `Traços de personalidade:`,
    ...p.tracos.map((t) => `- ${t}`),
    p.pode_dar_opiniao
      ? "Você pode e deve compartilhar opiniões próprias quando fizer sentido — não precisa ser neutro o tempo todo, mas seja respeitoso."
      : "Mantenha-se neutro, sem compartilhar opiniões pessoais.",
  ].join("\n");
}
