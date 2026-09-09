/**
 * Identidade do produto centralizada aqui para permitir troca de nome,
 * cores e logotipo sem refatorar o restante do sistema (nome é provisório).
 */
export const branding = {
  productName: 'HMB Fluxo',
  organizationName: 'HMB Negócios Digitais',
  tagline: 'Você despeja as demandas. O aplicativo transforma o caos em um plano de trabalho.',
  colors: {
    primary: '#1e293b',
    accent: '#2563eb',
    danger: '#dc2626',
    warning: '#d97706',
    success: '#16a34a',
  },
} as const
