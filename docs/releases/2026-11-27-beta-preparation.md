# Preparação do beta 1.1.0 — 27/11/2026

Base do app: main `aee0a5558fa4ab329f25d8562b6459281562a11b`.
Base da API: main `e420610ee0bcdff47dd367ae2004876a066d70bb`.
Ambas passaram nas verificações após o merge. Esta preparação está em branch
separada; não inclui o experimento local de atualização de conexão.

## Escopo

Gerar pacote iOS para distribuição futura pelo TestFlight, sem submissão,
convites ou liberação automática. O usuário indicará os participantes.
Não publicar a API de produção nesta preparação. O auto-deploy do backend
está desativado; o ambiente isolado de integração continua disponível.

A versão e o runtime passam a 1.1.0 (política appVersion); o perfil beta
herda as configurações de produção, mas usa canal beta e distribuição store.
Isso separa as atualizações desse beta do canal production. O build aponta
para a API de produção, que ainda precisa receber a versão compatível antes
de disponibilizar o app aos participantes. O número de build é incrementado
pelo EAS. Não usar auto-submit.

## Verificações realizadas

- Conta Expo autenticada com acesso ao projeto existente.
- Ambiente de build tem configuração Firebase em arquivo e credencial Sentry.
- Configuração Expo resolvida e ícones validados localmente.
- Identidade da API de produção tem permissões de leitura do bucket e criação,
  leitura, exclusão e ACL de objetos. Bucket sem binding público direto.
- Arquivo sintético temporário gravado com ACL privada no bucket de produção:
  acesso anônimo 403, leitura assinada 200 e conteúdo correto. Arquivo removido
  ao terminar; nenhuma mídia existente ou permissão foi alterada.
- A API integrada já passou em autorização de mídia, isolamento de contas e
  fluxos pessoal/Business no ambiente isolado. Esta checagem de Storage não
  substitui o smoke test após o futuro deploy da API de produção.

## Pacote compilado

- EAS: `11d6aefa-256c-47b8-9037-202950ec88c3`, status `FINISHED`, artefato disponível.
- iOS 1.1.0 (6), runtime 1.1.0, canal beta, distribuição store.
- Commit compilado: `cba3283f56fa92d2129cb5b936f3779fc8938540`.
- Certificados existentes reutilizados. Nenhuma submissão à Apple realizada.
- [Compilação no Expo](https://expo.dev/accounts/go-get-it-systems/projects/gasp/builds/11d6aefa-256c-47b8-9037-202950ec88c3).
- O perfil de submissão `beta` usa o app e a equipe existentes, sem herdar o
  Apple ID pessoal antigo do perfil `production`. A autenticação de submissão
  ainda deverá ser confirmada no envio; login no navegador não a substitui.
  Não há grupos nem auto-submit configurados nesse perfil. Essas mudanças de
  preparação não alteram o binário já compilado nem exigem nova compilação.

## Grupo restrito e bloqueios de distribuição

Foi criado no App Store Connect o grupo interno `GASP Beta - Core Team`, com
somente os dois participantes indicados pelo responsável, distribuição manual
e zero builds. A lista nominal permanece no App Store Connect, fora deste Git.

Na conferência de 27/11, os grupos internos antigos `Internal` e `Family`
recebiam builds automaticamente. Após autorização explícita, foram substituídos
por `Internal - Manual` e `Family - Manual`, ambos com distribuição manual,
quatro participantes preservados e zero builds. Os membros foram conferidos
antes da remoção dos dois grupos automáticos. Nenhum usuário foi removido do
TestFlight ou da equipe. Os grupos externos Family/Friends ficaram inalterados.
O risco identificado de distribuição automática pelos grupos internos antigos
foi resolvido. Conferir novamente os grupos imediatamente antes do envio.

O contrato atualizado da Apple ainda exige aceite pelo Account Holder.
O responsável informou que já entrou em contato com ele. O botão de contato
apenas abre um e-mail e não enviou notificação automaticamente.

## Sequência de liberação (não executada)

1. Confirmar aceite do contrato e verificar novamente que todos os grupos
   internos continuam manuais e o grupo restrito tem somente os dois indicados.
2. Confirmar autenticação de submissão para a equipe correta. Não reutilizar
   implicitamente a conta pessoal antiga nem criar chaves sem necessidade.
3. Publicar a API a partir da main revisada, após autorização, mantendo o
   auto-deploy desligado. Validar saúde, login, upload, mídia privada,
   composição vertical e Business no ambiente de destino antes de distribuir.
4. Enviar exatamente o pacote acima com o perfil `beta`, nunca `--latest`.
   Aguardar processamento e resolver eventuais exigências da Apple. Conferir
   versão, número de build, grupo e API antes de disponibilizar o app.
5. Associar manualmente somente `GASP Beta - Core Team`, sem links públicos ou
   associação a outros grupos. Conferir os dois destinatários imediatamente
   antes da liberação e validar instalação, login, fluxo pessoal e Business.
6. Se houver regressão, interromper o teste desse build e preservar evidências.
   As tags de recuperação guardam código, não backups de dados/configuração;
   voltar à API pública antiga não garante acesso às mídias privadas novas.
   Preferir correção compatível e revalidada antes de reabrir o beta.

## Texto preparado para “What to Test”

Validate sign-in and account switching; send and receive photo/video gasps;
check reaction camera, microphone, playback and the vertical split layout.
In Business Studio, switch companies, publish a test campaign, check metrics,
play received reactions, and verify featuring consent and withdrawal.
Report the steps to reproduce any issue, your iPhone model and iOS version.

Internal Testing é para usuários elegíveis da equipe App Store Connect.
External Testing atende convidados sem acesso administrativo; a primeira
build externa precisa da revisão beta da Apple. Nenhum grupo externo novo
foi criado e nenhuma versão foi distribuída nesta preparação.

Referências: [runtime e atualizações](https://docs.expo.dev/eas-update/runtime-versions/),
[configuração EAS](https://docs.expo.dev/eas/json/).
Referências Apple: [testadores internos](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers),
[testadores externos](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/).

## Atualização após conteúdo e capas — 27/11/2026

Esta atualização substitui o estado anterior de API ainda não publicada e de pacote sem mudanças funcionais.

- API revisada publicada com autorização em produção; saúde verificada. Dez marcas e vinte campanhas Live cadastradas; arquivos recebidos pela Bi com hashes iguais aos cortes preparados e acesso anônimo bloqueado.
- Capas dos vídeos integradas à branch de preparação após aprovação. Main intacta; experimento de conexão continua fora.
- Suíte completa: 608 testes aprovados, tipos e lint aprovados, capa real conferida no simulador e apresentação confirmada pelo usuário.
- Novo pacote solicitado: iOS 1.1.0 (7), canal beta, commit `9f9a85ce599b3fa1eaee4d94b30ea7bcd67f9680`.
- EAS: `4c8ddf82-12b4-4bf1-b02b-cd43116fba71`. Compilação solicitada; resultado ainda pendente.
- O build 6 não inclui as capas; não usá-lo para distribuir esta atualização.
- Nenhum envio à Apple ou convite. O aceite do Account Holder não foi reconfirmado nesta rodada.
- Antes de enviar, conferir o status final do build 7 e os grupos manuais. Não usar `--latest`.
