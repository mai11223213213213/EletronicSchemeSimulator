import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { COMPONENT_TYPES, REGISTRY } from '../model/registry'
import type { ComponentType } from '../model/types'
import { AcSourceElement } from './Elements/AcSourceElement'
import { BatteryElement } from './Elements/BatteryElement'
import { CapacitorElement } from './Elements/CapacitorElement'
import { DiodeElement } from './Elements/DiodeElement'
import { FuseElement } from './Elements/FuseElement'
import { InductorElement } from './Elements/InductorElement'
import { LedElement } from './Elements/LedElement'
import { LampElement } from './Elements/LampElement'
import { MeterElement } from './Elements/MeterElement'
import { MotorElement } from './Elements/MotorElement'
import { ResistorElement } from './Elements/ResistorElement'
import { ScopeElement } from './Elements/ScopeElement'
import { SwitchElement } from './Elements/SwitchElement'

// The palette shows the same symbols that get drawn on the canvas (names/pins/defaults are in model/registry.ts).
const SYMBOLS: Record<ComponentType, ReactNode> = {
  battery: <BatteryElement rotation={0} />,
  resistor: <ResistorElement />,
  lamp: <LampElement />,
  switch: <SwitchElement closed />,
  ammeter: <MeterElement letter="A" rotation={0} />,
  voltmeter: <MeterElement letter="V" rotation={0} />,
  diode: <DiodeElement />,
  led: <LedElement />,
  capacitor: <CapacitorElement />,
  inductor: <InductorElement />,
  fuse: <FuseElement />,
  motor: <MotorElement />,
  acsource: <AcSourceElement rotation={0} />,
  scope: <ScopeElement />,
}

export function Sidebar({ onClose }: { onClose: () => void }) {
  return (
    <aside className="flex h-full w-full select-none flex-col gap-3 overflow-hidden rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 pb-2">
        <h2 className="text-sm font-bold text-gray-800">Circuit components</h2>
        <button
          type="button" onClick={onClose} title="Hide components" aria-label="Hide components"
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid min-h-0 grid-cols-2 content-start gap-3 overflow-y-auto">
        {COMPONENT_TYPES.map((type) => {
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', type)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              className="group flex cursor-grab flex-col items-center gap-1.5"
            >
              <div className="flex aspect-square w-full items-center justify-center rounded-2xl border-2 border-gray-300 bg-gray-50 transition group-hover:border-blue-400 group-hover:bg-blue-50">
                <svg viewBox="-38 -24 76 48" className="w-4/5" pointerEvents="none">{SYMBOLS[type]}</svg>
              </div>
              <span className="text-center text-xs font-medium leading-tight text-gray-700">{REGISTRY[type].label}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
