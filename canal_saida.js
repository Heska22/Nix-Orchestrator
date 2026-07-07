// Este arquivo centraliza COMO o bot "fala primeiro" com a pessoa.
//
// Por padrão, só imprime no console (modo teste/desenvolvimento).
// Para funcionar de verdade fora do terminal (ex: chegar no WhatsApp da pessoa
// mesmo sem ela ter mandado nada antes), plugue o envio real via Twilio.
// Veja o README para o passo a passo completo.

export async function enviarMensagemProativa(usuarioId, texto) {
  console.log(`\n🔔 [Mensagem proativa para "${usuarioId}"]: ${texto}\n`);

  // Exemplo de envio real via WhatsApp usando a API da Twilio (fora do sandbox,
  // isso normalmente exige que a pessoa tenha interagido nas últimas 24h, ou que
  // você use um "template" pré-aprovado pela Meta para iniciar a conversa).
  //
  // import twilio from "twilio";
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  // await client.messages.create({
  //   from: "whatsapp:+14155238886", // seu número Twilio (sandbox ou produção)
  //   to: `whatsapp:${usuarioId}`,   // número da pessoa, ex: "+5511999999999"
  //   body: texto,
  // });
}
