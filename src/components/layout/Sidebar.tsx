import { NavLink } from 'react-router-dom'
import { navItems } from '../../config/navigation'
import { branding } from '../../config/branding'

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">{branding.productName}</div>
      <button type="button" className="quick-capture-button" onClick={() => alert('Captura rápida chega na Fase 5')}>
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
    </aside>
  )
}
