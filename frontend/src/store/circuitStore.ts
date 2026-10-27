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
      if (!el || !(key in el.props) || el.props[key] === value) return
      commit()
      set((s) => ({
        elements: s.elements.map((x) => (x.id === id ? { ...x, props: { ...x.props, [key]: value } } : x)),
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

    select: (selection) => set({ selection }),

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
      const wire: Wire = { id: nanoid(8), from: draft.from, to, bends: draft.bends }
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
      const at = snapPoint(hit.point)

      // Clicked exactly on the end of that wire: just connect to that end.
      if (same(at, path[0])) return get().finishWire(target.from)
      if (same(at, path[path.length - 1])) return get().finishWire(target.to)

      commit()
      const junction = { id: nanoid(8), ...at }
      const ends = (pts: Point[]) => pts.filter((p) => !same(p, at))
      const first: Wire = {
        id: nanoid(8), from: target.from, to: { kind: 'junction', junctionId: junction.id },
        bends: ends(path.slice(1, hit.segment + 1)),
      }
      const second: Wire = {
        id: nanoid(8), from: { kind: 'junction', junctionId: junction.id }, to: target.to,
        bends: ends(path.slice(hit.segment + 1, -1)),
      }
      const mine: Wire = {
        id: nanoid(8), from: draft.from, to: { kind: 'junction', junctionId: junction.id },
        bends: draft.bends,
      }
      set((st) => ({
        junctions: [...st.junctions, junction],
        wires: [...st.wires.filter((w) => w.id !== wireId), first, second, mine],
        draft: null,
      }))
    },

    cancelWire: () => set({ draft: null }),

    undo: () =>
      set((s) => {
        const prev = s.past.at(-1)
        if (!prev) return {}
        return { ...prev, past: s.past.slice(0, -1), future: [pick(s), ...s.future], selection: null, draft: null }
      }),

    redo: () =>
      set((s) => {
        const next = s.future[0]
        if (!next) return {}
        return { ...next, past: [...s.past, pick(s)], future: s.future.slice(1), selection: null, draft: null }
      }),

    loadCircuit: (data) =>
      set({ ...pick(data), selection: null, draft: null, past: [], future: [] }),
  }
})

/** Where a draft wire starts (used for the live preview). */
export function draftStart(s: CircuitState) {
  return s.draft ? endpointPos(s.draft.from, s.elements, s.junctions) : null
}
