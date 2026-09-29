# Guia de Teste de Notificacoes: Device e Simulator

Este guia valida a spec `social-notification-experience` de ponta a ponta. Ele cobre mensagens, gasps, reacoes, pedidos de amizade, amizade aceita, deduplicacao, foreground toast, push nativo e rotas abertas ao tocar na notificacao.

## Criterio de conclusao

A funcionalidade so pode ser considerada validada quando:

- Os testes automatizados passam.
- Os fluxos de foreground passam no Simulator e no iPhone fisico.
- Os fluxos de background, tela bloqueada e app encerrado passam no iPhone fisico.
- O token Expo do iPhone aparece na tabela `devices`.
- Um job de background termina com `sent >= 1` e `failed = 0`.
- Tocar em mensagem ou reacao nunca abre uma conversa `Unknown`.
- A reacao abre o chat e destaca o card correto.

O Simulator e uma evidencia auxiliar. A aprovacao final da spec exige o iPhone fisico.

## Ambiente usado neste guia

| Papel | Ambiente | Conta |
| --- | --- | --- |
| Usuario A, recipient | iPhone 15 Pro conectado por cabo | Conta A |
| Usuario B, actor | Simulator iPhone 17 Pro Max | Conta B |
| Frontend | Branch `feat/gasp-notification-mvp` | `gasp/` |
| Backend | Railway production | `gasp-backend/` |
| API esperada | `https://gasp-backend-production.up.railway.app` | |

Use duas contas reais e diferentes. Para mensagem, gasp e reacao, as contas devem ser amigas. Para testar pedido de amizade, elas nao podem estar conectadas; remova a amizade ou use contas extras.

## Registro da sessao de 21 de julho de 2026

| Caso observado | Resultado | Evidencia/observacao |
| --- | --- | --- |
| Mensagem em foreground | PASS | Atualizacao e toast dentro do app funcionaram |
| Gasp em foreground no Simulator | FAIL antes da correcao | O Gasp gerava o toast correto e depois um segundo toast tecnico com `[Gasp]` |
| Reacao recebida no Simulator | FAIL antes da correcao | `createdAt` do socket nao era convertido para `capturedAt`, causando `Invalid time value` |
| Pedido/aceite de amizade em foreground | PASS visual | Toasts actor-first apareceram nas imagens 25 e 26; rotas e casos de background ainda precisam ser testados |
| Permissoes do iPhone | PASS | Lock Screen, Notification Center, Banners e Sounds habilitados na imagem 27 |
| Mensagem em background no iPhone | PASS de entrega | Push nativo observado; repetir toque para registrar a rota como evidencia |
| Mensagem com iPhone bloqueado | PASS de entrega | Notificacao observada nas imagens 28 e 29; repetir toque para registrar a rota |
| Gasp em background | PASS de entrega | Push nativo observado; repetir depois do deploy para confirmar que existe somente um push |

Correcoes adicionadas apos esta sessao:

- Mensagens internas de chat com tipo `gasp` ou `reaction` nao geram um segundo toast.
- O backend nao cria notificacao `message.new` para mensagens internas `gasp` ou `reaction`.
- Reacoes de socket sao normalizadas antes de entrar na Inbox.
- Timestamp invalido recebe fallback e nao derruba a tela.

Antes do reteste, recarregue o bundle frontend. Para validar Gasp em background, a correcao backend tambem precisa estar implantada na Railway.

### Reteste minimo depois das correcoes

1. `SIM-03`: envie um Gasp para o Simulator com o app ativo. Deve aparecer exatamente um toast com nome e `sent you a gasp`; `[Gasp]` nao deve aparecer como segundo toast.
2. `SIM-04`: envie a reacao do iPhone fisico para o Simulator. A Inbox deve continuar renderizada, mostrar horario valido e exibir exatamente um toast com `reacted to your gasp`.
3. `GASP-02`: depois do deploy backend, envie um Gasp para o iPhone em background. Deve existir somente um push nativo.
4. Toque nos tres avisos e confirme as rotas antes de marcar os casos como `PASS` completos.

## O que cada ambiente consegue provar

| Comportamento | Simulator | iPhone fisico |
| --- | --- | --- |
| Socket e atualizacao em tempo real | Sim | Sim |
| Toast enquanto o app esta ativo | Sim | Sim |
| Deduplicacao de toast | Sim | Sim |
| Rota ao tocar no toast | Sim | Sim |
| Push remoto em Simulator moderno | Pode funcionar em Xcode 14+, macOS 13+ e iOS 16+ | Sim |
| Som e vibracao reais | Nao e evidencia valida | Sim |
| Lock screen | Nao e evidencia final | Sim |
| App encerrado e cold start real | Evidencia auxiliar | Sim |
| Registro APNs/Expo do aparelho real | Nao | Sim |

Se o Simulator nao obtiver um Expo push token, continue usando-o para os testes de foreground. Nao tente resolver APNs no Simulator antes de testar o iPhone fisico.

## 1. Preparacao

### 1.1 Verificar o codigo

No terminal do frontend:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp
git status --short --branch
```

Resultado esperado:

```text
## feat/gasp-notification-mvp...origin/feat/gasp-notification-mvp
```

Alteracoes locais intencionais podem aparecer abaixo da branch. Nao troque de branch nem use comandos que descartem essas alteracoes.

No terminal do backend:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp-backend
git status --short --branch
```

O backend tambem deve estar em `feat/gasp-notification-mvp`.

### 1.2 Confirmar o backend

```bash
curl --fail --silent --show-error --max-time 10 https://gasp-backend-production.up.railway.app/health
```

Resultado esperado:

```json
{"status":"ok","timestamp":"..."}
```

### 1.3 Preparar o iPhone

No iPhone:

1. Desbloqueie o aparelho e mantenha a tela ativa durante a instalacao.
2. Ative `Settings > Privacy & Security > Developer Mode` se solicitado.
3. Confie no perfil em `Settings > General > VPN & Device Management` se solicitado.
4. Conecte o iPhone ao Mac por cabo.
5. Mantenha Mac e iPhone na mesma rede Wi-Fi para o Metro em modo LAN.
6. Desative Focus e Do Not Disturb durante o teste.
7. Deixe o volume audivel e a vibracao/haptics habilitada.
8. Em `Settings > Notifications > GASP`, habilite:
   - Allow Notifications
   - Lock Screen
   - Notification Center
   - Banners
   - Sounds

O numero no icone do app nao faz parte do MVP atual. Nao marque o teste como falho apenas por nao existir badge numerico.

### 1.4 Preparar Reactotron

1. Abra Reactotron antes dos apps.
2. Ative o MCP no rodape se quiser que o Kiro leia os logs.
3. Confirme que o app aparece como `GASP`.

Consulte `docs/reactotron.md` se a conexao nao aparecer.

### 1.5 Iniciar Metro e instalar os dois apps

Terminal 1, mantenha aberto:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp
npx expo start --dev-client --lan --clear
```

Terminal 2, Simulator:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp
npx expo run:ios --device "iPhone 17 Pro Max" --no-bundler
```

Terminal 3, iPhone fisico:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp
npx expo run:ios --device "iPhone de Gabriel" --no-bundler
```

Se o nome do device estiver diferente:

```bash
xcrun devicectl list devices
```

Se o nome do Simulator estiver diferente:

```bash
xcrun simctl list devices available
```

### 1.6 Fazer login

1. No iPhone fisico, entre com a Conta A.
2. No Simulator, entre com a Conta B.
3. Anote os usernames e o horario de inicio do teste.
4. Confirme no Reactotron:
   - `authStore | login success` ou `authStore | session restored`
   - `socket | connected`
   - `[PushService] permission status: granted`
   - `[PushService] push token obtained:`
   - `[PushService] device registered successfully`

O log mostra somente o prefixo do token. O valor completo deve ser confirmado no banco.

## 2. Confirmar registro do device

### 2.1 Banco Postgres

No repositorio do backend:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp-backend
railway connect Postgres --environment production
```

No prompt do `psql`, consulte as contas:

```sql
SELECT id, username, display_name
FROM users
WHERE username IN ('USERNAME_CONTA_A', 'USERNAME_CONTA_B');
```

Depois consulte os devices:

```sql
SELECT
  u.username,
  d.platform,
  left(d.fcm_token, 28) AS token_prefix,
  d.updated_at
FROM devices d
JOIN users u ON u.id = d.user_id
WHERE u.username IN ('USERNAME_CONTA_A', 'USERNAME_CONTA_B')
ORDER BY d.updated_at DESC;
```

Resultado esperado para o iPhone:

- `platform = ios`
- `token_prefix` comeca com `ExpoPushToken[` ou `ExponentPushToken[`
- `updated_at` corresponde ao login/teste atual

Se nao houver linha, faca logout/login no iPhone e verifique os logs de `registerIfNeeded` antes de continuar os testes de background.

## 3. Testes automatizados antes do teste manual

Frontend:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp
npx tsc --noEmit
npm test -- --runInBand services/__tests__/conversations.test.ts services/__tests__/chatParticipant.test.ts services/__tests__/chatMessageHighlight.test.ts services/__tests__/pushService.test.ts hooks/__tests__/useSocketListeners.test.ts stores/__tests__/notificationStore.test.ts components/__tests__/ToastBanner.test.tsx
```

Backend:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp-backend
npm run typecheck
npm run test:run
```

Nao continue se TypeScript ou testes de notificacao falharem.

## 4. Testes no Simulator

Nestes testes, deixe a Conta B como recipient no Simulator e use a Conta A no iPhone como actor. Isso valida o mesmo frontend em uma segunda instalacao.

### SIM-01: mensagem com o mesmo chat aberto

Pre-condicao: as contas sao amigas e o Simulator esta dentro do chat com a Conta A.

1. No iPhone, abra o chat da Conta B.
2. No Simulator, mantenha esse mesmo chat aberto.
3. No iPhone, envie uma mensagem unica, por exemplo `SIM-01 14:32`.

Esperado no Simulator:

- A mensagem aparece inline.
- Nenhum toast aparece.
- Nenhum banner nativo aparece.
- O chat nao muda de tela.

### SIM-02: mensagem com o app ativo em outra tela

1. No Simulator, abra Camera, Inbox ou Chat list; nao deixe a conversa aberta.
2. No iPhone, envie `SIM-02 <horario>`.
3. Conte quantos toasts aparecem.
4. Toque no toast.

Esperado:

- Exatamente um toast, mesmo que socket de dominio e `notification:event` cheguem juntos.
- Nome/avatar da Conta A no toast.
- Preview da mensagem.
- Nenhum banner nativo enquanto o app esta ativo.
- O toque abre o chat existente com a Conta A.
- O header nunca mostra `Unknown`.
- Voltar retorna para a tela anterior.

### SIM-03: gasp com o app ativo

1. No Simulator, fique na Camera ou Inbox.
2. No iPhone, capture e envie um gasp para a Conta B.
3. Toque no toast recebido no Simulator.

Esperado:

- Exatamente um toast com nome da Conta A e `sent you a gasp`.
- Thumbnail ou blurhash aparece permanentemente desfocado; nunca revela o Gasp antes do toque e nunca deixa um espaco vazio.
- O toque abre `view-gasp` para o gasp correto.
- O gasp recebido aparece no estado pendente/inbox.

### SIM-04: reacao com o app ativo

1. No Simulator, envie um gasp para a Conta A.
2. No iPhone, abra o gasp e grave/envie uma reacao.
3. Antes de enviar a reacao, deixe o Simulator em uma tela diferente do chat.
4. No Simulator, toque no toast da reacao.

Esperado:

- Exatamente um toast com nome da Conta A e `reacted to your gasp`.
- O toque abre o chat com a Conta A.
- O card da reacao correta recebe foco visual por alguns segundos.
- O header nunca mostra `Unknown`.
- Nao abre `reaction-result` como uma experiencia desconectada.

### SIM-05: pedido de amizade com o app ativo

Pre-condicao: as contas nao sao amigas e nao possuem pedido pendente.

1. No Simulator, deixe a Conta B ativa em qualquer tela.
2. No iPhone, procure a Conta B em Discover e envie pedido de amizade.
3. No Simulator, toque no toast.

Esperado:

- Um toast com nome da Conta A e `sent you a friend request`.
- O toque abre Inbox.
- O pedido aparece na secao de friend requests e pode ser aceito/rejeitado.

### SIM-06: amizade aceita com o app ativo

Pre-condicao: a Conta B enviou um pedido para a Conta A.

1. Deixe a Conta B ativa no Simulator.
2. No iPhone, aceite o pedido da Conta B.
3. No Simulator, toque no toast.

Esperado:

- Um toast com nome da Conta A e `accepted your request`.
- O toque abre a superficie de Chat.
- A nova amizade aparece sem precisar reiniciar o app.

### SIM-07: push remoto no Simulator, evidencia auxiliar

1. Confirme que o Simulator obteve e registrou um Expo push token.
2. Coloque o app do Simulator em background com `Cmd + Shift + H`.
3. Envie uma mensagem da Conta A.
4. Toque na notificacao do Simulator.

Esperado quando o ambiente suporta push remoto:

- Banner nativo no Simulator.
- O toque abre o chat correto.

Se nao houver token ou push, registre como `NA - simulator push unavailable` e continue no iPhone. Isso nao substitui nem bloqueia o teste fisico.

## 5. Testes no iPhone fisico

Daqui em diante, a Conta A no iPhone e sempre o recipient. A Conta B no Simulator provoca cada evento.

### MSG-01: mensagem no mesmo chat

1. No iPhone, abra o chat da Conta B e mantenha-o visivel.
2. No Simulator, envie `MSG-01 <horario>`.

Esperado:

- Mensagem aparece inline.
- Nenhum toast.
- Nenhum banner, som ou vibracao nativa.

### MSG-02: mensagem com app ativo em outra tela

1. No iPhone, abra Camera ou Inbox.
2. No Simulator, envie `MSG-02 <horario>`.
3. Toque no toast.

Esperado:

- Exatamente um toast actor-first.
- Nenhum banner nativo e nenhum som de push.
- O toque abre o chat correto com nome/avatar da Conta B.
- Nunca aparece `Unknown`.
- Voltar retorna para a tela anterior.

### MSG-03: mensagem em background

1. No iPhone, saia para a Home sem encerrar o GASP.
2. Aguarde 3 segundos.
3. No Simulator, envie `MSG-03 <horario>`.
4. Abra Notification Center se o banner desaparecer.
5. Toque na notificacao.

Esperado:

- Banner/cartao nativo com nome da Conta B e preview.
- Som e/ou haptic conforme as configuracoes do aparelho.
- A notificacao fica visivel em Notification Center.
- O toque abre o chat correto.
- Nunca aparece `Unknown` nem uma nova conversa vazia.

### MSG-04: mensagem com iPhone bloqueado

1. Com GASP previamente aberto, pressione o botao lateral e bloqueie o iPhone.
2. Aguarde 3 segundos.
3. No Simulator, envie `MSG-04 <horario>`.
4. Fotografe ou grave a lock screen.
5. Desbloqueie e toque na notificacao.

Esperado:

- Alerta na lock screen.
- Som e/ou haptic.
- Toque abre o chat correto.

### MSG-05: mensagem com app encerrado

1. No iPhone, abra o app switcher e deslize GASP para cima.
2. Aguarde 3 segundos.
3. No Simulator, envie `MSG-05 <horario>`.
4. Toque na notificacao.

Esperado:

- Push nativo mesmo com GASP encerrado.
- Cold start completa login/restauracao de sessao.
- O app abre diretamente no chat correto.
- Nunca aparece `Unknown`.

### GASP-01: gasp com app ativo

1. No iPhone, fique em Camera ou Inbox.
2. No Simulator, capture e envie um gasp para a Conta A.
3. Toque no toast.

Esperado:

- Um toast com nome da Conta B e `sent you a gasp`.
- Nenhum banner nativo.
- O toque abre o gasp correto em `view-gasp`.

### GASP-02: gasp em background

1. Coloque GASP em background no iPhone.
2. No Simulator, envie um novo gasp.
3. Toque no push.

Esperado:

- Push nativo com som/haptic.
- O toque abre o gasp correto.
- O gasp pode ser aberto e reagido sem erro de `conversationId` vazio.

### GASP-03: gasp com iPhone bloqueado

1. Bloqueie o iPhone.
2. No Simulator, envie um novo gasp.
3. Desbloqueie e toque na notificacao.

Esperado:

- Alerta na lock screen com `sent you a gasp`.
- Toque abre o gasp correto.

### GASP-04: gasp com app encerrado

1. Encerre GASP pelo app switcher.
2. No Simulator, envie um novo gasp.
3. Toque no push.

Esperado:

- Push nativo.
- Cold start abre `view-gasp` para o item correto.

### REACTION-01: reacao com app ativo

1. No iPhone, envie um gasp para a Conta B.
2. Deixe o iPhone ativo em Camera ou Inbox.
3. No Simulator, abra esse gasp e grave/envie uma reacao.
4. No iPhone, toque no toast.

Esperado:

- Um toast com nome da Conta B e `reacted to your gasp`.
- O toque abre o chat existente.
- O card da reacao correta fica visivelmente destacado por alguns segundos.
- O header usa o nome/avatar da Conta B; nunca `Unknown`.

### REACTION-02: reacao em background

1. No iPhone, envie um gasp para a Conta B.
2. Coloque GASP em background no iPhone.
3. No Simulator, reaja ao gasp.
4. Toque no push do iPhone.

Esperado:

- Push nativo com `reacted to your gasp`.
- O toque abre o chat e revela o card da reacao.
- Nenhuma conversa nova e vazia e criada.

### REACTION-03: reacao com iPhone bloqueado

1. Envie um gasp do iPhone para o Simulator.
2. Bloqueie o iPhone.
3. No Simulator, reaja ao gasp.
4. Desbloqueie e toque na notificacao.

Esperado:

- Alerta na lock screen com som/haptic.
- Chat correto e card da reacao destacado.

### REACTION-04: reacao com app encerrado

1. Envie um gasp do iPhone para o Simulator.
2. Encerre GASP no iPhone.
3. No Simulator, reaja ao gasp.
4. Toque na notificacao.

Esperado:

- Push nativo.
- Cold start abre o chat correto e revela a reacao.
- Nunca aparece `Unknown`.

### FRIEND-01: pedido de amizade com app ativo

Pre-condicao: contas sem amizade/pedido pendente.

1. Deixe a Conta A ativa no iPhone.
2. No Simulator, a Conta B envia pedido para a Conta A.
3. No iPhone, toque no toast.

Esperado:

- Toast `sent you a friend request`.
- Toque abre Inbox.
- Pedido aparece para aceitar/rejeitar.

### FRIEND-02: pedido de amizade em background

Pre-condicao: use contas sem amizade/pedido pendente.

1. Coloque GASP em background no iPhone.
2. No Simulator, envie pedido para a Conta A.
3. Toque no push.

Esperado:

- Push nativo.
- Toque abre Inbox, nao Discover.
- Pedido aparece na lista.

### FRIEND-03: amizade aceita com app ativo

Pre-condicao: a Conta A enviou pedido para a Conta B.

1. Deixe a Conta A ativa no iPhone.
2. No Simulator, aceite o pedido.
3. No iPhone, toque no toast.

Esperado:

- Toast `accepted your request`.
- Toque abre Chat.
- Lista de amigos e atualizada.

### FRIEND-04: amizade aceita em background

Pre-condicao: a Conta A enviou pedido para a Conta B.

1. Coloque GASP em background no iPhone.
2. No Simulator, aceite o pedido.
3. Toque no push.

Esperado:

- Push nativo.
- Toque abre Chat.
- A nova amizade aparece.

## 6. Confirmar o resultado do worker

Os logs do backend mostram falhas, mas o worker nao imprime sucesso. Para verificar o valor retornado pelo BullMQ, conecte ao Redis:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp-backend
railway connect Redis --environment production
```

No `redis-cli`, liste os jobs concluidos mais recentes:

```text
ZRANGE bull:notifications:completed 0 9 REV
```

Copie o id do job correspondente ao horario do teste e consulte:

```text
HGET bull:notifications:JOB_ID data
HGET bull:notifications:JOB_ID returnvalue
HGET bull:notifications:JOB_ID failedReason
```

Resultado esperado para background/locked/killed:

```json
{"sent":1,"failed":0,"invalidTokensRemoved":0}
```

`sent: 1` significa que o Expo aceitou o ticket para envio. Isso nao confirma sozinho que a APNs entregou a notificacao; o banner, som/haptic e a abertura da rota no iPhone continuam sendo a evidencia final.

Resultados que indicam falha de preparacao:

| Resultado | Significado | Acao |
| --- | --- | --- |
| `{"skipped":true,"reason":"no_devices"}` | Token nao esta no banco | Repetir login/registro do device |
| `{"skipped":true,"reason":"user_online"}` em background | Estado do app ficou incorreto | Verificar `notification:app_state` e socket |
| `failed > 0` | Expo/APNs/FCM recusou o envio | Verificar logs e credenciais |
| `failedReason` preenchido | Job falhou depois das tentativas | Copiar erro completo |

Nao espere um job para o usuario ativo em foreground: nesse estado o backend deve usar socket e suprimir push.

## 7. Logs do backend

Para procurar erros dos ultimos dez minutos:

```bash
cd /Users/gabrielgimenes/www/gasp-layer-one/gasp-backend
railway logs --service gasp-backend --environment production --since 10m --lines 200
```

Procure por:

```text
[notifications] delivery failed
missing reaction notification route identifiers
Notification job ... failed
Expo push failed with status ...
```

Ausencia de erro nao prova entrega. Combine sempre: device row + resultado BullMQ + notificacao observada no iPhone.

## 8. Evidencias a salvar

Para cada teste manual, registre:

- ID do teste, por exemplo `MSG-03`.
- Horario exato.
- Conta actor e recipient.
- Estado do app.
- Screenshot ou video do toast/banner/lock screen.
- Screenshot da tela aberta apos o toque.
- Prefixo do token na tabela `devices`.
- `JOB_ID` e `returnvalue` do BullMQ para push.
- Logs Reactotron relevantes.
- Resultado `PASS`, `FAIL` ou `NA`.

Use esta tabela:

| ID | Estado | Toast/push | Rota correta | Sem Unknown | Worker | Resultado | Observacoes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SIM-01 | Active/same chat | | | | NA | | |
| SIM-02 | Active/other screen | | | | NA | | |
| SIM-03 | Active | | | | NA | | |
| SIM-04 | Active | | | | NA | | |
| SIM-05 | Active | | | | NA | | |
| SIM-06 | Active | | | | NA | | |
| SIM-07 | Background | | | | | | |
| MSG-01 | Active/same chat | | | | NA | | |
| MSG-02 | Active/other screen | | | | NA | | |
| MSG-03 | Background | | | | | | |
| MSG-04 | Locked | | | | | | |
| MSG-05 | Killed | | | | | | |
| GASP-01 | Active | | | | NA | | |
| GASP-02 | Background | | | | | | |
| GASP-03 | Locked | | | | | | |
| GASP-04 | Killed | | | | | | |
| REACTION-01 | Active | | | | NA | | |
| REACTION-02 | Background | | | | | | |
| REACTION-03 | Locked | | | | | | |
| REACTION-04 | Killed | | | | | | |
| FRIEND-01 | Active | | | | NA | | |
| FRIEND-02 | Background | | | | | | |
| FRIEND-03 | Active | | | | NA | | |
| FRIEND-04 | Background | | | | | | |

## 9. Diagnostico rapido

### Toast aparece, mas push nativo nao aparece

1. Confirme permissao no iOS Settings.
2. Confirme token Expo na tabela `devices`.
3. Confirme que o app estava realmente em background, locked ou killed.
4. Verifique o `returnvalue` do BullMQ.
5. Verifique Focus, Sounds e Notification Center.

### Worker retorna `no_devices`

1. Abra GASP no iPhone.
2. Faca logout e login.
3. Confirme `device registered successfully`.
4. Consulte novamente a tabela `devices`.

### Worker retorna `user_online` em background

1. Confirme no Reactotron o log `AppState | background -> socket disconnected`.
2. Aguarde 3 segundos depois de colocar o app em background.
3. Repita o evento.
4. Capture logs do backend e do socket se persistir.

### Push aparece, mas abre tela errada

Registre o tipo e a rota esperada:

| Evento | Destino esperado |
| --- | --- |
| Message | `/chat/:conversationId` com nome/avatar |
| Gasp | `/(modals)/view-gasp?gaspId=...` |
| Reaction | `/chat/:conversationId?highlightMessageId=...` |
| Friend request | `/(tabs)/inbox` |
| Friend accepted | `/(tabs)/chat` |

Copie o payload do job em `HGET bull:notifications:JOB_ID data` e compare `kind`, ids e route.

### Chat abre como `Unknown` ou ocorre `participantIds.findIndex`

1. Confirme que o frontend inclui a normalizacao de `participants` em `services/api/schemas/chat.schema.ts`.
2. Recarregue o bundle no iPhone e Simulator.
3. Reabra a notificacao com uma nova mensagem; notificacoes antigas podem conter payload legado.
4. Capture o response de `GET /conversations` no Reactotron.

### Push funciona no Simulator, mas nao no iPhone

O problema esta no caminho fisico: permissao, token do iPhone, perfil/entitlement APNs, credencial Expo/APNs ou configuracao do aparelho. Nao altere toast/socket para corrigir esse sintoma.

### Push funciona no iPhone, mas nao no Simulator

Registre `SIM-07` como indisponivel se o Simulator nao obtiver token. O iPhone fisico continua sendo a evidencia final da spec.

## 10. Encerramento

Quando todos os casos obrigatorios do iPhone estiverem `PASS`:

1. Preencha a tabela de evidencias.
2. Atualize Task 13 em `.kiro/specs/social-notification-experience/tasks.md`.
3. Registre qualquer diferenca do Simulator como observacao, nao como substituto do device.
4. So entao considere `social-notification-experience` concluida.

Referencia atual do Expo: [push remoto pode ser testado em iOS Simulator](https://docs.expo.dev/push-notifications/push-notifications-setup/) com Xcode 14+, macOS 13+ e iOS 16+, mas este projeto exige validacao adicional no iPhone fisico.
