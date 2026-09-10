# Manual de uso — HMB Fluxo

Guia rápido para o dia a dia, sem termos técnicos. Para detalhes de instalação e configuração do
projeto, veja o [README](README.md).

## Acessando o app

- Pelo navegador: abra o endereço publicado do HMB Fluxo e entre com seu e-mail e senha.
- Instalado como aplicativo (recomendado): no Chrome ou Edge, clique no ícone de instalação na
  barra de endereço (ou no menu **⋮ → Instalar HMB Fluxo**). O app passa a abrir em janela própria,
  como um programa normal do computador.
- Esqueceu a senha? Na tela de login, clique em **Esqueci minha senha** e siga o link recebido por
  e-mail.

## O que cada item do menu faz

| Menu | Para que serve |
|---|---|
| **Meu dia** | Tela inicial: o que você tem para fazer hoje, quanto tempo ainda tem disponível, e o que está atrasado. |
| **Equipe** | Visão lado a lado do que Michel e Helena têm na agenda — útil para redistribuir trabalho. |
| **Caixa de entrada** | Anote uma demanda em texto livre (ex.: "criar post pro Instagram do cliente X até sexta") e deixe a IA sugerir os detalhes, ou preencha manualmente. |
| **Linha do tempo** | Visão da semana, uma faixa por pessoa — arraste um bloco para outro dia para reagendar. |
| **Quadro** | As demandas organizadas por status (a caixa de entrada, precisa revisar, planejada, em andamento, etc.) — arraste o cartão para mudar o status. |
| **Calendário** | Visão de mês, com os prazos de entrega e os inícios planejados. |
| **Clientes** / **Projetos** | Cadastro de quem você atende e em que projeto cada demanda se encaixa. |
| **Recorrências** | Veja e gerencie demandas que se repetem automaticamente (reuniões semanais, relatórios mensais etc.). |
| **Concluídos** | Histórico do que já foi entregue. |
| **Lixeira** | Itens excluídos — dá para restaurar ou apagar de vez. |
| **Configurações** | Seu horário de trabalho, integrantes da equipe, categorias, modelos de trabalho, integração com IA e backup. |

## Tarefas do dia a dia

### Criar uma demanda rapidamente

Clique em **+ Adicionar demanda** (topo do menu lateral, disponível em qualquer tela), preencha ao
menos o título e salve. Cliente, projeto, prazo e responsável são opcionais — dá para completar
depois.

### Usar a Caixa de Entrada com IA

1. Vá em **Caixa de entrada** e escreva livremente, como se estivesse anotando num papel — pode
   descrever mais de uma demanda no mesmo texto.
2. Clique em **Interpretar e organizar**. A IA separa o texto em uma ou mais demandas, já tentando
   identificar cliente, prazo, prioridade e outros detalhes.
3. Revise cada campo antes de confirmar — campos em que a IA teve pouca certeza aparecem
   destacados, com a justificativa ao lado. Nada é criado até você clicar em **Confirmar**.
4. Se a IA estiver indisponível ou você preferir não usar, o texto continua salvo e você pode
   clicar em **Transformar manualmente** para preencher os campos você mesmo.

### Repetir uma demanda automaticamente (recorrência)

Abra a demanda que deve se repetir (ex.: "Reunião semanal de status"), vá até a seção
**Recorrência** no formulário, escolha a frequência (diária, semanal em dias específicos, mensal ou
a cada X dias) e clique em **Tornar recorrente**. Depois, use o botão **Gerar próximas demandas**
(ali mesmo ou na tela **Recorrências**) sempre que quiser criar as próximas ocorrências — isso não
duplica o que já foi gerado antes.

### Reaproveitar um roteiro de trabalho (modelo)

Se você tem um tipo de trabalho que sempre segue os mesmos passos (ex.: criar uma landing page,
rodar uma campanha), cadastre-o uma vez em **Configurações → Modelos de trabalho**, com as etapas
na ordem certa. Depois, clique em **Aplicar** sempre que for repetir esse trabalho para um cliente
— o app cria uma demanda para cada etapa, já na ordem certa (uma etapa só libera quando a anterior
termina).

### Convidar alguém para a equipe

Em **Configurações → Equipe**, clique em **Convidar novo integrante**, informe o e-mail e envie o
link gerado por WhatsApp ou e-mail (o app não envia automaticamente ainda). A pessoa convidada abre
o link, cria uma senha e já entra direto na organização.

### Fazer uma cópia de segurança manual

Em **Configurações → Exportação e backup**, clique em **Baixar backup em JSON**. Isso baixa um
arquivo com todas as informações da organização — guarde-o num lugar seguro de vez em quando, além
dos backups automáticos que o Supabase já faz.

## Dúvidas comuns

**Uma tarefa mudou sozinha / apareceu para o outro / sumiu?** Tudo é sincronizado em tempo real —
se você e a outra pessoa estiverem com o app aberto ao mesmo tempo, mudanças de um aparecem para o
outro na hora, sem precisar recarregar a página.

**Editei uma demanda e recebi um aviso de conflito?** Isso significa que outra pessoa salvou uma
mudança na mesma demanda entre o momento em que você abriu e o momento em que tentou salvar. Reveja
a versão atual antes de salvar de novo, para não perder a mudança da outra pessoa.

**Apaguei algo por engano?** Vá em **Lixeira** — clientes, projetos e demandas excluídos ficam lá
até serem apagados definitivamente, e podem ser restaurados a qualquer momento.

**O app não abre / mostra uma tela de erro?** Recarregue a página. Seus dados ficam salvos no
servidor, não no seu computador — um erro de tela não apaga nada.
