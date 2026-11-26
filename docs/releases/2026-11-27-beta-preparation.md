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

## Próximas etapas

1. Gerar o build iOS com as credenciais existentes, sem renová-las implicitamente.
2. Conferir o resultado e registrar o identificador do pacote.
3. Autorizar e executar separadamente o deploy da API; testar login, upload,
   acesso protegido, composição e Business no ambiente de destino.
4. Submeter à Apple somente com autorização; configurar acesso restrito aos
   participantes indicados e conferir aprovação/processamento necessários.
5. Preparar recuperação compatível com mídias privadas. As tags de recuperação
   guardam código, não backups de dados ou configuração de serviços.

Referências: [runtime e atualizações](https://docs.expo.dev/eas-update/runtime-versions/),
[configuração EAS](https://docs.expo.dev/eas/json/).
