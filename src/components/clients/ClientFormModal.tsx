import { useState, type FormEvent } from 'react'
import { Modal } from '../common/Modal'
import { createClient, updateClient, type ClientInput } from '../../data/repositories/clientRepository'
import { useAuth } from '../../auth/AuthProvider'
import type { Client } from '../../domain/task'

export function ClientFormModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null
  onClose: () => void
  onSaved: () => void
}) {
  const { organization, user } = useAuth()
  const [name, setName] = useState(client?.name ?? '')
  const [shortName, setShortName] = useState(client?.shortName ?? '')
  const [color, setColor] = useState(client?.color ?? '#2563eb')
  const [strategicWeight, setStrategicWeight] = useState(client?.strategicWeight?.toString() ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')
  const [active, setActive] = useState(client?.active ?? true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!organization || !user) return
    setStatus('saving')
    setError(null)
    const input: ClientInput = {
      name,
      shortName: shortName || null,
      color,
      strategicWeight: strategicWeight ? Number(strategicWeight) : null,
      notes: notes || null,
      active,
    }
    try {
      if (client) {
        await updateClient(client.id, input)
      } else {
        await createClient(organization.id, user.id, input)
      }
      setStatus('saved')
      onSaved()
      onClose()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o cliente.')
    }
  }

  return (
    <Modal title={client ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="form-grid">
        <label className="form-field-full">
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Nome curto
          <input value={shortName} onChange={(e) => setShortName(e.target.value)} />
        </label>
        <label>
          Cor
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          Peso estratégico
          <input
            type="number"
            value={strategicWeight}
            onChange={(e) => setStrategicWeight(e.target.value)}
            min={0}
            max={10}
          />
        </label>
        <label>
          Situação
          <select value={active ? 'active' : 'inactive'} onChange={(e) => setActive(e.target.value === 'active')}>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <label className="form-field-full">
          Observações
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        <div className="form-actions form-field-full">
          <span className={`save-status ${status}`}>
            {status === 'saving' && 'Salvando…'}
            {status === 'error' && error}
          </span>
          <button type="submit" className="primary-button" disabled={status === 'saving' || !name.trim()}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}
