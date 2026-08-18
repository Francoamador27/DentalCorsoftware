import React, { useMemo, useState, useCallback } from "react";
import Paciente from "./Paciente";
import Odontograma from "./componentes/Odontograma";
import HistorialClinico from "./componentes/HistorialClinico";
import PacientesEvents from "./componentes/PacientesEvents";
import ArchivosManager from "./ArchivosManager";
import Patologias from "./Patologias";
import { usePageTour } from "../../../tours/TourContext";
import { historialPacienteSteps } from "../../../tours/steps/historialPaciente.steps";

/* Reemplaza estos por tus componentes reales */
const DatosPaciente = () => <div className="text-slate-700"><Paciente /></div>;
const EvolucionClinica = () => <div className="text-slate-700"><Odontograma /></div>;
const Estudios = () => <div className="text-slate-700"><HistorialClinico /></div>;
const Pagos = () => <div className="text-slate-700"><PacientesEvents /></div>;
const Archivos = () => <div className="text-slate-700"><ArchivosManager /></div>;

const HistorialPaciente = () => {
  usePageTour('pacientes-historial', historialPacienteSteps);

  const [active, setActive] = useState(0);

  const tabs = useMemo(
    () => [
      { key: "datos", label: "Datos", element: <DatosPaciente /> },
      { key: "odontograma", label: "Odontograma", element: <EvolucionClinica /> },
      { key: "historial", label: "Historial", element: <Estudios /> },
      { key: "Citas", label: "Citas", element: <Pagos /> },
      { key: "archivos", label: "Archivos", element: <Archivos /> },
      { key: "patologias", label: "Patologías", element: <Patologias /> },
    ],
    []
  );

  const onKeyDown = useCallback(
    (e) => {
      const last = tabs.length - 1;
      if (e.key === "ArrowRight") { e.preventDefault(); setActive((i) => (i >= last ? 0 : i + 1)); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); setActive((i) => (i <= 0 ? last : i - 1)); }
      if (e.key === "Home")       { e.preventDefault(); setActive(0); }
      if (e.key === "End")        { e.preventDefault(); setActive(last); }
    },
    [tabs.length]
  );

  const prev = () => setActive((i) => Math.max(0, i - 1));
  const next = () => setActive((i) => Math.min(tabs.length - 1, i + 1));

  return (
    <div className="mx-auto max-w-5xl ">
      {/* Tabs header */}
      <div
        role="tablist"
        aria-label="Historial del paciente"
        onKeyDown={onKeyDown}
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2"
      >
        {tabs.map((t, idx) => {
          const selected = idx === active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${t.key}`}
              id={`tab-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(idx)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-medium outline-none transition",
                selected
                  ? "bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}

        <div className="ml-auto flex gap-2">
          <button
            onClick={prev}
            disabled={active === 0}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
          >
            ◀ Anterior
          </button>
          <button
            onClick={next}
            disabled={active === tabs.length - 1}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            type="button"
          >
            Siguiente ▶
          </button>
        </div>
      </div>

      {/* Active panel */}
      <div
        role="tabpanel"
        id={`panel-${tabs[active].key}`}
        aria-labelledby={`tab-${tabs[active].key}`}
        className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {tabs[active].element}
      </div>
    </div>
  );
};

export default HistorialPaciente;
