import { elementNames } from './naming'
import { buildNets, pinKey } from './netlist'
import { REGISTRY } from './registry'
import { isSource } from './sources'
import type { CircuitData } from './types'

export interface Problem {
  message: string
  /** The part to highlight on the canvas, when the problem belongs to one. */
  elementId?: string
}

export interface CheckResult {
  /** Block the simulation. */
  errors: Problem[]
  /** Simulation still runs, but the user should know. */
  warnings: string[]
}

/**
 * "Is the circuit finished?" — the checks run before every simulation:
 *  1. there is at least one power source,
 *  2. every pin of every part has a wire on it,
 *  3. every part is connected to a power source,
 *  4. every part lies on a CLOSED LOOP (current has a way back to the source).
 * Check 4 uses graph theory: a part is on a loop exactly when it is not a "bridge"
 * (an edge whose removal would split the circuit in two).
 */
export function checkCircuit(data: CircuitData): CheckResult {
  const { elements } = data
  const errors = new Map<string, Problem>() // one message per part: the first one found wins
  const warnings: string[] = []
  const names = elementNames(elements)
  const flag = (elementId: string, message: string) => {
    if (!errors.has(elementId)) errors.set(elementId, { elementId, message: `${names[elementId]}: ${message}` })
  }

  if (elements.length === 0) return { errors: [{ message: 'The canvas is empty — place some components.' }], warnings }
  if (!elements.some(isSource)) {
    return { errors: [{ message: 'There is no power source — add one from the components list.' }], warnings }
  }

  const { net, wired } = buildNets(data)

  // 2. dangling pins
  for (const el of elements) {
    for (const pin of REGISTRY[el.type].pins) {
      if (!wired.has(pinKey(el.id, pin.id))) flag(el.id, `pin "${pin.id}" is not connected to anything.`)
    }
  }

  // Every part is an edge between the nets of its two pins.
  const edges = elements.map((el) => {
    const [p, q] = REGISTRY[el.type].pins
    return { el, a: net(pinKey(el.id, p.id)), b: net(pinKey(el.id, q.id)) }
  })
  const nodeId = new Map<string, number>()
  const id = (n: string) => {
    if (!nodeId.has(n)) nodeId.set(n, nodeId.size)
    return nodeId.get(n)!
  }
  edges.forEach((e) => { id(e.a); id(e.b) })
  const adj: [to: number, edge: number][][] = Array.from({ length: nodeId.size }, () => [])
  edges.forEach((e, i) => {
    const a = id(e.a)
    const b = id(e.b)
    if (a === b) {
      warnings.push(`${names[e.el.id]} is short-circuited by a wire.`)
      return // a loop on its own: never a bridge, adds nothing to connectivity
    }
    adj[a].push([b, i])
    adj[b].push([a, i])
  })

  // 3. connected components: flood-fill from every node, remember which ones contain a power source
  const comp = new Array<number>(nodeId.size).fill(-1)
  let comps = 0
  for (let s = 0; s < nodeId.size; s++) {
    if (comp[s] !== -1) continue
    const stack = [s]
    comp[s] = comps
    while (stack.length) {
      for (const [to] of adj[stack.pop()!]) {
        if (comp[to] === -1) { comp[to] = comps; stack.push(to) }
      }
    }
    comps++
  }
  const hasSource = new Array<boolean>(comps).fill(false)
  for (const e of edges) if (isSource(e.el)) hasSource[comp[id(e.a)]] = true
  for (const e of edges) {
    if (!hasSource[comp[id(e.a)]]) flag(e.el.id, 'is not connected to a power source.')
  }

  // 4. bridges (Tarjan low-link). Parallel parts are separate edges, so they protect each other.
  const disc = new Array<number>(nodeId.size).fill(0)
  const low = new Array<number>(nodeId.size).fill(0)
  let timer = 0
  const bridges = new Set<number>()
  const dfs = (u: number, viaEdge: number) => {
    disc[u] = low[u] = ++timer
    for (const [v, ei] of adj[u]) {
      if (ei === viaEdge) continue
      if (disc[v]) low[u] = Math.min(low[u], disc[v])
      else {
        dfs(v, ei)
        low[u] = Math.min(low[u], low[v])
        if (low[v] > disc[u]) bridges.add(ei)
      }
    }
  }
  for (let n = 0; n < nodeId.size; n++) if (!disc[n]) dfs(n, -1)
  for (const i of bridges) flag(edges[i].el.id, 'is not part of a closed loop — the circuit is open here.')

  // Not an error: an open switch is a legitimate state, but it explains "why is nothing happening".
  if (elements.some((e) => e.type === 'switch' && e.props.closed !== true)) {
    warnings.push('A switch is open — no current will flow through its branch.')
  }
  return { errors: [...errors.values()], warnings }
}
