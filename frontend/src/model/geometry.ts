import { REGISTRY, GRID, PIN_REACH } from './registry'
import type {
  Axis, CircuitElement, Dir, Endpoint, Junction, PinDef, Point, Rotation,
} from './types'

export const snap = (v: number, step = GRID) => Math.round(v / step) * step
export const snapPoint = (p: Point): Point => ({ x: snap(p.x), y: snap(p.y) })

/** Rotate a local point by a multiple of 45 degrees (clockwise on screen, y points down). */
export function rotatePoint(p: Point, rotation: Rotation): Point {
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // Round to 2 decimals so trig noise (6e-16) never breaks exact comparisons; '+ 0' turns -0 into 0.
  const clean = (v: number) => Math.round(v * 100) / 100 + 0
  return { x: clean(p.x * cos - p.y * sin), y: clean(p.x * sin + p.y * cos) }
}

const DIRS: Dir[] = ['N', 'E', 'S', 'W']
/** Pin direction after rotating. At 45-degree steps wires still leave along a grid axis, so snap to the nearest of N/E/S/W. */
export function rotateDir(dir: Dir, rotation: Rotation): Dir {
  const angle = DIRS.indexOf(dir) * 90 + rotation
  return DIRS[Math.round(angle / 90) % 4]
}

export const axisOfDir = (d: Dir): Axis => (d === 'E' || d === 'W' ? 'h' : 'v')

export function nextRotation(r: Rotation): Rotation {
  return ((r + 45) % 360) as Rotation
}

/**
 * Why parts are drawn slightly smaller at 45°, 135°, 225° and 315°:
 * a pin PIN_REACH (30) from the centre, turned by 45°, lands at (21.2, 21.2) — between grid points,
 * so wires and T-junctions would be off the grid. If the part is instead scaled to 2·√2 = 2.83 cells
 * from the centre, the turned pin lands at exactly (20, 20): two cells right, two cells down.
 * The shrink factor is 28.28 / 30 = 0.943, which is hardly visible.
 */
const DIAGONAL_SCALE = (2 * GRID * Math.SQRT2) / PIN_REACH

/** 1 for 0/90/180/270, DIAGONAL_SCALE for the odd multiples of 45. Use for drawing AND for pin positions. */
export const partScale = (rotation: Rotation) => (rotation % 90 === 0 ? 1 : DIAGONAL_SCALE)

/** World position + exit axis of a pin of a placed element. */
export function pinWorld(el: CircuitElement, pin: PinDef): Point & { axis: Axis } {
  const s = partScale(el.rotation)
  const r = rotatePoint({ x: pin.x * s, y: pin.y * s }, el.rotation)
  return { x: el.x + r.x, y: el.y + r.y, axis: axisOfDir(rotateDir(pin.dir, el.rotation)) }
}

export function elementPins(el: CircuitElement) {
  return REGISTRY[el.type].pins.map((pin) => ({ pin, ...pinWorld(el, pin) }))
}

/** Where is this wire end? `axis` is null for junctions (they accept any direction). */
export function endpointPos(
  ep: Endpoint,
  elements: CircuitElement[],
  junctions: Junction[],
): (Point & { axis: Axis | null }) | null {
  if (ep.kind === 'junction') {
    const j = junctions.find((x) => x.id === ep.junctionId)
    return j ? { x: j.x, y: j.y, axis: null } : null
  }
  const el = elements.find((x) => x.id === ep.elementId)
  const pin = el && REGISTRY[el.type].pins.find((p) => p.id === ep.pinId)
  return el && pin ? pinWorld(el, pin) : null
}

export const sameEndpoint = (a: Endpoint, b: Endpoint) =>
  a.kind === 'pin'
    ? b.kind === 'pin' && a.elementId === b.elementId && a.pinId === b.pinId
    : b.kind === 'junction' && a.junctionId === b.junctionId
