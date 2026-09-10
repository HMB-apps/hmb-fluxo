import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Rede de segurança final (Fase 7): sem isso, um erro de renderização em
 * qualquer tela deixaria a página inteira em branco, sem explicação, para
 * quem estiver usando o app no dia a dia.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-screen">
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h1>Algo deu errado</h1>
            <p style={{ color: 'var(--text)', marginBottom: 16 }}>
              Encontramos um erro inesperado nesta tela. Seus dados estão salvos no servidor — isso
              afeta só a exibição. Tente recarregar a página.
            </p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
