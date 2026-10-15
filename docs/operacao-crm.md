# Operação do CRM

## Acesso

O serviço Neon Auth gerencia senhas e sessões. O CRM aceita apenas e-mails verificados presentes em `CRM_ALLOWED_EMAILS`. O administrador inicial é `guigasprogramador@gmail.com`. As APIs verificam a sessão antes de consultar ou alterar dados. Páginas privadas redirecionam para `/login`.

Configure `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (aleatório, pelo menos 32 caracteres) e `CRM_ALLOWED_EMAILS` como segredos do Worker. Autorize o domínio de produção no Neon Auth. A tela de login permite verificar e-mail por código, sair e recuperar senha.

## Renovações e atendimento

`/renovacoes` apresenta vencimentos hoje, em 7 ou 30 dias, vencidos, renovados e datas pendentes. Planos vitalícios e cancelados não entram nas filas de vencimento. Cada ciclo com data tem um cartão independente em `/kanban`, com etapa, próximo contato e anotações. Mova os cartões arrastando ou escolhendo a etapa.

Confirmar renovação atualiza ativação e vencimento, preserva as datas anteriores no histórico e encerra o atendimento e lembretes anteriores. Esta ação não registra recebimento: o pagamento deve ser lançado no financeiro.

## WhatsApp

`/mensagens` permite editar modelos e preparar mensagens com `{nome}`, `{vencimento}` e `{valor}`. A conversa abre no WhatsApp; a pessoa responsável revisa e envia. Nenhum envio automático ou disparo em massa é realizado.

## Lembretes

O Worker executa a geração diariamente às 08h de Brasília (11h UTC), além da atualização ao abrir operações. Os marcos são 30 e 7 dias antes, no vencimento, 3 e 15 dias depois. As chaves por cliente, ciclo e marco impedem duplicações. Lembretes concluídos não reaparecem no mesmo ciclo. A fila operacional considera vencimentos dos últimos 30 dias e dos próximos 30; vencimentos mais antigos continuam na central.

## Financeiro

`/financeiro` registra cobranças e recebimentos, com cliente opcional, descrição, valor, data e método. Dar baixa marca a data do recebimento. Os totais recebido, a receber, atrasado e por mês usam lançamentos financeiros, nunca inferem receita recebida a partir do preço dos planos.

## Manutenção

Migração: `node --env-file=.env.local scripts/migrate-operations.mjs`. Prefira `DATABASE_URL_UNPOOLED` para migrações.

Desenvolvimento com autenticação local: carregue também `.env.auth.local` no ambiente do processo antes de iniciar o Next. Não publique esses arquivos.

Build Cloudflare: `npm run build:cloudflare`. O script afasta temporariamente os arquivos de ambiente para evitar que o OpenNext incorpore credenciais no pacote e os restaura ao terminar. Não interrompa o processo. Se o computador desligar durante o build, o backup fica no diretório temporário `crm-build-env-*`.

Publicação: `npm run deploy`. Requer credencial Cloudflare apenas no ambiente do processo. O agendamento depende da publicação de `wrangler.jsonc` com `cloudflare-worker.ts`.
