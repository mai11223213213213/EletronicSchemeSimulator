import type { CircuitData, Endpoint } from './types'

export const pinKey = (elementId: string, pinId: string) => `p:${elementId}:${pinId}`
export const endpointKey = (ep: Endpoint) =>
  ep.kind === 'pin' ? pinKey(ep.elementId, ep.pinId) : `j:${ep.junctionId}`

/**
 * Wires are ideal conductors, so everything joined by wires/junctions is ONE electrical node ("net").
 * Union-find: each wire merges the nets of its two ends. `net(key)` then returns the net's name.
 */
export function buildNets(data: CircuitData) {
  const parent = new Map<string, string>()
  const wired = new Set<string>() // every pin/junction that has at least one wire on it
  const find = (k: string): string => {
    const p = parent.get(k)
    if (p === undefined) return k
    const root = find(p)
    parent.set(k, root) // path compression
    return root
  }
  for (const w of data.wires) {
    const a = endpointKey(w.from)
    const b = endpointKey(w.to)
    wired.add(a)
    wired.add(b)
    parent.set(find(a), find(b))
  }
  return { net: find, wired }
}
