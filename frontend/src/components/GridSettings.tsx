import { Grid2X2, Settings2 } from 'lucide-react'
import { useState } from 'react'

export const MIN_CELL = 5
export const MAX_CELL = 30

interface Props {
  cellPx: number
  visible: boolean
  onCellPx: (v: number) => void
  onVisible: (v: boolean) => void
  /** Move the view back to the origin (after panning far away). */
  onResetView: () => void
}

/** Grid button + popup. "Scale" zooms the whole schematic, so pins always stay on the grid. */
export function GridSettings({ cellPx, visible, onCellPx, onVisible, onResetView }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute bottom-4 right-4 z-30 flex items-end gap-2" onClick={(e) => e.stopPropagation()}>
      {open && (
        <div className="w-64 rounded-md border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Grid2X2 className="h-4 w-4 text-gray-900" />
              Grid settings
            </div>
            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{cellPx} px</span>
          </div>
          <label className="mb-2 flex items-center justify-between text-sm text-gray-700">
            <span>Show grid</span>
            <input type="checkbox" checked={visible} onChange={(e) => onVisible(e.target.checked)} className="h-4 w-4 accent-blue-600" />
          </label>
          <label className="block text-sm text-gray-700" htmlFor="grid-size">Scale (zoom)</label>
          <input
            id="grid-size" type="range" min={MIN_CELL} max={MAX_CELL} step="1" value={cellPx}
            onChange={(e) => onCellPx(Number(e.target.value))} className="mt-2 w-full accent-blue-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>{MIN_CELL} px</span>
            <span>{MAX_CELL} px</span>
          </div>
          <button
            type="button" onClick={onResetView}
            className="mt-3 w-full rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-700 hover:bg-blue-50"
          >
            Reset view
          </button>
        </div>
      )}
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Grid settings"
        className="flex shrink-0 items-center gap-2 rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur transition hover:bg-white"
      >
        <Settings2 className="h-4 w-4 text-gray-900" />
        <span>Grid</span>
        <span className="text-xs text-gray-500">{cellPx}px</span>
      </button>
    </div>
  )
}
