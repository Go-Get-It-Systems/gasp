# Reactotron — Debug em Tempo Real

Guia completo de setup e uso do Reactotron no projeto GASP.

---

## O que é o Reactotron

App desktop para debug de React Native. Conecta ao app em execução (simulador ou device físico) e exibe em tempo real:

- Logs do app
- Requests HTTP (Axios)
- Eventos do Socket.IO
- Erros capturados

---

## Instalação do App Desktop

Baixar o instalador para macOS Apple Silicon (M1/M2/M3):

**[Reactotron 3.11.0 — arm64 Mac](https://github.com/infinitered/reactotron/releases/download/reactotron-app%403.11.0/Reactotron-3.11.0-arm64-mac.zip)**

> Para Intel Mac, usar: `Reactotron-3.11.0-mac.zip`

---

## Como usar

### 1. Abrir o Reactotron antes do app
Sempre abra o Reactotron **primeiro**, depois rode o app.

### 2. Rodar o projeto
```bash
npx expo start
```

### 3. Conexão automática
O app conecta automaticamente ao Reactotron com o nome **"GASP"**. Isso funciona porque o `_layout.tsx` já carrega a config em modo dev:

```ts
if (__DEV__) {
  require('../reactotron.config');
}
```

> **Device físico**: funciona sem configuração adicional para iPhone na mesma rede Wi-Fi.

---

## MCP Server (integração com Kiro)

O Reactotron tem um servidor MCP que permite ao Kiro ler os logs diretamente, sem precisar copiar nada.

### Ativar o MCP no Reactotron
1. Abrir o Reactotron
2. Clicar no botão **MCP** no rodapé
3. Aguardar o ponto **verde** aparecer (servidor rodando na porta `4567`)

### Configuração no Kiro (já feita)
O arquivo `.kiro/settings/mcp.json` já está configurado:

```json
{
  "mcpServers": {
    "reactotron": {
      "url": "http://localhost:4567/mcp"
    }
  }
}
```

### Ordem correta ao iniciar
1. Abrir o **Reactotron**
2. Ativar o **MCP** (botão no rodapé → ponto verde)
3. Rodar o **app** no iPhone
4. Abrir o **Kiro**

### Verificar conexão
Digitar no chat do Kiro:
```
/mcp
```

---

## O que o Kiro consegue ver via MCP

| Dado | Descrição |
|------|-----------|
| Timeline | Todos os eventos em tempo real |
| Network Log | Requests e responses HTTP |
| Logs | Todos os `console.log` do app |
| Erros | Erros capturados com stack trace |

---

## Logs implementados no projeto

### Helper `console.tronLog`

Disponível globalmente via `reactotron.config.ts`:

```ts
console.tronLog.log('mensagem', { dados })    // ℹ️ info
console.tronLog.warn('mensagem', { dados })   // ⚠️ aviso
console.tronLog.error('mensagem', { dados })  // 🔴 erro (destaque)
console.tronLog.debug('mensagem', { dados })  // 🔵 debug
```

Os objetos aparecem expansíveis no Reactotron.

---

### Axios (`services/api.ts`)

| Evento | Log |
|--------|-----|
| Request | `API ▶ POST /gasps` + params/data |
| Response OK | `API ◀ 200 POST /gasps` + data |
| Response erro | `API ✖ 401 POST /gasps` + status/message |

---

### Upload Queue (`services/uploadQueue.ts`)

| Evento | Log |
|--------|-----|
| Arquivo na fila | `uploadQueue \| enqueue` + id/type/uri |
| Upload completo | `uploadQueue \| success` + id/type |
| Falha (max tentativas) | `uploadQueue \| failed` + id/type/uri |

---

### Auth Store (`stores/authStore.ts`)

| Evento | Log |
|--------|-----|
| Login | `authStore \| login success` + userId/username |
| Register | `authStore \| register success` + userId/username |
| Logout | `authStore \| logout` |
| Sessão restaurada | `authStore \| session restored` + userId/username |
| Silent refresh | `authStore \| silent refresh success` + userId |

---

### Socket.IO (`services/socket.ts`)

| Evento | Log |
|--------|-----|
| Conectado | `socket \| connected` + socket id |
| Desconectado | `socket \| disconnected` + reason |
| Erro de conexão | `socket \| connect_error` + message |
| Nova mensagem | `socket ◀ chat:new_message` + conversationId |
| Gasp recebido | `socket ◀ gasp:received` + gaspId/senderId |
| Gasp visto | `socket ◀ gasp:viewed` + gaspId |
| Reação recebida | `socket ◀ gasp:reaction_received` + gaspId |
| Status atualizado | `socket ◀ gasp:status_updated` + gaspId/status |

---

## Workflow de debug

Quando encontrar um bug:

1. Reproduzir a ação no iPhone
2. Olhar a Timeline do Reactotron
3. Falar para o Kiro: **"olha o Reactotron"** — ele lê tudo diretamente
4. Ou copiar o log/request relevante e colar no chat

Não é necessário saber em qual arquivo ou linha está o problema.
