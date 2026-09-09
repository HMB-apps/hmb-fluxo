# HMB Fluxo

Central inteligente de demandas da HMB Negócios Digitais. Aplicação web compartilhada, PWA
instalável, com banco de dados central (Supabase) e autenticação individual para Michel e Helena.

> Nome, cores e demais itens de identidade ficam centralizados em [`src/config/branding.ts`](src/config/branding.ts)
> para facilitar troca futura.

Este README cobre as **Fases 1, 2 e 3**: autenticação, organização HMB, convites, políticas de
segurança (RLS), o núcleo de gestão (clientes, projetos, categorias, tarefas com CRUD completo,
lixeira, histórico, notificações internas) e as visualizações operacionais do dia a dia — Meu Dia,
Quadro Kanban com arrastar-e-soltar, Calendário, Linha do Tempo e capacidade de agenda. As demais
fases (planejador automático, IA) serão implementadas em seguida, sem remover o que já funciona
aqui.

> Status: Fases 1, 2 e 3 validadas em um projeto Supabase real (`hmb-fluxo`, região `sa-east-1`),
> incluindo organização, convite/aceite por Michel e Helena, CRUD de clientes/tarefas, notificação
> automática, edição com controle de concorrência, histórico de auditoria, cálculo de capacidade
> diária e as telas Meu Dia, Equipe, Calendário e Linha do Tempo com dados reais.

---

## 1. Requisitos de desenvolvimento

- Node.js 20 ou superior (testado com Node 24)
- Uma conta e um projeto no [Supabase](https://supabase.com)
- Navegador Chromium (Edge ou Chrome) para testar a instalação como PWA

## 2. Instalação das dependências

```bash
npm install
```

## 3. Configuração do Supabase

### 3.1 Criar o projeto

Crie um projeto no [painel do Supabase](https://supabase.com/dashboard) (se ainda não tiver um).
Depois, em **Project Settings → API**, copie:

- **Project URL**
- **anon public key** (nunca a `service_role`)

### 3.2 Rodar as migrations

As migrations em [`supabase/migrations/`](supabase/migrations) criam as tabelas, os triggers e as
políticas de RLS da Fase 1. Rode-as **em ordem** (0001 → 0006), pelo **SQL Editor** do painel do
Supabase (cole o conteúdo de cada arquivo e execute) ou via Supabase CLI:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

O que cada migration faz:

| Arquivo | Conteúdo |
|---|---|
| `0001_organizations_profiles_members.sql` | Tabelas `organizations`, `profiles`, `organization_members`; trigger que cria o perfil automaticamente ao registrar um usuário |
| `0002_invitations.sql` | Tabela `invitations` |
| `0003_rls_policies.sql` | Ativa Row Level Security e cria as políticas de leitura/escrita |
| `0004_bootstrap_and_invitations_rpc.sql` | Funções `claim_first_organization` e `accept_invitation` |
| `0005_realtime.sql` | Habilita Realtime nas tabelas de membros/perfis |
| `0006_invitation_preview.sql` | Função pública para pré-visualizar um convite pelo token, antes do login |
| `0007_security_hardening.sql` | Corrige avisos do linter de segurança (search_path, permissões de funções) |
| `0008_revoke_anon_helper_functions.sql` | Remove acesso de `anon` às funções internas de apoio ao RLS |
| `0009_clients_projects_categories.sql` | Tabelas `clients`, `projects`, `categories` |
| `0010_seed_default_categories_on_bootstrap.sql` | Semeia as categorias sugeridas (seção 12.3) ao criar o espaço de trabalho |
| `0011_tasks.sql` | Tabela `tasks` (com subtarefas via `parent_task_id`), `tags`, `task_tags` |
| `0012_notifications_audit_log.sql` | Tabelas `notifications` e `audit_log` |
| `0013_rls_fase2.sql` | RLS de clientes, projetos, categorias, tarefas, tags e histórico |
| `0014_task_triggers.sql` | Autor/editor automáticos, concorrência otimista (`row_version`), datas de conclusão/cancelamento, histórico e notificação de atribuição |
| `0015_realtime_fase2.sql` | Habilita Realtime em clientes, projetos, categorias, tarefas e notificações |
| `0016_security_hardening_fase2.sql` | Corrige avisos de segurança das novas funções |
| `0017_work_schedules_and_calendar_blocks.sql` | Tabelas `work_schedules` (horário/capacidade por pessoa) e `calendar_blocks` (feriados, ausências, reuniões) |
| `0018_rls_fase3.sql` | RLS de horário de trabalho (só o próprio dono edita) e bloqueios de agenda |
| `0019_realtime_fase3.sql` | Habilita Realtime em `work_schedules` e `calendar_blocks` |

### 3.3 Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com a URL e a anon key do seu projeto:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=coloque-a-anon-key-aqui
```

`.env.local` nunca deve ser commitado (já está no `.gitignore`).

## 4. Execução local

```bash
npm run dev
```

Abra `http://localhost:5173`.

## 5. Primeiro acesso (bootstrap da organização)

1. Na tela de login, ainda não existe conta — vá em **Supabase → Authentication → Users → Add
   user** e crie o primeiro usuário (Michel) com e-mail e senha, **ou** habilite o cadastro público
   temporariamente só para este primeiro acesso administrativo (mais simples: crie o usuário
   direto pelo painel do Supabase, é a forma recomendada, já que este app não expõe cadastro
   público por padrão — ver seção 12.4 do briefing).
2. Faça login em `/login` com o e-mail e a senha criados.
3. Como o usuário ainda não pertence a nenhuma organização, o app mostra a tela **"Criar espaço de
   trabalho"**. Confirme o nome (padrão: "HMB Negócios Digitais"). Isso cria a organização e torna
   esse usuário administrador.
4. Em **Configurações → Equipe**, use **Convidar novo integrante** para gerar um link de convite
   para Helena. O app mostra o link (`/convite/<token>`) na própria tela, com botão **Copiar
   link**, para você enviar por e-mail ou WhatsApp — o envio automático desse link específico fica
   para uma fase futura (ver "Limitações conhecidas").
5. Helena abre o link, informa nome e senha. Se a confirmação de e-mail estiver ativada no projeto
   (padrão do Supabase), ela recebe um e-mail de confirmação automático do próprio Supabase; ao
   clicar no link recebido, volta autenticada e o app retoma sozinho o aceite do convite pendente
   (usa `localStorage` para lembrar qual convite ela estava aceitando). Se a confirmação estiver
   desativada, o aceite acontece na hora, sem passo extra.

## 5.1 Núcleo de gestão (Fase 2)

Com a organização criada, o app já opera de verdade:

- **Clientes** (`/clientes`): cadastro, edição, página de detalhe com demandas abertas e
  concluídas, envio à lixeira.
- **Projetos** (`/projetos`): vinculados a um cliente ou internos à HMB, com status
  ativo/pausado/encerrado.
- **Categorias**: gerenciadas em Configurações — a organização já nasce com as 15 categorias
  sugeridas na seção 12.3 do briefing, editáveis e desativáveis.
- **Tarefas** (`/quadro`, por enquanto uma lista filtrável — o Kanban visual chega na Fase 3):
  CRUD completo, subtarefas (`parent_task_id`), tags, responsável, prioridade manual, prazos,
  status, estimativas, e uma tarefa pode existir sem cliente/projeto/prazo (regra #3 do briefing).
- **Concluídos** (`/concluidos`) e **Lixeira** (`/lixeira`): lixeira reúne clientes, projetos e
  tarefas enviados para exclusão, com restaurar e excluir definitivamente (só permitido sobre um
  registro já na lixeira — nunca uma exclusão direta).
- **Notificações internas**: sino no cabeçalho, com contagem de não lidas; ao atribuir uma tarefa
  a alguém, essa pessoa recebe uma notificação automaticamente (regra #18).
- **Histórico**: toda criação, mudança de status, reatribuição, reagendamento e edição de
  conteúdo relevante de uma tarefa fica registrada em `audit_log`, com autor e data.
- **Edição concorrente segura** (cenário 6 do briefing): cada tarefa carrega um `row_version`;
  se Michel e Helena editarem a mesma tarefa ao mesmo tempo, quem salvar por último recebe um
  aviso de conflito em vez de sobrescrever silenciosamente a mudança do outro.
- **Tempo real**: mudanças em clientes, projetos, categorias, tarefas e notificações aparecem para
  o outro usuário sem recarregar a página.

## 5.2 Visualizações operacionais (Fase 3)

- **Meu Dia** (`/meu-dia`, tela inicial): saudação, capacidade disponível hoje, carga programada
  e percentual de ocupação (com alerta de sobrecarga), tarefas atrasadas, tarefas de hoje com
  ações rápidas (iniciar/pausar/concluir), entregas ao cliente do dia, itens aguardando ação, e
  um seletor para ver o dia de Michel ou de Helena.
- **Quadro** (`/quadro`): agora é um Kanban de verdade — colunas por status, cartões arrastáveis
  entre colunas (arrastar muda o status), opção de ocultar colunas vazias, indicadores de atraso,
  cliente e bloqueio de agenda no cartão. Tarefas travadas (`schedule_locked`) não podem ser
  arrastadas.
- **Equipe** (`/equipe`): uma raia por pessoa (+ "Sem responsável") com as tarefas ativas de cada
  um e a capacidade do dia; arrastar um cartão para outra raia reatribui a tarefa, com aviso se
  isso sobrecarregar a agenda de quem vai receber.
- **Calendário** (`/calendario`): visão mensal com as tarefas no dia do prazo ao cliente ou do
  início planejado.
- **Linha do Tempo** (`/linha-do-tempo`): visão semanal com uma raia por pessoa; arrastar um bloco
  para outro dia ou pessoa reagenda o início/fim planejado sem alterar o prazo de entrega ao
  cliente (regra #7 do briefing).
- **Horário de trabalho** (Configurações → Meu horário de trabalho): cada pessoa configura os
  próprios dias úteis, horário de expediente, almoço, margem para imprevistos e duração padrão de
  bloco de foco — usado no cálculo de capacidade em Meu Dia e Equipe.
- **Cálculo de capacidade**: isolado e testável em `src/domain/capacity.ts` — desconta almoço,
  bloqueios de agenda (feriados/ausências/reuniões) e aplica a margem de imprevistos configurada.

## 6. Testes

```bash
npm run test        # testes unitários (Vitest)
npm run test:watch  # modo watch
npm run test:e2e    # testes de ponta a ponta (Playwright); requer `npm run build` prévio
```

## 7. Build de produção

```bash
npm run build
npm run preview   # serve o build localmente para conferência
```

## 8. Deploy (HTTPS obrigatório para PWA)

Qualquer hospedagem estática com HTTPS funciona (Vercel, Netlify, Cloudflare Pages). Passos gerais:

1. Conecte o repositório à plataforma escolhida.
2. Configure as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no painel da
   hospedagem (nunca a `service_role`).
3. Comando de build: `npm run build`. Diretório de saída: `dist`.
4. Configure fallback de rotas para `index.html` (SPA) — necessário para rotas como `/convite/:token`.

## 9. Instalação como PWA (Edge/Chrome, Windows)

1. Acesse o endereço HTTPS publicado.
2. Clique no ícone de instalação na barra de endereço (ou menu **⋮ → Instalar HMB Fluxo**).
3. O app abre em janela própria e passa a aparecer no menu Iniciar.
4. Atualizações de versão são aplicadas automaticamente (service worker com `autoUpdate`); os dados
   continuam no Supabase e não são apagados.

Se o navegador não oferecer instalação automática, o app continua funcionando normalmente pelo
navegador — a instalação é uma conveniência, não um requisito.

## 10. Convite e gestão de usuários

Feito por qualquer administrador em **Configurações → Equipe**:

- **Convidar**: gera um link de convite válido por 7 dias.
- **Revogar**: invalida um convite pendente.
- **Desativar/Reativar**: remove o acesso de um integrante sem apagar suas tarefas ou seu
  histórico (a autoria de tarefas passadas é preservada).

## 11. Backup e restauração

A Fase 1 não implementa ainda a tela de exportação administrativa (prevista para a Fase 6). Até lá,
use os recursos nativos do Supabase:

- **Backups automáticos**: painel do Supabase → Database → Backups (diário no plano Pro).
- **Backup manual**: `pg_dump` via connection string do projeto (Settings → Database).

## 12. Atualização de versão

`git pull` + `npm install` (se houver novas dependências) + `npm run build` + novo deploy. Como o
banco é centralizado e as migrations são versionadas e aditivas, atualizar o código não apaga dados
existentes. Novas migrations devem ser aplicadas antes de publicar uma versão que dependa delas.

---

## Arquitetura

```
src/
  app/            bootstrap do roteamento e do gate de configuração
  auth/           contexto de autenticação (sessão, perfil, organização ativa)
  components/
    layout/       Sidebar, Header, sino de notificações
    clients/      formulário de cliente
    projects/     formulário de projeto
    tasks/        formulário completo de tarefa, cartão e coluna do Kanban
    settings/     configuração de horário de trabalho
    common/       Modal genérico e outros componentes reutilizáveis
  config/         identidade visual, config regional e navegação — nenhum outro
                  arquivo deve hardcodar nome do produto, cores ou timezone
  data/
    supabase/     cliente Supabase, tipos gerados do banco, mapeadores row → domínio
    repositories/ acesso a dados por entidade (única camada que fala com o Supabase)
  domain/         tipos e regras de negócio puros, independentes do formato das tabelas —
                  inclui capacity.ts (cálculo de capacidade/carga, testado sem banco)
  hooks/          useOrgData (clientes/projetos/categorias/tarefas/membros/horários/
                  bloqueios com Realtime embutido) e useRealtimeTable (assinatura
                  genérica por tabela)
  pages/          telas roteadas
  planner/        (Fase 4) motor de planejamento de agenda
  ai/             (Fase 5) integração com IA via interface AIProvider
supabase/
  migrations/     migrations SQL versionadas, numeradas e aditivas
e2e/              testes Playwright
```

Camadas de negócio (domínio, planejador, cálculo de prioridade) não importam nada de `data/` ou de
componentes React — apenas o inverso. Isso mantém a lógica testável sem precisar de um banco real.

### Segurança

- Toda tabela de negócio tem Row Level Security ativada; nenhuma política depende apenas de
  `authenticated`, todas verificam participação ativa na organização (`is_org_member` /
  `is_org_admin`, funções `SECURITY DEFINER` em `0003_rls_policies.sql`).
- Criação de organização e aceite de convite passam por funções RPC `SECURITY DEFINER`
  (`claim_first_organization`, `accept_invitation`), nunca por insert direto do cliente.
- A chave usada no frontend é sempre a `anon public key`. A `service_role` nunca deve ser exposta
  no navegador nem commitada.

## Limitações conhecidas (Fases 1, 2 e 3)

- Convites são compartilhados manualmente por link — não há envio automático de e-mail (exigiria
  configurar um serviço de e-mail transacional; decisão adiada por não ser bloqueadora).
- Não há tela de criação de usuário dentro do app para o primeiro administrador; ele é criado pelo
  painel do Supabase (decisão intencional: evita expor cadastro público, conforme a seção 12.4 do
  briefing).
- Caixa de Entrada ainda é um placeholder de navegação — a interpretação por IA chega na Fase 5.
- Categorias podem ser criadas/desativadas em Configurações, mas a reordenação visual (arrastar
  para cima/baixo) ainda não tem interface própria — dá para ajustar via banco se necessário.
- Dependências entre tarefas, priorização automática, recorrências, anexos, lembretes e divisão em
  blocos de foco (seções 16.2, 16.4, 17, 19, 20, 21 do briefing) ainda não existem — chegam nas
  Fases 4 e 6. O planejador automático com prévia/desfazer também é Fase 4: por enquanto, mover uma
  tarefa no Quadro, na Equipe ou na Linha do Tempo aplica a mudança na hora.
- "Tarefas criadas por outra pessoa e ainda não visualizadas" (seção 14) não tem rastreamento
  próprio ainda — hoje isso é coberto pela notificação de atribuição.
- Reordenação manual das tarefas dentro de "Hoje" em Meu Dia ainda não existe (a lista é ordenada
  pelo horário planejado).
- Salvamento do formulário de tarefa é explícito (botão Salvar) com indicação de
  salvando/erro/conflito, não autosave campo a campo.
- Exportação administrativa e backup automatizado pelo app ainda não existem (Fase 6); usar os
  recursos nativos do Supabase enquanto isso.
- Interações de arrastar-e-soltar (Quadro, Equipe, Linha do Tempo) usam `@dnd-kit` com sensor de
  ponteiro padrão — funcionam normalmente com mouse/touch reais; alguns ambientes de automação de
  navegador têm dificuldade em simular o gesto de arrastar.

## Próximas fases

Ver o histórico de commits e o briefing original para o detalhamento completo. Resumo:

- **Fase 4** — prioridade sugerida, dependências, planejador automático com prévia/desfazer.
- **Fase 5** — Caixa de Entrada Inteligente com IA (Anthropic), validação por schema.
- **Fase 6** — recorrências, notificações, modelos de trabalho, exportação e backup administrativos.
- **Fase 7** — testes ponta a ponta, acessibilidade, desempenho, documentação final.
