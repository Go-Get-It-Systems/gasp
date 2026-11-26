# Composição vertical — implementação e validação, 26/11/2026

## Versionamento

- Checkpoint anterior: `8c93b32`, na branch `codex/reaction-fullscreen-vertical`.
- App novo: `codex/reaction-vertical-delivery`, derivada do checkpoint.
- Backend novo: `codex/reaction-vertical-composite`, derivada de `ea5bd05`.
- Backend anterior preservado em `codex/composite-before-vertical`.
- App anterior à prévia preservado em `codex/reaction-layout-before-fullscreen`.
- Nenhuma branch antiga foi removida ou reorganizada. Branches de implementação e recuperação publicadas. Principais sem merge.

## Comportamento

O app solicita `vertical-50-50` com a proporção da tela e o atraso de revelação. O servidor gera original em cima e reação embaixo, metades iguais, enquadramento central com preenchimento, logo junto ao canto inferior direito do original e divisor discreto. O vídeo termina com a reação e mantém sua faixa de áudio. A gravação do microfone é preservada; esta alteração não acrescenta mixagem do áudio original.

Os arquivos novos usam `composites/<usuário>/vertical-v1/…`. O player identifica o formato pela URL original antes de consultar o cache, evitando compor um vídeo pronto novamente. Novos vídeos preenchem a tela; antigos continuam com `contain`, sem corte. Em aparelhos de proporções diferentes, o preenchimento pode recortar bordas; validar enquadramento no aparelho receptor.

O servidor continua aceitando `1/3-2/3` para versões anteriores. Se uma versão antiga do servidor rejeitar especificamente o novo layout, o app solicita uma composição antiga completa uma única vez. Outros erros mantêm o tratamento existente. Isso evita perder o gasp original durante uma atualização gradual.

## Evidência local

- App: gate completo passou, 489 testes / 73 suítes, contrato de fluxo, tipos e lint.
- Backend: 225 testes passaram; 21 testes de integração dependentes de serviços externos foram pulados pela configuração existente. Tipos, build e lint passaram (avisos preexistentes).
- FFmpeg real: 12 composições passaram — formato antigo e vertical, foto/vídeo, atraso zero ou três segundos, proporções 9:19.5 e 9:16.
- Os testes inspecionam pixels antes/depois da revelação e em cada metade, dimensões, duração e áudio decodificado não silencioso. JPEG e vídeo com taxas de quadros diferentes foram usados.
- Amostra visual local: `/tmp/gasp-vertical-proof/composite.mp4` e `/tmp/gasp-vertical-proof/after-reveal.png`, foto E2E e vídeo sintético no lugar do rosto. Inspeção confirmou ordem, divisor e posição da marca.

## Publicação e teste conectado

- Rascunhos: app https://github.com/Go-Get-It-Systems/gasp/pull/41 e backend https://github.com/Go-Get-It-Systems/gasp-backend/pull/16. CI remota passou, incluindo integração com banco/Redis e montagem FFmpeg no Docker.
- Com autorização explícita do usuário, backend `ba57530` publicado no Railway sem merge. Deployment `dc3f31ba-13cf-4412-b167-ebc6f2167d3e` SUCCESS; saúde HTTP 200. App testado em `764ad73`.
- Simuladores: Bi enviou foto e vídeo para Iaco; soltura em 1499 ms não revelou. Hold completo revelou após cerca de 3 s. Falha de câmera esperada no simulador. Foto: 0 de 778 quadros mostraram REC. Vídeo: contato de quadros confirmou relógio de 0.0 a 9.0 s. Cada abertura completa teve um PATCH open 200 e um close-view 200.
- Evidências visuais locais: `/tmp/gasp-vertical-e2e/photo-hold.mp4`, `/tmp/gasp-vertical-e2e/video-hold.mp4`, `/tmp/gasp-vertical-e2e/video-sheet.jpg`. Traces e HTTP sanitizados nos arquivos `vertical-simulator-*` deste diretório.
- iPhone 15 Pro: gravação começou 313 ms após hold, ainda durante contagem. Revelação em 3047 ms; atraso enviado ao compositor 2734 ms, exatamente a diferença. Upload, composição 200 e reação 201; nenhum close-view no intervalo. Evidências: `vertical-physical-trace.log` e `vertical-physical-http.json`.
- Usuário confirmou reprodução e áudio no iPhone e envio da reação. Na Bi, inspeção visual confirmou vídeo original em cima, rosto embaixo, divisor e marca, preenchendo a tela. Player fechado após a inspeção.
- Após essa inspeção, usuário confirmou explicitamente sua própria voz na prévia e REC com cronômetro avançando nesta rodada. Fluxo principal vertical aprovado no teste conectado; não equivale a certificar todas as condições de rede ou todos os aparelhos.

| Regra | Resultado desta rodada | Evidência |
| --- | --- | --- |
| C1 revelação/consumo | PASS | Foto/vídeo revelados após contagem; uma abertura no servidor por hold completo |
| C2 soltura antecipada | PASS | 1499 ms, borrado, sem abertura correspondente |
| C3 gravação na contagem | PASS | Início 2734 ms antes da revelação no aparelho |
| C4 indicador real | PASS | Usuário confirmou REC e cronômetro no iPhone; 0 de 778 quadros da foto no simulador mostraram REC |
| C5 soltura após revelação | PASS | Prévia física 159 ms após soltura; falha esperada do simulador encerrou viewer |
| C6 atraso da composição | PASS | Atraso 2734 ms coincide com trace; montagem vertical recebida |
| C7 reação entregue | PASS | Composite 200, reactions 201, sem close-view intermediário |
| C8 falhas de envio | PASS (automatizado) | Gate e testes remotos passaram; falha de rede não foi injetada no aparelho nesta rodada |
| C9 áudio durante captura | PASS | Usuário confirmou ouvir o vídeo enquanto reagia |
| C10 rosto e voz | PASS | Rosto visível na composição recebida; usuário confirmou voz própria na prévia |

## Ainda necessário

1. Concluir revisão e integração às principais. Publicação do aplicativo é uma etapa distinta do merge.
2. Vídeo físico validado nesta rodada; matriz de foto/vídeo e proporções adicionais coberta localmente por FFmpeg. Não foi repetida captura física com foto após este deploy.
