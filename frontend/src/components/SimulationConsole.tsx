import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { capacitance } from "../model/capacitor";
import { elementNames } from "../model/naming";
import { REGISTRY } from "../model/registry";
import { isDynamic, type ElementResult } from "../model/solver";
import { acFrequency } from "../model/sources";
import type { CircuitElement, ComponentType } from "../model/types";
import { formatSI, formatTemp } from "../model/units";
import { useCircuitStore } from "../store/circuitStore";
import { useSimStore } from "../store/simStore";

const STATUS_STYLE = {
  ok: "text-emerald-600",
  burned: "text-red-600",
  open: "text-amber-600",
} as const;

const burnedLabel = (type: ComponentType) =>
  type === "fuse" ? "BLOWN" : type === "capacitor" ? "BURST" : "BURNED";

const statusLabel = (el: CircuitElement, status: ElementResult["status"]) =>
  status === "burned"
    ? burnedLabel(el.type)
    : status === "open"
      ? "OPEN"
      : "OK";

const numberProp = (el: CircuitElement, key: string) =>
  Number(el.props[key] ?? REGISTRY[el.type].defaults[key]);

function estimateFrequency(trace: number[], dt: number): number {
  const mean = trace.reduce((a, b) => a + b, 0) / trace.length;
  const crossings: number[] = [];

  for (let k = 1; k < trace.length; k++) {
    if (trace[k - 1] < mean && trace[k] >= mean) crossings.push(k);
  }

  if (crossings.length < 2) return 0;

  return (
    (crossings.length - 1) /
    ((crossings[crossings.length - 1] - crossings[0]) * dt)
  );
}

function rows(
  el: CircuitElement,
  r: ElementResult,
  ac: boolean,
  trace?: number[],
  traceDt?: number,
): [label: string, value: string][] {
  const R: [string, string] = ["R", r.R === null ? "∞" : formatSI(r.R, "Ω")];
  const I: [string, string] = ["I", formatSI(r.I, "A")];
  const U: [string, string] = ["U", formatSI(r.U, "V")];
  const P: [string, string] = ["P", formatSI(r.P, "W")];
  const T: [string, string] = ["t", formatTemp(r.T)];

  let out: [string, string][];

  switch (el.type) {
    case "ammeter":
      out = [I, U];
      break;
    case "voltmeter":
      out = [U, I];
      break;
    case "resistor":
    case "lamp":
      out = [R, I, U, P, T];
      break;
    case "motor":
      out = [R, I, U, P, T, ["n", `${Math.round(r.level * 100)} %`]];
      break;
    case "diode":
    case "led":
      out = [I, U, P, T];
      break;
    case "fuse":
      out = [R, I, U, T];
      break;
    case "capacitor": {
      const c = capacitance(el.props);
      out = [
        ["C", formatSI(c, "F")],
        U,
        I,
        ["E", formatSI(0.5 * c * r.Upeak * r.Upeak, "J")],
      ];
      break;
    }
    case "inductor": {
      const l = numberProp(el, "inductance") * 1e-3;
      out = [
        ["L", formatSI(l, "H")],
        I,
        U,
        ["E", formatSI(0.5 * l * r.Ipeak * r.Ipeak, "J")],
      ];
      break;
    }
    case "acsource":
      out = [["f", formatSI(acFrequency(el.props), "Hz")], U, I, P];
      break;
    case "scope": {
      const f = trace && traceDt ? estimateFrequency(trace, traceDt) : 0;
      const vpp = trace?.length ? Math.max(...trace) - Math.min(...trace) : 0;
      return [
        U,
        ["pp", formatSI(vpp, "V")],
        ["f", f > 0 ? formatSI(f, "Hz") : "—"],
      ];
    }
    default:
      out = [R, I, U, P];
  }

  if (ac && el.type !== "ammeter" && el.type !== "voltmeter") {
    out.push(["Up", formatSI(r.Upeak, "V")], ["Ip", formatSI(r.Ipeak, "A")]);
  } else if (ac) {
    out.push([
      "pk",
      formatSI(
        el.type === "ammeter" ? r.Ipeak : r.Upeak,
        el.type === "ammeter" ? "A" : "V",
      ),
    ]);
  }

  return out;
}

function Waveform({ trace }: { trace: number[] }) {
  const W = 220;
  const H = 56;
  const peak = Math.max(...trace.map(Math.abs), 1e-9);

  const points = trace
    .map(
      (v, k) =>
        `${((k / Math.max(trace.length - 1, 1)) * W).toFixed(1)},${(
          H / 2 -
          (v / peak) * (H / 2 - 4)
        ).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mb-1 w-full rounded bg-gray-900"
      role="img"
      aria-label="Measured voltage"
    >
      <line
        x1="0"
        x2={W}
        y1={H / 2}
        y2={H / 2}
        stroke="#374151"
        strokeWidth="1"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#4ade80"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text x="4" y="10" fontSize="8" fill="#9ca3af">
        ±{formatSI(peak, "V")}
      </text>
    </svg>
  );
}

export function SimulationConsole() {
  const elements = useCircuitStore((s) => s.elements);
  const selection = useCircuitStore((s) => s.selection);
  const select = useCircuitStore((s) => s.select);

  const problems = useSimStore((s) => s.problems);
  const warnings = useSimStore((s) => s.warnings);
  const result = useSimStore((s) => s.result);
  const running = useSimStore((s) => s.running);
  const time = useSimStore((s) => s.engine.time);
  const ideal = useSimStore((s) => s.ideal);
  const setConsoleOpen = useSimStore((s) => s.setConsoleOpen);

  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const names = elementNames(elements);
  const dynamic = elements.some(isDynamic);
  const ac = result?.ac === true;

  // Errors have priority, then warnings, then measurement cards.
  const slides = [
    ...problems.map((problem, index) => ({
      kind: "problem" as const,
      id: `problem-${index}`,
      message: problem.message,
      elementId: problem.elementId,
    })),
    ...warnings.map((warning, index) => ({
      kind: "warning" as const,
      id: `warning-${index}`,
      message: warning,
    })),
    ...(result
      ? elements.flatMap((element) => {
          const measurement = result.elements[element.id];
          return measurement
            ? [
                {
                  kind: "element" as const,
                  id: element.id,
                  element,
                  measurement,
                  trace: result.traces?.[element.id],
                },
              ]
            : [];
        })
      : []),
  ];

  const currentIndex = Math.min(activeIndex, Math.max(slides.length - 1, 0));
  const currentSlide = slides[currentIndex];

  const goTo = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, slides.length - 1)));
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;

    const delta =
      (event.changedTouches[0]?.clientX ?? touchStartX.current) -
      touchStartX.current;

    if (Math.abs(delta) > 45) {
      goTo(currentIndex + (delta < 0 ? 1 : -1));
    }

    touchStartX.current = null;
  };

  const renderMeasurementCard = (
    el: CircuitElement,
    measurement: ElementResult,
    trace?: number[],
  ) => {
    const selected = selection?.kind === "element" && selection.id === el.id;

    return (
      <button
        type="button"
        onClick={() => select({ kind: "element", id: el.id })}
        className={`block w-full rounded border p-2 text-left transition ${
          selected
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">
            {names[el.id]}
          </span>
          <span
            className={`font-mono font-semibold ${STATUS_STYLE[measurement.status]}`}
          >
            {statusLabel(el, measurement.status)}
          </span>
        </div>

        {el.type === "scope" && trace && trace.length > 1 && (
          <Waveform trace={trace} />
        )}

        <dl className="grid grid-cols-[2rem_1fr] gap-x-2 font-mono text-gray-700">
          {rows(el, measurement, ac, trace, result?.traceDt).map(
            ([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-gray-400">{label}</dt>
                <dd>{value}</dd>
              </div>
            ),
          )}
        </dl>
      </button>
    );
  };

  const renderMobileSlide = () => {
    if (!currentSlide) {
      return (
        <p className="py-3 text-center text-xs text-gray-500">
          No simulation data yet.
        </p>
      );
    }

    if (currentSlide.kind === "problem") {
      return (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          <p className="mb-1 font-semibold">
            Cannot start — the circuit is not finished:
          </p>
          {currentSlide.elementId ? (
            <button
              type="button"
              onClick={() =>
                select({ kind: "element", id: currentSlide.elementId! })
              }
              className="text-left underline decoration-dotted"
            >
              ✗ {currentSlide.message}
            </button>
          ) : (
            <>✗ {currentSlide.message}</>
          )}
        </div>
      );
    }

    if (currentSlide.kind === "warning") {
      return (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          ⚠ {currentSlide.message}
        </div>
      );
    }

    return renderMeasurementCard(
      currentSlide.element,
      currentSlide.measurement,
      currentSlide.trace,
    );
  };

  return (
    <aside className="flex h-full w-full select-none flex-col gap-3 overflow-hidden rounded-md border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur max-[899px]:h-auto max-[899px]:shrink-0">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 pb-2">
        <h2 className="text-sm font-bold text-gray-800">
          Simulation
          <span
            className={`ml-1 text-xs font-medium ${running ? "text-emerald-600" : "text-red-600"}`}
          >
            ● {running ? "running" : "stopped"}
          </span>
          {running && dynamic && (
            <span className="ml-2 font-mono text-xs font-normal text-gray-500">
              t = {time.toFixed(2)} s
            </span>
          )}
        </h2>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setConsoleOpen(false)}
            title="Hide readout"
            aria-label="Hide readout"
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {running && (
        <p className="shrink-0 text-xs text-gray-500 max-[899px]:hidden">
          Model: <b className="text-gray-700">{ideal ? "ideal" : "real"}</b>
          {ac && " · U, I, P are RMS / average values; Up, Ip are peaks"}
        </p>
      )}

      {/* Desktop: preserve the current vertical list. */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto text-xs max-[899px]:hidden">
        {problems.length > 0 && (
          <section className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
            <p className="mb-1 font-semibold">
              Cannot start — the circuit is not finished:
            </p>
            <ul className="space-y-1">
              {problems.map((problem, index) => (
                <li key={index}>
                  {problem.elementId ? (
                    <button
                      type="button"
                      onClick={() =>
                        select({ kind: "element", id: problem.elementId! })
                      }
                      className="text-left underline decoration-dotted hover:text-red-900"
                    >
                      ✗ {problem.message}
                    </button>
                  ) : (
                    <>✗ {problem.message}</>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2 text-amber-800">
            {warnings.map((warning, index) => (
              <li key={index}>⚠ {warning}</li>
            ))}
          </ul>
        )}

        {result &&
          elements.map((el) => {
            const measurement = result.elements[el.id];
            if (!measurement) return null;

            return (
              <div key={el.id}>
                {renderMeasurementCard(el, measurement, result.traces?.[el.id])}
              </div>
            );
          })}
      </div>

      {/* Mobile: one card at a time, navigated with arrows or a horizontal swipe. */}
      <div
        className="hidden flex-none flex-col gap-2 overflow-hidden text-xs max-[899px]:flex"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {running && (
          <p className="shrink-0 text-xs text-gray-500">
            Model: <b className="text-gray-700">{ideal ? "ideal" : "real"}</b>
            {ac && " · RMS values"}
          </p>
        )}

        <div className="flex-none">{renderMobileSlide()}</div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 pt-2">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => goTo(currentIndex - 1)}
            aria-label="Previous readout"
            className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-xs text-gray-500">
            {slides.length ? `${currentIndex + 1} / ${slides.length}` : "0 / 0"}
            {slides.length > 1 && " · Swipe to navigate"}
          </span>

          <button
            type="button"
            disabled={currentIndex >= slides.length - 1}
            onClick={() => goTo(currentIndex + 1)}
            aria-label="Next readout"
            className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
