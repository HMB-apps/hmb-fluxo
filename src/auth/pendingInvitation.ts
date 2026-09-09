/**
 * Guarda o token do convite que o usuário está tentando aceitar enquanto ele
 * ainda não está autenticado (ex.: precisa confirmar o e-mail primeiro).
 * Assim, ao voltar já logado, o app retoma o aceite em vez de cair na tela
 * de "criar espaço de trabalho".
 */
const STORAGE_KEY = 'hmb_pending_invitation_token'

export function setPendingInvitationToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // localStorage indisponível (modo privado, etc.) — sem impacto funcional,
    // a pessoa só precisará reabrir o link do convite manualmente.
  }
}

export function getPendingInvitationToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function clearPendingInvitationToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ver comentário acima
  }
}
