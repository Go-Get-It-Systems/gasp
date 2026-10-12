# Backlog: o que ficou para depois

Itens identificados durante o trabalho e adiados de propósito. Cada um tem
evidência, onde mexer e a decisão que falta. Adicione itens com a skill
`backlog` (`.claude/skills/backlog/`), que mantém este formato.

Prioridades:
- **P1:** afeta usuários agora; fazer antes de novas features.
- **P2:** afeta usuários em casos específicos; planejar.
- **P3:** raro ou só no futuro; registrar e esperar.

Status: `aberto`, `decisão pendente`, `em andamento`, `feito (PR)`.

---

## B-001 · Reação pelo chat não marca o gasp como `reacted`
- **Prioridade:** P1 · **Área:** backend + app · **Status:** aberto
- **Contexto:** quando o gasp é aberto pelo chat (`chatMessageId`), a reação
  vai como mensagem (`POST /messages`, tipo `reaction`). O backend não muda o
  status do gasp, que fica `opened` e continua na aba Gasps até expirar.
- **Por que P1:** o app só esconde o gasp localmente (`viewedGaspUrls`, em
  memória, sem persistência). Depois de reiniciar o app, um gasp de
  visualização única já visto volta para a lista e pode ser aberto de novo.
  Esse é o caminho comum: abrir pelo chat.
- **Evidência:** teste "known gap" em
  `app/(modals)/__tests__/view-gasp.flow.test.tsx`; contrato, seção
  "Lacunas conhecidas".
- **Onde:** `gasp-backend/src/modules/messages/` (ao criar uma mensagem
  `reaction` com `replyToId` de uma mensagem `gasp`, marcar o gasp como
  `reacted` usando `resolveReactionStatusUpdate`), ou o app também chamar
  `POST /reactions` no modo chat.
- **Decisão:** qual dos dois caminhos. Recomendado: backend, porque cobre
  versões antigas do app.

## B-002 · Banco de produção perde conexão de vez em quando
- **Prioridade:** P1 · **Área:** infra/backend · **Status:** aberto
- **Contexto:** `connect ETIMEDOUT 10.154.34.200:5432` (IPv4), com IPv6
  recusado. Isso causou todos os 3 erros 500 vistos em 6h (por exemplo,
  `PATCH /gasps/:id/open`). O job de expiração (`gasp-expiry.worker.ts`)
  falha em ~1 de cada 6 execuções, e o log mostra a mensagem vazia porque o
  erro é um `AggregateError`.
- **Evidência:** `railway logs --json` em 11–12/10/2026: 148 de 500 linhas
  com "Gasp expiry job … failed:".
- **Onde:** configuração do pool do `postgres` em `src/config/database.ts`
  (tempo de conexão, conexões ociosas, preferência por IPv4 ou IPv6 na rede
  privada do Railway). Também logar `err` completo no worker.
- **Mitigação já feita:** o app tenta o `open` de novo em erro transitório
  (PR gasp#38).

## B-003 · `open` que falha em todas as tentativas deixa o gasp `pending`
- **Prioridade:** P3 · **Área:** backend · **Status:** decisão pendente
- **Contexto:** se as 4 tentativas do `open` falharem, o `close-view` não
  muda um gasp `pending` (`resolveCloseViewTransition`), e o gasp volta para a
  lista de quem já o viu.
- **Decisão:** permitir `close-view` a partir de `pending` (o app só envia
  depois de uma revelação). Atenção: muda uma regra testada em
  `gasps.transitions.test.ts` ("cliente fechou sem abrir").

## B-004 · Mesma conta em dois aparelhos abre o mesmo gasp
- **Prioridade:** P3 (vira P1 com sessões web) · **Área:** backend · **Status:** aberto
- **Contexto:** enquanto um gasp de visualização única está `opened` (até a
  reação chegar, ~10s com o composite), o servidor ainda o lista como
  pendente, e outro aparelho da mesma conta consegue abri-lo. Visto com
  iPhone + simulador.
- **Decisão tomada:** tirar gasps de visualização única `opened` da lista de
  pendentes (`ALWAYS_PENDING_STATUSES` / `isPendingForRecipient`). O `open`
  continua idempotente.
- **Mitigação já feita:** o segundo aparelho mostra "Já aberto em outro
  aparelho" (PR gasp#38).

## B-005 · Miniatura em branco para vídeos
- **Prioridade:** P2 · **Área:** app (UI) · **Status:** aberto
- **Contexto:** na tela "Send to", a miniatura no canto fica vazia quando a
  mídia é vídeo. A bolha do próprio gasp em vídeo no chat do remetente também
  fica em branco.
- **Onde:** `app/(modals)/send-gasp.tsx` e a bolha `GaspBubble` (lado do
  remetente). Gerar um frame com `expo-video-thumbnails` ou usar o blurhash.

## B-006 · Consentimento do Business
- **Prioridade:** P2 · **Área:** produto · **Status:** decisão pendente
- **Contexto:** decisão de produto sobre como pedir e registrar o
  consentimento para mídia de Business, pendente desde a análise do projeto.
  Falta detalhar o que exatamente precisa de consentimento.

## B-007 · iPhone 15 Pro Max não instala builds de desenvolvimento
- **Prioridade:** P3 · **Área:** conta Apple · **Status:** aberto (externo)
- **Contexto:** a build para o 15 Pro Max falha com "PLA Update … Account
  Holder must agree" e o perfil não inclui o aparelho. Quem resolve é o
  titular da conta Apple Developer.
