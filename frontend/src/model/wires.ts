import { endpointPos } from './geometry'
import { routeWire } from './routing'
import type { CircuitData, Point, Wire } from './types'

/** Final drawn polyline of a wire, or null if one of its ends no longer exists. */
export function wirePath(wire: Wire, data: Pick<CircuitData, 'elements' | 'junctions'>): Point[] | null {
  const a = endpointPos(wire.from, data.elements, data.junctions)
  const b = endpointPos(wire.to, data.elements, data.junctions)
  if (!a || !b) return null
  return routeWire(a, wire.bends, b, a.axis, b.axis, wire.diagonal === true)
}
