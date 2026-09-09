# HMB Fluxo

Central inteligente de demandas da HMB Negócios Digitais. Aplicação web compartilhada, PWA
instalável, com banco de dados central (Supabase) e autenticação individual para Michel e Helena.

> Nome, cores e demais itens de identidade ficam centralizados em [`src/config/branding.ts`](src/config/branding.ts)
> para facilitar troca futura.

Este README cobre a **Fase 1 — Fundação web compartilhada**: autenticação, organização HMB,
convites, políticas de segurança (RLS) e o esqueleto de navegação. As demais fases (tarefas,
quadro, linha do tempo, planejador, IA etc.) serão implementadas em seguida, sem remover o que
já funciona aqui.

> Status: Fase 1 validada de ponta a ponta em um projeto Supabase real (`hmb-fluxo`, região
> `sa-east-1`), incluindo criação da organização, convite e aceite por Michel e Helena.

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
  components/     componentes visuais reutilizáveis (layout, etc.)
  config/         identidade visual, config regional e navegação — nenhum outro
                  arquivo deve hardcodar nome do produto, cores ou timezone
  data/
    supabase/     cliente Supabase, tipos gerados do banco, mapeadores row → domínio
    repositories/ acesso a dados por entidade (única camada que fala com o Supabase)
  domain/         tipos de negócio, independentes do formato das tabelas
  pages/          telas roteadas
  planner/        (Fase 4) motor de planejamento de agenda
  ai/             (Fase 5) integração com IA via interface AIProvider
  notifications/  (Fase 6) notificações internas e push
  realtime/       (fases seguintes) assinaturas Realtime compartilhadas
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

## Limitações conhecidas (Fase 1)

- Convites são compartilhados manualmente por link — não há envio automático de e-mail (exigiria
  configurar um serviço de e-mail transacional; decisão adiada por não ser bloqueadora).
- Não há tela de criação de usuário dentro do app para o primeiro administrador; ele é criado pelo
  painel do Supabase (decisão intencional: evita expor cadastro público, conforme a seção 12.4 do
  briefing).
- Meu Dia, Quadro, Linha do Tempo, Clientes, Projetos, Caixa de Entrada etc. são apenas placeholders
  de navegação nesta fase — a lógica de negócio chega nas Fases 2 a 6.
- Exportação administrativa e backup automatizado pelo app ainda não existem (Fase 6); usar os
  recursos nativos do Supabase enquanto isso.

## Próximas fases

Ver o histórico de commits e o briefing original para o detalhamento completo. Resumo:

- **Fase 2** — clientes, projetos, categorias, tarefas, CRUD completo, lixeira, histórico.
- **Fase 3** — Meu Dia, Quadro Kanban, Calendário, Linha do Tempo manual, capacidade.
- **Fase 4** — prioridade sugerida, dependências, planejador automático com prévia/desfazer.
- **Fase 5** — Caixa de Entrada Inteligente com IA (Anthropic), validação por schema.
- **Fase 6** — recorrências, notificações, modelos de trabalho, exportação e backup administrativos.
- **Fase 7** — testes ponta a ponta, acessibilidade, desempenho, documentação final.
