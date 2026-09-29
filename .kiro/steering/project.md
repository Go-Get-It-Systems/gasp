# GASP — Project Steering

## O que é o GASP

GASP é um app mobile de troca de mídia efêmera entre amigos (similar ao Snapchat), construído com **Expo / React Native** no frontend e **Fastify + Drizzle ORM + PostgreSQL** no backend. O nome da feature central é "Gasp" — um vídeo ou imagem enviado de um usuário para outro que precisa ser segurado para revelar e pode ser respondido com uma reação em vídeo (split-screen).

---

## Stack

### Frontend (`d:\gasp-main`)
- **Expo SDK 54** + **React Native 0.81** + **expo-router 6** (file-based routing)
- **React 19**, **TypeScript 5.9**
- **TanStack React Query v5** — cache e fetch de dados
- **Zustand v5** — estado global
- **expo-video** — playback de vídeo
- **expo-camera** — gravação de reações
- **expo-image** — imagens otimizadas
- **expo-image-picker** — galeria para campanhas
- **Firebase Auth** (`@react-native-firebase/auth`) — autenticação por telefone (SMS)
- **Firebase Storage** (via `services/storage.ts`) — upload de mídia
- **Socket.IO client** — notificações em tempo real
- **Zod** — validação de schemas
- **lucide-react-native** — ícones
- **react-native-reanimated 4** + **react-native-gesture-handler** — animações e gestos
- **i18next** — internacionalização (PT-BR default, EN disponível)

### Backend (`C:\Users\erick.ERIKHENRIQUE\Downloads\Projetos\GASP\gasp-backend-main`)
- **Fastify** + **TypeScript** + **tsx watch** (dev)
- **Drizzle ORM** + **PostgreSQL**
- **Vitest** — testes unitários
- **BullMQ** — filas (parcialmente implementado)
- **Sentry** — error tracking

---

## Variáveis de ambiente

**Frontend** (`d:\gasp-main\.env`):
```
EXPO_PUBLIC_API_URL=http://192.168.1.2:3000
```

**Backend** (`.env` no diretório do backend):
```
BUSINESS_STUDIO_ENABLED=true
BUSINESS_STUDIO_ALLOWED_WORKSPACE_IDS=<id>
BUSINESS_STUDIO_FOLLOWER_CAP=100
```

---

## Estrutura de rotas do app

```
app/
  _layout.tsx              — root layout, providers (QueryClient, GestureHandler)
  index.tsx                — redirect para auth ou tabs
  (auth)/                  — fluxo de login (phone → SMS → perfil)
  (tabs)/                  — tab bar principal
    _layout.tsx            — CustomTabBar (5 tabs: Discover, Camera, Gasps, Studio/Chat, Profile)
    camera.tsx             — câmera principal (gravar gasp)
    discover.tsx           — descoberta de usuários e empresas
    chat.tsx               — chat (apenas contas pessoais)
    studio.tsx             — Business Studio (apenas contas business) — 3 sub-tabs: Overview, Reactions, Metrics
    profile.tsx            — perfil do usuário logado
    inbox.tsx              — inbox de gasps recebidos
  (modals)/                — modais empilhados sobre as tabs
    business-profile.tsx   — perfil público de empresa (todos os usuários)
    campaign-composer.tsx  — criar e publicar campanha (apenas owner)
    campaign-reaction-viewer.tsx — gravar reação a campanha (HoldToView + split-screen)
    campaign-reaction-full.tsx   — visualizar reação em fullscreen split-screen
    view-gasp.tsx          — visualizar gasp recebido
    reaction-composer.tsx  — gravar reação a gasp pessoal
    friend-profile.tsx     — perfil de amigo
    send-gasp.tsx          — enviar gasp
    settings.tsx + settings-*.tsx — configurações
    product-updates.tsx    — novidades do produto
  (business)/              — rotas owner-only do Studio
    campaigns.tsx          — listar/gerenciar campanhas
    overview.tsx           — visão geral do workspace
    workspace.tsx          — configurações do workspace
  chat/[id].tsx            — tela de chat individual
```

---

## Stores Zustand

| Store | Responsabilidade |
|---|---|
| `authStore` | usuário autenticado, token, accountType |
| `businessStore` | `activeWorkspace`, `businessQueryKeys` |
| `cameraStore` | `campaignMode`, `reactionTarget` (para abrir câmera em modo reação) |
| `appStore` | estado global do app (online, etc.) |
| `chatStore` | conversas abertas |
| `gaspStore` | gasps em trânsito |
| `inboxStore` | dados do inbox |
| `notificationStore` | notificações push |
| `mediaCacheStore` | cache de mídia |

---

## Feature: Business Studio

### Conceito
Contas do tipo `business` têm acesso ao Studio — um painel para publicar campanhas de vídeo/imagem para seus seguidores, ver reações e métricas de entrega.

### Tipos de conta
- `personal` — usuário normal: pode enviar gasps, reagir a gasps, seguir empresas, reagir a campanhas
- `business` — conta empresa: acesso ao Studio, publica campanhas, não pode seguir usuários pessoais, seguidores recebem campanhas

### Regras de follow
- Usuário pessoal pode **seguir** empresas (botão "Follow")
- Usuário pessoal pode **add** outros usuários pessoais (botão "Add")
- Conta business pode seguir outras empresas e add usuários pessoais
- No Discover: empresas mostram "Follow/Following", pessoas mostram "Add"

### Fluxo de campanha
1. Owner abre `campaign-composer.tsx` → escolhe mídia da galeria → faz upload para Firebase Storage (`type: 'campaigns'`) → cria draft → publica
2. Backend em `publishCampaign`: insere `campaign_deliveries` para todos os followers ativos → status `queued` → imediatamente `delivered`
3. Follower abre perfil da empresa → vê campanha com botão `⚡ React`
4. Tap em React → abre `campaign-reaction-viewer` com `workspaceId`, `campaignId`, `mediaUri` nos params
5. Follower grava reação (HoldToView + front camera) → upload → `submitCampaignReaction` → volta ao perfil
6. Owner abre Studio → aba Reactions → vê a reação

### Endpoints principais (backend)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/businesses/mine` | workspaces do owner logado |
| GET | `/businesses/:handle` | perfil público por handle |
| GET | `/businesses/:id/overview` | visão geral (owner only) |
| GET | `/businesses/:id/metrics` | métricas (owner only) |
| GET | `/businesses/:id/campaigns` | lista campanhas (owner only) |
| POST | `/businesses/:id/campaigns` | criar campanha draft |
| POST | `/businesses/:id/campaigns/:cid/publish` | publicar → fan-out deliveries |
| DELETE | `/businesses/:id/campaigns/:cid` | excluir campanha |
| GET | `/businesses/by-handle/:handle/campaigns` | campanhas públicas por handle |
| GET | `/businesses/by-handle/:handle/reactions` | reactions por handle |
| GET | `/businesses/by-handle/:handle/reactions/pinned` | reactions fixadas |
| GET | `/businesses/by-handle/:handle/follow-status` | status de follow por handle |
| POST | `/businesses/:id/follow` | seguir workspace |
| DELETE | `/businesses/:id/follow` | deixar de seguir |
| GET | `/businesses/:id/reactions` | reactions do workspace (owner) |
| POST | `/businesses/:id/reactions` | submeter reaction (followers only) |
| POST | `/businesses/:id/reactions/:rid/pin` | fixar reaction (owner, max 6) |
| DELETE | `/businesses/:id/reactions/:rid/pin` | desafixar reaction |
| PATCH | `/businesses/:id/campaigns/:cid/delivery` | marcar aberto/visto |

### Banco de dados (tabelas Business Studio)

```
business_workspaces    — workspace da empresa (id, handle, displayName, followerCount...)
business_members       — membros/owners do workspace
business_followers     — seguidores (isActive, blockedAt, explicit, idempotent, independent)
business_campaigns     — campanhas (state: draft|publishing|live|failed|closed, mediaUrl)
campaign_deliveries    — entregas por follower (status: queued|delivered|failed|opened|viewed)
campaign_reactions     — vídeos de reação dos followers (isPinned, pinnedAt, pinnedOrder)
```

### Migrations aplicadas
- `0005` — schema base business studio
- `0006` — business broadcast (deliveries, campaigns)
- `0007` — follow enhancements
- `0008` — business_followers.blocked_at, is_active
- `0009` — campaign_reactions.is_pinned, pinned_at, pinned_order

### Query keys (frontend)

```ts
businessQueryKeys = {
  mine:          () => ['businesses', 'mine'],
  overview:      (wsId) => ['businesses', wsId, 'overview'],
  campaigns:     (wsId) => ['businesses', wsId, 'campaigns'],
  reactions:     (wsId) => ['businesses', wsId, 'reactions'],
  metrics:       (wsId) => ['businesses', wsId, 'metrics'],
  followStatus:  (wsId) => ['businesses', wsId, 'follow'],
  publicCampaigns: (wsId) => ['businesses', wsId, 'campaigns', 'public'],
}
// Pinned reactions (não está no businessQueryKeys):
['businesses', workspaceId, 'pinned-reactions']
// Public by-handle queries:
['businesses', 'handle', handle, 'campaigns']
['businesses', 'handle', handle, 'reactions']
['businesses', 'handle', handle, 'pinned-reactions']
```

### Featured Reactions (fixadas)
- Owner pode fixar até **6** reações via botão Pin no Studio → aba Reactions
- Fixadas aparecem no Overview do Studio (`FeaturedReactionsGrid`) e no perfil público da empresa (antes das tabs)
- SQL de reordenação usa subquery Postgres (não MySQL INNER JOIN)

---

## Feature: Gasp pessoal (core)

### Fluxo
1. Usuário grava gasp na câmera → upload para Firebase → envia para amigo(s)
2. Destinatário recebe no Inbox → segura para revelar (`HoldToView`) → vê o gasp
3. Pode reagir: grava vídeo de reação → upload → `submitReaction` → split-screen no chat

### Componentes principais
- `HoldToView` — revela conteúdo enquanto segura
- `ReactionCapture` — câmera front em PiP durante a revelação
- `ReactionPreview` — preview split-screen antes de enviar
- `ReactionComposite` — layout split-screen (45% reação / 55% original)
- `ReactionPlaybackModal` — visualização fullscreen de reação no chat

---

## Upload de mídia

Todos os uploads passam por `services/uploadQueue.ts` → `uploadWithRetry()`.

**Tipos permitidos** (`services/storage.ts`):
```ts
type MediaType = 'gasps' | 'reactions' | 'avatars' | 'composites' | 'campaigns'
```

O backend (`uploads.service.ts`) valida o campo `type` no multipart — se não for um dos valores acima, retorna 400.

---

## Navegação — regras importantes

- Modais fullscreen (`campaign-reaction-viewer`, `campaign-reaction-full`) usam `presentation: 'fullScreenModal'` no `(modals)/_layout.tsx`
- Para fechar esses modais sem fechar os modais abaixo na pilha: usar `router.dismiss()` **não** `router.back()` e **não** `router.dismissAll()`
- `router.back()` em fullScreenModal fecha toda a pilha de modais
- `router.dismissAll()` fecha todos os modals (nunca usar no viewer)

---

## CustomTabBar

- 5 tabs: Discover, Camera, Gasps, **Studio** (business) / **Chat** (personal), Profile
- Tab bar é **escondida** quando `cameraStore.campaignMode === true` ou `cameraStore.reactionTarget !== null`
- Aba "Metrics" foi removida do tab bar — está dentro do Studio como sub-tab

---

## Regras de UI / negócio

- Todo o app em **inglês**
- Apenas followers podem reagir a campanhas (`⚡ React` só aparece se `isFollowing && campaign.state === 'live'`)
- Owner não vê o botão Follow no próprio perfil
- Contas business no Discover mostram Follow/Following (não Add)
- `accountType` de um usuário deve ser `'business'` no banco para acessar o Studio (script: `npx tsx src/db/set-business-account.ts <username>`)
- Máximo 6 reactions fixadas por workspace

---

## Configuração de desenvolvimento

**Rodar backend:**
```bash
cd C:\Users\erick.ERIKHENRIQUE\Downloads\Projetos\GASP\gasp-backend-main
npm run dev   # tsx watch src/index.ts
```

**Rodar frontend:**
```bash
cd d:\gasp-main
npx expo start
```

**Aplicar migration manual:**
```bash
cd C:\Users\erick.ERIKHENRIQUE\Downloads\Projetos\GASP\gasp-backend-main
npx tsx src/db/run-migration-0009.ts
```

**Verificar TypeScript:**
```bash
# Frontend
cd d:\gasp-main && npx tsc --noEmit --skipLibCheck

# Backend
cd C:\Users\erick.ERIKHENRIQUE\Downloads\Projetos\GASP\gasp-backend-main && npx tsc --noEmit --skipLibCheck
```

**Rodar testes do backend:**
```bash
cd C:\Users\erick.ERIKHENRIQUE\Downloads\Projetos\GASP\gasp-backend-main
npx vitest run src/modules/businesses/
```

---

## Problemas conhecidos / decisões passadas

| Problema | Decisão |
|---|---|
| `router.back()` em fullScreenModal fecha todos os modals | Usar `router.dismiss()` |
| Upload de campanha salvava `file://` URI local | Corrigido: `uploadWithRetry` antes de `createCampaign` |
| `accountType` missing em recommended users | Corrigido: fofQuery agora inclui `accountType` no SELECT e groupBy |
| `campaign_reactions.is_pinned` não existia | Migration 0009 aplicada |
| SQL de reordenação de pin usava syntax MySQL | Corrigido para Postgres subquery |
| `staleTime` alto + `enabled: activeTab === 'reactions'` impedia reactions de aparecer | Corrigido: `staleTime: 0`, `gcTime: 0`, `enabled: !!workspaceId` |
| `submitCampaignReaction` não validava `type: 'campaigns'` no upload | Corrigido: adicionado `'campaigns'` ao `ALLOWED_MEDIA_TYPES` no backend |
| Rate limit 429 em desenvolvimento | Aumentado para 1000/min em dev |
