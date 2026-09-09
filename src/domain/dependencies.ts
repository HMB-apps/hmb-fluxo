/**
 * Dependências entre tarefas (seção 19 do briefing): "bloqueia" e "é
 * bloqueada por". Lógica pura para detectar ciclos no cliente (feedback
 * imediato) e para ordenar tarefas respeitando dependências no planejador —
 * a garantia definitiva contra ciclos fica no banco (trigger da migration).
 */

export interface DependencyEdge {
  blockingTaskId: string
  blockedTaskId: string
}

/**
 * Verifica se adicionar a aresta (blockingTaskId -> blockedTaskId) criaria um
 * ciclo, ou seja, se blockedTaskId já alcança blockingTaskId pelas arestas
 * existentes (A bloqueia B bloqueia A).
 */
export function wouldCreateCycle(
  edges: DependencyEdge[],
  blockingTaskId: string,
  blockedTaskId: string,
): boolean {
  if (blockingTaskId === blockedTaskId) return true

  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    if (!adjacency.has(edge.blockingTaskId)) adjacency.set(edge.blockingTaskId, [])
    adjacency.get(edge.blockingTaskId)!.push(edge.blockedTaskId)
  }

  // Existe caminho de blockedTaskId até blockingTaskId?
  const visited = new Set<string>()
  const stack = [blockedTaskId]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === blockingTaskId) return true
    if (visited.has(current)) continue
    visited.add(current)
    for (const next of adjacency.get(current) ?? []) stack.push(next)
  }
  return false
}

/**
 * Ordena tarefas respeitando dependências (Kahn) — usado pelo planejador
 * para nunca programar uma etapa antes da que a bloqueia (regra #9).
 * Tarefas fora de `taskIds` referenciadas em `edges` são ignoradas.
 * Retorna `null` se houver um ciclo (não deveria acontecer, já bloqueado no
 * banco, mas o planejador não deve travar nesse caso).
 */
export function topologicalOrder(taskIds: string[], edges: DependencyEdge[]): string[] | null {
  const idSet = new Set(taskIds)
  const inDegree = new Map<string, number>(taskIds.map((id) => [id, 0]))
  const adjacency = new Map<string, string[]>(taskIds.map((id) => [id, []]))

  for (const edge of edges) {
    if (!idSet.has(edge.blockingTaskId) || !idSet.has(edge.blockedTaskId)) continue
    adjacency.get(edge.blockingTaskId)!.push(edge.blockedTaskId)
    inDegree.set(edge.blockedTaskId, (inDegree.get(edge.blockedTaskId) ?? 0) + 1)
  }

  const queue = taskIds.filter((id) => (inDegree.get(id) ?? 0) === 0)
  const order: string[] = []

  while (queue.length > 0) {
    const current = queue.shift()!
    order.push(current)
    for (const next of adjacency.get(current) ?? []) {
      inDegree.set(next, (inDegree.get(next) ?? 0) - 1)
      if (inDegree.get(next) === 0) queue.push(next)
    }
  }

  return order.length === taskIds.length ? order : null
}
