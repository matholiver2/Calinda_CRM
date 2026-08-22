# CALINDA — Design System

**Fonte única de verdade** para toda a interface do CALINDA (CRM com IA: conversas ativas, funil de leads, criação de documentos para clientes). Qualquer tela nova ou revisão de tela existente deve seguir este documento. Se um componente novo não está descrito aqui, adicione a especificação aqui antes de implementar — não invente um padrão isolado na tela.

> **v2 — 14/08/2026:** rebrand completo (NALLIVO → CALINDA), nova paleta verde (identidade da logo) e nova linguagem visual: cartões arredondados com sombra suave e tom mais acolhedor, no lugar do minimalismo austero (bordas retas, zero sombra) da v1. A seção 4 substitui integralmente as regras de raio/elevação da v1.

---

## 1. Princípios

1. **Ferramenta de trabalho, acolhedora — não fria.** O usuário passa horas por dia aqui. A v1 deste documento priorizava densidade austera; a v2 busca o mesmo nível de clareza com um tom mais humano: cartões com respiro, cantos arredondados, saudação pessoal no dashboard ("Bem-vindo, {nome}").
2. **Verde como identidade, não como decoração.** Toda a paleta deriva da logo (marca orgânica em espiral, tons de verde). Vermelho/azul/roxo saturado — clichê de "produto de IA genérico" — está fora da mesa.
3. **Um acento por contexto.** Tema escuro usa o verde-claro (`Acento`) para interação, porque é o que se destaca sobre o fundo quase-preto da marca. Tema claro usa o verde-primário (`Primária`), porque é o que se destaca sobre branco. Nunca os dois ao mesmo tempo na mesma superfície.
4. **Cor de status é informação, não marca.** Etapa do funil, status de documento, badges — usam a escala categórica da seção 2.4, nunca o verde de marca (que significa "ação primária").
5. **Nada de clichê de "feito por IA".** Proibido: gradiente roxo/azul saturado, glassmorphism (`backdrop-blur` decorativo), ícone de faísca/estrelas para "IA", Inter+Poppins como par tipográfico padrão, emoji como ícone de interface.

---

## 2. Cor

### 2.1 Paleta de marca (fornecida pelo cliente)

| Papel | Hex | Nota |
|---|---|---|
| Primária | `#217940` | Verde médio — acento em tema **claro** |
| Primária escura | `#214429` | Hover/pressed do acento em tema claro |
| Acento | `#ABD571` | Verde-limão claro — acento em tema **escuro** |
| Acento luminoso | `#CFE783` | Hover/glow do acento em tema escuro; destaque de métrica positiva |
| Fundo | `#081E09` | Fundo do tema escuro (quase preto, tingido de verde — a cor por trás da logo) |
| Texto claro | `#F4F7F2` | Texto principal sobre fundo escuro |
| Texto escuro | `#172018` | Texto principal sobre fundo claro |

> Combinação de referência do cliente: `#217940` + `#ABD571` + `#081E09` — mantém a personalidade da logo sem ficar berrante. Esta é a combinação usada no **tema escuro** (padrão do produto), que é onde a marca "respira": fundo quase-preto, ação primária em `#217940`, destaque/glow em `#ABD571`.

### 2.2 Tokens semânticos

Implementados em `globals.css`, com troca automática claro/escuro/sistema (já existente no produto). Manter estes nomes — não criar sinônimos.

| Token | Escuro (padrão) | Claro | Uso |
|---|---|---|---|
| `--color-bg` | `#081E09` | `#F6F8F4` | Fundo da página |
| `--color-bg-elevated` | `#0E2A11` | `#FFFFFF` | Sidebar, inputs, cabeçalho |
| `--color-surface` | `#10301A` | `#FFFFFF` | Cards, painéis |
| `--color-surface-hover` | `#163B21` | `#EEF3EA` | Hover de linha/item |
| `--color-border` | `#1D4025` | `#E1E9DC` | Divisórias, borda padrão |
| `--color-border-strong` | `#2A5433` | `#CBD9C3` | Borda de input, borda ativa |
| `--color-fg` | `#F4F7F2` | `#172018` | Texto primário |
| `--color-fg-muted` | `#AFC6AC` | `#4B5A4C` | Texto secundário, labels |
| `--color-fg-subtle` | `#7FA07E` | `#6B7D68` | Metadados, timestamps |
| `--color-accent` | `#ABD571` | `#217940` | Ação primária, item ativo |
| `--color-accent-hover` | `#CFE783` | `#214429` | Hover do acento |
| `--color-accent-soft` | `#ABD571 / 16%` | `#217940 / 10%` | Fundo de badge/estado ativo |
| `--color-accent-foreground` | `#0E2A11` | `#FFFFFF` | Texto **sobre** o acento (escuro sobre verde-claro; claro sobre verde-escuro) |
| `--color-success` | `#7FE08A` | `#15803D` | Fechado, ativo, confirmado |
| `--color-warning` | `#E8B95B` | `#B45309` | Parado, pendente, atenção |
| `--color-info` | `#7DB8E8` | `#1D6FB8` | Reunião, neutro informativo |
| `--color-danger` | `#E8746B` | `#C23B2E` | Erro, perdido, destrutivo |

**Ponto de atenção:** o botão primário troca de texto por tema — `accent-foreground` escuro no tema escuro (porque `#ABD571` é claro demais para texto branco em cima) e branco no tema claro (porque `#217940` é escuro o bastante). Isso já está previsto na tabela acima; nunca hardcode `text-white` num botão primário.

**Regra de contraste:** todo par texto/fundo precisa de no mínimo 4.5:1 (texto normal) ou 3:1 (texto ≥18px/bold). Testado: `#F4F7F2` sobre `#081E09` ≈ 15.8:1 (ok); `#172018` sobre `#F6F8F4` ≈ 14.9:1 (ok); `#0E2A11` sobre `#ABD571` ≈ 6.4:1 (ok); `#FFFFFF` sobre `#217940` ≈ 5.1:1 (ok).

### 2.3 Cor por etapa do funil / status de documento

Independente da paleta de marca — escala categórica própria, consistente entre Kanban, badges, gráficos e a régua de progresso do documento. Mantida da v1 (já valida bem contra o novo fundo verde-escuro):

| Papel | Cor | Hex |
|---|---|---|
| Novo / rascunho | Coral | `#F2836E` |
| Em progresso (1) | Laranja | `#F2A65E` |
| Em progresso (2) / qualificando | Âmbar | `#E8C15E` |
| Revisão / aguardando aprovação | Azul | `#7DB8E8` |
| Concluído / assinado / ganho | Verde-limão (Acento) | `#ABD571` |
| Recorrência / remarketing | Violeta | `#B79EE0` |
| Perdido / cancelado / arquivado | Cinza-verde | `#6B7D68` |

Regra: a etapa "concluído" reaproveita o `Acento` da marca de propósito — é o único status que tem permissão de usar a cor de marca, porque "negócio fechado" é o evento mais importante do funil.

---

## 3. Tipografia

Mantida da v1 — não há motivo para trocar por causa do rebrand de cor. **Não** Inter+Poppins.

```css
--font-display: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
--font-sans:    'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
--font-mono:    'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;
```

| Família | Papel | Onde usar |
|---|---|---|
| **Space Grotesk** | Display | Título de página, saudação do dashboard ("Bem-vindo, {nome}"), número grande de métrica, wordmark "CALINDA". Peso 600–700. |
| **IBM Plex Sans** | Interface | Corpo, labels, botões, navegação, tabelas, formulários. |
| **IBM Plex Mono** | Dado estruturado | Telefone, e-mail, ID, timestamp exato, valores monetários em tabela. |

Escala e regras de uso: inalteradas da v1 (ver histórico do arquivo).

---

## 4. Espaçamento, raio e elevação — **v2, substitui a v1**

A v1 pedia disciplina "Swiss Modernism": raio pequeno, zero sombra, separação só por borda de 1px. A v2 adota a linguagem mais acolhedora da referência visual do cliente: cartões brancos/verde-escuro com **raio generoso** e **sombra suave em camadas**, não mais bordas secas.

### 4.1 Espaçamento

Inalterado — base 4px, produto denso:

```
--space-1: 4px   --space-4: 16px   --space-8: 32px
--space-2: 8px   --space-5: 20px   --space-10: 40px
--space-3: 12px  --space-6: 24px   --space-12: 48px
```

### 4.2 Raio de borda

```
--radius-sm: 10px   /* input, botão, badge retangular */
--radius-md: 16px   /* card, dropdown, modal — era 8px na v1 */
--radius-lg: 24px   /* painel grande, hero do dashboard */
--radius-full: 999px /* avatar, pill de status, badge arredondado, nav pill */
```

### 4.3 Elevação

Cartão de conteúdo agora carrega sombra suave própria (não só borda). Ainda **sem** glassmorphism/blur — a sombra é sólida e discreta, não translúcida:

```css
--shadow-card: 0 1px 2px rgb(8 30 9 / 0.04), 0 4px 12px -4px rgb(8 30 9 / 0.08);
--shadow-float: 0 8px 24px -6px rgb(8 30 9 / 0.18), 0 2px 8px -2px rgb(8 30 9 / 0.10);
/* shadow-card: todo Card (seção 6.3). shadow-float: dropdown, popover, modal, toast. */
```

No tema escuro, a sombra usa a mesma cor-base (`#081E09`) com opacidade um pouco maior, já que sombra preta pura não lê sobre fundo já escuro — ver `globals.css`.

Borda (`--color-border`) continua existindo mas fica mais sutil: 1px, quase invisível, só para separar cartões adjacentes sem espaçamento — a sombra é quem carrega a hierarquia agora.

---

## 5. Iconografia

Inalterado da v1: **Lucide**, outline, `stroke-width: 1.75–2`. Nunca emoji. Nunca ícone de faísca/estrelas para "IA" — usar texto ("IA conduzindo") + ícone `Bot`/`BotOff` já em uso.

---

## 6. Componentes

### 6.1 Botão

| Variante | Fundo | Texto | Uso |
|---|---|---|---|
| `primary` | `--color-accent` | `--color-accent-foreground` (não hardcode branco — ver 2.2) | Uma por tela/seção |
| `secondary` | `--color-surface-hover` | `--color-fg` | Ação secundária |
| `ghost` | transparente | `--color-fg-muted` | Ação terciária, ícone-botão |
| `danger` | `--color-danger` / 10% | `--color-danger` | Destrutivo |

Raio `--radius-sm` (10px), altura 36px padrão / 30px compacto.

### 6.2 Badge / Status pill

`--radius-full`, fundo = cor-do-status a 12–16% de opacidade, texto = cor-do-status sólida. Status "concluído/ganho" é o único badge que pode usar `--color-accent` (ver 2.3).

### 6.3 Card

`--color-surface` + `box-shadow: var(--shadow-card)` + `border: 1px solid var(--color-border)` (borda sutil, não é mais o principal separador) + `--radius-md` (16px). Variante com destaque de métrica mantém `border-left: 3px solid <cor>`.

### 6.4 Painel de conversa (chat)

Inalterado na estrutura (lead à esquerda / IA e vendedor à direita, ver v1), cores atualizadas: bolha da IA usa `--color-accent-soft` + borda `--color-accent`/30%; bolha do vendedor usa `--color-info`/15%.

### 6.5 Kanban e Documentos

Estrutura inalterada da v1 (seções 7.8–7.9 do histórico) — só os tokens de cor/raio/sombra mudam, herdados automaticamente do Card (6.3) e do Badge (6.2).

---

## 7. Logo

- Wordmark: "CALINDA" em `--font-display` (Space Grotesk), peso 700.
- Marca gráfica: espiral orgânica em gradiente de verde (arquivo fornecido pelo cliente) → `public/logo.svg` / `public/logo.png`. Usar como ícone da sidebar (substitui o monograma "C" temporário) e como favicon.
- Área de proteção mínima ao redor da marca gráfica: metade da altura do símbolo.
- Nunca recolorir a marca gráfica fora da paleta da seção 2.1.

---

## 8. Movimento, acessibilidade e anti-padrões

Inalterados da v1 (motion ~3/10 funcional; contraste mínimo 4.5:1/3:1; alvo de toque ≥44px; `:focus-visible` sempre visível; `prefers-reduced-motion` respeitado).

Lista de anti-padrões da v1 continua valendo **integralmente**, com um item novo:

- ❌ Gradiente roxo/azul saturado.
- ❌ Glassmorphism decorativo.
- ❌ Inter + Poppins como par tipográfico.
- ❌ Ícone de faísca/estrelas para "IA".
- ❌ Emoji como ícone de interface.
- ❌ Sombra colorida/pesada fora dos tokens `--shadow-card`/`--shadow-float` da seção 4.3.
- ❌ Zebra-striping em tabela.
- ❌ Spinner giratório como único feedback de carregamento.
- ❌ Cor de marca (verde-acento) usada como cor de status — exceto "concluído/ganho" (2.3).
- ❌ **Novo:** raio de card menor que 16px ou maior que 24px — a v1 usava 8–12px (agora errado), não exagerar para "rounded-3xl" também.

---

## 9. Checklist antes de entregar uma tela

- [ ] Tema escuro é o padrão; testado também em claro e "sistema".
- [ ] Acento correto por tema: `#ABD571` (escuro) ou `#217940` (claro) — nunca os dois na mesma superfície.
- [ ] Texto sobre botão primário usa `accent-foreground`, não branco/preto fixo.
- [ ] Cor de status vem da escala categórica (2.3), não do acento de marca (exceto "concluído").
- [ ] Card usa `--radius-md` (16px) + `--shadow-card`, não mais borda seca da v1.
- [ ] Título usa Space Grotesk, corpo IBM Plex Sans, dado estruturado IBM Plex Mono.
- [ ] Contraste de texto verificado (4.5:1 / 3:1).
- [ ] `:focus-visible` funcional em todo elemento interativo.
- [ ] Nenhum item da lista de anti-padrões (seção 8) presente.

---

*Mantido por: time de produto CALINDA. Ao alterar uma decisão aqui (cor, fonte, espaçamento), atualize este arquivo primeiro — código é a implementação deste documento, não o contrário.*
