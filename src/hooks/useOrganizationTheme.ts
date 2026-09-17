import { useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'

/**
 * Aplica a cor primária customizada da organização (Fase 8) na custom
 * property --primary do tema — só essa cor é customizável por organização;
 * accent/danger/success continuam globais, para não quebrar contraste.
 */
export function useOrganizationTheme(): void {
  const { organization } = useAuth()

  useEffect(() => {
    if (organization?.primaryColor) {
      document.documentElement.style.setProperty('--primary', organization.primaryColor)
    }
    return () => {
      document.documentElement.style.removeProperty('--primary')
    }
  }, [organization?.primaryColor])
}
