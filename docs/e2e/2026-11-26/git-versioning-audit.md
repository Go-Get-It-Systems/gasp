# GASP — inventário Git e próxima composição

Consulta: 26 de novembro de 2026. Datas locais em Australia/Melbourne.

## Resultado e limites

- App: main local e main consultada ao vivo no GitHub coincidem em 584e3c3, de 12/10/2026. Última integração: reação enviada pelo chat marca o gasp como reacted.
- Prévia aprovada: codex/reaction-fullscreen-vertical, 1be1b23, de 23/10/2026, oito commits à frente de main. Essa branch não aparece nas 46 branches retornadas pela consulta remota. O backup codex/reaction-layout-before-fullscreen também permanece local.
- Os registros E2E de novembro e alterações de docs/backlog.md estão sem commit. Nenhuma alteração de código está pendente no app.
- Backend local: main em ea5bd05, de 23/10/2026, correção de retries e diagnósticos do job de expiração. Diretório de trabalho limpo. A principal remota foi confirmada no Egolite autenticado e coincide com a local.
- A conexão GitHub e o CLI seguem sem acesso válido ao backend, mas a sessão autenticada no Egolite permitiu concluir a leitura. Foram confirmadas 21 branches remotas, incluindo feat/composite-service na segunda página; nenhuma alteração posterior na main.
- Nenhuma branch foi excluída, renomeada, integrada ou publicada nesta auditoria.

## Autoria e segurança

- Histórico local atribui a Erik Henrique as pontas feat/business-studio-local (app) e backend-dev (backend), de 29/09/2026. A ponta backend-dev foi reconfirmada no GitHub via Egolite em 308f70b, com autoria ErickHen e apenas um commit no histórico.
- As duas pontas não possuem ancestral comum com suas respectivas main locais. Não integrar essas branches inteiras como forma de recuperar um ajuste isolado.
- O PR integrado do Business Studio descreve integração seletiva do trabalho existente. Histórico sem ancestral comum não significa que todas as funcionalidades estejam ausentes da main.
- Proteções de outubro já presentes no backend main: propriedade da reação/gasp (0918428), limites de download e execução (26f78e6), URLs apenas do próprio bucket (174d0f9), rate limit por cliente (8861772), bloqueio de webhooks para endereços internos (dcfab9a). Autor registrado: GabriellGimenes.
- Não foi localizada evidência suficiente para atribuir ao Erik uma atualização recente de segurança. A consulta remota confirmou o mesmo snapshot de setembro do Erik, sem evidência de atualização posterior nessa branch; isso não exclui trabalho em outro repositório ou ainda não publicado.

## Reorganização futura — apenas mapeamento

1. Preservar a branch da prévia e a referência anterior; decidir publicação e integração após revisão.
2. Branches marcadas como alcançáveis por main abaixo são candidatas a revisão futura, não autorização de exclusão. Verificar PR, worktrees e referências de recuperação antes de limpar.
3. Branches sem alcance por main exigem comparação de conteúdo; squash/cherry-pick podem integrar mudanças sem preservar ancestralidade.
4. Há worktrees registrados para outras frentes. Não remover branches ocupadas. O app também tem um registro de worktree temporário podável; apenas identificado.
5. Não misturar desenvolvimento legado dev/develop/qa, snapshots do Erik, protótipos e backups com a frente atual sem comparar conteúdo.

## Composição vertical — ponto de implementação

- A prévia usa original em cima e reação embaixo, 50/50, com cover, logo no canto inferior direito do painel original e divisor discreto.
- O cliente ainda solicita layout 1/3-2/3 em services/compositeService.ts. O backend só aceita esse valor e gera reaction à esquerda (360 px), gasp à direita (720 px), altura 1920 px.
- Portanto não basta trocar a aparência do player: o arquivo de vídeo já chega horizontalmente composto.
- Caminho proposto: adicionar um layout vertical explícito ao contrato, preservar o layout legado para clientes antigos, passar a seleção ao compositor e fazer a branch da prévia solicitar o novo layout após suporte no servidor.
- Preservar atraso de revelação, voz, marca d'água e controles de acesso. Validar montagem com FFmpeg real, foto/vídeo, antes/depois da revelação, ordem das metades e som.
- Vídeos já gerados permanecerão no formato antigo. A mudança vale para novas composições. Não houve implementação, deploy ou publicação desta mudança nesta auditoria.

## gasp — branches locais

| Branch | Último commit | Data | Autor | Alcançável por main |
|---|---|---|---|---|
| agent/business-broadcast-mvp-spec | 7948049 | 2026-08-18 10:11:23 +1000 | GabriellGimenes | não |
| backup/main-before-notification-merge-20260721 | 47624b1 | 2026-07-11 14:20:47 +1000 | GabriellGimenes | não |
| chore/backlog | 7ee6c9e | 2026-10-12 11:36:35 +1100 | GabriellGimenes | sim |
| codex/chat-inbox-mvp | 2a51dd5 | 2026-08-06 15:54:36 +1000 | GabriellGimenes | sim |
| codex/ci-foundation | e0ac260 | 2026-10-09 12:14:33 +1100 | GabriellGimenes | sim |
| codex/corporate-eas-migration | 78a383a | 2026-08-14 11:14:34 +1000 | GabriellGimenes | sim |
| codex/integrate-business-broadcast | 955a798 | 2026-10-09 14:29:19 +1100 | GabriellGimenes | sim |
| codex/integrate-social-pulse-layout | 36a3426 | 2026-10-09 12:53:45 +1100 | GabriellGimenes | sim |
| codex/product-updates | 3dabb15 | 2026-08-08 10:16:27 +1000 | GabriellGimenes | sim |
| codex/profile-management-mvp | 1b50599 | 2026-08-07 14:56:39 +1000 | GabriellGimenes | sim |
| codex/reaction-fullscreen-vertical | 1be1b23 | 2026-10-23 12:01:55 +1100 | GabriellGimenes | não |
| codex/reaction-layout-before-fullscreen | 584e3c3 | 2026-10-12 13:36:46 +1100 | GabriellGimenes | sim |
| codex/settings-experience-specs | c711b0f | 2026-08-10 14:19:01 +1000 | GabriellGimenes | sim |
| codex/settings-foundation | 30d70c7 | 2026-08-08 09:44:45 +1000 | GabriellGimenes | sim |
| codex/test-business-media-recovery | 19b4756 | 2026-10-09 16:53:57 +1100 | GabriellGimenes | sim |
| codex/trust-safety-block-report | eb77856 | 2026-08-11 12:05:39 +1000 | GabriellGimenes | sim |
| feat/business-studio-mvp | 67a2324 | 2026-08-17 14:45:48 +1000 | GabriellGimenes | não |
| feat/f1-reaction-composite | 52f4781 | 2026-07-01 12:51:15 +1000 | GabriellGimenes | sim |
| feat/gasp-app-icon | 0527b8d | 2026-07-24 17:12:25 +1000 | GabriellGimenes | sim |
| feat/gasp-notification-mvp | 1c92446 | 2026-07-21 15:18:00 +1000 | GabriellGimenes | sim |
| feat/gasps-social-pulse | a3f7cbc | 2026-08-27 14:36:58 +1000 | GabriellGimenes | sim |
| feat/hold-countdown-circle-reveal | 4fbe431 | 2026-10-10 15:36:38 +1100 | GabriellGimenes | sim |
| feat/reaction-preview-45-55 | 9c68ffa | 2026-07-24 11:51:32 +1000 | GabriellGimenes | sim |
| feat/reaction-ui-polish | 61bdfae | 2026-07-10 23:00:39 +1000 | GabriellGimenes | sim |
| feat/reaction-video-watermark | 9e0b363 | 2026-07-24 11:29:09 +1000 | GabriellGimenes | sim |
| feat/super-imposed-reaction | dea7fac | 2026-07-01 21:09:07 +1000 | GabriellGimenes | sim |
| fix/chat-reaction-marks-reacted | 1457304 | 2026-10-12 13:26:42 +1100 | GabriellGimenes | sim |
| fix/rec-hud-follows-recording | fdd2d4e | 2026-10-12 11:03:05 +1100 | GabriellGimenes | sim |
| main | 584e3c3 | 2026-10-12 13:36:46 +1100 | GabriellGimenes | sim |
| spike/swipe-duet | 1a89b42 | 2026-10-14 15:55:51 +1100 | GabriellGimenes | não |
| tmp/merge-reaction-ui-polish | b1101f8 | 2026-07-11 14:30:52 +1000 | GabriellGimenes | sim |

### Worktrees registrados

```text
/Users/gabrielgimenes/www/gasp-layer-one/gasp                         1be1b23 [codex/reaction-fullscreen-vertical]
/private/tmp/gasp-app-icon-worktree                                   0527b8d [feat/gasp-app-icon] prunable
/Users/gabrielgimenes/Documents/Codex/2026-08-27/t/worktrees/gasp-ci  19b4756 [codex/test-business-media-recovery]
/Users/gabrielgimenes/www/gasp-layer-one/gasp-profile-management-mvp  1b50599 [codex/profile-management-mvp]
/Users/gabrielgimenes/www/gasp-layer-one/gasp-settings-foundation     30d70c7 [codex/settings-foundation]
```

## gasp-backend — branches locais

| Branch | Último commit | Data | Autor | Alcançável por main |
|---|---|---|---|---|
| backup/main-before-notification-merge-20260721 | 2effe1c | 2026-07-10 23:00:52 +1000 | GabriellGimenes | sim |
| codex/business-reaction-withdrawal | 16d5aa8 | 2026-10-09 14:12:18 +1100 | GabriellGimenes | sim |
| codex/chat-realtime-delivery | 2f772b7 | 2026-08-06 15:42:49 +1000 | GabriellGimenes | sim |
| codex/ci-foundation | 723b298 | 2026-10-09 12:14:35 +1100 | GabriellGimenes | sim |
| codex/expiry-job-resilience | 9e7d995 | 2026-10-23 10:30:31 +1100 | GabriellGimenes | não |
| codex/fix-push-provider-isolation | 1588a53 | 2026-10-09 15:14:15 +1100 | GabriellGimenes | sim |
| codex/integrate-business-broadcast | 067ad34 | 2026-10-09 13:36:33 +1100 | GabriellGimenes | sim |
| codex/test-business-campaign-closure | 532f711 | 2026-10-09 16:53:53 +1100 | GabriellGimenes | sim |
| codex/trust-safety-block-report | 1eca1ea | 2026-08-10 15:37:23 +1000 | GabriellGimenes | sim |
| debug/notification-pipeline | 3a7c46e | 2026-07-08 16:46:48 +1000 | GabriellGimenes | sim |
| feat/business-studio-mvp | 746a5fc | 2026-08-17 14:46:04 +1000 | GabriellGimenes | sim |
| feat/composite-service | d27be13 | 2026-07-01 20:07:46 +1000 | GabriellGimenes | sim |
| feat/gasp-notification-mvp | 45b64ff | 2026-07-21 15:18:11 +1000 | GabriellGimenes | sim |
| feat/gasps-social-pulse | 7242feb | 2026-08-27 12:57:39 +1000 | GabriellGimenes | sim |
| feat/reaction-ui-polish | 2effe1c | 2026-07-10 23:00:52 +1000 | GabriellGimenes | sim |
| feat/reaction-video-watermark | 0b1b474 | 2026-07-24 11:29:10 +1000 | GabriellGimenes | sim |
| feat/super-imposed-reaction | 0133471 | 2026-07-03 15:15:46 +1000 | GabriellGimenes | não |
| fix/core-gasp-flow | dcfab9a | 2026-10-10 00:15:30 +1100 | GabriellGimenes | sim |
| main | ea5bd05 | 2026-10-23 10:35:19 +1100 | GabriellGimenes | sim |
| tmp/merge-reaction-ui-polish | 5a62e0c | 2026-07-11 14:30:52 +1000 | GabriellGimenes | sim |

### Worktrees registrados

```text
/Users/gabrielgimenes/www/gasp-layer-one/gasp-backend                         ea5bd05 [main]
/Users/gabrielgimenes/Documents/Codex/2026-08-27/t/worktrees/gasp-backend-ci  532f711 [codex/test-business-campaign-closure]
```

## App — branches remotas consultadas ao vivo

- agent/business-broadcast-mvp-spec
- chore/backlog
- codex/chat-inbox-mvp
- codex/ci-foundation
- codex/corporate-eas-migration
- codex/integrate-business-broadcast
- codex/integrate-social-pulse-layout
- codex/product-updates
- codex/profile-management-mvp
- codex/settings-experience-specs
- codex/settings-foundation
- codex/test-business-media-recovery
- codex/trust-safety-block-report
- dev
- develop
- feat/beta-polish-tasks
- feat/business-studio-local
- feat/business-studio-mvp
- feat/f1-reaction-composite
- feat/gasp-app-icon
- feat/gasp-notification-mvp
- feat/gasp-notifications
- feat/gasps-social-pulse
- feat/hold-countdown-circle-reveal
- feat/notification-content-type-indicator
- feat/reaction-preview-45-55
- feat/reaction-ui-polish
- feat/reaction-video-watermark
- feat/reveal-recording-ux
- feat/super-imposed-reaction
- fix/blurred-gasp-notification-preview
- fix/bugs-b1-b6
- fix/chat-reaction-marks-reacted
- fix/chat-unread-indicator
- fix/core-gasp-view-flow
- fix/duration-and-reaction-display
- fix/keep-sender-on-gasp-update
- fix/pt-br-profile-stats-labels
- fix/reaction-chat-audio-playback
- fix/reaction-send-after-unmount
- fix/reaction-thumbnail-45-55
- fix/rec-hud-follows-recording
- fix/sentry-wave-1-firebase-signout
- main
- qa
- test

## Backend — referências remotas locais (lista de 21 branches reconfirmada no Egolite)

- origin
- origin/backend-dev
- origin/codex/chat-realtime-delivery
- origin/codex/ci-foundation
- origin/codex/test-business-campaign-closure
- origin/codex/trust-safety-block-report
- origin/debug/notification-pipeline
- origin/dev
- origin/feat/business-studio-mvp
- origin/feat/composite-service
- origin/feat/gasp-notification-mvp
- origin/feat/gasps-social-pulse
- origin/feat/reaction-ui-polish
- origin/feat/reaction-video-watermark
- origin/feat/super-imposed-reaction
- origin/main
- origin/qa
