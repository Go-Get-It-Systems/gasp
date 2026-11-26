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
Metro; o usuário confirmou Iaco. A rodada física de vídeo foi executada:
o usuário confirmou som durante captura, REC/cronômetro, rosto e voz na
prévia. Envio e recebimento na Bi foram conferidos nesta integração.

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
| C4 REC real | PASS | Usuário confirmou REC e cronômetro no iPhone; simulador sem REC na amostra. Precisão de início não foi medida. |
| C5 soltar após revelar | PASS | Usuário confirmou prévia real; sem câmera, alerta e retorno funcionaram. |
| C6 composição sincronizada | NOT VERIFIED | Reprodução vertical recebida passou; offset exato da captura física ainda não medido. |
| C7 status final coerente | PASS | API retornou reacted, uma reação recebida vinculada à conversa; nenhum close-view entre open e envio. |
| C8 falhas de envio | NOT VERIFIED | Gate automatizado passou; não houve falha induzida no aparelho. |
| C9 áudio durante captura | PASS | Usuário confirmou som enquanto reagia no iPhone. |
| C10 rosto e voz | PASS | Usuário confirmou imagem e voz na prévia; rosto observado no recebimento da Bi. |

## Rodada física de vídeo

Para o gasp `davrraqd97lty4wwdllzsht9`, logs da API confirmam open 200 às
05:07:22 UTC, uploads 200 às 05:07:34 e 05:07:37, composição 200 às
05:07:46 e reação 201 em seguida. Não houve close-view nesse intervalo.
Consulta autenticada posterior confirmou status `reacted` e exatamente uma
reação recebida pela Bi, vinculada à conversa.

No simulador da Bi, o chat mostrou uma nova reação do Iaco. A reprodução
carregou pela leitura protegida e mostrou o vídeo original em cima e o
rosto embaixo, divisão vertical em tela inteira, divisor e logo. O quadro
observado mostrava AUDIO 3.8s. A reprodução foi fechada após a conferência.
Não foram publicados no Git imagens do rosto ou áudio da pessoa.

O usuário confirmou todos os pontos perguntados: som durante a captura,
REC/cronômetro e rosto/voz na prévia. O trecho de trace físico não estava
no buffer do Metro consultado; não atribuir precisão temporal à confirmação
visual. C3 e o offset exato de C6 seguem sem evidência temporal desta rodada.

Antes da captura, houve aviso de reconexão, timeouts e uma resposta 503
observada no cliente. Railway manteve API/banco/Redis online, sem falha de
deploy; os logs mostraram desconexões/reconexões. Três consultas seguintes
à saúde retornaram 200, assim como a caixa de entrada. Causa ainda não
isolada; não afirmar que o servidor reiniciou ou que houve correção.

Investigação seguinte encontrou defeito independente de ciclo de vida do
socket, registrado em B-010. Corrigido na branch de integração: suspensão
preserva ouvintes, conexão pendente é reutilizada, a faixa acompanha o
estado atual, e logout mantém descarte completo da sessão. Dois testes
reproduziram as falhas antes do ajuste; depois passaram sete direcionados,
598 testes completos, tipos e lint (51 avisos existentes). Após reabrir o
iPhone na versão ajustada, o usuário confirmou retorno do segundo plano,
reconexão e desaparecimento do aviso. Recebimento de eventos após retorno
será exercitado no Business. Isso não encerra B-008 nem C3/C6.

## Segurança implantada — verificação pela API

Upload privado: leitura anônima 403; destinatário antes do envio 403;
destinatário com gasp pendente recebeu acesso e leitura 200; resposta de
acesso sem cache; depois do consumo, nova solicitação de acesso 403.
Avatar sintético explicitamente público retornou 200. A identidade de teste
recebeu 403 ao consultar o bucket de produção. Nenhum segredo consta aqui.
Essas verificações são da API/armazenamento, não substituem teste nativo.

## Próximos passos

1. Complementar evidência temporal de início da captura e sincronização;
   investigar recorrência do aviso de reconexão. Fluxo de vídeo, som, rosto,
   voz, REC, entrega vertical e status reacted passaram nesta rodada.
2. Troca de conta e reprodução legada com os leitores privados.
3. Business: papel de conta, campanhas foto/vídeo, métricas, câmera,
   consentimento, destaque e revogação, limite de dez. Duas empresas foram
   preparadas; Iaco proprietário, Bi única seguidora, contas ainda pessoais.
4. Push em segundo plano separado: a identidade restrita não tem permissão
   FCM. Não considerar entrega em primeiro plano prova de push.

Gravações brutas e tokens temporários ficam fora do Git. Não há aprovação
final do E2E integrado nem liberação para produção/TestFlight.
