// Pure data model. No React, no DOM — safe to move to a shared package later.

export type ComponentType =
  | 'battery' | 'resistor' | 'lamp' | 'switch' | 'ammeter' | 'voltmeter'
  | 'diode' | 'led' | 'capacitor' | 'inductor' | 'fuse' | 'motor'

/** Direction a pin "faces" (the way a wire should leave it). */
export type Dir = 'N' | 'E' | 'S' | 'W'
export type Axis = 'h' | 'v'
export type Rotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315

export interface Point {
  x: number
  y: number
}

/** Static description of a pin, in the component's local space (origin = component centre). */
export interface PinDef {
  id: string
  x: number
  y: number
  dir: Dir
}

/** Editable values. The simulator will read these later. */
export type ElementProps = Record<string, number | boolean>

export interface CircuitElement {
  id: string
  type: ComponentType
  /** Centre of the component in world units, always on the grid. */
  x: number
  y: number
  rotation: Rotation
  props: ElementProps
}

export interface Junction extends Point {
  id: string
}

/** A wire end is either a component pin or a junction (T-connection). */
export type Endpoint =
  | { kind: 'pin'; elementId: string; pinId: string }
  | { kind: 'junction'; junctionId: string }

export interface Wire {
  id: string
  from: Endpoint
  to: Endpoint
  /** Corner points the user clicked (and can drag). In orthogonal mode extra elbows are computed at render time. */
  bends: Point[]
  /** true = straight lines at any angle between the points; missing/false = only horizontal and vertical lines. */
  diagonal?: boolean
}

export type Selection =
  | { kind: 'element'; id: string }
  | { kind: 'wire'; id: string }

/** A wire that is currently being drawn. */
export interface WireDraft {
  from: Endpoint
  bends: Point[]
}

/** The part of the state that is saved to the DB and to the undo history. */
export interface CircuitData {
  elements: CircuitElement[]
  wires: Wire[]
  junctions: Junction[]
}
