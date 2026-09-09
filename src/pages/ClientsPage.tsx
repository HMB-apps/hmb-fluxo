import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients } from '../hooks/useOrgData'
import { ClientFormModal } from '../components/clients/ClientFormModal'
import { trashClient } from '../data/repositories/clientRepository'
import type { Client } from '../domain/task'

export function ClientsPage() {
  const { items: clients, loading, error, reload } = useClients()
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const navigate = useNavigate()

  async function handleTrash(client: Client, event: React.MouseEvent) {
    event.stopPropagation()
    if (!window.confirm(`Enviar "${client.name}" para a lixeira?`)) return
    await trashClient(client.id)
    reload()
  }

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button type="button" className="primary-button" onClick={() => setEditing('new')}>
          Novo cliente
        </button>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : clients.length === 0 ? (
        <div className="empty-state">Nenhum cliente cadastrado ainda.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Situação</th>
              <th>Peso estratégico</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} onClick={() => navigate(`/clientes/${client.id}`)}>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: client.color ?? '#94a3b8',
                      marginRight: 8,
                    }}
                  />
                  {client.name}
                </td>
                <td>{client.active ? 'Ativo' : 'Inativo'}</td>
                <td>{client.strategicWeight ?? '—'}</td>
                <td>
                  <button
                    type="button"
                    className="link-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(client)
                    }}
                  >
                    Editar
                  </button>{' '}
                  <button type="button" className="link-button" onClick={(e) => void handleTrash(client, e)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <ClientFormModal
          client={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
