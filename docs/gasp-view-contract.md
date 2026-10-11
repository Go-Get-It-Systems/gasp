# Contrato do fluxo central: ver um gasp e reagir

Este documento é a fonte única de verdade do que a tela `view-gasp` precisa
garantir. Toda mudança em `app/(modals)/view-gasp.tsx`, `hooks/useViewGasp.ts`,
`components/gasp/HoldToView.tsx`, `RecordingHud`, `RecordingCountdown`,
`ReactionCapture` ou `ReactionPreview` precisa manter **todas** as regras abaixo.

As regras C1–C8 são verificadas juntas, na tela real, por
`app/(modals)/__tests__/view-gasp.flow.test.tsx`. Se uma correção quebrar
qualquer uma, o teste falha. As regras marcadas **[aparelho]** dependem de
câmera, microfone ou áudio de verdade e só podem ser provadas num iPhone
físico (veja o checklist no fim). O simulador não tem câmera.

## Linha do tempo de um gasp

```
segura ──► contagem 3-2-1 ──► revelação ──► gasp tocando ──► solta / fim
            │ câmera pronta     │ gasp consumido              │ para a gravação
            │ começa a gravar   │ (fallback: grava aqui)      │ prévia da reação
                                                            ──► Enviar / Descartar
```

## Regras

### C1. O gasp só é consumido na revelação
- Abrir a tela não consome o gasp.
- No fim da contagem (revelação): o servidor recebe `open` uma única vez,
  e a bolha do chat e a mídia são marcadas como vistas localmente.
- Se o gasp do servidor só for encontrado depois da revelação, o `open` é
  enviado assim que ele aparecer.
- Se o `open` falhar por erro transitório (rede ou 5xx), o app tenta de novo
  (500ms, 1,5s, 3s).

### C2. Soltar durante a contagem não custa nada
- Nada é consumido, nenhum alerta aparece, nenhum `open` ou `close-view` é
  enviado, e a pessoa pode segurar de novo.

### C3. A gravação começa na contagem
- Assim que a câmera frontal fica pronta durante a contagem, a gravação
  começa, para que o momento da revelação esteja no vídeo.
- O expo-camera pode avisar que está pronto antes de conseguir gravar e
  recusar a primeira tentativa ("Camera is not ready yet"). Enquanto a pessoa
  segura, o app tenta de novo a cada 150ms, até 10 vezes.
- Se a câmera não ficou pronta a tempo, a gravação começa na revelação.
- Existe no máximo uma gravação por vez que a pessoa segura.
- A duração máxima da gravação é a duração do gasp (até 30s) mais 3s de
  contagem mais 1s de folga.

### C4. O REC mostra a gravação real
- O chip REC aparece somente enquanto a câmera está gravando de verdade.
- O cronômetro conta a partir do início real da gravação: começa perto de
  0:03 na revelação quando a gravação começou na contagem.
- O REC acende só depois que uma tentativa de gravar sobreviveu 300ms (as
  recusas do expo-camera chegam em ~15ms), para nunca piscar durante as
  novas tentativas. O cronômetro conta desde o início real da tentativa.
- Se a gravação falhar, o REC some.

### C5. Soltar depois da revelação
- A gravação é interrompida e a prévia da reação aparece com o vídeo gravado.
- Se não houver vídeo, aparece o alerta "Falha na gravação" e a tela fecha
  ao confirmar.
- A tela nunca fica travada: se a câmera não devolver o vídeo em 4s depois
  de soltar, conta como "sem vídeo" (visto num iPhone 15 Pro com um gasp em
  vídeo com som).

### C6. O composite fica sincronizado com a revelação
- O backend recebe `revealOffsetMs = revelação − início da gravação`
  (cerca de 3000ms quando a gravação começou na contagem; 0 no fallback),
  para alinhar o gasp com o rosto no vídeo lado a lado.

### C7. O status final no servidor é coerente
- Reação entregue (modo inbox): o gasp termina `reacted`.
- Enquanto a reação está sendo entregue, nenhum `close-view` é enviado,
  porque o servidor marcaria `viewed` e a reação não conseguiria mais marcar
  `reacted` (transições em `gasp-backend/src/modules/gasps/gasps.transitions.ts`).
- `close-view` (que vira `viewed`) só é enviado quando a pessoa sai sem
  reação: descartou, fechou a tela ou a entrega falhou.

### C8. Falhas no envio
- Falha no upload: a prévia continua na tela, o botão Enviar volta a
  funcionar e aparece um alerta. O gasp não é fechado.
- Falha na entrega depois do upload: o gasp é fechado (`close-view`).

### C9. [aparelho] O vídeo toca com som enquanto a reação é gravada
- Garantido pelo patch nativo `patches/expo-video+3.0.16.patch`, que mantém
  o `AVAudioSession` em `.playAndRecord`. Testes JS não conseguem provar isso.

### C10. [aparelho] A selfie grava o rosto e a voz
- O vídeo da reação tem imagem da câmera frontal e áudio do microfone.

## Lacunas conhecidas (decisão pendente)

- **Reação pelo chat não marca `reacted`.** No modo chat (`chatMessageId`)
  a reação é enviada como mensagem, e o backend não muda o status do gasp.
  Se o gasp foi ligado ao do servidor, ele fica em `opened` e continua
  aparecendo na aba Gasps até expirar. O teste de fluxo documenta esse
  comportamento atual para que uma mudança aqui seja intencional.

- **`open` que falha em todas as tentativas.** Se o servidor recusar as
  quatro tentativas, o gasp continua `pending`: o `close-view` não muda um
  gasp `pending` (decisão em `gasps.transitions.ts`), e o gasp volta para a
  lista de quem já o viu. Fechar essa brecha exige decidir se `close-view`
  deve marcar `viewed` também a partir de `pending`.

## Checklist no aparelho antes de cada PR que toca este fluxo

Use dois aparelhos ou aparelho + simulador, com as contas de teste.

1. Enviar um **vídeo com som** e uma **foto**.
2. No aparelho, segurar e soltar durante a contagem: nada é consumido (C2).
3. Segurar até o fim do vídeo:
   - ouve o som do vídeo (C9);
   - o REC aparece perto de 0:03 na revelação e para quando o gasp termina (C3, C4).
4. Na prévia, o rosto e a voz aparecem (C10). Enviar.
5. O remetente recebe o composite, e o gasp aparece no início do composite,
   sincronizado com a revelação (C6).
6. Conferir no servidor ou na aba de enviados que o status é `reacted` (C7).
