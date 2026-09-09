import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { ensureWorkSchedule, updateWorkSchedule, type WorkScheduleInput } from '../../data/repositories/scheduleRepository'
import { WEEKDAY_SHORT_LABELS } from '../../domain/schedule'
import type { WorkSchedule } from '../../domain/schedule'

export function WorkScheduleSection() {
  const { organization, user } = useAuth()
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (!organization || !user) return
    let active = true
    ensureWorkSchedule(organization.id, user.id).then((s) => {
      if (active) {
        setSchedule(s)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [organization, user])

  async function persist(next: WorkSchedule) {
    setSchedule(next)
    setStatus('saving')
    const input: WorkScheduleInput = {
      workingDays: next.workingDays,
      startTime: next.startTime,
      endTime: next.endTime,
      lunchStart: next.lunchStart,
      lunchEnd: next.lunchEnd,
      dailyCapacityMinutes: next.dailyCapacityMinutes,
      bufferPercentage: next.bufferPercentage,
      focusBlockMinutes: next.focusBlockMinutes,
    }
    try {
      await updateWorkSchedule(next.id, input)
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  function toggleDay(day: number) {
    if (!schedule) return
    const workingDays = schedule.workingDays.includes(day)
      ? schedule.workingDays.filter((d) => d !== day)
      : [...schedule.workingDays, day].sort()
    void persist({ ...schedule, workingDays })
  }

  if (loading || !schedule) return <p>Carregando…</p>

  return (
    <div>
      <div className="form-field">
        Dias trabalhados
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {WEEKDAY_SHORT_LABELS.map((label, day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={schedule.workingDays.includes(day) ? 'pill priority-normal' : 'pill'}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <label>
          Início do expediente
          <input
            type="time"
            value={schedule.startTime}
            onChange={(e) => void persist({ ...schedule, startTime: e.target.value })}
          />
        </label>
        <label>
          Fim do expediente
          <input
            type="time"
            value={schedule.endTime}
            onChange={(e) => void persist({ ...schedule, endTime: e.target.value })}
          />
        </label>
        <label>
          Início do almoço
          <input
            type="time"
            value={schedule.lunchStart ?? ''}
            onChange={(e) => void persist({ ...schedule, lunchStart: e.target.value || null })}
          />
        </label>
        <label>
          Fim do almoço
          <input
            type="time"
            value={schedule.lunchEnd ?? ''}
            onChange={(e) => void persist({ ...schedule, lunchEnd: e.target.value || null })}
          />
        </label>
        <label>
          Margem para imprevistos (%)
          <input
            type="number"
            min={0}
            max={100}
            value={schedule.bufferPercentage}
            onChange={(e) => void persist({ ...schedule, bufferPercentage: Number(e.target.value) })}
          />
        </label>
        <label>
          Bloco de foco padrão (min)
          <input
            type="number"
            min={15}
            step={15}
            value={schedule.focusBlockMinutes}
            onChange={(e) => void persist({ ...schedule, focusBlockMinutes: Number(e.target.value) })}
          />
        </label>
      </div>

      <p className={`save-status ${status}`} style={{ marginTop: 8 }}>
        {status === 'saving' && 'Salvando…'}
        {status === 'saved' && 'Salvo.'}
        {status === 'error' && 'Não foi possível salvar.'}
      </p>
    </div>
  )
}
