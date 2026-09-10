# HMB Fluxo

Central inteligente de demandas da HMB Negócios Digitais. Aplicação web compartilhada, PWA
instalável, com banco de dados central (Supabase) e autenticação individual para Michel e Helena.

> Nome, cores e demais itens de identidade ficam centralizados em [`src/config/branding.ts`](src/config/branding.ts)
> para facilitar troca futura.

Este README cobre as **Fases 1 a 5**: autenticação, organização HMB, convites, políticas de
segurança (RLS), o núcleo de gestão (clientes, projetos, categorias, tarefas com CRUD completo,
lixeira, histórico, notificações internas), as visualizações operacionais do dia a dia (Meu Dia,
Quadro Kanban com arrastar-e-soltar, Calendário, Linha do Tempo, capacidade de agenda), o
planejamento inteligente (prioridade sugerida, dependências entre tarefas, planejador automático
com prévia e desfazer) e a Caixa de Entrada Inteligente com IA (Google Gemini, gratuito). As fases
restantes (recorrências, modelos de trabalho, exportação/backup administrativos, refinamento final)
serão implementadas em seguida, sem remover o que já funciona aqui.

> Status: Fases 1 a 4 validadas de ponta a ponta em um projeto Supabase real (`hmb-fluxo`, região
> `sa-east-1`). A Fase 5 (Caixa de Entrada com IA) está implementada e publicada (Edge Function
> `interpret-inbox` + Google Gemini), mas a validação final ficou pendente: no momento do teste, a
> API gratuita do Gemini estava respondendo `503 UNAVAILABLE` ("alta demanda") de forma persistente
> — um problema temporário do lado do Google, não do código (o fluxo de erro/retry do app tratou
> isso corretamente, mostrando "Falha na interpretação" com opção de tentar de novo ou criar a
> tarefa manualmente). Vale testar de novo mais tarde pelo botão **Testar conexão** em
> Configurações → Integração com IA.

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
| `0020_task_dependencies.sql` | Tabela `task_dependencies` com trigger que rejeita ciclos |
| `0021_planner_runs.sql` | Tabela `planner_runs` (histórico do planejador, para desfazer) |
| `0022_rls_fase4.sql` | RLS de dependências e execuções do planejador |
| `0023_realtime_fase4.sql` | Habilita Realtime em `task_dependencies` e `planner_runs` |
| `0024_inbox_and_ai.sql` | Tabelas `inbox_entries`, `ai_interpretations` e `ai_settings` |
| `0025_rls_fase5.sql` | RLS da Caixa de Entrada, interpretações e preferências de IA |
| `0026_realtime_fase5.sql` | Habilita Realtime nas três tabelas acima |
| `0027`–`0029` | Ajustes do modelo padrão do Gemini conforme o Google descontinuava versões durante os testes (histórico — ver `supabase/migrations/`) |

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

### 3.4 Configurar a IA (Google Gemini, gratuito)

A interpretação da Caixa de Entrada (Fase 5) roda numa Edge Function do Supabase, não no
frontend — a chave nunca fica no `.env` do app.

1. Crie uma chave gratuita em [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   (começa com `AIzaSy...`).
2. No [painel do Supabase](https://supabase.com/dashboard) do seu projeto, vá em **Edge Functions
   → Secrets** (ou **Project Settings → Edge Functions**) e adicione:
   - Nome: `GEMINI_API_KEY`
   - Valor: a chave copiada no passo 1
3. Publique a função (se ainda não estiver publicada):
   ```bash
   supabase functions deploy interpret-inbox
   ```

Sem essa chave configurada, o resto do app funciona normalmente — só a interpretação por IA fica
indisponível, mostrando um erro claro em vez de travar (regra da seção 5.1 do briefing).

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

## 5.3 Planejamento inteligente (Fase 4)

- **Prioridade sugerida**: calculada automaticamente (`src/domain/priority.ts`) a partir da
  proximidade do prazo, se a tarefa bloqueia outras, se ela mesma depende de algo ainda não
  concluído, e do peso estratégico do cliente. Sempre vem com uma justificativa em português —
  nunca é só um número escondido (seção 17 do briefing). A prioridade manual, quando definida,
  tem precedência sobre a sugerida.
- **Dependências entre tarefas** (no formulário de tarefa, seção "Dependências"): marque que uma
  tarefa é bloqueada por outra; o banco rejeita qualquer combinação que crie um ciclo (A bloqueia
  B bloqueia A), com um trigger dedicado, e a interface também confere antes de tentar salvar.
- **Planejador automático** (botão "Planejar automaticamente" na Linha do Tempo): gera uma prévia
  de agendamento para tarefas com responsável e estimativa que ainda não têm início planejado —
  respeitando dependências (nunca agenda uma etapa antes de quem a bloqueia), capacidade diária de
  cada pessoa e tarefas travadas (que nunca entram na proposta). Nada é aplicado até você revisar
  a lista, desmarcar o que não quiser e confirmar. Cada aplicação fica registrada e pode ser
  desfeita com um clique ("Desfazer última reorganização"), restaurando o início/fim planejado
  anterior de cada tarefa afetada.
- O motor do planejador (`src/domain/planner.ts`) é lógica pura, testada sem precisar de banco.

## 5.4 Caixa de Entrada Inteligente com IA (Fase 5)

- **Como usar** (`/caixa-de-entrada`): escreva livremente uma ou várias demandas no campo de texto.
  **Salvar na caixa de entrada** grava o texto bruto na hora, sem IA — ele nunca se perde, mesmo
  que a interpretação falhe ou esteja desativada (seção 5.1 do briefing). **Interpretar e
  organizar** salva e já manda interpretar.
- **Arquitetura** (seção 24.1): a chamada à IA acontece numa Edge Function do Supabase
  (`supabase/functions/interpret-inbox`), nunca do navegador — a chave fica só no servidor, como
  segredo de ambiente (`GEMINI_API_KEY`), configurado direto no painel do Supabase (nunca passa
  pelo código nem pelo Git). A função usa uma interface `AiProvider` interna com uma implementação
  `GeminiProvider`; trocar de fornecedor no futuro (ex.: Claude, se um dia fizer sentido usar a API
  paga) significa implementar outra classe, sem mudar o resto da função.
- **Revisão antes de aplicar** (seção 10.4): cada demanda interpretada vira um cartão editável, com
  os campos de baixa confiança destacados e a justificativa da IA ao lado. Você pode editar
  qualquer campo, descartar uma demanda individualmente, ou confirmar todas de uma vez — nada é
  criado até confirmar. As tarefas nascem com status "Precisa revisar".
- **Cada campo interpretado carrega valor, confiança (0-1), justificativa e o trecho do texto
  original que originou aquele valor** (seção 24.3) — a resposta da IA é validada nesse formato
  antes de qualquer gravação, nunca é salva "crua".
- **Dependências entre demandas do mesmo texto**: se a IA perceber que uma demanda depende de outra
  do mesmo texto (ex.: "o resumo depende da análise da campanha"), a dependência já vem marcada na
  revisão e é criada automaticamente ao confirmar.
- **Falha da IA** (seção 10.5): o texto continua salvo, o erro aparece de forma simples, e há um
  botão para tentar de novo ou **Transformar manualmente** (abre o formulário de tarefa já com o
  texto original preenchido).
- **Configurações → Integração com IA**: ligar/desligar a interpretação, ver o provedor e o modelo
  configurados, testar a conexão, e um aviso claro do que é enviado ao provedor externo (só o texto
  digitado e os nomes de clientes/categorias já cadastrados — nunca o histórico completo, seção
  24.4).

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
    settings/     configuração de horário de trabalho e integração com IA
    inbox/        revisão das demandas interpretadas pela IA
    planner/      prévia do planejamento automático
    common/       Modal genérico e outros componentes reutilizáveis
  config/         identidade visual, config regional e navegação — nenhum outro
                  arquivo deve hardcodar nome do produto, cores ou timezone
  data/
    supabase/     cliente Supabase, tipos gerados do banco, mapeadores row → domínio
    repositories/ acesso a dados por entidade (única camada que fala com o Supabase)
  domain/         tipos e regras de negócio puros, independentes do formato das tabelas e
                  do React — capacity.ts (capacidade/carga), priority.ts (prioridade
                  sugerida), dependencies.ts (ciclos e ordenação) e planner.ts (motor do
                  planejador automático), todos testados sem precisar de banco
  hooks/          useOrgData (clientes/projetos/categorias/tarefas/membros/horários/
                  bloqueios/caixa de entrada com Realtime embutido) e useRealtimeTable
                  (assinatura genérica por tabela)
  pages/          telas roteadas
supabase/
  migrations/     migrations SQL versionadas, numeradas e aditivas
  functions/
    interpret-inbox/  Edge Function que chama a IA (Fase 5) — só código de backend,
                       nunca embarcado no bundle do frontend
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

## Limitações conhecidas (Fases 1 a 5)

- Convites são compartilhados manualmente por link — não há envio automático de e-mail (exigiria
  configurar um serviço de e-mail transacional; decisão adiada por não ser bloqueadora).
- Não há tela de criação de usuário dentro do app para o primeiro administrador; ele é criado pelo
  painel do Supabase (decisão intencional: evita expor cadastro público, conforme a seção 12.4 do
  briefing).
- Categorias podem ser criadas/desativadas em Configurações, mas a reordenação visual (arrastar
  para cima/baixo) ainda não tem interface própria — dá para ajustar via banco se necessário.
- Recorrências, anexos, lembretes e divisão de tarefas longas em blocos de foco (seções 16.4, 20,
  21 do briefing) ainda não existem — chegam na Fase 6.
- Caixa de Entrada: só aceita texto por enquanto — áudio, imagens, PDFs e links (seção 10.2) ficam
  para uma evolução futura, já previstos no banco (a tabela `inbox_entries` guarda o texto bruto
  independente de como a interpretação evolui).
- A validação de conexão com o Gemini foi feita, mas a interpretação de um texto real ainda não foi
  confirmada de ponta a ponta — a API gratuita estava retornando `503` (alta demanda) no momento do
  teste. O código e o fluxo de erro/retry estão prontos; falta só repetir o teste quando a API
  estiver disponível (ver nota de status no topo deste README).
- O planejador automático (Fase 4) só agenda tarefas que ainda não têm início planejado — ele não
  replaneja o que já está na agenda. Para isso, continue movendo manualmente pelo Quadro, Equipe ou
  Linha do Tempo (que aplicam a mudança na hora). Ele também não divide uma tarefa em vários blocos
  quando ela não cabe num dia só — sinaliza o conflito em vez de dividir.
- "Necessidade de aprovação" (seção 17) ainda não é um campo próprio da tarefa, então não entra
  ainda no cálculo de prioridade sugerida.
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

- **Fase 6** — recorrências, notificações, modelos de trabalho, exportação e backup administrativos.
- **Fase 7** — testes ponta a ponta, acessibilidade, desempenho, documentação final.
