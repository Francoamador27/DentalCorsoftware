import React, { useState, useMemo, useCallback } from 'react';
import Gastos from './Gastos';
import Estadisticas from './Estadisticas';
import Ingresos from './Ingresos';
import { usePageTour } from '../../tours/TourContext';
import { finanzasSteps } from '../../tours/steps/finanzas.steps';


// Reemplaza estos por tus componentes reales
const CrearServicio = () => <div className="text-slate-700"></div>;
const ListaServicios = () => <div className="text-slate-700"></div>;

const Finanzas = () => {
  usePageTour('finanzas', finanzasSteps);

  const [active, setActive] = useState(0);

  const tabs = useMemo(
    () => [
      { key: "Estadisticas", label: "Estadisticas", element: <Estadisticas /> },
      { key: "Ingresos", label: "Ingresos", element: <Ingresos /> },
      { key: "Gastos", label: "Gastos", element: <Gastos /> },
      // { key: "Ingresos", label: "Ingresos", element: <ListaServicios /> },
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
    <div className="mx-auto max-w-7xl p-4">
      {/* Header opcional */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">
    Finanzas
        </h1>
      </div>

      {/* Tabs header */}
      <div
        role="tablist"
        aria-label="Gestión de servicios"
        onKeyDown={onKeyDown}
        className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 bg-white rounded-t-lg px-6 pt-4"
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
                "rounded-lg px-6 py-3 text-sm font-semibold outline-none transition-all duration-200",
                selected
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
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
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
            type="button"
          >
            ← Anterior
          </button>
          <button
            onClick={next}
            disabled={active === tabs.length - 1}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            type="button"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Active panel */}
      <div
        role="tabpanel"
        id={`panel-${tabs[active].key}`}
        aria-labelledby={`tab-${tabs[active].key}`}
        className="rounded-b-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        {tabs[active].element}
      </div>
    </div>
  );
};

export default Finanzas;