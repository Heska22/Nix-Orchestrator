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
  // Por padrão roda a cada 30 minutos, mas está vazio: você define a regra real.
  cron.schedule("*/30 * * * *", async () => {
    // Exemplos do que você pode colocar aqui:
    // - Rodar o bot_pesquisa_web sobre um assunto que a pessoa acompanha,
    //   e só disparar mensagem se encontrar algo novo/importante.
    // - Checar o resultado de uma tarefa longa que outro bot estava rodando.
    // - Verificar se algum prazo/lembrete está próximo.
    //
    // const algoRelevante = await suaLogicaDeVerificacao();
    // if (algoRelevante) {
    //   const mensagem = await gerarMensagemProativa(`Avisar a pessoa sobre: ${algoRelevante}`);
    //   await enviarMensagemProativa(usuarioId, mensagem);
    // }
  });

  console.log(`⏰ Agendador iniciado — bom dia programado para "${horarioBomDia}" (formato cron).`);
}
