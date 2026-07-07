# Bot Orquestrador 🤖⚙️

Um assistente central que recebe seu pedido e **delega automaticamente** para os bots/IAs que você criar, decidindo sozinho qual (ou quais) usar. É a mesma arquitetura usada por sistemas de "agentes com ferramentas" (tool use / function calling).

Este projeto vem com a **estrutura pronta e vazia** — nenhum bot de exemplo — pra você plugar exatamente os seus.

> Usa a **API do Google Gemini** (tem tier gratuito de verdade, sem cartão de crédito). Pegue sua chave em https://aistudio.google.com/apikey.
>
> ⚠️ O tier gratuito tem limite de requisições por minuto/dia (varia por modelo e muda com o tempo — confira os valores atuais em https://ai.google.dev/gemini-api/docs/rate-limits). Pra um bot pessoal de uso normal costuma ser suficiente.

## Como funciona

```
Você: "faz X e depois Y"
        │
        ▼
  Orquestrador (Gemini)
        │
        ├──▶ decide chamar seu_bot_1(...)
        └──▶ decide chamar seu_bot_2(...)
        │
        ▼
  Junta os resultados e responde de forma natural
```

O modelo recebe a lista de bots registrados como "ferramentas" e decide sozinho:
- Se precisa usar algum bot.
- Quais parâmetros passar pra ele.
- Se precisa encadear várias chamadas para resolver um pedido complexo.

## Rodando

```bash
npm install
cp .env.example .env
# edite o .env com sua GEMINI_API_KEY
npm start
```

Enquanto nenhum bot estiver registrado, o orquestrador roda normal (é só uma conversa com o Gemini, sem ferramentas) e avisa no console que ainda não há bots.

## Bots já inclusos

| Bot | O que faz |
|---|---|
| `bot_pesquisa_web` | Pesquisa na internet em tempo real (usa a busca nativa do Google Gemini) e responde com fontes |

## 🧠 Personalidade, memória e iniciativa própria

Esse orquestrador não é só um "executor de comandos" — ele tem:

### 1. Personalidade
Edite `personalidade.json` para mudar nome, tom de voz, traços e se ele pode dar opinião própria. Isso entra automaticamente no system prompt.

### 2. Memória de longo prazo
Depois de cada troca de mensagens, o bot atualiza sozinho um resumo sobre você (gostos, contexto, rotina) e guarda em `memoria/dados.json`. Na próxima conversa, ele já lembra.

- Cada `USUARIO_ID` tem sua própria memória (útil se depois você conectar múltiplas pessoas via WhatsApp — use o número da pessoa como ID).
- Quer resetar a memória? Apague o arquivo `memoria/dados.json` (ele é recriado sozinho).

### 3. Iniciativa própria (falar sem você perguntar antes)
Configurado em `agendador.js`, com duas regras:
- **Rotina fixa**: por padrão, um "bom dia" personalizado às 8h (configurável via `HORARIO_BOM_DIA` no `.env`, formato cron).
- **Verificação periódica**: a cada 30 min o bot pode checar se "algo relevante" aconteceu (ex: resultado de uma pesquisa, uma notícia) e decidir sozinho se vale a pena te avisar. Esse bloco vem vazio de propósito — você define a regra real (tem exemplos comentados no arquivo).

⚠️ **Importante sobre a iniciativa**: rodando só no terminal (CLI), o bot só consegue "falar primeiro" enquanto o processo `node index.js` estiver rodando — e você só vai ver a mensagem se estiver olhando o console naquele momento. Para ele **de fato mandar mensagem no seu WhatsApp sem você ter perguntado nada antes**, é preciso:
1. Conectar com o projeto Twilio (WhatsApp) que já te passei.
2. Descomentar o trecho de envio real via Twilio em `canal_saida.js` e preencher `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` no `.env`.
3. Manter o processo rodando 24h (uma VPS, Railway, Render, etc. — não adianta só no seu computador se ele desligar/hibernar).
4. Ter cuidado com a política da Meta: fora da janela de 24h de conversa ativa, iniciar uma conversa no WhatsApp exige um **template de mensagem pré-aprovado** (não é qualquer texto livre). A Twilio te orienta nesse processo quando for pra produção.

## Criando seu próximo bot

1. Copie o template:
```bash
cp bots/_template_bot.js bots/meu_bot.js
```

2. Edite `bots/meu_bot.js` seguindo o padrão do template (defina `definicao` com nome/descrição/parâmetros, e implemente a lógica em `executar()`).

3. Registre em `registro_bots.js`:
```javascript
import * as meuBot from "./bots/meu_bot.js";

export const bots = [
  meuBot,
];
```

Pronto — o orquestrador já enxerga e pode chamar seu bot automaticamente, sem precisar mexer no `index.js`.

## Dicas importantes

- **A `description` de cada bot é o que faz o orquestrador decidir quando usá-lo.** Quanto mais clara e específica, melhor a decisão do modelo.
- **Um bot pode ser outra IA**: um bot escritor com um `system` prompt focado em copywriting, um bot programador focado em código, um bot analista focado em dados — cada um é só uma chamada à API do Gemini com instruções diferentes.
- **Um bot pode ser uma API externa**: clima, cotação, envio de email, consulta em banco de dados, etc. — é só um `fetch()` dentro do `executar()`.
- **Conectar no WhatsApp**: troque a interface de linha de comando (`readline` no `index.js`) pela rota `/whatsapp` do projeto Twilio — é só chamar a função `processarMensagem(historico)` dentro do webhook.
- **Múltiplos usuários**: se for usar em produção com várias pessoas falando com o bot ao mesmo tempo, separe o histórico por usuário/número (como no exemplo do projeto Twilio) para não misturar conversas.
- **Persistência**: hoje o histórico da conversa fica em memória (RAM) e some ao reiniciar o processo. Se precisar manter entre reinícios, salve em SQLite/Postgres/Redis.

## Estrutura de arquivos

```
bot-orquestrador/
├── index.js                # Orquestrador principal (CLI + loop de tool use + memória + iniciativa)
├── registro_bots.js         # Catálogo central de bots (você registra aqui)
├── personalidade.json       # Configuração editável: nome, tom, traços
├── personalidade.js         # Monta o trecho de system prompt a partir do json acima
├── memoria.js                # Memória de longo prazo persistente (arquivo JSON)
├── memoria/dados.json        # Onde a memória fica salva (criado automaticamente)
├── agendador.js              # Regras de iniciativa própria (horário fixo + verificação periódica)
├── canal_saida.js            # Como o bot "fala primeiro" (console por padrão, Twilio comentado)
├── bots/
│   ├── _template_bot.js     # Copie este arquivo para criar cada novo bot
│   └── bot_pesquisa_web.js  # Bot de pesquisa web real, já registrado
├── package.json
└── .env.example
```
