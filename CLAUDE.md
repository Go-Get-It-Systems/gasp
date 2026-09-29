# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

GASP is a React Native mobile app (Expo 54) — an ephemeral media platform (Snapchat-style) with real-time chat, disappearing photos ("gasps"), and video reactions. This is the frontend; the backend lives in `../gasp-backend/`.

## Commands

```bash
npm install                  # Install dependencies (use --legacy-peer-deps if needed)
npx expo start               # Dev server (Expo Go or dev client)
expo run:android             # Build & run on Android
expo run:ios                 # Build & run on iOS
npm run lint                 # ESLint (expo lint)
npm run test                 # Jest (88 tests)
npm run test:watch           # Jest watch mode
```

Set `EXPO_PUBLIC_API_URL` to point at the backend (defaults to `http://localhost:3000`).

## Stack

Expo 54 + React Native 0.81 + TypeScript (strict) + NativeWind v4 (Tailwind) + Zustand 5 + React Query (TanStack) + Zod + Socket.IO client + Axios + React Native Reanimated + Lucide icons + Sentry + i18next

---

## Architecture Rules (MANDATORY)

**These rules are NON-NEGOTIABLE. Follow them for ALL new code. Do NOT deviate without explicit user approval.**

### Rule 1: React Query for ALL server state — NEVER fetch in stores

- ALL data from the backend (lists, details, stats) MUST go through React Query hooks in `hooks/queries/`.
- Zustand stores are for **UI-only state**: typing indicators, online status, viewed tracking, hold gesture, camera state, search queries.
- **NEVER** add `fetch*`, `load*`, or `isLoading` to a Zustand store. Use `useQuery`/`useMutation` instead.
- New data domain? Create a new hook file in `hooks/queries/` following the existing pattern.
- Use `queryKeys` from `services/queryKeys.ts` for ALL cache keys. Add new keys there.

### Rule 2: Zod schemas are the SINGLE source of truth for types

- ALL domain types (User, Message, Gasp, etc.) MUST be defined as Zod schemas in `services/api/schemas/`.
- Types are derived via `z.infer<typeof Schema>`. NEVER create manual `interface`/`type` in `types/` files.
- API service functions MUST validate responses with `validateResponse(schema, data, context)` (graceful degradation via safeParse).
- New API endpoint? Add schema first, derive type, then write the service function.

### Rule 3: Components must be small, single-purpose (<200 lines)

- No component file should exceed ~200 lines. If it does, decompose it.
- Use the **dispatcher pattern** for components that render different variants (see MessageBubble → TextBubble/GaspBubble/ReactionBubble).
- Extract complex state logic into custom hooks (see `useTextOverlay` extracted from camera-preview).
- Shared styles between sibling components go in a shared `*Styles.ts` file (see `chatMediaStyles.ts`).

### Rule 4: Typed navigation — no raw router.push with params

- Use typed navigation functions from `services/navigation.ts` for ALL routes that accept params.
- New param-heavy route? Add a typed function to `services/navigation.ts`.
- Simple routes without params (e.g., `router.push('/(tabs)/camera')`) are fine as-is.

### Rule 5: Socket events → React Query cache for data, Zustand for UI

- Socket events that deliver DATA (new message, new gasp, gasp viewed/expired) MUST update React Query cache via `queryClient.setQueryData`.
- Socket events that deliver UI STATE (typing, presence online/offline) update Zustand stores.
- Use the singleton `queryClient` import from `@/lib/queryClient` (NOT `useQueryClient()` hook) in socket listeners.
- New socket event? Add handler in `hooks/useSocketListeners.ts` following the existing pattern.

### Rule 6: Error handling — ErrorBoundary + Sentry + QueryState

- All screens MUST be wrapped by ErrorBoundary (root layout covers this).
- All `catch` blocks MUST call `Sentry.captureException(e)` — NEVER empty catches.
- List screens MUST use `<QueryState>` wrapper with appropriate skeleton loaders.
- New list screen? Create a domain skeleton component and wrap with QueryState.

### Rule 7: Accessibility on ALL interactive elements

- Every `Pressable`, `TouchableOpacity`, and interactive element MUST have `accessibilityLabel`.
- Buttons: add `accessibilityRole="button"`.
- Tabs: add `accessibilityRole="tab"` + `accessibilityState={{ selected }}`.
- Images: add `accessibilityRole="image"`.
- Inputs: add `accessibilityLabel` + `accessibilityHint`.

### Rule 8: Uploads use uploadWithRetry

- ALL file uploads MUST go through `uploadWithRetry` from `services/uploadQueue.ts`.
- NEVER call `uploadMedia`/`uploadGasp` directly — always use the retry wrapper.
- Failed uploads are captured by Sentry automatically.

### Rule 9: User-facing strings in locale files

- New user-facing strings SHOULD be added to `locales/en.json` and referenced via `useTranslation()`.
- At minimum, error messages and empty states MUST use i18n.
- Keep keys organized by screen/domain (e.g., `chat.startConversation`, `inbox.noGasps`).

### Rule 10: _layout.tsx structure — providers vs hooks

- `RootLayout` contains ONLY providers (ErrorBoundary, QueryClientProvider).
- `RootContent` contains ALL hooks that need provider context (useSocketListeners, useOnlineStatus, etc.).
- NEVER add hooks that use React Query in `RootLayout` — they must go in `RootContent`.

---

## Architecture

### Routing (Expo Router, file-based)

- `app/index.tsx` — Auth gate: redirects to `/(auth)/welcome` or `/(tabs)/camera`
- `app/_layout.tsx` — Root layout: GestureHandlerRootView, auth initialization, splash screen, socket listeners
- `app/(auth)/` — Auth flow: welcome, phone-login, verify-code, create-profile
- `app/(tabs)/` — Main tabs: discover, **camera** (initial), inbox, chat, profile. Custom tab bar via `CustomTabBar`
- `app/(modals)/` — Modal screens: view-gasp, send-gasp, camera-preview, reaction-result, edit-profile, friend-profile, settings
- `app/chat/[id].tsx` — Individual chat conversation (not inside tabs)

### State Management (Zustand stores in `stores/`)

Each store is a standalone `create<T>()` call. Access outside React via `useXStore.getState()`.

Stores contain **UI/client state only**. Server state (friends, gasps, profile stats, etc.) is managed by React Query hooks in `hooks/queries/`.

| Store | Responsibility |
|-------|---------------|
| `authStore` | User, token, login/register/logout, session restore (`initializeAuth`) |
| `chatStore` | Conversations, messages (keyed by conversationId), typing indicators, socket emit wrappers |
| `gaspStore` | Pending/sent gasps, reactions, hold-to-view state, batch send |
| `inboxStore` | Friend list with online status, friend requests, search filtering |
| `cameraStore` | Camera facing, flash mode, captured URI |
| `appStore` | Onboarding state, device permissions |
| `mediaCacheStore` | Local media cache (downloaded gasp/reaction URIs) |

> `profileStore` was removed — profile stats are now fetched via the `useProfileStats` hook in `hooks/queries/useProfile.ts`.

### API Layer

- `services/api.ts` — Axios instance at `{API_URL}/api/v1`. Request interceptor injects JWT from authStore. Response interceptor auto-refreshes on 401.
- `services/api/*.ts` — Domain-specific API calls: auth, users, friends, conversations, messages, gasps, reactions.
- `services/api/schemas/` — Zod validation schemas: `user.schema.ts`, `chat.schema.ts`, `gasp.schema.ts`, `common.schema.ts`. Types are derived from these schemas (see Types section).
- `services/queryKeys.ts` — React Query key factory. All query keys centralized here.
- `services/navigation.ts` — Typed navigation helper functions wrapping `router` from Expo Router.
- `services/socket.ts` — Socket.IO singleton. Typed event emitters (`chatSendMessage`, `chatStartTyping`, etc.) and listener registrars (`onChatNewMessage`, `onGaspReceived`, etc.) that return cleanup functions.
- `services/storage.ts` — Media upload (gasps, reactions, avatars) via backend `POST /api/v1/uploads` (multipart). Backend streams the file to Firebase Storage with `firebase-admin` and returns `{ downloadUrl, storagePath }`.
- `hooks/queries/` — React Query hooks for server state:
  - `useFriends.ts` — friend list, friend requests
  - `useGasps.ts` — received/sent gasps
  - `useChat.ts` — conversation list, messages
  - `useProfile.ts` — user stats (`useProfileStats`), sent gasps grid

### Real-Time (Socket.IO)

`hooks/useSocketListeners.ts` is called once in the root layout. It registers all socket listeners and dispatches to Zustand stores. Events:
- **Chat**: `chat:new_message`, `chat:typing`, `chat:message_read`, `chat:conversation_updated`
- **Gasp**: `gasp:received`, `gasp:viewed`, `gasp:reaction_received`, `gasp:expired`
- **Presence**: `presence:user_online`, `presence:user_offline`, `presence:bulk_status`

### Auth Flow

1. Firebase Auth (phone SMS) via `@react-native-firebase/auth` (native module)
2. Firebase token sent to backend → backend returns its own JWT
3. JWT stored in `expo-secure-store` (via `utils/storage.ts`)
4. On app launch, `authStore.initializeAuth()` restores session from SecureStore, validates with `/users/me`, connects socket
5. Guest mode available (bypasses backend auth)

### Firebase

- **`@react-native-firebase/app` + `/auth`** — Native modules for phone SMS authentication.
- **No Firebase JS SDK in the client.** Storage uploads go through the backend (`POST /api/v1/uploads`), which uses `firebase-admin` server-side and returns a public download URL. This avoids the auth-state mismatch between native `@react-native-firebase/auth` and the JS SDK.

Project ID: `gasp-cab37`

## Styling

- **NativeWind v4** with Tailwind classes. Global CSS in `global.css`. This is the **default** for layout and styling.
- **Dark theme only** (background `#0A0A0F`, `userInterfaceStyle: "dark"` in app.json).
- Custom color tokens in `tailwind.config.js`: `bg`, `surface`, `primary`, `accent-pink/magenta/cyan`, `border`.
- Full color palette (including text, semantic, gradient definitions) in `constants/colors.ts`.
- Icons: `lucide-react-native`.
- **Use `StyleSheet.create` only when required**: animations (Reanimated), complex absolute positioning, or `BlurView` (which requires numeric styles). Otherwise prefer Tailwind classes.

## Key Patterns

- **Path alias**: `@/*` maps to project root. Always use `@/stores/authStore`, `@/services/api`, etc.
- **Typed routes**: `experiments.typedRoutes: true` in app.json. Expo Router generates route types.
- **React Compiler**: Enabled experimentally (`experiments.reactCompiler: true`).
- **New Architecture**: Enabled (`newArchEnabled: true`).
- **Cursor-based pagination**: Backend returns `{ data, nextCursor, hasMore }`. See `PaginatedResponse<T>` in `services/api.ts`.
- **Messages are stored newest-first** in chatStore (index 0 = newest) since FlatList is inverted.
- **Socket listener pattern**: Each `on*` function in `services/socket.ts` returns a cleanup function. `useSocketListeners` collects them all and calls them on unmount.
- **Component organization**: By domain — `components/ui/` (shared primitives), `components/auth/`, `components/camera/`, `components/chat/`, `components/gasp/`, `components/inbox/`, `components/profile/`, `components/discover/`, `components/navigation/`.
  - `components/chat/` contains: `MessageBubble` (dispatcher by type), `BubbleWrapper`, `TextBubble`, `GaspBubble`, `ReactionBubble`, `MediaBadge`, `DateSeparator`, `ChatInput`
  - `components/ui/InlineVideo.tsx` — standalone video player (used in gasp view and reactions)

## Types

Domain types are now **derived from Zod schemas** in `services/api/schemas/`:
- `services/api/schemas/user.schema.ts` — `User`, `Friend`, `OnlineStatus` and related Zod schemas
- `services/api/schemas/chat.schema.ts` — `Message`, `MessageType`, `Conversation` and related Zod schemas
- `services/api/schemas/gasp.schema.ts` — `Gasp`, `GaspStatus`, `Reaction`, `ApiGasp`, `ApiPendingGasp`, `ApiReaction` and related Zod schemas
- `services/api/schemas/common.schema.ts` — Shared primitive schemas (pagination, IDs, etc.)

`types/user.ts`, `types/chat.ts`, and `types/gasp.ts` have been deleted. The only remaining file in `types/` is:
- `types/navigation.ts` — Expo Router typed route params

Backend API types (`Api*` prefixed) are validated at the API boundary by Zod schemas and transformed into frontend types in services/hooks before reaching components.

## Known Gotchas

1. **Two Firebase packages**: `@react-native-firebase/*` for native auth, `firebase` JS SDK for Storage. Don't mix them.
2. **Expo prebuild required**: Native modules require a dev client — Expo Go won't work for full functionality.
3. **Socket listeners are global**: Registered once in `RootContent`, not per-screen. Individual screens should NOT register their own socket listeners.
4. **Token refresh race**: The Axios interceptor serializes concurrent 401 refreshes. Socket has its own token refresh in `connect_error`.
5. **`constants/colors.ts` vs `tailwind.config.js`**: Both define the color palette. Keep them in sync.
6. **`--legacy-peer-deps`**: Required for `npm install` due to Firebase peer dependency conflict.
7. **RootLayout vs RootContent**: Hooks using React Query MUST be in `RootContent` (inside QueryClientProvider), NEVER in `RootLayout`.
8. **useSocketListeners uses singleton queryClient**: Imports `queryClient` directly from `@/lib/queryClient`, NOT via `useQueryClient()` hook.
9. **gaspStore.markGaspViewed signature**: Accepts `(gaspId, imageUri?)` — pendingGasps data lives in React Query, not the store.
10. **Android ReactionBubble**: Reply strip JSX is fragile — NEVER change JSX structure, only styles. See `components/chat/ReactionBubble.tsx`.
11. **Discover error handling**: Treats API errors as empty state (recommendations are optional, don't block the screen).
