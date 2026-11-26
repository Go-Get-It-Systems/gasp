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
- **Prioridade:** P1 · **Área:** backend + app · **Status:** feito (gasp#40)
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
- **Decisão:** resolvido no app: com o gasp do servidor conhecido, a reação
  pelo chat vai por `POST /reactions` (que também publica a resposta no
  chat). Versões antigas do app só se corrigem ao atualizar. Se isso
  importar, dá para adicionar um fallback no backend depois.

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


## B-008 · Upload de mídia sofre falhas TLS intermitentes
- **Prioridade:** P2 · **Área:** infra/app · **Status:** aberto
- **Contexto:** no E2E de 23/10/2026, o envio do vídeo de teste de 9s de Iaco para Bi falhou com “No connection”, inclusive após Try Again. A foto passou na mesma sessão. Impacto em aparelhos reais ainda não confirmado.
- **Evidência:** `docs/e2e/2026-10-23/report.md` e `upload-errors.log`: `/api/v1/uploads`, conexão resetada pelo peer, `NSURLErrorDomain -1200`, erro SSL -9816. `/health` respondeu 200. Não há evidência para atribuir a falha a um commit específico.
- **Onde:** transporte iOS → domínio Railway; investigar logs de edge/backend e comparar aparelho físico. Fluxo chamador em `services/storage.ts` e `app/(modals)/send-gasp.tsx`. Validação completa de vídeo, composite, áudio e câmera pendente até resolver.

- **Investigação em 23/10/2026:** nova tentativa autenticada falhou duas vezes no handshake TLS e passou na terceira, sem mudança de código: upload 200 (484.619 bytes), criação do gasp 201 e recebimento de vídeo de 9s confirmado na UI. Ver `docs/e2e/2026-10-23/upload-investigation.md`. Não é falha determinística de arquivo/compressão. Origem do reset ainda depende de logs de borda/rede; Railway CLI está sem autenticação. Mantido aberto, sem declarar correção.

- B-008: correlação Railway concluída em 23/10: resets anteriores ao HTTP; upload recuperado confirmado por requestId LG_pYLmRToKM_3bRjUJq2g (200, 1430 ms). Causa de rede/borda ainda não identificada. Ver docs/e2e/2026-10-23/upload-investigation.md.
- **Reteste 23/10/2026 11:02 (Melbourne):** foto sintética Bi → Iaco também falhou nas três tentativas automáticas, com `NSURLErrorDomain -1200 / SSL -9816`, conexões descritas como `quic-connection` e 0/0 bytes HTTP. UI: “No connection”. Nenhum upload nos logs HTTP Railway da janela; GETs de perfil retornaram 200. Backend `ea5bd05`, após desativar Serverless: job de expiração concluiu normalmente. Evidências em `docs/e2e/2026-10-23/retest-1100/`. A falha não é exclusiva de vídeo; origem exata permanece sem atribuição a código/autor.

## B-009 · Saída de áudio durante reação com possível conexão AirPods
- **Prioridade:** P2 · **Área:** app/iOS · **Status:** encerrado por validação do usuário em 26/11/2026, sem alteração de código
- **Contexto:** primeira tentativa no iPhone 15 Pro sem som audível durante captura. Usuário depois informou possível conexão AirPods e elevou o volume; repetição passou sem mudança de código, com áudio original durante captura e voz própria na prévia confirmados. Defeito do app não estabelecido; cenário Bluetooth ainda não validado.
- **Evidência:** E2E de 26/11/2026, `docs/e2e/2026-11-26/report.md`, `physical-trace.log` e `physical-audio-retest.log`. Ambas as reações entregues; primeira rota não instrumentada. Não atribuir causa a AirPods, commit ou autor sem reproduzir.
- **Onde:** sessão/rota de áudio nativa, `components/gasp/HoldToView.tsx` e `patches/expo-video+3.0.16.patch`. Comparar saída do telefone e AirPods explicitamente antes de alterar código.
- **Conclusão:** usuário confirmou depois que a validação com AirPods também estava correta. Pendência encerrada com base nessa confirmação; causa da primeira tentativa inaudível não isolada e nenhum conserto de código foi alegado.
