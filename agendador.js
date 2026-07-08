import cron from "node-cron";

// Aqui é onde você configura QUANDO o bot toma iniciativa própria de falar com você.
// Formato cron: "minuto hora dia mês diaDaSemana"

export function iniciarAgendador({ gerarMensagemProativa, enviarMensagemProativa, usuarioId }) {
  // 1) Rotina fixa — ex: mandar um "bom dia" personalizado todo dia às 8h
  const horarioBomDia = process.env.HORARIO_BOM_DIA || "0 8 * * *";
  cron.schedule(horarioBomDia, async () => {
    const mensagem = await gerarMensagemProativa(
      "Dar um bom dia natural e personalizado para a pessoa, considerando o que você sabe sobre ela pela memória."
    );
    await enviarMensagemProativa(usuarioId, mensagem);
  });

  // 2) Verificação periódica — o bot decide sozinho se vale a pena avisar algo.
  // Configure um tema em TEMA_MONITORAMENTO no .env (ex: "preço do bitcoin", "notícias sobre IA").
  // Se não configurar nada, essa verificação fica inativa (não gasta requisições à toa).
  const tema = process.env.TEMA_MONITORAMENTO;
  const intervaloVerificacao = process.env.INTERVALO_VERIFICACAO || "*/30 * * * *";

  if (tema) {
    cron.schedule(intervaloVerificacao, async () => {
      console.log(`🔎 Verificando se há algo relevante sobre "${tema}"...`);

      const mensagem = await gerarMensagemProativa(
        `Verifique (pesquisando na web se necessário) se há algo novo e realmente relevante sobre "${tema}" ` +
          `que valha a pena avisar a pessoa agora. Se não achar nada novo ou importante o suficiente, responda ` +
          `EXATAMENTE com a palavra ATENCAO_NADA_RELEVANTE e mais nada. Se achar algo que valha a pena, escreva ` +
          `a mensagem para avisar a pessoa diretamente, no seu estilo.`
      );

      if (!mensagem.includes("ATENCAO_NADA_RELEVANTE")) {
        await enviarMensagemProativa(usuarioId, mensagem);
      } else {
        console.log("🔎 Nada relevante encontrado dessa vez.");
      }
    });

    console.log(`🔎 Monitoramento ativo sobre "${tema}" a cada intervalo "${intervaloVerificacao}".`);
  }

  console.log(`⏰ Agendador iniciado — bom dia programado para "${horarioBomDia}" (formato cron).`);
}
