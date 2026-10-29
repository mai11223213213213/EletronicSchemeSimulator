import { nanoid } from 'nanoid'
import { create } from 'zustand'
import { endpointPos, nextRotation, sameEndpoint, snapPoint } from '../model/geometry'
import { REGISTRY } from '../model/registry'
import { nearestOnPath } from '../model/routing'
import { wirePath } from '../model/wires'
import type {
  CircuitData, CircuitElement, ComponentType, Endpoint, Point, Selection, Wire, WireDraft,
} from '../model/types'

const HISTORY_LIMIT = 100
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y

interface CircuitState extends CircuitData {
  selection: Selection | null
  draft: WireDraft | null
  past: CircuitData[]
  future: CircuitData[]
  /** Style given to NEW wires (remembered between wires). Not part of the circuit, so not in undo. */
  diagonalWires: boolean
  /** Why the app changed a value the user typed (e.g. "rated voltage lowered"). Shown in the properties card. */
  notice: { elementId: string; notes: string[] } | null

  addElement: (type: ComponentType, x: number, y: number) => void
  /** Call once when a drag starts, so the whole drag is a single undo step. */
  beginMove: () => void
  moveElement: (id: string, x: number, y: number) => void
  rotateSelected: () => void
  toggleSwitch: (id: string) => void
  /** Change one editable number (resistance, voltage, ...). One undo step per call. */
  setProp: (id: string, key: string, value: number) => void
  deleteSelected: () => void
  select: (s: Selection | null) => void

  startWire: (from: Endpoint) => void
  addBend: (p: Point) => void
  finishWire: (to: Endpoint) => void
  /** Finish the wire being drawn by T-connecting it into an existing wire. */
  finishWireOnWire: (wireId: string, p: Point) => void
  cancelWire: () => void
  /** Orthogonal/diagonal: changes the selected wire, or the wire being drawn / future wires when none is selected. */
  setWireStyle: (diagonal: boolean) => void
  toggleWireStyle: () => void
  /** Bend ("node") editing. moveBend is called many times per drag; call beginMove() once before the drag. */
  moveBend: (wireId: string, index: number, p: Point) => void
  insertBend: (wireId: string, index: number, p: Point) => void
  removeBend: (wireId: string, index: number) => void
  /** Drop stored bends that the drawn wire does not pass through (and whose removal changes nothing visible). */
  pruneDeadBends: () => void

  undo: () => void
  redo: () => void
  loadCircuit: (data: CircuitData) => void
}

const pick = (s: CircuitData): CircuitData => ({
  elements: s.elements,
  wires: s.wires,
  junctions: s.junctions,
})

/** Remove junctions that no wire uses any more. */
function pruneJunctions(d: CircuitData): CircuitData {
  const used = new Set<string>()
  for (const w of d.wires) for (const e of [w.from, w.to]) if (e.kind === 'junction') used.add(e.junctionId)
  return { ...d, junctions: d.junctions.filter((j) => used.has(j.id)) }
}

export const useCircuitStore = create<CircuitState>((set, get) => {
  /** Save the current data in the undo history. Call BEFORE changing anything. */
  const commit = () =>
    set((s) => ({ past: [...s.past, pick(s)].slice(-HISTORY_LIMIT), future: [] }))

  return {
    elements: [],
    wires: [],
    junctions: [],
    selection: null,
    draft: null,
    past: [],
    future: [],
    diagonalWires: false,
    notice: null,

    addElement: (type, x, y) => {
      commit()
      const el: CircuitElement = {
        id: nanoid(8),
        type,
        x,
        y,
        rotation: 0,
        props: { ...REGISTRY[type].defaults },
      }
      set((s) => ({ elements: [...s.elements, el], selection: { kind: 'element', id: el.id } }))
    },

    beginMove: () => commit(),

    moveElement: (id, x, y) =>
      set((s) => ({ elements: s.elements.map((el) => (el.id === id ? { ...el, x, y } : el)) })),

    rotateSelected: () => {
      const sel = get().selection
      if (sel?.kind !== 'element') return
      commit()
      set((s) => ({
        elements: s.elements.map((el) =>
          el.id === sel.id ? { ...el, rotation: nextRotation(el.rotation) } : el),
      }))
    },

    toggleSwitch: (id) => {
      commit()
      set((s) => ({
        elements: s.elements.map((el) =>
          el.id === id && el.type === 'switch'
            ? { ...el, props: { ...el.props, closed: !el.props.closed } }
            : el),
      }))
    },

    setProp: (id, key, value) => {
      const el = get().elements.find((x) => x.id === id)
      const def = el && REGISTRY[el.type]
      // Accept any key the part type defines (parts made before a newer prop existed do not have it yet).
      if (!el || !def || !(key in def.defaults) || el.props[key] === value) return
      // Let the part type correct impossible combinations (see `normalize` in the registry), then compare:
      // if the correction undid the edit completely there is nothing to save in the undo history.
      const edited = { ...el.props, [key]: value }
      const { props, notes } = def.normalize?.(edited, key) ?? { props: edited, notes: [] }
      const changed = Object.keys(props).some((k) => props[k] !== el.props[k])
      if (changed) commit()
      set((s) => ({
        elements: changed ? s.elements.map((x) => (x.id === id ? { ...x, props } : x)) : s.elements,
        notice: notes.length ? { elementId: id, notes } : null,
      }))
    },

    deleteSelected: () => {
      const sel = get().selection
      if (!sel) return
      commit()
      set((s) => {
        if (sel.kind === 'wire') {
          return { ...pruneJunctions({ ...pick(s), wires: s.wires.filter((w) => w.id !== sel.id) }), selection: null }
        }
        const touches = (e: Endpoint) => e.kind === 'pin' && e.elementId === sel.id
        return {
          ...pruneJunctions({
            ...pick(s),
            elements: s.elements.filter((el) => el.id !== sel.id),
            wires: s.wires.filter((w) => !touches(w.from) && !touches(w.to)),
          }),
          selection: null,
        }
      })
    },

    select: (selection) => set({ selection, notice: null }),

    startWire: (from) => set({ draft: { from, bends: [] }, selection: null }),

    addBend: (p) =>
      set((s) => {
        if (!s.draft) return {}
        const prev = s.draft.bends.at(-1)
        if (prev && same(prev, p)) return {}
        return { draft: { ...s.draft, bends: [...s.draft.bends, p] } }
      }),

    finishWire: (to) => {
      const { draft } = get()
      if (!draft || sameEndpoint(draft.from, to)) return
      commit()
      const wire: Wire = { id: nanoid(8), from: draft.from, to, bends: draft.bends, diagonal: get().diagonalWires }
      set((s) => ({ wires: [...s.wires, wire], draft: null }))
    },

    finishWireOnWire: (wireId, rawPoint) => {
      const s = get()
      const { draft } = s
      const target = s.wires.find((w) => w.id === wireId)
      if (!draft || !target) return
      const path = wirePath(target, s)
      if (!path) return
      const hit = nearestOnPath(path, rawPoint)
      if (!hit) return
      // Snap the junction to the grid when that keeps it ON the wire (always true for horizontal/vertical wires).
      // A diagonal wire only passes through some grid points; there keep the exact point so the junction sits on the wire.
      let at = snapPoint(hit.point)
      if ((nearestOnPath(path, at)?.dist ?? Infinity) > 0.01) {
        at = { x: Math.round(hit.point.x * 100) / 100, y: Math.round(hit.point.y * 100) / 100 }
      }

      // Clicked exactly on the end of that wire: just connect to that end.
      if (same(at, path[0])) return get().finishWire(target.from)
      if (same(at, path[path.length - 1])) return get().finishWire(target.to)

      commit()
      const junction = { id: nanoid(8), ...at }
      const ends = (pts: Point[]) => pts.filter((p) => !same(p, at))
      const first: Wire = {
        id: nanoid(8), from: target.from, to: { kind: 'junction', junctionId: junction.id },
        bends: ends(path.slice(1, hit.segment + 1)), diagonal: target.diagonal, // the two halves keep the old wire's style
      }
      const second: Wire = {
        id: nanoid(8), from: { kind: 'junction', junctionId: junction.id }, to: target.to,
        bends: ends(path.slice(hit.segment + 1, -1)), diagonal: target.diagonal,
      }
      const mine: Wire = {
        id: nanoid(8), from: draft.from, to: { kind: 'junction', junctionId: junction.id },
        bends: draft.bends, diagonal: s.diagonalWires,
      }
      set((st) => ({
        junctions: [...st.junctions, junction],
        wires: [...st.wires.filter((w) => w.id !== wireId), first, second, mine],
        draft: null,
      }))
    },

    cancelWire: () => set({ draft: null }),

    setWireStyle: (diagonal) => {
      const { draft, selection, wires } = get()
      const wire = !draft && selection?.kind === 'wire' ? wires.find((w) => w.id === selection.id) : undefined
      if (!wire) { set({ diagonalWires: diagonal }); return } // drawing, or nothing selected: choose the style for new wires
      if ((wire.diagonal === true) === diagonal) return
      commit()
      set((s) => ({ wires: s.wires.map((w) => (w.id === wire.id ? { ...w, diagonal } : w)) }))
    },

    toggleWireStyle: () => {
      const { draft, selection, wires, diagonalWires } = get()
      const wire = !draft && selection?.kind === 'wire' ? wires.find((w) => w.id === selection.id) : undefined
      get().setWireStyle(!(wire ? wire.diagonal === true : diagonalWires))
    },

    moveBend: (wireId, index, p) =>
      set((s) => ({
        wires: s.wires.map((w) =>
          w.id === wireId ? { ...w, bends: w.bends.map((b, i) => (i === index ? p : b)) } : w),
      })),

    insertBend: (wireId, index, p) => {
      commit()
      set((s) => ({
        wires: s.wires.map((w) =>
          w.id === wireId ? { ...w, bends: [...w.bends.slice(0, index), p, ...w.bends.slice(index)] } : w),
      }))
    },

    removeBend: (wireId, index) => {
      commit()
      set((s) => ({
        wires: s.wires.map((w) =>
          w.id === wireId ? { ...w, bends: w.bends.filter((_, i) => i !== index) } : w),
      }))
    },

    /**
     * A stored bend can become "dead": the router skips it when it only makes the wire run out along a line and
     * come back (see `simplify` in routing.ts). It is then drawn nowhere, yet stays in the data, and its handle
     * would float in empty space. Called when a drag ends (no undo step of its own: it belongs to that drag).
     * A bend is only removed if the wire looks exactly the same without it.
     */
    pruneDeadBends: () =>
      set((s) => {
        let changed = false
        const wires = s.wires.map((w) => {
          const path = w.bends.length ? wirePath(w, s) : null
          if (!path) return w
          let bends = w.bends
          for (let i = bends.length - 1; i >= 0; i--) {
            if ((nearestOnPath(path, bends[i])?.dist ?? Infinity) < 0.01) continue // it is on the wire: keep
            const without = bends.filter((_, k) => k !== i)
            const next = wirePath({ ...w, bends: without }, s)
            if (next && next.length === path.length && next.every((p, k) => same(p, path[k]))) bends = without
          }
          if (bends === w.bends) return w
          changed = true
          return { ...w, bends }
        })
        return changed ? { wires } : {}
      }),

    undo: () =>
      set((s) => {
        const prev = s.past.at(-1)
        if (!prev) return {}
        return { ...prev, past: s.past.slice(0, -1), future: [pick(s), ...s.future], selection: null, draft: null, notice: null }
      }),

    redo: () =>
      set((s) => {
        const next = s.future[0]
        if (!next) return {}
        return { ...next, past: [...s.past, pick(s)], future: s.future.slice(1), selection: null, draft: null, notice: null }
      }),

    loadCircuit: (data) =>
      set({ ...pick(data), selection: null, draft: null, past: [], future: [] }),
  }
})

/** Where a draft wire starts (used for the live preview). */
export function draftStart(s: CircuitState) {
  return s.draft ? endpointPos(s.draft.from, s.elements, s.junctions) : null
}
