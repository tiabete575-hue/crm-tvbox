# Modernização e Unificação do TV Box CRM

Atualização estrutural, funcional e visual do **TV Box CRM** para unificar fluxos operacionais duplicados, integrar a renovação de assinaturas diretamente ao caixa financeiro e ao WhatsApp, expandir o controle de planos e aparelhos (MAC/Servidor) e elevar o padrão visual de todas as telas para uma experiência SaaS executiva.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões Confirmadas para a Atualização**:
> - **Escopo Completo de Melhorias**: Implementação conjunta do Fluxo Integrado (Renovação + Financeiro + WhatsApp), Redesign completo do Kanban, Financeiro e Central de Renovações, Dashboard 2.0 com caixa real, unificação das abas de Lembretes/Automações/Renovações e suporte a dados de aparelho (MAC/App/Servidor) e ciclos mensais/trimestrais.
> - **Lançamento Financeiro Integrado na Renovação**: Ao confirmar a renovação de um cliente (em qualquer tela), o modal exibirá a opção já preenchida para registrar o pagamento (ou cobrança pendente) com valor do plano, método (PIX, Cartão, Dinheiro, Transferência) e status de baixa imediata.
> - **Direção Visual SaaS Refinada**: Interface clara de alta legibilidade (`#F8FAFC` / `#FFFFFF`), barra lateral escura com ícones semânticos dedicados para cada módulo, tipografia `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums` para valores e datas) e eliminação de alertas nativos (`confirm`/`alert`) e bordas pesadas.

---

## 1. Overview & Core Concept

- **O Que Faz**: Transforma o CRM de assinantes de TV Box em uma plataforma operacional coesa onde o atendimento diário (vencimentos do dia, lembretes de WhatsApp, movimentação no Kanban e baixa financeira) acontece sem retrabalho entre abas isoladas.
- **Público-Alvo / Operação**: Administração e atendimento comercial de carteiras de clientes de TV Box que precisam de agilidade para cobrar vencimentos, renovar acessos e controlar a receita líquida recebida mês a mês.
- **Valor Principal**:
  1. **Zero Retrabalho**: Renovar um cliente já atualiza o vencimento, encerra lembretes pendentes, move o cartão do Kanban para *Renovado*, registra a anotação no histórico e lança o pagamento no Financeiro em um único clique.
  2. **Rastreabilidade de Atendimento no WhatsApp**: Clicar para enviar uma mensagem de WhatsApp registra automaticamente a interação no histórico do cliente e sugere/avança a etapa do Kanban para *Contato realizado*.
  3. **Navegação Limpa e Sem Duplicidade**: Consolidação das antigas telas separadas de *Lembretes*, *Automações* e *Renovações* em uma **Central de Renovações & Lembretes** com abas inteligentes, mantendo as rotas antigas compatíveis.

---

## 2. User Experience & Visual Design

### Fluxos Principais do Usuário

1. **Dashboard Executivo 2.0**:
   - Visão consolidada com **Receita Estimada da Carteira (MRR)** vs. **Caixa Real Recebido no Mês**, **A Receber**, **Em Atraso**, **Taxa de Retenção** e **Funil do Kanban**.
   - Fila rápida de **Ações do Dia** (clientes que vencem hoje ou com tarefa de contato agendada para hoje) com botões de ação direta para WhatsApp e Renovação Rápida.
2. **Central Unificada de Renovações & Lembretes**:
   - Filtros segmentados em linha única: *Lembretes de Hoje*, *Vence Hoje*, *Próximos 7 Dias*, *Próximos 30 Dias*, *Vencidos*, *Renovados* e *Datas Pendentes*.
   - Em cada cliente da fila, exibição clara de plano, valor, dias restantes/atraso, informações rápidas do aparelho e ações diretas (*WhatsApp com Template Inteligente*, *Mover Etapa* e *Confirmar Renovação*).
3. **Kanban de Atendimento Redesenhado**:
   - Colunas com cabeçalhos limpos, contador tabular e soma financeira potencial em cada etapa (*Renovação próxima*, *Contato realizado*, *Aguardando resposta*, *Interessado*, *Aguardando pagamento*, *Renovado*, *Não renovou*).
   - Cartões com arrastar-e-soltar (drag & drop) fluido, seletor rápido de etapa, agendamento de próximo contato, observações rápidas com salvamento automático + feedback por Toast, e botão de disparo de WhatsApp.
4. **Estúdio de Mensagens WhatsApp**:
   - Seleção de cliente com busca rápida, escolha ou criação de novos modelos de mensagem com variáveis dinâmicas (`{nome}`, `{vencimento}`, `{valor}`, `{plano}`), pré-visualização em tempo real e registro automático da interação ao abrir o WhatsApp.
5. **Módulo Financeiro Completo**:
   - Indicadores de *Recebido*, *A Receber* e *Em Atraso* com filtros por período/status/método, gráfico de evolução mensal de caixa recebido, formulário ágil de lançamento e tabela de movimentações com baixa em 1 clique (*Receber hoje*) e exclusão/estorno seguro.
6. **Cadastro de Clientes & Painel de Detalhes Aprimorado**:
   - Suporte a planos **Mensal**, **Trimestral**, **Semestral**, **Anual** e **Vitalício** com cálculo automático da data de vencimento.
   - Campos estruturados opcionais para **Dispositivo / App / MAC Address / Servidor** facilitando o suporte técnico e a recarga.

### Identidade Visual & Tema

- **Direção Estética**: SaaS corporativo de alta precisão — superfícies planas com bordas sutis de `1px` (`border-slate-200`), sem uso de `border-l-4` decorativo e sem pílulas exageradas para metadados estáticos.
- **Paleta de Cores (Regra 60-30-10)**:
  - **60% Canvas Neutro**: Fundo principal em `#F8FAFC` (`bg-slate-50`) e superfícies de conteúdo em `#FFFFFF` (`bg-white`).
  - **30% Superfícies Estruturais**: Navegação lateral em `#0F172A` (`bg-slate-900`), divisórias sutis `#E2E8F0` (`border-slate-200`) e texto secundário `#64748B` (`text-slate-500`).
  - **10% Acento & Semântica**: Azul executivo `#2563EB` (`bg-blue-600`) para ações primárias; Verde `#16A34A` para ativo/recebido/WhatsApp; Âmbar `#D97706` para alerta de vencimento próximo; Vermelho `#DC2626` para vencido/atrasado.
- **Tipografia & Hierarquia**:
  - **Display & Interface**: `Plus Jakarta Sans` para títulos, navegação e controles, garantindo leitura nítida e moderna.
  - **Dados, Datas e Valores Financeiros**: `JetBrains Mono` / `tabular-nums` para alinhamento vertical perfeito em tabelas financeiras, contadores de dias e KPIs.
- **Feedback Interativo**: Substituição de todas as caixas nativas `window.confirm()` por modais/confirmações integradas na interface e notificações via `Toast`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Unificação do Modal de Renovação com Lançamento Financeiro Opcional**
  - *Abordagem Escolhida*: Ao clicar em *Confirmar Renovação* (na Central de Renovações, no Kanban, em Lembretes ou na Ficha do Cliente), o modal permite definir a data da renovação, escolher o ciclo do plano e manter marcada (por padrão) a opção *"Registrar pagamento no financeiro"* com valor, forma de pagamento (PIX, cartão, dinheiro, transferência) e se já foi pago.
  - *Por quê*: Elimina o principal ponto de atrito relatado na documentação atual, onde o operador precisava renovar em uma tela e depois lançar manualmente o pagamento na aba Financeiro.
- **Decisão 2: Compatibilidade Total com o Banco de Dados Neon Existente**
  - *Abordagem Escolhida*: Preservar integralmente as tabelas `clients`, `labels`, `interactions`, `renewals`, `crm_tasks`, `crm_reminders`, `crm_payments` e `crm_templates`, ampliando de forma retrocompatível o cálculo de meses para planos `mensal` (1 mês) e `trimestral` (3 meses), além de `semestral` (6 meses), `anual` (12 meses) e `vitalicio`.
  - *Por quê*: Garante que nenhum dado existente em produção seja perdido e que as migrações e o Worker da Cloudflare continuem funcionando perfeitamente.
- **Decisão 3: Registro Automático de Contato via WhatsApp**
  - *Abordagem Escolhida*: Sempre que o operador acionar o envio de WhatsApp para um cliente, o sistema abre o link seguro do WhatsApp e dispara em paralelo o registro na tabela `interactions` (`type: 'whatsapp'`) e atualiza a tarefa ativa no Kanban de `proxima` para `contatado`.
  - *Por quê*: Mantém o histórico do cliente e o quadro Kanban sempre atualizados sem exigir cliques extras de preenchimento manual.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        Navegação Lateral & Layout                          │
│  Dashboard │ Clientes │ Renovações & Lembretes │ Kanban │ WhatsApp │ Fin.  │
└──────┬──────────┬─────────────────┬────────────────┬─────────┬────────┬────┘
       │          │                 │                │         │        │
       ▼          ▼                 ▼                ▼         ▼        ▼
┌────────────┐ ┌────────────┐ ┌──────────────────────────────────────────────┐
│ Dashboard  │ │ Gestão de  │ │       Central Operacional Modularizada       │
│ Executivo  │ │ Clientes & │ │  • Fila de Renovações & Lembretes do Dia     │
│ 2.0 (KPIs, │ │ Painel 360 │ │  • Quadro Kanban com Soma por Coluna         │
│ Caixa Real,│ │ (Planos +  │ │  • Estúdio de Templates WhatsApp             │
│ Funil)     │ │ Aparelho)  │ │  • Gestão Financeira & Fluxo de Caixa        │
└─────┬──────┘ └─────┬──────┘ └──────────────────────┬───────────────────────┘
      │              │                               │
      └──────────────┼───────────────────────────────┘
                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   Modal Unificado de Renovação + Pagamento                 │
│   Atualiza Vencimento + Histórico + Kanban + Lembretes + Caixa Financeiro  │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        Rotas de API Next.js (Server)                       │
│  /api/dashboard │ /api/clients │ /api/clients/renew │ /api/operations      │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL / Neon Serverless DB                        │
│  clients │ renewals │ interactions │ crm_tasks │ crm_reminders │ payments  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Ciclos de Plano (`plan_type`)**: Suporte na aplicação e nas rotas de validação para `'mensal' | 'trimestral' | 'semestral' | 'anual' | 'vitalicio'` (com migração automática flexível da constraint SQL caso necessário).
- **Transação Atômica de Renovação (`/api/clients/renew`)**:
  - Recebe `{ client_id, renewed_at, plan_type, plan_value, notes, register_payment, payment_method, payment_paid }`.
  - Calcula `new_expiration_date` conforme o ciclo (`mensal` = +1m, `trimestral` = +3m, `semestral` = +6m, `anual` = +12m).
  - Executa em uma única transação: atualização do cliente, inserção em `renewals`, atualização da etiqueta de mês de vencimento, registro em `interactions`, conclusão de `crm_tasks` e `crm_reminders` do ciclo anterior e, se `register_payment` estiver ativo, inserção imediata em `crm_payments`.
- **Métricas Expandidas do Dashboard (`/api/dashboard`)**:
  - Retorna além dos indicadores de clientes: resumo financeiro do mês atual (`received_this_month`, `pending_this_month`, `overdue_total`), distribuição por etapa do Kanban (`kanban_summary`) e lista de prioridades do dia (`urgent_renewals`).

### Interactive Component & State Mapping

- **Navegação Lateral (`RootLayout`)**: Ícones exclusivos do `lucide-react` para cada rota (`LayoutDashboard`, `Users`, `CalendarClock`, `Kanban`, `MessageSquare`, `Wallet`, `Tags`, `ArrowLeftRight`), indicador ativo claro e contador de pendências.
- **Central de Operações (`Operations.tsx`)**:
  - Filtros interativos e busca em tempo real por nome, telefone ou aparelho.
  - Ação de criar novos templates de WhatsApp, editar existentes e copiar/disparar mensagem com log automático em `/api/interactions`.
  - Modal de renovação integrado com preview do novo vencimento e opção de lançamento financeiro simultâneo.
  - Gestão financeira com filtro por situação (*Todos*, *Recebidos*, *Pendentes*, *Atrasados*), criação de lançamento, baixa em 1 clique e exclusão de lançamento com confirmação segura na interface.
