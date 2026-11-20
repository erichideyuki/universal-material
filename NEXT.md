# Universal Material Web — handoff de endurecimento skills/API (rodada 1 → 2)
Data: 2026-06-03 · Versão alvo: 3.9.0

## Por que isso existe (ler primeiro — método)
As skills são geradas no primeiro passe a partir de **priors idiomáticos de M3**, de
propósito independentes da API. O objetivo destas rodadas é **gerar e mapear a
divergência** entre a expectativa idiomática (skill) e a API real.

> NÃO gerar skills a partir do `custom-elements.json`/source: isso zera a divergência
> e te cega justamente pros problemas de API. A divergência é o produto.

**Toda divergência é uma bifurcação**, nunca "conserta a skill" por reflexo:
- skill errada + **API boa** → corrige a doc;
- skill reflete o idiomático + **API diverge** → candidato a corrigir a **API**.
A skill é um *oráculo de "API esperada"*. Onde difere do real, sinaliza um dos dois.

Regra de verificação: **confirmar cada claim no navegador** (não confiar em
source-reading nem em claim gerada). Caçar por **classe de falha**, na lib inteira,
não componente por componente.

## Classes de falha pra varrer na lib inteira (rodada 2)
1. **Atributo de markup inerte** (estado declarativo não aplica).
   Confirmado: `select value`, `tab active`, `checkbox/switch/radio checked` (corrigido),
   `list-item selected` (não existe). Checar também: `chip selected`,
   `expansion-panel expanded`, `pane open`, `drawer-item active`, `dialog open`, etc.
2. **Quebra ao ser movido/reconectado no DOM** (cross-ref perdida no disconnect e não
   refeita no reconnect). Confirmado+corrigido: typeahead, tab-bar. Checar:
   expansion-panel-container↔panels, agrupamento de radio, chip-set↔chips,
   nav-rail/nav-bar↔items, scaffold↔panes/context, menu↔anchor. (Framework e o próprio
   scaffold movem DOM → dispara.)
3. **Nome de API plausível mas inventado** (alucinação do gerador). Confirmado:
   `optionsProvider`, `onAction`, atributo `theme`, `--u-card-content-padding`.
   Toda claim que *parece* idiomática merece desconfiança extra.

## Problemas encontrados — rodada 1 (mapa de divergência)

### A. Bugs de componente CORRIGIDOS nesta sessão (resolução do lado da API)
1. `src/typeahead/typeahead.ts` — zera `#target` no `disconnectedCallback` (re-attach no
   reconnect). Sem isso, typeahead movido fica surdo (dropdown nunca abre).
2. `src/tab-bar/tab-bar.ts` — re-registra as tabs no `connectedCallback` (`#registerTabs`);
   tab zera `_bar` no disconnect e o `slotchange` não re-dispara ao mover → clique vira no-op.
3. `src/shared/selection-control/selection-control.ts` — semeia `#checked` do atributo no
   `firstUpdated` (markup `checked` era inerte em checkbox/switch/radio + list-items).
4. `src/search/search.styles.scss` — modo `static` não herda o layout da barra flutuante
   (sem padding/centralização externos); layout de leading/trailing movido do `slot` pro
   container `.icon`.

### B. Doc-only RESOLVIDO nesta sessão (skill estava errada, API está certa)
- theming: dark via classes `u-dark`/`u-light` no body (color-scheme + light-dark()),
  não atributo `theme`.
- snackbar: ação via evento `actionClick` (não há `onAction`); durações long=5000 /
  short=2500, default long. **(decidido doc-only — ver C)**
- card: token é `--u-card-padding` (não `--u-card-content-padding`); banner full-width
  precisa altura fixa; receita de avatar sobreposto.
- top-app-bar: barra small é 64dp (era 56 = M2).
- menu: receita de "kebab" de linha com `u-overflow-menu`; `anchorElement` p/ trigger irmão.
- datepicker: API do `u-calendar` inline (value ISO, eventos input+change, setar month/year,
  locale).
- selection-controls: `indeterminate` é só via propriedade p/ DOM gerado; `change` BORBULHA.
- typeahead: API real = controller via `target-id` + `.source`/`.formatter`/evento
  `selected` (aceita qualquer input: u-search, u-text-field, u-chip-field, `<input>` nativo).
- tab-bar: evento `change` + `activeTabIndex` documentados.
- list: `u-list-item` não tem `selected` (só `selectable`); highlight persistente via classe
  + `::part(container)`; atributo `no-inset` (flush). **(selected → ver C)**
- chips: `chip-field` precisa de `formatter` p/ objetos. **(remove → ver C)**
- Skills NOVAS (não existiam): `progress`, `badge`, `search`. `overview` atualizado.

### C. Candidatos de fix de API — ACEITOS como opção (rodada 2)
Pontos onde a skill foi patcheada pra casar com a API divergente nesta sessão, mas o
**candidato aceito é mexer na API**. Ao implementar a API, **reverter a nota da skill pra
forma idiomática**.
1. **`u-select`**: tornar o atributo `value` settável/refletido (idiomático: native, MUI).
   Hoje inerte → skill usa `<u-option selected>`.
2. **`u-tab`**: honrar o atributo `active` p/ seleção inicial (hoje inerte em aba não-primeira).
3. **`u-list-item`**: adicionar estado `selected` (listas convencionalmente têm seleção).
   Hoje ausente → skill documenta workaround com classe + `::part`.
4. **`u-text-field`/`u-select`**: adicionar constraint validation (`required`/`pattern`,
   `checkValidity`/`reportValidity`). Hoje ausente → skill diz "valide no JS".
5. **chips**: fazer o evento `remove` borbulhar/compor p/ poder delegar no `u-chip-set`.
   Hoje não borbulha → skill diz "ouça por-chip".

**NÃO é candidato (decidido):** snackbar `onAction` — manter a abordagem do evento
`actionClick`; NÃO adicionar `onAction` ao config. A correção da skill fica.

### D. Issues conhecidos a corrigir na raiz (ainda não feito)
- **Race de upgrade do `u-select`**: ~6 exceptions `_scheduleSync` /
  `_renderOptionRelatedElements` no load em toda página com vários selects (option sobe
  antes do select). Página funciona, mas é ruído. Corrigir em `src/select/` (ordem de
  upgrade / null-guard no lookup do pai).
- **Exemplo de doc bugado**: `docs/src/app/components/typeahead/examples/handling-selection.html`
  atribui `.selected` como propriedade em vez de `addEventListener('selected', …)`.

## Limites de verificação (refazer na rodada 2)
- **Responsivo não observado**: `resize_window` e zoom do navegador eram no-op (viewport
  travado em 2560/xl). Mobile/md validados só por CSS + comportamento do componente.
  Re-testar breakpoints (panes/rail/nav-bar) num viewport redimensionável de verdade.
- **a11y, performance e bundle size**: não auditados.
- **Site de docs oficial (:4200)**: não auditado por inteiro (só skills + alguns exemplos).

## Estado do repo (desta sessão)
- Branch: `fix/component-bugs-and-skills` (a partir de `main`).
- Commitado: `4430e43` (3 fixes src: typeahead/tab-bar/selection-control) e
  `84bb657` (13 skills + progress/badge).
- **Pendente de commit**: `src/search/search.styles.scss` + `.styles.ts` (fix do `static` +
  ícones no container); `skills/list`, `skills/search` (nova), `skills/typeahead`,
  `skills/overview`. `dist/` rebuildado (gitignored); `mockup/` é gitignored (harness descartável).

## Tarefas concretas — rodada 2
1. Varrer **classes de falha 1 e 2** na lib inteira (provavelmente há mais casos nos
   componentes não testados).
2. Implementar os **candidatos de API C1–C5**; depois reverter as skills correspondentes
   pra forma idiomática.
3. Corrigir o **race do u-select** (D).
4. Construir um **verificador de contrato por componente** (generalizar o `_verify.html`):
   instancia cada componente e afirma que cada attr/event/método/css-var documentado existe
   e se comporta. Roda toda rodada → pega regressão e nova divergência.
5. Re-testar **responsivo** num viewport redimensionável.
6. Auditar os **exemplos do site de docs** (:4200).
7. Fechar/commitar o que está pendente do estado do repo acima.