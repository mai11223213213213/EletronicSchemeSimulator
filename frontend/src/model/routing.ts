import { GRID } from './registry'
import type { Axis, Point } from './types'

const onGrid = (v: number) => Math.round(v / GRID) * GRID
const eq = (a: Point, b: Point) => a.x === b.x && a.y === b.y

/** Intermediate corner points needed to go from p to q using only horizontal/vertical lines. */
function elbow(p: Point, q: Point, startAxis: Axis, endAxis: Axis | null): Point[] {
  if (p.x === q.x || p.y === q.y) return []
  if (startAxis === 'h' && endAxis === 'h') {
    const mx = onGrid((p.x + q.x) / 2) // Z-shape, middle on the grid
    return [{ x: mx, y: p.y }, { x: mx, y: q.y }]
  }
  if (startAxis === 'v' && endAxis === 'v') {
    const my = onGrid((p.y + q.y) / 2)
    return [{ x: p.x, y: my }, { x: q.x, y: my }]
  }
  // L-shape: leave along startAxis, arrive along the other one.
  return startAxis === 'h' ? [{ x: q.x, y: p.y }] : [{ x: p.x, y: q.y }]
}

/** Drop duplicate points and middle points of straight runs. */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = []
  for (const p of points) {
    if (out.length && eq(out[out.length - 1], p)) continue
    out.push(p)
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3)
      const straight = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)
      if (!straight) break
      out.splice(out.length - 2, 1)
    }
  }
  return out
}

/**
 * Turns [start, ...bends, end] into a path made only of horizontal and vertical segments.
 * Leaves the start pin along `startAxis` and arrives at the end pin along `endAxis`,
 * the way a drawn schematic does.
 */
export function routeOrthogonal(
  start: Point,
  bends: Point[],
  end: Point,
  startAxis: Axis | null,
  endAxis: Axis | null,
): Point[] {
  const pts = [start, ...bends, end].map(({ x, y }) => ({ x, y })) // drop extra fields like `axis`
  const out: Point[] = [pts[0]]
  let axis: Axis = startAxis ?? 'h'
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i]
    const q = pts[i + 1]
    const last = i === pts.length - 2
    out.push(...elbow(p, q, axis, last ? endAxis : null), q)
    const a = out[out.length - 2]
    const b = out[out.length - 1]
    if (!eq(a, b)) axis = a.y === b.y ? 'h' : 'v'
  }
  return simplify(out)
}

/**
 * Free-angle wire: just straight segments  start → bend 1 → bend 2 → … → end.
 * Nothing is inserted between the points, so a segment can run at any angle (diagonal).
 */
export function routeDiagonal(start: Point, bends: Point[], end: Point): Point[] {
  const out: Point[] = []
  for (const { x, y } of [start, ...bends, end]) { // destructure to drop extra fields like `axis`
    const p = { x, y }
    if (!out.length || !eq(out[out.length - 1], p)) out.push(p) // skip duplicates
  }
  return out
}

/** The one entry point the app uses: picks the routing style of the wire. */
export function routeWire(
  start: Point,
  bends: Point[],
  end: Point,
  startAxis: Axis | null,
  endAxis: Axis | null,
  diagonal: boolean,
): Point[] {
  return diagonal ? routeDiagonal(start, bends, end) : routeOrthogonal(start, bends, end, startAxis, endAxis)
}

export const toPathData = (pts: Point[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')

/**
 * Closest point on the path to `p`, with the index of the segment it lies on.
 * Works for a segment at any angle: project p onto the line a→b (t = how far along it, 0…1), clamp to the ends.
 */
export function nearestOnPath(pts: Point[], p: Point) {
  let best: { point: Point; segment: number; dist: number } | null = null
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
    const point = { x: a.x + t * dx, y: a.y + t * dy }
    const dist = Math.hypot(point.x - p.x, point.y - p.y)
    if (!best || dist < best.dist) best = { point, segment: i, dist }
  }
  return best
}
