# Electronic Scheme Simulator

A website where you build your own electrical circuit and simulate how it behaves in real time.

Drag parts onto the canvas, connect them with wires, press **Start simulation**, and watch real voltages, currents and temperatures. Lamps glow, and parts burn out when you overload them.

## Features

**Editor**
- Drag parts from the components list onto a grid canvas.
- Parts: power source, resistor, incandescent lamp, switch, ammeter, voltmeter, diode, LED, capacitor, inductor, fuse, motor (fan).
- Wires are straight (horizontal/vertical, routed automatically) or diagonal (free angle). Click the canvas to add bends, drag the bends of a selected wire to reshape it, or click an existing wire to make a T-junction.
- Rotate parts in 45° steps, move them with the mouse, edit their values in the properties panel.
- Undo / redo, grid on/off and zoom.

**Simulation**
- **Circuit check before start:** there must be a power source, every pin must be wired, and every part must lie on a closed loop. Problems are listed and the offending parts are outlined in red.
- **DC solver:** nodal analysis (Kirchhoff's current law, solved with Gaussian elimination). Diodes and LEDs are solved with Newton iterations; capacitors and inductors with small time steps, so charging curves play out in real time.
- **Meters work like real instruments:** wire the ammeter in series and the voltmeter across a part.
- **Lamp:** rated power sets brightness (dim at low power, full at rated power) and the glow follows it. It burns out above 150 % of rated power.
- **Resistor:** rated power sets its temperature and colour, and it burns out above 150 % of rated power.
- **LED:** glows in its own colour (set the hue), needs a series resistor and burns out above 150 % of its rated current.
- **Diode:** conducts one way only; the triangle tints blue while it conducts.
- **Capacitor:** describe it either by its **capacitance** (type µF) or by its **construction**: plate area, plate gap and what fills the gap (air, paper, polyester, glass, mica, ceramic, tantalum oxide), from which C = ε₀·εr·A / d is calculated. Switching between the two keeps the capacitance (and says what it recalculated). In construction mode the rated voltage cannot exceed the breakdown voltage (dielectric strength × gap), so it is lowered automatically; area, gap and dielectric are never changed for you. It starts empty at every Start, the plates fill with blue as it charges, and it bursts above its rated voltage.
- **Inductor:** current rises gradually; a halo shows the magnetic field.
- **Fuse:** blows (the wire inside melts) above its rated current.
- **Motor (fan):** the blades spin faster the more power it gets, and it burns out when overdriven.
- **Live:** change a value or rewire while the simulation runs and the numbers update.
- **Readout card:** R, I, U, P and temperature (t) for every part with a status (OK / OPEN / BURNED). Click a card to select that part on the canvas.

## Controls

| Action | How |
|---|---|
| Place a part | Drag it from the components list |
| Move a part | Drag it |
| Start a wire | Click a pin |
| Add a bend | Click the empty canvas while drawing |
| Finish a wire | Click another pin, a junction, or a wire |
| Diagonal / straight wire | `D` while drawing or with a wire selected, or the **Wire** card |
| Move a wire bend | Select the wire, drag a white dot |
| Add / remove a bend | Double-click a diagonal wire / double-click a dot |
| Pan the canvas | Drag empty canvas, or mouse wheel (Shift = sideways) |
| Cancel a wire | `Esc` or right-click |
| Rotate selected part | `R` (45° per press) |
| Delete selected | `Del` / `Backspace` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Shift+Z` or `Ctrl+Y` |
| Toggle a switch | Double-click it, or use the properties panel |
| Show shortcuts | Hover the **?** icon at the top right |

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Zustand (state), lucide-react (icons)
- **Backend:** Express 5, Prisma, PostgreSQL (so far only a health-check route; saving circuits is not built yet)
- **Monorepo:** npm workspaces (`frontend`, `backend`, `shared`)

## Getting started

### Requirements
- [Node.js](https://nodejs.org/) 20.19 or newer (developed on Node 24) and npm
- PostgreSQL, **only** if you want the backend connected to a database. The simulator itself does not need it.

### 1. Install

From the repository root:

```bash
npm install
```

### 2. Run the app

**Frontend only (enough to use the simulator):**

```bash
npm run dev -w frontend
```

Then open the address Vite prints, usually <http://localhost:5173>.

**Frontend and backend together:**

```bash
npm run dev
```

This starts both with `concurrently`. The API listens on <http://localhost:3001> (health check at `/api/health`).

### 3. Backend database (optional)

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE"
PORT=3001
```

Then generate the Prisma client:

```bash
npm run db:generate -w backend
```

If PostgreSQL is not running, the server still starts and prints a warning; only database-backed routes will not work.

### Other frontend commands

```bash
npm run build -w frontend    # type-check and build for production
npm run lint -w frontend     # run ESLint
npm run preview -w frontend  # serve the production build locally
```

## Project structure

```
frontend/src/
  model/        pure logic, no React: types, part registry, geometry, wire routing,
                circuit check (circuitCheck.ts) and physics solver (solver.ts)
  store/        Zustand state: circuitStore.ts (the circuit + undo/redo),
                simStore.ts (simulation state and live updates)
  components/   React UI: Canvas, SideBar, PropertiesPanel, SimulationConsole,
                ElementView and the SVG symbols in Elements/
  hooks/        useKeyboardShortcuts.ts
backend/        Express API + Prisma schema (prisma/schema.prisma)
shared/         reserved for code shared between frontend and backend
```

### How it fits together

1. **model/** holds the rules and the maths as plain functions.
2. **store/** holds the current state and the actions that change it.
3. **components/** only read the stores and draw; clicks call store actions.

To add a new part, add one entry to `frontend/src/model/registry.ts` and draw its SVG in `components/Elements/`. The sidebar, properties panel and circuit check pick it up from the registry.

## Simulation model and limits

- DC sources only. Capacitors and inductors are stepped in time (30 steps per second); diodes use the exponential diode law. There is no AC source yet.
- Voltage and current are shown as magnitudes (no polarity). Diodes have no reverse breakdown and capacitors are not polarised.
- Battery = ideal source plus a small internal resistance. Ammeter ≈ 1 mΩ, voltmeter ≈ 10 MΩ.
- Temperature is a simple estimate: 25 °C plus the fraction of rated power times the part's hot temperature (2500 °C lamp, 200 °C resistor).
- Burned parts stay burned until you stop the simulation.

## Roadmap

- Save and load circuits through the backend (the `Circuit` table already exists).
- Tests for the solver and circuit check.
- AC sources and capacitors / inductors.
