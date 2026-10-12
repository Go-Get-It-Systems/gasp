---
name: backlog
description: Record something deliberately left for later in docs/backlog.md (GASP), with evidence, location, priority and the decision it needs. Use whenever work uncovers an out-of-scope bug, a known gap, a pending product decision or a follow-up ("fica para depois", "anota isso", "deixa no TODO"), at the end of a gasp-core-e2e run for anything not fixed, and when the user asks what is pending. Also use it to update or close an item when it gets fixed.
---

# Backlog

`docs/backlog.md` is the single list of things GASP left for later. Keep it
honest: an item exists only with evidence, and leaves only when it is done.

## Add an item

1. Read `docs/backlog.md`. If an item already covers it, update that item
   instead of adding a duplicate.
2. Take the next id (`B-NNN`, never reuse one) and append a section in this
   exact shape, in Portuguese like the rest of the file:

   ```markdown
   ## B-NNN · <título curto do problema, não da solução>
   - **Prioridade:** P1|P2|P3 · **Área:** app|backend|infra|produto|... · **Status:** aberto|decisão pendente
   - **Contexto:** o que acontece e para quem, em 1–3 frases.
   - **Evidência:** log, rastreio `[gasp-flow]`, teste, screenshot ou comando que mostra o problema (com data).
   - **Onde:** arquivos ou módulos a mexer; a correção recomendada, se já se sabe.
   - **Decisão:** o que falta decidir e quem decide (omita se nada).
   ```

3. Pick the priority by impact, not by effort:
   - **P1:** afeta usuários agora; fazer antes de novas features.
   - **P2:** afeta usuários em casos específicos; planejar.
   - **P3:** raro ou só no futuro; registrar e esperar.
4. If the item is also a rule gap of the core flow, add or keep a line in
   `docs/gasp-view-contract.md` → "Lacunas conhecidas" pointing to the id.
5. Tell the user the id, the title and the priority in one line. Do not
   start fixing it unless they ask.

## Update or close

- When work starts: `Status: em andamento`.
- When it ships: `Status: feito (<repo>#<PR>)`, and keep the section for one
  release so the history is visible; remove it after that.
- When a decision is made: write the decision under **Decisão** and move
  the status to `aberto`.

## Answering "o que está pendente?"

Summarize the open items by priority (P1 first) with id and title. Recommend
what to do next based on P1 items and on the area the user is about to work
in.
