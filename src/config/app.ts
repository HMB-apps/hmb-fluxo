/**
 * Configurações regionais fixas do MVP (seção 8 do briefing).
 * Podem futuramente virar preferências por organização.
 */
export const appConfig = {
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  weekStartsOn: 1, // segunda-feira
  currency: 'BRL',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
} as const
