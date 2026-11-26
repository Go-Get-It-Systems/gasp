# Integração Business e segurança — 26/11/2026

## Escopo autorizado
Preservar a versão atual, integrar as branches do Erik em branches próprias e reiniciar a validação: fluxo pessoal primeiro, Business depois. Sem merge na main, publicação de produção ou TestFlight nesta etapa.

## Referências imutáveis e recuperação
| Repositório | Base validada | Origem Erik | Recuperação publicada |
|---|---|---|---|
| App | main 3885c32acc87fa87a802c62ff6bee6df328f30b4 | 0e465f5f4e74fb50941d042abb1fbc4b051556e3 | recovery/main-pre-erik-20261126 |
| App + relatório Business | 61bf23b48c97d3efe88ca5794bca0b81acb27731 | — | recovery/pre-erik-integration-20261126 |
| API | main 3c6b7b7604d6b93eca14d36ae7b6f2ae6296abed | d4bfde9e7c179282fd8b0934ed390f0fd2cc29e9 | recovery/pre-erik-integration-20261126 |

As duas integrações usam `codex/erik-business-security-integration`, em worktrees irmãs separadas dos checkouts que alimentam o app atual. O relatório Business foi reaplicado antes da integração. Logs locais antigos ficam preservados no checkout original, sem publicar possíveis dados de sessão.

## Plano e critérios de passagem
1. **Checkpoint:** tags anotadas remotas, bases e origens registradas; checkouts originais preservados.
2. **Integração:** manter histórico do Erik, composição vertical, reprodução legada, patch de áudio, retries/logs de expiração; resolver conflito do compositor combinando layout atual e leitores privados.
3. **Ajustes de compatibilidade:** revisar acesso/renovação de mídia privada e troca de conta; alinhar reprodução Business ao padrão vertical aprovado; conferir aviso de limite diário.
4. **Gate local:** contrato do core, suites completas, tipos, lint, build da API, regressões de composição FFmpeg; testes de banco somente em banco descartável.
5. **E2E pessoal:** dois simuladores, foto/vídeo, soltura antecipada, revelação, consumo, falha esperada de câmera do simulador; depois iPhone com rosto, voz, REC, áudio, sincronização e recebimento vertical; reprodução antiga e troca de conta.
6. **E2E Business:** acesso por papel, campanha foto/vídeo, rascunho/publicação, entrega/métricas, câmera e áudio, consentimento desligado/ligado, destaque e retirada, limite configurado de dez.
7. **Publicação das branches:** commits revisáveis e evidências, sem integrar main. Aprovação do produto e plano de rollout antes de produção/TestFlight.

## Ambiente e rollout
A API do Erik passa a criar mídia privada e o app usa `/uploads/access`. Não publicar essa API isoladamente para usuários com clientes antigos. O teste integrado precisa de API com esse endpoint e armazenamento privado corretamente configurado. Preferir ambiente isolado; não tratar testes contra a API antiga como validação desta integração.

Antes de rollout: inventariar clientes instalados, definir atualização mínima/obrigatória ou fase de compatibilidade, validar IAM/ACL e URLs históricas do bucket. `storage.rules` sozinho não prova que arquivos históricos ou permissões públicas de bucket foram revogados. Não tornar mídia privada pública para contornar falhas.

## Rollback
- **Nesta etapa:** encerrar o Metro da integração e reconectar ao checkout original; nenhum dado de produção ou schema foi alterado pela integração.
- **Código:** abrir nova branch/worktree na tag de recuperação apropriada; não usar reset destrutivo nem reescrever main. Tags já publicadas em ambos os repositórios.
- **Após eventual deploy:** restaurar o release compatível e configuração registrada. Apenas voltar o código antigo pode deixar uploads privados novos inacessíveis: preparar previamente uma versão de recuperação que mantenha leitura autorizada, ou bloquear a publicação até resolver essa compatibilidade.
- **Dados/configuração:** tags Git não são backup do banco, bucket ou variáveis. A integração não altera schema, ACL ou configuração de produção. O usuário autorizou um ambiente remoto separado e credenciais exclusivas, com permissões limitadas ao bucket de teste. O limite do piloto permanece dez; uma restauração do banco nunca é implícita no rollback de código.

## Estado inicial
585 testes do app e 343 da API passaram nas branches isoladas do Erik; 18 testes de banco não foram executados nessa análise. Esses resultados não equivalem ao gate da integração nem ao E2E no aparelho. Resultados integrados serão registrados separadamente.

## Preparação do ambiente isolado
O usuário escolheu ambiente separado e autorizou identidade/chave exclusivas, acesso somente ao bucket novo e segredo no Railway de integração.

- Railway: `integration-erik`; API `gasp-api-integration`, Postgres e Redis exclusivos, sem cópia de produção.
- Bucket novo: `gasp-integration-erik-20261126`, separado dos arquivos existentes; criado privado. A configuração de suporte a avatares públicos ainda está pendente.
- Firebase Auth permanece no projeto do app para permitir os logins de teste existentes; não equivale a Firebase totalmente separado.
- A identidade restrita ainda não foi criada: a API IAM está desativada e a revisão automática pede autorização específica para habilitá-la no projeto compartilhado. Não houve alteração de IAM nem geração de chave.
- Fixtures de banco exclusivamente sintéticas; não clonar dados, fila ou dispositivos reais de produção.
- Gate integrado: 592 testes do app, tipos e lint passaram (51 avisos, zero erros). API: 353 testes unitários/rotas, 18 Business com PostgreSQL, três permissões de mídia com PostgreSQL e 12 montagens FFmpeg passaram; tipos/build/migrações passaram (lint: seis avisos, zero erros).
- Simuladores e iPhone pendentes nesta versão. Não confundir E2E anterior com validação desta integração.
