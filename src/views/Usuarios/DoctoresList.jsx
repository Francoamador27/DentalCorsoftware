import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import clienteAxios from "../../config/axios";
import { mostrarConfirmacion } from "../../utils/Alertas";

// peq. hook de debounce
function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const ROL_LABELS = { 1: "Admin", 2: "Doctor", 3: "Secretario" };
const ROL_BADGE = {
  1: "bg-blue-100 text-blue-800",
  2: "bg-emerald-100 text-emerald-800",
  3: "bg-amber-100 text-amber-800",
};

const fetcher = async ([url, params, token]) => {
  const { data } = await clienteAxios.get(url, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
};

const DoctoresList = () => {
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
    ["/api/doctores", params, token],
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true, // SWR v2
    }
  );

  const eliminarDoctor = async (doctor) => {
    if (Number(doctor.rol) === 1) {
      alert("No se puede eliminar un usuario con rol Admin.");
      return;
    }

    const confirmar = await mostrarConfirmacion(
      "¿Estás seguro que deseas eliminar?",
      "Esta acción eliminará el doctor de forma permanente."
    );
    if (!confirmar) return;

    try {
      await clienteAxios.delete(`/api/doctores/${doctor.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      mutate(); // refrescar lista
    } catch {
      alert("Error al eliminar el doctor");
    }
  };

  const doctores = data?.data || [];
  const meta = data?.meta || {};
console.log('doctores', doctores)
  return (
    <div className="p-4">
      <div className="flex justify-start gap-1 items-center mb-6">
        <h2 className="text-2xl font-semibold">Administrar Doctores</h2>
        <Link
          to="/admin-dash/doctores/nuevo"
          className="inline-flex py-2 items-center gap-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Doctor
        </Link>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
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
        <p>Cargando doctores...</p>
      ) : error ? (
        <p>Error al cargar los doctores.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-800 bg-white">
            <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">DNI</th>
                <th className="px-4 py-3 text-left">Especialidad</th>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {doctores.map((doctor) => (
                <tr key={doctor.id} className="hover:bg-gray-50 border-t border-gray-200 transition">
                  <td className="px-4 py-3">{doctor.id}</td>
                  <td className="px-4 py-3">{doctor.name}</td>
                  <td className="px-4 py-3">{doctor.email}</td>
                  <td className="px-4 py-3">{doctor.dni}</td>
                  <td className="px-4 py-3">{doctor.specialty}</td>
                  <td className="px-4 py-3">
                    {doctor.color ? (
                      <span
                        className="inline-block w-6 h-6 rounded-full border"
                        style={{ backgroundColor: doctor.color }}
                      />
                    ) : (
                      <span className="text-gray-400 italic">Sin color</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                        ROL_BADGE[Number(doctor.rol)] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {ROL_LABELS[Number(doctor.rol)] ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <Link
                      to={`/admin-dash/doctores/${doctor.id}`}
                      className="px-3 py-1 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Ver más
                    </Link>
                    {Number(doctor.rol) !== 1 && (
                      <button
                        onClick={() => eliminarDoctor(doctor)}
                        className="px-3 py-1 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700 transition"
                        type="button"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {doctores.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
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

export default DoctoresList;
