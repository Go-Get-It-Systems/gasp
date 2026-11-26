# Composição vertical — implementação local, 26/11/2026

## Versionamento

- Checkpoint anterior: `8c93b32`, na branch `codex/reaction-fullscreen-vertical`.
- App novo: `codex/reaction-vertical-delivery`, derivada do checkpoint.
- Backend novo: `codex/reaction-vertical-composite`, derivada de `ea5bd05`.
- Backend anterior preservado em `codex/composite-before-vertical`.
- App anterior à prévia preservado em `codex/reaction-layout-before-fullscreen`.
- Nenhuma branch antiga foi removida ou reorganizada. As mudanças permanecem locais; não houve merge ou publicação.

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

## Ainda necessário

1. Publicar branches e validar CI remota. Login no Egolite funciona, mas Git por SSH e autenticação do CLI não estão válidos para push.
2. Disponibilizar suporte vertical no backend antes da validação conectada. A produção continua no formato anterior.
3. Repetir camadas de simuladores e aparelho físico para a versão nova: câmera, voz, REC, atraso, entrega e visualização pela Bi; a aprovação E2E anterior não certifica esta mudança.
4. Integrar à main somente após revisão e validação. Publicação do aplicativo é uma etapa distinta do merge.
