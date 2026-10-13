# TV Box CRM

CRM para controlar clientes, vencimentos e renovações de planos de TV Box sem depender das etiquetas do WhatsApp.

## O que já funciona

- Cadastro, edição, consulta e exclusão de clientes.
- Cálculo automático do vencimento para planos anuais e semestrais.
- Etiqueta automática pelo mês do vencimento.
- Painel, lembretes, renovação e histórico de atendimento.
- Atalho para conversar no WhatsApp com mensagem pronta.
- Importação CSV/JSON, exportação CSV/JSON e prevenção de telefone duplicado.

## Executar localmente

```bash
npm install
npm run dev
```

O CRM usa PostgreSQL no Neon por meio do driver oficial `@neondatabase/serverless`. A conexão local é carregada de `.env.local`, criado por `neon link` e ignorado pelo Git.

## Preparar o Neon

O projeto está vinculado ao Neon `fancy-dream-92064266`, branch `production`. O esquema versionado está em `database/neon-schema.sql`, e a infraestrutura (Function e Object Storage) está declarada em `neon.ts`.

Antes de publicar o frontend na internet, adicione autenticação. O sistema não deve ficar aberto sem login.

## Formato de importação

CSV separado por vírgula ou ponto e vírgula. Cabeçalhos aceitos:

```text
nome;telefone;plano;valor;data_ativacao;data_vencimento;observacoes;dispositivo;etiqueta
```

Também são aceitos `name`, `phone`, `plan_type` e os demais nomes internos em inglês. Registros sem nome/telefone ou com telefone já cadastrado são ignorados.
