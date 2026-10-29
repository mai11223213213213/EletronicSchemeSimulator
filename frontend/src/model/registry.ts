import {
  CAPACITOR_DEFAULTS, CAPACITOR_MODES, DIELECTRICS, capacitance, capacitorHelp, capacitorReadouts, isConstruction,
  normalizeCapacitor,
} from './capacitor'
import type { ComponentType, ElementProps, PinDef } from './types'
import { formatSI } from './units'

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
  /** When set the field is a drop-down; the stored number is the position of the chosen option in this list. */
  options?: string[]
  /** When set, the field is only shown while this returns true (e.g. plate area only in "Construction" mode). */
  show?: (props: ElementProps) => boolean
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
  /** Values calculated from the inputs, shown read-only in the properties card. */
  readouts?: (props: ElementProps) => [label: string, value: string][]
  /** A sentence of explanation for the properties card (may depend on the current values). */
  help?: (props: ElementProps) => string
  /**
   * Called with the props after every edit. Returns props that describe a part which can really exist
   * (it may change some values) plus notes telling the user what was changed and why.
   * `changedKey` is the property the user just edited.
   */
  normalize?: (props: ElementProps, changedKey?: string) => { props: ElementProps; notes: string[] }
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
  // Diode and LED conduct one way only: pin "a" is the anode (+), pin "b" the cathode (−).
  diode: {
    label: 'Diode',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 18,
    defaults: { ratedCurrent: 1 },
    fields: [{ key: 'ratedCurrent', label: 'Rated current', unit: 'A', min: 0.001 }],
    format: () => '',
  },
  led: {
    label: 'LED',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 22,
    // forwardVoltage = drop across the LED at its rated current; hue = colour (0 red, 60 yellow, 120 green, 220 blue)
    defaults: { forwardVoltage: 2, ratedCurrent: 0.02, hue: 0 },
    fields: [
      { key: 'forwardVoltage', label: 'Forward drop', unit: 'V', min: 0.5 },
      { key: 'ratedCurrent', label: 'Rated current', unit: 'A', min: 0.001 },
      { key: 'hue', label: 'Colour hue', unit: '°', min: 0 },
    ],
    format: () => '',
  },
  capacitor: {
    label: 'Capacitor',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 18,
    // Two ways to describe it (see model/capacitor.ts): by capacitance, or by plate area / gap / dielectric.
    defaults: { ...CAPACITOR_DEFAULTS },
    fields: [
      { key: 'mode', label: 'Specify by', unit: '', min: 0, options: CAPACITOR_MODES },
      { key: 'capacitance', label: 'Capacitance', unit: 'µF', min: 1e-6, show: (p) => !isConstruction(p) },
      { key: 'plateArea', label: 'Plate area', unit: 'cm²', min: 0.01, show: isConstruction },
      { key: 'plateDistance', label: 'Plate gap', unit: 'µm', min: 0.01, show: isConstruction },
      { key: 'dielectric', label: 'Filled with', unit: '', min: 0, options: DIELECTRICS.map((d) => d.name), show: isConstruction },
      { key: 'maxVoltage', label: 'Rated voltage', unit: 'V', min: 0.1 },
    ],
    format: (p) => formatSI(capacitance(p), 'F'),
    readouts: capacitorReadouts,
    help: capacitorHelp,
    normalize: normalizeCapacitor,
  },
  inductor: {
    label: 'Inductor',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 16,
    defaults: { inductance: 100 },
    fields: [{ key: 'inductance', label: 'Inductance', unit: 'mH', min: 0.001 }],
    format: (p) => `${p.inductance} mH`,
  },
  fuse: {
    label: 'Fuse',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 15,
    defaults: { ratedCurrent: 0.5 },
    fields: [{ key: 'ratedCurrent', label: 'Rated current', unit: 'A', min: 0.001 }],
    format: (p) => `${p.ratedCurrent} A`,
  },
  motor: {
    label: 'Motor (fan)',
    pins: [
      { id: 'a', x: -PIN_REACH, y: 0, dir: 'W' },
      { id: 'b', x: PIN_REACH, y: 0, dir: 'E' },
    ],
    halfW: 35,
    halfH: 20,
    defaults: { resistance: 25, ratedPower: 4 },
    fields: [
      { key: 'resistance', label: 'Resistance', unit: 'Ω', min: 0 },
      { key: 'ratedPower', label: 'Rated power', unit: 'W', min: 0.001 },
    ],
    format: () => '',
  },
}

export const COMPONENT_TYPES = Object.keys(REGISTRY) as ComponentType[]

export function isComponentType(v: string): v is ComponentType {
  return v in REGISTRY
}
