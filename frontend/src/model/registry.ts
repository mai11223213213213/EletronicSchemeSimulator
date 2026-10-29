import type { ComponentType, ElementProps, PinDef } from './types'

/** One grid cell in world units. All pins sit on multiples of this. */
export const GRID = 10

/**
 * Distance from a part's centre to each of its two pins: 3 grid cells.
 * Rotating by 0/90/180/270 keeps the pins on the grid; for the diagonal angles geometry.ts shrinks the
 * part slightly (see `partScale`) so they land on the grid there too.
 */
export const PIN_REACH = 3 * GRID

/** A number the user can edit in the properties panel. */
export interface FieldDef {
  key: string
  label: string
  unit: string
  min: number
}

export interface ComponentDef {
  label: string
  pins: PinDef[]
  /** Half-size of the selection box, local space. */
  halfW: number
  halfH: number
  defaults: ElementProps
  /** Editable numbers (booleans like a switch's `closed` are toggled on the canvas instead). */
  fields: FieldDef[]
  /** Short text drawn next to the part on the schematic, e.g. "100 Ω". */
  format: (props: ElementProps) => string
}

/**
 * Single source of truth for every component.
 * Origin (0,0) = centre of the part; pins sit on grid points so they stay on the grid
 * after any rotation (multiples of 45°, see `partScale`).
 */
export const REGISTRY: Record<ComponentType, ComponentDef> = {
  battery: {
    label: 'Power source',
    pins: [
      { id: 'plus', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'minus', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 20,
    defaults: { voltage: 9, internalResistance: 0.1 },
    fields: [
      { key: 'voltage', label: 'Voltage', unit: 'V', min: 0 },
      { key: 'internalResistance', label: 'Internal R', unit: 'Ω', min: 0.001 },
    ],
    format: (p) => `${p.voltage} V`,
  },
  resistor: {
    label: 'Resistor',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 15,
    defaults: { resistance: 100, maxPower: 2 },
    fields: [
      { key: 'resistance', label: 'Resistance', unit: 'Ω', min: 0 },
      { key: 'maxPower', label: 'Rated power', unit: 'W', min: 0.001 },
    ],
    format: (p) => `${p.resistance} Ω`,
  },
  lamp: {
    label: 'Incandescent lamp',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 20,
    defaults: { resistance: 50, ratedPower: 2 },
    fields: [
      { key: 'resistance', label: 'Resistance', unit: 'Ω', min: 0 },
      { key: 'ratedPower', label: 'Rated power', unit: 'W', min: 0.001 },
    ],
    format: (p) => `${p.resistance} Ω`,
  },
  switch: {
    label: 'Switch',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 20,
    defaults: { closed: false },
    fields: [],
    format: () => '',
  },
  // Meters are real instruments: the ammeter goes IN SERIES (≈0 Ω), the voltmeter goes ACROSS a part (≈∞ Ω).
  ammeter: {
    label: 'Ammeter',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 20,
    defaults: {},
    fields: [],
    format: () => '',
  },
  voltmeter: {
    label: 'Voltmeter',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 20,
    defaults: {},
    fields: [],
    format: () => '',
  },
}

export const COMPONENT_TYPES = Object.keys(REGISTRY) as ComponentType[]

export function isComponentType(v: string): v is ComponentType {
  return v in REGISTRY
}
