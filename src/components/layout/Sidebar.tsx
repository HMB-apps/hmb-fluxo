import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { navItems } from '../../config/navigation'
import { branding } from '../../config/branding'
import { TaskFormModal } from '../tasks/TaskFormModal'

export function Sidebar() {
  const [creatingTask, setCreatingTask] = useState(false)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">{branding.productName}</div>
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
      </nav>

      {creatingTask && (
        <TaskFormModal task={null} onClose={() => setCreatingTask(false)} onSaved={() => setCreatingTask(false)} />
      )}
    </aside>
  )
}
