import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { useRealtimeTable } from '../../hooks/useRealtimeTable'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../data/repositories/notificationRepository'
import type { NotificationItem } from '../../domain/task'

function describeNotification(n: NotificationItem): string {
  const title = typeof n.payload.title === 'string' ? n.payload.title : 'uma tarefa'
  if (n.type === 'task_assigned') return `Você foi atribuído a "${title}"`
  return n.type
}

export function NotificationBell() {
  const { user, organization } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const load = useCallback(async () => {
    if (!user) return
    setItems(await listNotifications(user.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    void load()
  }, [load])

  useRealtimeTable('notifications', organization?.id, load)

  const unreadCount = items.filter((n) => !n.readAt).length

  async function handleOpenNotification(n: NotificationItem) {
    if (!n.readAt) await markNotificationRead(n.id)
    setOpen(false)
    await load()
    if (n.taskId) navigate('/quadro')
  }

  async function handleMarkAllRead() {
    if (!user) return
    await markAllNotificationsRead(user.id)
    await load()
  }

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button type="button" className="notification-bell" onClick={() => setOpen((o) => !o)} aria-label="Notificações">
        🔔
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          {items.length === 0 ? (
            <div className="notification-item">Nenhuma notificação ainda.</div>
          ) : (
            <>
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`notification-item${n.readAt ? '' : ' unread'}`}
                  onClick={() => void handleOpenNotification(n)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void handleOpenNotification(n)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {describeNotification(n)}
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(n.createdAt).toLocaleString('pt-BR')}</div>
                </div>
              ))}
              {unreadCount > 0 && (
                <div className="notification-item">
                  <button type="button" className="link-button" onClick={() => void handleMarkAllRead()}>
                    Marcar tudo como lido
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
