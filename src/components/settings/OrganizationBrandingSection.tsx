import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../data/supabase/client'
import { updateOrganizationBranding } from '../../data/repositories/organizationRepository'

/**
 * Identidade visual por organização (Fase 8): cor primária e logo. Chama
 * `supabase.storage` direto daqui em vez de passar por um repositório
 * dedicado — é uma única tela com uma única operação de upload, sem lógica
 * de negócio para testar isoladamente.
 */
export function OrganizationBrandingSection() {
  const { organization, refresh } = useAuth()
  const [color, setColor] = useState(organization?.primaryColor ?? '#1e293b')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const logoUrl = organization?.logoPath
    ? supabase.storage.from('org-logos').getPublicUrl(organization.logoPath).data.publicUrl
    : null

  async function handleSaveColor() {
    if (!organization) return
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      await updateOrganizationBranding(organization.id, { primaryColor: color })
      await refresh()
      setStatus('Cor salva.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a cor.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !organization) return
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      const extension = file.name.split('.').pop() ?? 'png'
      const path = `${organization.id}/logo.${extension}`
      const { error: uploadError } = await supabase.storage.from('org-logos').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      await updateOrganizationBranding(organization.id, { logoPath: path })
      await refresh()
      setStatus('Logo atualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a logo.')
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  return (
    <div>
      <div className="form-grid">
        <label>
          Cor principal
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ height: 40 }} />
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="button" onClick={() => void handleSaveColor()} disabled={saving}>
            Salvar cor
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <strong style={{ fontSize: 13 }}>Logo da organização</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          {logoUrl && (
            <img src={logoUrl} alt="Logo atual" style={{ maxHeight: 64, maxWidth: 200, objectFit: 'contain' }} />
          )}
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(e) => void handleUploadLogo(e)} disabled={saving} />
        </div>
      </div>

      {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
      {status && <p style={{ fontSize: 12, marginTop: 8 }}>{status}</p>}
    </div>
  )
}
