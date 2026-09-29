# GASP — E2E Test Strategy

## 1. Escolha da Ferramenta: Maestro

### Por que Maestro e não Detox?

| Critério | Maestro | Detox |
|---|---|---|
| **Suporte a Expo Go / Dev Build** | ✅ Nativo — funciona via Expo Dev Build sem ejeção | ⚠️ Requer ejeção ou prebuild manual; não roda no Expo Go |
| **Setup** | `brew install maestro` + 1 arquivo YAML | Instalar Jest, `detox-cli`, configurar `jest-circus`, editar `app.json` e `build.gradle` / `Podfile` |
| **Linguagem dos testes** | YAML declarativo | JavaScript/TypeScript + API imperativa |
| **Seletores de acessibilidade** | `accessibilityLabel` e `id` funcionam out-of-the-box no iOS e Android | Também suportados, mas exigem `testID` nos componentes nativos para confiabilidade |
| **Gravação/replay de fluxos** | `maestro studio` — grava interações em tempo real | Não possui |
| **Velocidade de CI** | Paralelo nativo com `maestro cloud` | Requer matriz de build customizada |
| **Maturidade com RN 0.81 / Expo SDK 54** | Ativamente mantido para versões recentes | Requer testar compatibilidade a cada upgrade |
| **Gestos complexos (HoldToView)** | `longPressOn` com `duration` configurável | `longPress` equivalente, mas frágil com Reanimated 4 |

**Decisão: Maestro** é a escolha certa para este projeto porque o GASP usa Expo SDK 54 com Expo Dev Builds, Reanimated 4 e gestos customizados (`HoldToView`, `useHoldGesture`). Maestro opera na camada de acessibilidade do OS, o que o torna agnóstico à implementação interna do Reanimated, enquanto Detox opera na camada JS e pode sofrer timeouts com animações longas.

---

## 2. Pré-requisitos

```bash
# Instalar Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash
# ou no macOS:
brew tap mobile-dev-inc/tap
brew install maestro

# Verificar instalação
maestro --version   # >= 1.38.0 recomendado para Expo SDK 54

# Build de desenvolvimento (obrigatório — Maestro não suporta Expo Go)
cd d:\gasp-main
npx expo prebuild --platform android
# ou gerar o .apk de dev
npx eas build --profile development --platform android --local
```

---

## 3. Configuração de Ambiente de Teste

Os testes assumem dois usuários pré-registrados no ambiente de staging:

| Variável | Descrição |
|---|---|
| `GASP_PERSONAL_PHONE` | Número do usuário pessoal (ex: +5511999990001) |
| `GASP_PERSONAL_OTP` | OTP hardcoded do Firebase Auth emulator |
| `GASP_BUSINESS_PHONE` | Número do usuário business |
| `GASP_BUSINESS_OTP` | OTP do usuário business |
| `GASP_FRIEND_USERNAME` | Username do amigo já adicionado ao personal |
| `GASP_WORKSPACE_HANDLE` | Handle do workspace business |

Configurar em `e2e/config/.env.test` (não commitado — listado no `.gitignore`).

---

## 4. Cenários de Teste — Gherkin

### Flow 1: Usuário Personal — Envio de Gasp

```gherkin
Feature: Envio de Gasp pessoal
  Como um usuário pessoal do GASP
  Eu quero tirar uma foto e enviá-la para um amigo
  Para que ele receba meu momento efêmero no inbox

  Background:
    Dado que o app GASP está instalado e em primeiro plano
    E o backend de staging está acessível

  Scenario: Auth Gate — login com telefone e OTP
    Dado que o usuário não está autenticado
    Quando o app carrega a tela de boas-vindas
    Então eu vejo o botão "Get started with phone"
    Quando eu toco no botão de telefone
    Então a tela de inserção de número aparece
    Quando eu insiro o número "+5511999990001"
    E toco em "Continue"
    Então vejo a tela de inserção de OTP de 6 dígitos
    Quando eu insiro o código "123456"
    Então o app navega para a aba Camera

  Scenario: Tirar foto e navegar para o modal de envio
    Dado que estou autenticado e na aba Camera
    E tenho permissão de câmera concedida
    Quando eu toco no botão de captura (shutter)
    Então o app processa a foto
    E abre o modal "Send to"

  Scenario: Selecionar amigo e enviar gasp
    Dado que estou no modal "Send to"
    E a lista de amigos está carregada com pelo menos 1 amigo
    Quando eu toco no primeiro amigo da lista para selecioná-lo
    Então o checkbox do amigo fica marcado
    E o botão "Send to 1 friend" aparece na parte inferior
    Quando eu toco em "Send to 1 friend"
    Então vejo o indicador de upload com progresso
    E após o upload concluir, o modal fecha

  Scenario: Ativar replay antes de enviar
    Dado que estou no modal "Send to" com um amigo selecionado
    Quando eu ativo o toggle "Allow recipient to replay this gasp"
    Então o toggle muda para o estado "Replayable"
    E ao enviar, o gasp é marcado como replayable=true

  Scenario: Buscar amigo pelo nome
    Dado que estou no modal "Send to" com vários amigos
    Quando eu digito o nome do amigo na barra de busca
    Então a lista filtra mostrando apenas amigos cujo nome contém o texto digitado

  Scenario: Selecionar todos os amigos
    Dado que estou no modal "Send to" com múltiplos amigos
    Quando eu toco em "Select all"
    Então todos os amigos ficam selecionados
    E o botão de envio mostra "Send to N friends"
    Quando eu toco em "Deselect all"
    Então todos os amigos são desmarcados
```

---

### Flow 2: Usuário Business — Campanha → Reaction → Pin → Métricas

```gherkin
Feature: Ciclo completo de campanha business
  Como proprietário de uma conta business no GASP
  Eu quero criar e publicar campanhas, ver reações dos seguidores
  E fixar as melhores reações para destaque no perfil

  Background:
    Dado que existe um workspace business ativo com handle "@acme"
    E existe pelo menos 1 usuário personal seguindo "@acme"
    E ambos os usuários estão autenticados em seus respectivos dispositivos/sessões

  Scenario: Business cria e publica campanha
    Dado que estou autenticado como usuário business na aba Studio
    Quando eu toco em "New Campaign" (ou no botão de create na overview)
    Então o modal "New Campaign" abre
    Quando eu toco na área de seleção de mídia
    E seleciono um vídeo da galeria
    Então o preview do vídeo aparece no compositor
    Quando eu preencho o título com "Summer Drop 2026"
    E toco no botão "Publish Campaign"
    Então vejo o indicador "Uploading media…"
    E em seguida "Publishing…"
    E a tela de sucesso "Campaign published!" aparece
    Quando eu toco em "Back to Studio"
    Então retorno à aba Overview do Studio
    E vejo o card "Active campaign" com o título "Summer Drop 2026"

  Scenario: Personal acessa perfil business e reage à campanha
    Dado que estou autenticado como usuário personal
    E estou na tela de perfil da empresa "@acme" (via Discover)
    E a campanha "Summer Drop 2026" está com estado "live"
    E eu sigo "@acme"
    Quando eu toco no botão "⚡ React" da campanha
    Então o modal campaign-reaction-viewer abre
    E vejo a mídia da campanha
    Quando eu pressiono e seguro a área de visualização
    Então a câmera frontal ativa e inicia o countdown
    E após o countdown, a mídia da campanha é revelada
    E a gravação de reação começa automaticamente
    Quando eu solto o toque
    Então a gravação para
    E o preview split-screen aparece
    Quando eu toco no botão "Send" no preview
    Então vejo o indicador de upload
    E após o envio, vejo o alerta "Reaction sent!"
    Quando eu toco em "Done"
    Então retorno ao perfil business

  Scenario: Business vê reação no Studio e a fixa como destaque
    Dado que estou autenticado como usuário business na aba Studio
    Quando eu navego para a aba "Reactions"
    Então vejo a reação enviada pelo usuário personal na lista
    E o card exibe o nome do usuário e o título da campanha
    Quando eu toco no botão "Pin to featured" da reação
    Então o botão muda para "Unpin from featured"
    E a reação aparece na seção "Featured reactions" da aba Overview

  Scenario: Business verifica métricas após campanha
    Dado que estou autenticado como usuário business na aba Studio
    Quando eu navego para a aba "Metrics"
    Então os cards de resumo mostram valores maiores que zero para Delivered e Viewed
    E a linha da campanha "Summer Drop 2026" exibe engagement rate > 0%
    E o estado da campanha aparece como "LIVE" ou "CLOSED"

  Scenario: Limite de 6 reações fixadas
    Dado que o workspace já tem 6 reações fixadas
    Quando eu tento fixar uma 7ª reação
    Então vejo o alerta "You can feature up to 6 reactions. Unpin one first."
    E a contagem de reações fixadas permanece em 6

  Scenario: Personal não vê botão React sem seguir
    Dado que estou autenticado como usuário personal
    E NÃO sigo "@acme"
    Quando acesso o perfil de "@acme" com campanha live
    Então o botão "⚡ React" NÃO aparece na campanha
```

---

## 5. Casos de Borda (Edge Cases)

### Edge Case 1 — Falha no upload via `uploadWithRetry`

**Cenário:** O dispositivo perde conexão durante o upload do gasp no `send-gasp.tsx`.

**O que testar:**
- O modal de erro com ícone `WifiOff` aparece com o título de network error
- O botão "Try again" (i18n: `common.tryAgain`) está visível
- Ao tocar em "Try again", o upload é retentado **sem recomprimir a mídia** (usando `uploadedMediaRef.current`)
- O progresso é resetado para 0% e sobe novamente
- Se a segunda tentativa tiver sucesso, o modal fecha normalmente

**Técnica de simulação:** `maestro` + interceptação de rede via proxy (mitmproxy) ou usando a tab Network Throttling do Emulator/Simulator para simular perda de pacotes durante o upload.

### Edge Case 2 — Perda de conexão Socket.IO durante inbox sync

**Cenário:** O Socket.IO se desconecta enquanto o usuário está no modal `send-gasp`, resultando em lista de amigos vazia (`inboxStore.friends === []`).

**O que testar:**
- A lista de amigos exibe estado vazio (tela em branco ou mensagem de lista vazia)
- O botão "Send to" não aparece (nenhum amigo selecionável)
- Quando a conexão é restaurada e o Socket.IO reconnects, a lista re-popula automaticamente
- O `setBulkOnlineStatus` do `inboxStore` é chamado e os status online refletem a realidade

**Técnica de simulação:** Modo avião do emulador durante a abertura do modal + restauração de conexão.

### Edge Case 3 — Rate limit 429 no envio de gasp

**Cenário:** O servidor retorna 429 para a mutation `POST /gasps/batch`.

**O que testar:**
- O modal de erro com ícone `Clock` e tipo `rateLimit` aparece
- O botão "Try again" está presente (pois `canRetry === true` para rate limit)
- O gasp já foi uploadado para Firebase (`uploadedMediaRef.current !== null`), então o retry **não** re-faz o upload
- O retry chama diretamente `submitMetadata(downloadUrl)` sem passar pelo compress/upload
- Após o retry bem-sucedido (servidor volta 200), o modal fecha e a UI retorna à câmera

**Técnica de simulação:** Mock do endpoint `/gasps/batch` via WireMock/MSW no backend de staging para retornar 429 na primeira chamada e 200 na segunda.

---

## 6. Estrutura de Arquivos dos Testes

```
e2e/
├── STRATEGY.md              ← Este arquivo
├── README.md                ← Guia de execução
├── config/
│   ├── .env.test.example    ← Template de variáveis (sem valores reais)
│   └── maestro.config.yaml  ← Configuração global Maestro
├── flows/
│   ├── 00_auth_personal.yaml          ← Auth gate — usuário personal
│   ├── 00_auth_business.yaml          ← Auth gate — usuário business
│   ├── 01_camera_capture_send.yaml    ← Câmera + envio de gasp
│   └── 02_business_campaign_cycle.yaml ← Campanha → reaction → pin → metrics
└── edge-cases/
    ├── 03_upload_failure_retry.yaml   ← Falha no uploadWithRetry
    ├── 04_socketio_disconnect.yaml    ← Perda de conexão no inbox
    └── 05_rate_limit_retry.yaml       ← 429 no POST /gasps/batch
```
