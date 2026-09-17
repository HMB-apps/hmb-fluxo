import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { navItems } from '../../config/navigation'
import { branding } from '../../config/branding'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../data/supabase/client'
import { TaskFormModal } from '../tasks/TaskFormModal'

export function Sidebar() {
  const { organization, isPlatformAdmin } = useAuth()
  const [creatingTask, setCreatingTask] = useState(false)

  const logoUrl = organization?.logoPath
    ? supabase.storage.from('org-logos').getPublicUrl(organization.logoPath).data.publicUrl
    : null

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {logoUrl ? (
          <img src={logoUrl} alt={organization?.name ?? branding.productName} className="sidebar-org-logo" />
        ) : (
          branding.productName
        )}
      </div>
      <button type="button" className="quick-capture-button" onClick={() => setCreatingTask(true)}>
        + Adicionar demanda
      </button>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        {isPlatformAdmin && (
          <NavLink to="/superadmin" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon" aria-hidden="true">
              🛡️
            </span>
            Painel da plataforma
          </NavLink>
        )}
      </nav>

      {creatingTask && (
        <TaskFormModal task={null} onClose={() => setCreatingTask(false)} onSaved={() => setCreatingTask(false)} />
      )}
    </aside>
  )
}
