export interface NavItem {
  to: string
  label: string
  icon: string
}

export const navItems: NavItem[] = [
  { to: '/meu-dia', label: 'Meu dia', icon: '☀️' },
  { to: '/equipe', label: 'Equipe', icon: '👥' },
  { to: '/caixa-de-entrada', label: 'Caixa de entrada', icon: '📥' },
  { to: '/linha-do-tempo', label: 'Linha do tempo', icon: '🗓️' },
  { to: '/quadro', label: 'Quadro', icon: '🗂️' },
  { to: '/calendario', label: 'Calendário', icon: '📅' },
  { to: '/clientes', label: 'Clientes', icon: '🏢' },
  { to: '/projetos', label: 'Projetos', icon: '📁' },
  { to: '/recorrencias', label: 'Recorrências', icon: '🔁' },
  { to: '/concluidos', label: 'Concluídos', icon: '✅' },
  { to: '/lixeira', label: 'Lixeira', icon: '🗑️' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙️' },
]
