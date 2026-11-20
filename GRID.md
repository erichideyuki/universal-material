# Data Grid — mapa de features (requisitos / roadmap)
Data: 2026-06-03 · Marca ✅ = já implementado. Cada item = o que a feature faz.

## 0. Baseline (já tem)
- ✅ Sort de coluna (single).
- ✅ Reorder de coluna por drag.
- ✅ Agrupamento por drag de coluna (group panel estilo DevExpress).
- ✅ Virtual scroll (virtualização de linha) por padrão.

## 1. Ordenação
- Multi-sort: shift-click adiciona chave secundária/terciária; mostra a ordem (1,2,3) no header.

## 2. Filtragem
- Filtro por coluna: menu/input por coluna, por tipo — texto (contains/equals/starts), número/data (>, <, between), set/enum (multi-select dos valores distintos).
- Floating filter: linha de inputs de filtro logo abaixo do header.
- Quick filter / busca global: um campo que filtra em todas as colunas de uma vez.
- Filter builder (avançado): compõe condições com AND/OR entre colunas ("status = X E valor > Y").

## 3. Agregação & totais (complemento do agrupamento que você já tem)
- Agregação por grupo: sum/avg/min/max/count por coluna, exibida na linha do grupo.
- Group footer: linha de subtotal ao fim de cada grupo.
- Grand total: linha de total geral fixada no rodapé.

## 4. Pivot
- Modo pivot: transforma valores de linha em colunas (linhas × colunas × medidas), igual tabela dinâmica de planilha. Caro de fazer; diferencial premium.

## 5. Edição
- Edição inline de célula: double-click/Enter entra; Esc cancela, Enter/Tab confirma.
- Editores por coluna: texto, número, data, select, checkbox, custom.
- Validação: rejeita valor inválido, marca a célula, bloqueia o commit.
- Row editing: edita a linha inteira com save/cancel (em vez de célula a célula).
- Modelo de commit/eventos: emite o que mudou pro consumidor persistir; ideal ter undo/redo.

## 6. Seleção
- Seleção de linha: single/multi, coluna de checkbox, "selecionar tudo" no header, persistente através de sort/filtro.
- Range selection (estilo Excel): seleção retangular de células arrastando — base pra copiar.

## 7. Clipboard & export
- Copy/paste estilo Excel: copia range, cola em células (respeitando edição/validação).
- Export CSV.
- Export Excel (.xlsx) com formatação, respeitando filtro/sort/agrupamento/colunas visíveis. (Crítico pro público de compliance — relatório.)

## 8. Colunas
- Pinning: congela coluna(s) à esquerda/direita; só as do meio rolam.
- Resize: arrasta a borda; auto-size pro conteúdo (double-click na borda).
- Column chooser / visibilidade: menu pra mostrar/ocultar colunas.
- Header menu: sort/filter/pin/hide/autosize a partir de um menu no header.
- Column groups: header multi-nível (um header pai cobrindo sub-colunas).
- Formatters & cell renderers: formatar valor / renderizar conteúdo custom por coluna (badge, link, ícone).

## 9. Linhas
- Pinning de linha: fixa linha(s) no topo/rodapé (totais, itens importantes).
- Master-detail: linha expansível que revela um painel/sub-grid de detalhe.
- Tree data: linhas hierárquicas (pai/filho) com expandir/colapsar.
- Altura variável / auto-height: a linha cresce com o conteúdo.
- Full-width row: linha que ocupa toda a largura (banner/seção).

## 10. Fonte de dados
- ✅ Client-side (tudo em memória) — é o que o virtual scroll atual serve.
- **Server-side / infinite row model**: carrega linhas em blocos sob demanda enquanto rola, com **sort/filter/group empurrados pro backend**. Essencial pra dataset grande e multi-tenant (não dá pra trazer 1M de linhas pro browser). É o item enterprise de maior peso pro teu mercado.
- Paginação: alternativa ao scroll infinito.

## 11. Estado & persistência
- Salvar/restaurar estado do grid (ordem/largura/visibilidade/pin de coluna, sort, filtro, grupo) — o usuário mantém o layout dele por sessão/tenant. API de estado pra controle programático.

## 12. Acessibilidade, teclado, i18n
- Navegação por teclado: setas, Tab, Enter pra editar, navegação célula-a-célula estilo planilha.
- Acessibilidade (ARIA grid roles + leitor de tela): requisito **regulatório**, não opcional pro teu público.
- Localização: strings da UI, formato de data/número por locale; suporte RTL.

## 13. Performance
- ✅ Virtualização de linha.
- Virtualização de coluna: renderiza só as colunas visíveis (grids com muitas colunas).
- Updates transacionais: add/remove/update de linha sem re-render total (delta).

## 14. Extensibilidade
- Componentes custom: cell renderer / editor / header.
- API de eventos: clique de célula, mudança de seleção/sort/filtro, commit de edição, expand de grupo/detail.
- Toolbar / status bar customizável.

---
## Lente de prioridade (pro teu mercado: ERP de compliance, multi-tenant, Angular)
Alto valor primeiro (mapeiam direto na dor): **server-side row model**, filtragem,
export Excel/CSV, agregação/totais, edição+validação, **acessibilidade**, persistência de
estado de coluna, pinning. Diferenciais "uau" mas secundários: pivot, master-detail, tree.
Não precisa de tudo pra valer $10/mês — o core + 4–5 desses já é uma proposta forte.