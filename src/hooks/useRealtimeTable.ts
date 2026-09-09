import { useEffect, useRef } from 'react'
import { supabase } from '../data/supabase/client'

let channelSequence = 0

/**
 * Assina mudanças Realtime de uma tabela filtrada por organização e chama
 * `onChange` a cada evento, para refletir edições do outro usuário sem
 * recarregar a página (seção 5.6 do briefing).
 *
 * Cada instância usa um nome de canal único: o cliente Supabase reaproveita
 * o mesmo objeto de canal quando o nome já existe, e chamar `.on(...)` nele
 * depois que outra instância já rodou `.subscribe()` lança erro. Como várias
 * telas/componentes podem usar a mesma tabela ao mesmo tempo (ex.: o filtro
 * de clientes do Quadro e o formulário de nova tarefa), cada assinatura
 * precisa do seu próprio canal.
 */
export function useRealtimeTable(table: string, organizationId: string | undefined, onChange: () => void): void {
  const idRef = useRef<number | null>(null)
  if (idRef.current === null) idRef.current = channelSequence++

  useEffect(() => {
    if (!organizationId) return
    const channel = supabase
      .channel(`${table}-${organizationId}-${idRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `organization_id=eq.${organizationId}` },
        () => onChange(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, organizationId])
}
