# Integração Erik — validação de 26/11/2026

## Escopo e estado

Ambiente exclusivo `integration-erik`; nenhum merge, deploy de produção ou
TestFlight nesta rodada. App `b60e6f2`, API `bfb5e2f`, ambos na branch
`codex/erik-business-security-integration`. Recuperação e plano:
[integração](../../plans/2026-11-26-erik-integration.md).

Infra concluída: API, PostgreSQL e Redis online, sem falhas recentes às
04:15 UTC. Deployment ativo `615f06b1-7b2b-49c9-9934-016793d5b51a`.
CI da API passou em Quality, Database and Docker e CI no run `45753001484`.
O comando de pré-deploy voltou para migrações após confirmar as fixtures.

## Evidências nativas — simuladores

Bi: iPhone 17 Pro. Iaco: iPhone 17 Pro Max. Login por telefone/código de teste
confirmado nos dois apps, conectados ao Metro da integração (8084).
As contas e dados são exclusivos do banco de integração; Firebase Auth é
compartilhado com o projeto existente. O iPhone 15 Pro foi aberto no mesmo
Metro; o usuário confirmou Iaco. A rodada física ainda está pendente.

Vídeo novo `davrraqd97lty4wwdllzsht9` preparado pela API autenticada da Bi
para a captura física (upload 200, envio 201). Essa preparação não conta
como novo teste de envio pela interface; o envio nativo foi validado acima.

Foto enviada pela interface da Bi: `ym2t507ugy54rpxibcqjivk4`.
Soltura em 1.499 ms manteve borrado e não enviou `open`. No hold seguinte,
revelação após 3.066 ms, foto visível e um único `open` HTTP 200 às
04:10:48 UTC. `close-view` HTTP 200 às 04:11:23 UTC após sair sem reação.
A caixa de entrada ficou vazia. Evidências: `early-release.png`,
`bi-photo-preview.png`, `photo-hold.jpg`.

Vídeo enviado pela interface da Bi: `hgwmkhd2gvik5gwrzvoue6v4`.
Upload 200 e envio 201 às 04:15:50–51 UTC; revelação após 3.066 ms,
`open` único 200 às 04:16:31 UTC e `close-view` 200 às 04:16:40 UTC.
Os quadros mostram a contagem, AUDIO 0.2s logo após revelar, progressão até
AUDIO 8.7s, alerta de gravação indisponível e retorno à caixa vazia.
Evidência: `video-hold.jpg` e `simulator-http.json`.

A câmera não existe no simulador: as dez tentativas retornaram
`This operation is not supported on the simulator`. Análise a cada 0,1s:
zero de 293 quadros de foto e zero de 270 quadros de vídeo detectaram REC.
Isso verifica a amostra coletada, não prova ausência de flashes menores
que o intervalo de amostragem. Áudio e câmera reais dependem do iPhone.

## Contrato C1–C10

| Regra | Estado nesta rodada | Evidência / limite |
|---|---|---|
| C1 consumo na revelação | PASS | Foto/vídeo: um open, depois close-view e caixa vazia. |
| C2 soltura antecipada | PASS | Foto continuou borrada; nenhum open/close durante a soltura. |
| C3 gravação na contagem | NOT VERIFIED | Sem câmera no simulador; requer iPhone. |
| C4 REC real | NOT VERIFIED | Caminho sem câmera passou na amostra; cronômetro real pendente. |
| C5 soltar após revelar | NOT VERIFIED | Alerta/saída sem vídeo passou; prévia com captura real pendente. |
| C6 composição sincronizada | NOT VERIFIED | FFmpeg local passou; recebimento nativo integrado pendente. |
| C7 status final coerente | NOT VERIFIED | Saída sem reação passou; reacted após envio real pendente. |
| C8 falhas de envio | NOT VERIFIED | Gate automatizado passou; não houve falha induzida no aparelho. |
| C9 áudio durante captura | NOT VERIFIED | Requer validação física. |
| C10 rosto e voz | NOT VERIFIED | Requer validação física. |

## Segurança implantada — verificação pela API

Upload privado: leitura anônima 403; destinatário antes do envio 403;
destinatário com gasp pendente recebeu acesso e leitura 200; resposta de
acesso sem cache; depois do consumo, nova solicitação de acesso 403.
Avatar sintético explicitamente público retornou 200. A identidade de teste
recebeu 403 ao consultar o bucket de produção. Nenhum segredo consta aqui.
Essas verificações são da API/armazenamento, não substituem teste nativo.

## Próximos passos

1. iPhone/Iaco: vídeo novo, captura, som, rosto, voz, REC, envio e composição
   vertical recebida pela Bi; confirmar status reacted e sincronização.
2. Troca de conta e reprodução legada com os leitores privados.
3. Business: papel de conta, campanhas foto/vídeo, métricas, câmera,
   consentimento, destaque e revogação, limite de dez. Duas empresas foram
   preparadas; Iaco proprietário, Bi única seguidora, contas ainda pessoais.
4. Push em segundo plano separado: a identidade restrita não tem permissão
   FCM. Não considerar entrega em primeiro plano prova de push.

Gravações brutas e tokens temporários ficam fora do Git. Não há aprovação
final do E2E integrado nem liberação para produção/TestFlight.
