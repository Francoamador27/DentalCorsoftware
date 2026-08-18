import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import clienteAxios from "../../../config/axios";
import { mostrarConfirmacion } from "../../../utils/Alertas";
import { Stethoscope } from "lucide-react";
import { usePageTour } from "../../../tours/TourContext";
import { pacientesSteps } from "../../../tours/steps/pacientes.steps";

// peq. hook de debounce
function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const fetcher = async ([url, params, token]) => {
  const { data } = await clienteAxios.get(url, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
};

const PacientesList = () => {
  usePageTour('pacientes', pacientesSteps);

  const token = localStorage.getItem("AUTH_TOKEN");

  const [busqueda, setBusqueda] = useState("");
  const [direccion, setDireccion] = useState("desc");
  const [perPage, setPerPage] = useState(10);
  const [pagina, setPagina] = useState(1);

  // 1) debounce para no disparar requests por tecla
  const debouncedBusqueda = useDebounced(busqueda, 350);

  // 2) params memoizados; sólo ponemos busqueda si tiene ≥4
  const params = useMemo(() => {
    const p = {
      direccion,
      per_page: perPage,
      page: pagina,
    };
    if (debouncedBusqueda.trim().length >= 4) {
      p.busqueda = debouncedBusqueda.trim();
    }
    return p;
  }, [debouncedBusqueda, direccion, perPage, pagina]);

  // 3) key estable con tupla; NO concatenar strings
  const { data, error, isLoading, mutate, isValidating } = useSWR(
    ["/api/pacientes", params, token],
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true, // SWR v2
    }
  );

  const eliminarPaciente = async (idpa) => {
    const confirmar = await mostrarConfirmacion(
      "¿Estás seguro que deseas eliminar?",
      "Esta acción eliminará el paciente de forma permanente."
    );
    if (!confirmar) return;

    try {
      await clienteAxios.delete(`/api/pacientes/${idpa}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      mutate(); // refrescar lista
    } catch {
      alert("Error al eliminar el paciente");
    }
  };
  const pacientes = data?.data || [];
  console.log("Pacientes:", pacientes);
  const meta = data?.meta || {};

  return (
    <div className="p-4">
      <div className="flex justify-start gap-1 items-center mb-6" data-tour="pacientes-header">
        <h2 className="text-2xl font-semibold">Administrar pacientes</h2>
        <Link
          to="/admin-dash/pacientes/nuevo"
          className="inline-flex py-2 items-center gap-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Paciente
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-4 mb-4 items-center" data-tour="pacientes-filtros">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por nombre, email o DNI"
            className="border px-3 py-1 rounded w-64"
            autoComplete="off"
          />
          {busqueda && (
            <button
              onClick={() => {
                setBusqueda("");
                setPagina(1);
              }}
              className="text-sm text-red-500 underline"
              type="button"
            >
              Limpiar
            </button>
          )}
        </div>

        {busqueda.length > 0 && busqueda.length < 4 && (
          <p className="text-sm text-yellow-600">
            Escribí al menos 4 letras o números para buscar.
          </p>
        )}

        <select
          onChange={(e) => {
            setDireccion(e.target.value);
            setPagina(1);
          }}
          className="border px-2 py-1 rounded"
          value={direccion}
        >
          <option value="desc">Fecha ↓ Recientes</option>
          <option value="asc">Fecha ↑ Antiguos</option>
        </select>

        <select
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPagina(1);
          }}
          className="border px-2 py-1 rounded"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>

        {isValidating && <span className="text-sm text-gray-500">Actualizando…</span>}
      </div>

      {/* Tabla */}
      {isLoading ? (
        <p>Cargando pacientes...</p>
      ) : error ? (
        <p>Error al cargar los pacientes.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200" data-tour="pacientes-tabla">
          <table className="min-w-full text-sm text-gray-800 bg-white">
            <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">DNI</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Telefono</th>
                <th className="px-4 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map((paciente) => (
                <tr key={paciente.id} className="hover:bg-gray-50 border-t border-gray-200 transition">
                  <td className="px-4 py-3">{paciente.user?.dni}</td>
                  <td className="px-4 py-3">{paciente.user?.name}</td>
                  <td className="px-4 py-3">{paciente.user?.email}</td>
                  <td className="px-4 py-3">{paciente.phon}</td>

                  <td className="px-4 py-3 flex gap-2">
                    <Link
                      to={`/admin-dash/pacientes/historial/${paciente.idpa}`}
                      className="inline-block bg-blue-300 hover:bg-blue-400 text-white text-xs font-semibold px-3 py-2 rounded"
                    >
                      <Stethoscope />
                    </Link>
                    <button
                      onClick={() => eliminarPaciente(paciente.idpa)}
                      className="px-3 py-1 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700 transition"
                      type="button"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {pacientes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="mt-4 flex gap-4 items-center">
        <button
          onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          disabled={pagina <= 1}
          type="button"
        >
          Anterior
        </button>
        <span className="text-sm">
          Página {meta.current_page || pagina} de {meta.last_page || "?"}
        </span>
        <button
          onClick={() =>
            setPagina((prev) => (meta.last_page ? Math.min(meta.last_page, prev + 1) : prev + 1))
          }
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          disabled={meta.last_page && pagina >= meta.last_page}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default PacientesList;
