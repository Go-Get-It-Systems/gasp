# GASP Backend - Referencia Completa para I.A.

## Visao Geral

Backend do app GASP - plataforma de midia efemera (estilo Snapchat) com chat em tempo real.
Serve a API REST, WebSocket (Socket.IO) e background jobs a partir de um unico processo Node.js.

**Diretorio raiz**: `C:\Users\gabri\Documents\projetos\app\gasp-backend\`

---

## Stack Tecnica

| Componente | Tecnologia | Versao |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Linguagem | TypeScript | 5.9 |
| Framework HTTP | Fastify | 5.3 |
| Real-time | Socket.IO | 4.8 |
| ORM | Drizzle ORM | 0.39 |
| Banco de dados | PostgreSQL | 16 |
| Cache / PubSub | Redis (ioredis) | 7 |
| Fila de jobs | BullMQ | 5.x |
| Auth (origem) | Firebase Auth | Phone SMS |
| Auth (backend) | @fastify/jwt | JWT proprio |
| Push Notifications | Firebase Cloud Messaging | via firebase-admin 13 |
| Validacao | Zod | 3.24 |
| Logger | Pino | 9 (built-in Fastify) |
| IDs | @paralleldrive/cuid2 | - |
| Deploy | Railway | - |

---

## Estrutura de Pastas

```
gasp-backend/
  package.json
  tsconfig.json
  drizzle.config.ts           # Config do Drizzle Kit (schema path, dialect, dbCredentials)
  docker-compose.yml          # Postgres 16 + Redis 7 para dev local
  Dockerfile                  # Multi-stage build para producao
  .env                        # Variaveis de ambiente (NAO commitar)
  .env.example                # Template das variaveis
  src/
    index.ts                  # ENTRY POINT - inicia Fastify, Socket.IO, BullMQ workers
    config/
      env.ts                  # Validacao de env vars com Zod schema
      database.ts             # Conexao PostgreSQL via postgres.js + Drizzle
      redis.ts                # 3 conexoes Redis: geral, pub, sub (Socket.IO precisa)
      firebase.ts             # firebase-admin init (Auth + Messaging)
      socket.ts               # Cria Socket.IO server com Redis adapter
    db/
      schema/                 # Drizzle schema (10 tabelas)
        index.ts              # Re-exporta todas as tabelas
        users.ts
        friendships.ts
        conversations.ts      # conversations + conversation_participants
        messages.ts
        gasps.ts
        reactions.ts
        devices.ts            # FCM tokens dos dispositivos
        webhooks.ts           # webhook_subscriptions + webhook_events
      migrations/             # Migracoes SQL geradas pelo Drizzle Kit
    modules/                  # Modulos de dominio (routes + schemas + service)
      auth/
      users/
      friends/
      conversations/
      messages/
      gasps/
      reactions/
      notifications/          # Apenas service (sem routes - envia push via BullMQ)
      webhooks/
      presence/               # Apenas service (sem routes - Redis sorted set)
    socket/                   # Socket.IO event handlers
      index.ts                # Registra middleware auth + todos os gateways
      middleware.ts            # Verifica JWT na conexao socket
      chat.gateway.ts         # Mensagens, typing, read receipts
      presence.gateway.ts     # Online/offline tracking
      gasp.gateway.ts         # Emit helpers para gasp events
    jobs/                     # BullMQ queues e workers
      queue.ts                # Define 4 filas: notifications, webhooks, gasp-expiry, cleanup
      workers/
        notification.worker.ts
        webhook.worker.ts
        gasp-expiry.worker.ts
        cleanup.worker.ts
    shared/
      types.ts                # Tipos compartilhados (MessageType, NotificationType, etc.)
      errors.ts               # Classes de erro (AppError, NotFoundError, etc.)
      pagination.ts           # Cursor-based pagination helpers (encode/decode base64url)
      rate-limit.ts           # Configs de rate limit por rota
```

---

## Variaveis de Ambiente (.env)

```
PORT=3000                     # Porta do servidor
HOST=0.0.0.0                  # Host de escuta
NODE_ENV=development          # development | production | test

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gasp
REDIS_URL=redis://localhost:6379

JWT_SECRET=<min 16 chars>     # Segredo para assinar JWT
JWT_EXPIRES_IN=24h            # Expiracao do JWT

FIREBASE_PROJECT_ID=gasp-cab37
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@gasp-cab37.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

CORS_ORIGIN=http://localhost:8081
```

---

## Banco de Dados - 10 Tabelas

### users
| Coluna | Tipo | Notas |
|---|---|---|
| id | text PK | CUID2 auto-gerado |
| firebase_uid | text UNIQUE | UID do Firebase Auth |
| phone_number | varchar(20) UNIQUE | Telefone |
| display_name | varchar(50) | Nome exibido |
| username | varchar(30) UNIQUE | @username |
| avatar_url | text | URL do avatar |
| bio | text | Biografia (default '') |
| is_active | boolean | default true |
| last_seen_at | timestamptz | Ultimo acesso |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indices: `firebase_uid`, `username`, `phone_number`

### friendships
| Coluna | Tipo | Notas |
|---|---|---|
| id | text PK | CUID2 |
| requester_id | text FK->users | Quem enviou |
| addressee_id | text FK->users | Quem recebeu |
| status | varchar(20) | 'pending' / 'accepted' / 'blocked' |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Unique constraint: (requester_id, addressee_id)

### conversations
| Coluna | Tipo |
|---|---|
| id | text PK |
| created_at | timestamptz |
| updated_at | timestamptz |

### conversation_participants
| Coluna | Tipo | Notas |
|---|---|---|
| id | text PK | |
| conversation_id | text FK->conversations | |
| user_id | text FK->users | |
| last_read_at | timestamptz | Quando leu pela ultima vez |
| unread_count | integer | Contador de nao lidas |
| joined_at | timestamptz | |

Unique constraint: (conversation_id, user_id)

### messages
| Coluna | Tipo | Notas |
|---|---|---|
| id | text PK | |
| conversation_id | text FK->conversations | |
| sender_id | text FK->users | |
| content | text | Conteudo da mensagem |
| type | varchar(20) | 'text' / 'image' / 'gasp' / 'reaction' |
| media_url | text | URL da midia (se type != text) |
| reply_to_id | text | ID da mensagem respondida (futuro) |
| read_at | timestamptz | Quando foi lida |
| created_at | timestamptz | |

Indice composto: (conversation_id, created_at)

### gasps
| Coluna | Tipo | Notas |
|---|---|---|
| id | text PK | |
| sender_id | text FK->users | |
| recipient_id | text FK->users | |
| image_url | text | URL da imagem |
| blurhash | varchar(100) | Placeholder blur |
| status | varchar(20) | 'pending' / 'viewed' / 'expired' |
| viewed_at | timestamptz | |
| expires_at | timestamptz | 24h apos criacao |
| created_at | timestamptz | |

### reactions
| Coluna | Tipo |
|---|---|
| id | text PK |
| gasp_id | text FK->gasps |
| reactor_id | text FK->users |
| video_url | text |
| created_at | timestamptz |

### devices
| Coluna | Tipo | Notas |
|---|---|---|
| id | text PK | |
| user_id | text FK->users | |
| fcm_token | text UNIQUE | Token FCM do dispositivo |
| platform | varchar(10) | 'ios' / 'android' |
| device_id | text | ID unico do dispositivo |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### webhook_subscriptions
| Coluna | Tipo |
|---|---|
| id | text PK |
| url | text |
| secret | text |
| events | text[] |
| is_active | boolean |
| description | text |
| created_at | timestamptz |
| updated_at | timestamptz |

### webhook_events
| Coluna | Tipo |
|---|---|
| id | text PK |
| subscription_id | text FK->webhook_subscriptions |
| event_type | varchar(50) |
| payload | jsonb |
| status | varchar(20) |
| attempts | integer |
| last_attempt_at | timestamptz |
| delivered_at | timestamptz |
| error_message | text |
| created_at | timestamptz |

---

## API REST - Todos os Endpoints

Base URL: `/api/v1`

### Auth (`/api/v1/auth`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | /register | Nao | Registra usuario (envia firebaseToken + displayName + username) -> retorna { user, token } |
| POST | /login | Nao | Login com firebaseToken -> retorna { user, token } |
| POST | /refresh | JWT | Renova o JWT |
| POST | /devices | JWT | Registra token FCM { fcmToken, platform, deviceId? } |
| DELETE | /devices/:token | JWT | Remove token FCM (logout) |

### Users (`/api/v1/users`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | /me | JWT | Perfil do usuario autenticado |
| PATCH | /me | JWT | Atualiza perfil { displayName?, username?, avatarUrl?, bio? } |
| GET | /search?q= | JWT | Busca usuarios por username/displayName |
| GET | /:id | JWT | Perfil publico de um usuario |

### Friends (`/api/v1/friends`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | / | JWT | Lista amigos (com isOnline do Redis) |
| GET | /requests | JWT | Lista pedidos de amizade pendentes |
| POST | /request | JWT | Envia pedido { addresseeId } |
| POST | /accept | JWT | Aceita pedido { friendshipId } |
| POST | /reject | JWT | Rejeita pedido { friendshipId } |
| DELETE | /:friendshipId | JWT | Remove amizade |

### Conversations (`/api/v1/conversations`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | / | JWT | Lista conversas (cursor-based) ?cursor=&limit=20 |
| POST | / | JWT | Cria ou retorna conversa 1-a-1 { participantId } |
| GET | /:id | JWT | Detalhes de uma conversa |

### Messages (`/api/v1/conversations`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| GET | /:conversationId/messages | JWT | Mensagens paginadas ?cursor=&limit=50&direction=older|newer |
| POST | /:conversationId/messages | JWT | Envia mensagem { content, type?, mediaUrl? } |
| PATCH | /:conversationId/read | JWT | Marca conversa como lida |

### Gasps (`/api/v1/gasps`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | / | JWT | Envia gasp { recipientId, imageUrl, blurhash? } |
| POST | /batch | JWT | Envia gasp para varios { recipientIds[], imageUrl, blurhash? } |
| GET | /pending | JWT | Gasps pendentes para o usuario |
| GET | /sent | JWT | Gasps enviados pelo usuario |
| PATCH | /:id/view | JWT | Marca gasp como visto |

### Reactions (`/api/v1/reactions`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | / | JWT | Cria reacao { gaspId, videoUrl } |
| GET | /gasps/:gaspId | JWT | Lista reacoes de um gasp |

### Webhooks (`/api/v1/webhooks`)
| Metodo | Rota | Auth | Descricao |
|---|---|---|---|
| POST | / | JWT | Cria subscription { url, events[], description? } -> retorna secret |
| GET | / | JWT | Lista subscriptions |
| PATCH | /:id | JWT | Atualiza subscription |
| DELETE | /:id | JWT | Remove subscription |
| GET | /:id/events | JWT | Historico de entregas |
| POST | /:id/test | JWT | Envia evento de teste |

---

## Paginacao

Todas as listas usam **cursor-based pagination**:
- O cursor e um timestamp codificado em base64url
- Funcoes: `encodeCursor(date)` e `decodeCursor(cursor)` em `src/shared/pagination.ts`
- Padrao de resposta: `{ data: T[], nextCursor: string | null, hasMore: boolean }`
- Busca `limit + 1` registros; se retornar mais que `limit`, tem proxima pagina

---

## Autenticacao - Fluxo Completo

1. **App** -> Firebase Auth (phone SMS) -> recebe `firebaseIdToken`
2. **App** -> `POST /api/v1/auth/register` com `{ firebaseToken, displayName, username }`
3. **Backend** -> `firebase-admin.auth().verifyIdToken(token)` -> extrai `uid`, `phone_number`
4. **Backend** -> Cria/busca usuario no PostgreSQL
5. **Backend** -> Gera JWT proprio com `{ userId, firebaseUid }` (expira em 24h)
6. **App** -> Armazena JWT no `expo-secure-store`
7. **App** -> Usa `Authorization: Bearer <jwt>` em toda chamada API
8. **App** -> Usa `auth: { token: jwt }` na conexao Socket.IO

### Middleware de Auth
- **HTTP**: `authMiddleware` em `src/modules/auth/auth.middleware.ts` - usa `request.jwtVerify()`
- **Socket.IO**: `socketAuthMiddleware` em `src/socket/middleware.ts` - usa `jsonwebtoken.verify()` diretamente

### Type Augmentation
```typescript
// Em auth.middleware.ts
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthPayload;  // { userId: string, firebaseUid: string }
    user: AuthPayload;
  }
}
// Acesso: request.user.userId, request.user.firebaseUid
```

---

## Socket.IO - Eventos em Tempo Real

Conexao: `io('wss://api.gasp.app', { auth: { token: jwt }, transports: ['websocket'] })`

### Chat Gateway (`src/socket/chat.gateway.ts`)

**Cliente -> Servidor:**
| Evento | Payload | Descricao |
|---|---|---|
| `chat:send_message` | `{ conversationId, content, type?, mediaUrl? }` | Envia mensagem |
| `chat:typing_start` | `{ conversationId }` | Comecou a digitar |
| `chat:typing_stop` | `{ conversationId }` | Parou de digitar |
| `chat:mark_read` | `{ conversationId }` | Marca como lida |
| `chat:join_conversation` | `conversationId` (string) | Entra na room da conversa |
| `chat:leave_conversation` | `conversationId` (string) | Sai da room |

**Servidor -> Cliente:**
| Evento | Payload | Descricao |
|---|---|---|
| `chat:new_message` | `{ message, conversationId }` | Nova mensagem recebida |
| `chat:typing` | `{ conversationId, userId, isTyping }` | Alguem digitando |
| `chat:message_read` | `{ conversationId, userId, readAt }` | Mensagem lida |
| `chat:conversation_updated` | `{ conversationId, lastMessage }` | Conversa atualizada |
| `chat:error` | `{ event, message }` | Erro ao processar |

### Presence Gateway (`src/socket/presence.gateway.ts`)

**Servidor -> Cliente:**
| Evento | Payload |
|---|---|
| `presence:user_online` | `{ userId, lastSeenAt }` |
| `presence:user_offline` | `{ userId, lastSeenAt }` |
| `presence:bulk_status` | `{ statuses: [{ userId, status }] }` |

**Mecanismo:**
- Redis Sorted Set `presence:online` com score = timestamp
- Heartbeat a cada 30s
- Offline threshold: 60s sem heartbeat
- Multi-socket: Redis Set `socket:user:<userId>` rastreia todos os sockets de um usuario
- So emite offline quando TODOS os sockets desconectam

### Gasp Gateway (`src/socket/gasp.gateway.ts`)

**Servidor -> Cliente (emitidos pelo backend, nao pelo cliente):**
| Evento | Payload |
|---|---|
| `gasp:received` | `{ gasp }` |
| `gasp:viewed` | `{ gaspId, viewedAt }` |
| `gasp:reaction_received` | `{ reaction, gaspId }` |
| `gasp:expired` | `{ gaspId }` |

### Rooms do Socket.IO
- `user:<userId>` - Room pessoal (cada socket entra ao conectar)
- `conversation:<conversationId>` - Room da conversa (entra/sai via eventos)

---

## Background Jobs (BullMQ)

4 filas definidas em `src/jobs/queue.ts`:

### notifications
- **Worker**: `notification.worker.ts`
- **Job data**: `{ recipientId, type, title, body, data }`
- **Logica**: Checa se usuario esta online (Redis) -> se sim, skip push. Busca FCM tokens -> envia via `firebase-admin.messaging().sendEachForMulticast()`. Remove tokens invalidos.
- **Concurrency**: 10

### webhooks
- **Worker**: `webhook.worker.ts`
- **Job data**: `{ eventId, subscriptionId, url, secret, eventType, payload }`
- **Logica**: Assina payload com HMAC-SHA256, POST para URL com headers `X-Gasp-Signature`, `X-Gasp-Event`, `X-Gasp-Delivery`. Timeout 10s.
- **Retry**: 5 tentativas, backoff exponencial (base 60s)
- **Falha total**: Desativa subscription apos 5 falhas
- **Concurrency**: 5

### gasp-expiry
- **Worker**: `gasp-expiry.worker.ts`
- **Schedule**: A cada 60 segundos
- **Logica**: `UPDATE gasps SET status='expired' WHERE status='pending' AND expires_at < NOW()`
- **Concurrency**: 1

### cleanup
- **Worker**: `cleanup.worker.ts`
- **Schedule**: Diariamente as 3:00 AM (`0 3 * * *`)
- **Logica**: Remove webhook_events > 30 dias e gasps expirados > 7 dias
- **Concurrency**: 1

---

## Sistema de Webhooks

### Eventos Disponiveis
```
user.registered    user.updated
message.created
gasp.sent          gasp.viewed       gasp.expired
reaction.created
friend.requested   friend.accepted
```

### Fluxo de Entrega
1. Servico chama `webhooksService.emitWebhookEvent(eventType, payload)`
2. Busca subscriptions ativas que incluem o eventType
3. Para cada: cria registro em `webhook_events` + enfileira job no BullMQ
4. Worker assina com `HMAC-SHA256(body, subscription.secret)`
5. POST com headers:
   - `X-Gasp-Signature: sha256=<hmac>`
   - `X-Gasp-Event: <eventType>`
   - `X-Gasp-Delivery: <eventId>`

---

## Push Notifications

### Fluxo
1. Mensagem/gasp/reaction criado
2. Servico chama funcao em `notifications.service.ts` (ex: `notifyNewMessage()`)
3. Enfileira job `notifications` no BullMQ
4. Worker: checa se online (Redis zscore) -> skip se online
5. Busca FCM tokens da tabela `devices`
6. Envia via `firebase-admin.messaging().sendEachForMulticast()`
7. Remove tokens invalidos do banco

### Tipos de Notificacao
| Tipo | Titulo | Body |
|---|---|---|
| `new_message` | `<senderName>` | Preview da mensagem |
| `gasp_received` | `<senderName>` | "sent you a gasp" |
| `reaction_received` | `<reactorName>` | "reacted to your gasp" |
| `friend_request` | `<requesterName>` | "wants to be your friend" |
| `friend_accepted` | `<accepterName>` | "accepted your friend request" |

---

## Redis - Chaves Utilizadas

| Chave | Tipo | TTL | Uso |
|---|---|---|---|
| `presence:online` | Sorted Set | - | Score=timestamp, member=userId |
| `socket:user:<userId>` | Set | - | Set de socket IDs do usuario |
| `typing:<convId>:<userId>` | String | 5s | Indicador de digitacao |
| `bull:notifications:*` | BullMQ internal | - | Fila de notificacoes |
| `bull:webhooks:*` | BullMQ internal | - | Fila de webhooks |
| `bull:gasp-expiry:*` | BullMQ internal | - | Fila de expiracao |
| `bull:cleanup:*` | BullMQ internal | - | Fila de limpeza |

---

## Tratamento de Erros

Classes em `src/shared/errors.ts`:

| Classe | HTTP Status | Code |
|---|---|---|
| `AppError` | variavel | variavel |
| `NotFoundError` | 404 | NOT_FOUND |
| `UnauthorizedError` | 401 | UNAUTHORIZED |
| `ForbiddenError` | 403 | FORBIDDEN |
| `BadRequestError` | 400 | BAD_REQUEST |
| `ConflictError` | 409 | CONFLICT |
| `RateLimitError` | 429 | RATE_LIMIT |

Erros de Zod retornam `400 VALIDATION_ERROR` com `details` dos erros.

Formato de resposta de erro:
```json
{ "error": "NOT_FOUND", "message": "User not found" }
```

---

## Rate Limiting

Configurado em `src/shared/rate-limit.ts`:
- **Global**: 100 req/min por usuario (ou por IP se nao autenticado)
- **Auth endpoints**: 10 req/min
- **Message sending**: 30 req/min

---

## Comandos

```bash
npm run dev          # Inicia servidor com hot reload (tsx watch)
npm run build        # Compila TypeScript para dist/
npm run start        # Inicia em producao (node dist/index.js)
npm run db:generate  # Gera migracao SQL a partir do schema
npm run db:migrate   # Roda migracoes pendentes
npm run db:push      # Sincroniza schema direto no banco (dev)
npm run db:studio    # Abre Drizzle Studio (GUI do banco)
npm run db:seed      # Roda seed de dados (dev)
npm run test         # Roda testes (Vitest watch)
npm run test:run     # Roda testes uma vez
npm run typecheck    # Verifica tipos sem compilar
```

---

## Padrao de Modulos

Cada modulo em `src/modules/<nome>/` segue o padrao:

```
<nome>.schemas.ts   # Zod schemas para validacao de input
<nome>.service.ts   # Logica de negocio (acesso ao banco, Redis, etc.)
<nome>.routes.ts    # Rotas Fastify (chama service, retorna resposta)
```

- Routes registram `authMiddleware` via `app.addHook('preHandler', authMiddleware)`
- Routes fazem `schema.parse(request.body)` para validar input
- Services fazem queries Drizzle e retornam dados
- Services lancam erros custom (NotFoundError, etc.) que o error handler global captura

---

## Gotchas e Decisoes Tecnicas

1. **BullMQ + ioredis**: BullMQ embarca sua propria versao do ioredis. Passar a instancia ioredis do projeto causa conflito de tipos. Solucao: passar `{ url: env.REDIS_URL }` em vez da instancia Redis.

2. **@fastify/jwt type augmentation**: Declarar `FastifyJWT` interface no modulo `@fastify/jwt`, NAO em `FastifyRequest`. Isso permite `request.user.userId` funcionar com tipagem correta.

3. **firebase-admin exports**: Precisam de type annotations explicitas (`admin.auth.Auth`, `admin.messaging.Messaging`) para evitar erro TS2742.

4. **drizzle-kit vs .js extensions**: O drizzle-kit usa CommonJS internamente e nao resolve `.js` extensions nos imports TypeScript. Os arquivos em `src/db/schema/` usam imports sem extensao (ex: `from './users'` em vez de `from './users.js'`). O resto do projeto usa `.js`.

5. **Firebase credentials**: `FIREBASE_PRIVATE_KEY` deve ser a chave PEM do service account (comeca com `-----BEGIN PRIVATE KEY-----`), NAO a API key do Firebase. O `firebase.ts` tem fallback gracioso se a chave nao estiver configurada.

6. **Socket auth**: O `@fastify/jwt` so funciona no contexto HTTP. Para Socket.IO, usamos `jsonwebtoken.verify()` diretamente com o mesmo `JWT_SECRET`.

7. **Presence multi-device**: Um usuario pode ter multiplos sockets (multiplos dispositivos). O Redis Set `socket:user:<userId>` rastreia todos. So marca offline quando o Set fica vazio.

---

## Dependencias Principais (package.json)

```
fastify, @fastify/cors, @fastify/helmet, @fastify/rate-limit, @fastify/compress, @fastify/jwt
socket.io, @socket.io/redis-adapter
drizzle-orm, postgres (driver)
ioredis
bullmq
firebase-admin
zod
@paralleldrive/cuid2
pino, pino-pretty
dotenv
```

Dev: `typescript, tsx, drizzle-kit, vitest, @types/node`

---

## Deploy

### Railway (MVP)
- 1 servico: API + Socket.IO + Workers (512MB RAM)
- PostgreSQL gerenciado
- Redis gerenciado (ou Upstash)
- Custo: ~$5-10/mes

### Escala futura
- 10K users: Separar workers em servico dedicado
- 50K users: Horizontal scaling com Redis adapter para Socket.IO
- 100K+: Particionamento de mensagens, read replicas
