import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CircuitBoard,
  LogOut,
  Plus,
  Clock3,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import {
  createCircuit,
  getCircuits,
  updateCircuit,
  deleteCircuit,
  type Circuit,
} from "../api/circuits";

export function PersonalPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [circuits, setCircuits] = useState<Circuit[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [renameTarget, setRenameTarget] = useState<Circuit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Circuit | null>(null);

  const [renameValue, setRenameValue] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    let active = true;

    getCircuits()
      .then((data) => {
        if (active) setCircuits(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load your circuits.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleCreateCircuit() {
    setError("");
    setCreating(true);

    try {
      const circuit = await createCircuit();
      navigate(`/editor/${circuit.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create a circuit.",
      );
    } finally {
      setCreating(false);
    }
  }

function openRenameModal(circuit: Circuit) {
  setRenameTarget(circuit)
  setRenameValue(circuit.name)
  setModalError('')
}

function openDeleteModal(circuit: Circuit) {
  setDeleteTarget(circuit)
  setModalError('')
}

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  const initials = user?.email?.slice(0, 1).toUpperCase() ?? "U";

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#f1f3f2] text-[#26332d]">
      <header className="sticky top-0 z-30 border-b border-[#dfe5e1] bg-white">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176b4b] text-white">
              <CircuitBoard className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold tracking-tight">
              Electronic Scheme Simulator
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eee8] text-xs font-bold text-[#176b4b]">
                {initials}
              </div>
              <span className="hidden max-w-[190px] truncate text-xs font-medium text-[#536159] sm:inline">
                {user?.email}
              </span>
            </div>

            <div className="h-7 w-px bg-[#e5e9e6]" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Sign out"
              className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[#65736a] transition hover:bg-[#f0f4f1] hover:text-[#176b4b] disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#dfe5e1] pb-7">
          <div>
            <p className="mb-2 text-xs font-medium text-[#829087]">
              Personal workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              My circuits
            </h1>
            <p className="mt-2 text-sm text-[#7f8c83]">
              Your electronic circuit designs.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateCircuit}
            disabled={creating}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#176b4b] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#12583d] disabled:opacity-60"
          >
            {creating ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? "Creating..." : "New circuit"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
          >
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-40 animate-pulse rounded-xl border border-[#dfe5e1] bg-white"
              />
            ))}
          </div>
        ) : circuits.length === 0 ? (
          <div className="mt-8 flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd7ce] bg-white px-6 py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#dce8df] bg-[#f0f5f1]">
              <CircuitBoard className="h-9 w-9 text-[#176b4b]" />
            </div>
            <h2 className="mt-7 text-base font-semibold text-[#354239]">
              No circuits yet
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#89948d]">
              Create your first circuit and start designing.
            </p>
            <button
              type="button"
              onClick={handleCreateCircuit}
              disabled={creating}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#176b4b] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#12583d] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Create your first circuit
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {circuits.map((circuit) => (
              <article
                key={circuit.id}
                className="group flex min-h-40 flex-col rounded-xl border border-[#dfe5e1] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#9db9a7] hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4ef] text-[#176b4b]">
                    <CircuitBoard className="h-5 w-5" />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openRenameModal(circuit)}
                      title="Rename circuit"
                      aria-label={`Rename ${circuit.name}`}
                      className="rounded-md p-2 text-[#829087] transition hover:bg-[#edf4ef] hover:text-[#176b4b]"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openDeleteModal(circuit)}
                      title="Delete circuit"
                      aria-label={`Delete ${circuit.name}`}
                      className="rounded-md p-2 text-[#a0aaa3] transition hover:bg-rose-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/editor/${circuit.id}`)}
                  className="mt-5 text-left"
                >
                  <h2 className="truncate text-sm font-semibold text-[#354239] group-hover:text-[#176b4b]">
                    {circuit.name}
                  </h2>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#89948d]">
                    <Clock3 className="h-3.5 w-3.5" />
                    Updated {formatDate(circuit.updatedAt)}
                  </div>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
