import type { ReactNode } from 'react'
import { isSupabaseConfigured } from '../data/supabase/client'
import { branding } from '../config/branding'

export function ConfigGate({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>{branding.productName}</h1>
          <p className="auth-error">
            O aplicativo ainda não está configurado. Copie <code>.env.example</code> para{' '}
            <code>.env.local</code> e preencha <code>VITE_SUPABASE_URL</code> e{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> com os dados do seu projeto Supabase.
          </p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
