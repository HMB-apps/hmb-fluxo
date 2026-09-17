/**
 * Guarda o nome da organização que a pessoa está tentando criar em
 * /solicitar-acesso enquanto ela ainda não está autenticada (ex.: precisa
 * confirmar o e-mail primeiro). Assim, ao voltar já logada, o app retoma a
 * solicitação em vez de cair na tela genérica de "criar espaço de trabalho".
 */
const STORAGE_KEY = 'hmb_pending_org_request_name'

export function setPendingOrgRequestName(orgName: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, orgName)
  } catch {
    // localStorage indisponível (modo privado, etc.) — sem impacto funcional,
    // a pessoa só precisará preencher o nome de novo.
  }
}

export function getPendingOrgRequestName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearPendingOrgRequestName(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ver comentário acima
  }
}
