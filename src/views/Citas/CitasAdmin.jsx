import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import clienteAxios from '../../config/axios';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate';
import { mostrarConfirmacion, mostrarError, mostrarExito } from '../../utils/Alertas';
import NotificacionWhatsapp from '../../components/NotificacionWhatsapp/NotificacionWhatsapp';
import { Stethoscope, User,CalendarCheck, Trash2 } from 'lucide-react';
import { usePageTour } from '../../tours/TourContext';
import { citasSteps } from '../../tours/steps/citas.steps';

// ── Debounce pequeñito
function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ── Fetcher estable: recibe [url, params, token]
const fetcher = async ([url, params, token]) => {
  const { data } = await clienteAxios.get(url, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
};

const CitasAdmin = () => {
  usePageTour('citas', citasSteps);

  const token = localStorage.getItem('AUTH_TOKEN');

  // Filtros y paginación
  const [busqueda, setBusqueda] = useState('');
  const [isPaid, setIsPaid] = useState('');               // "" | "1" | "0"
  const [ordenarPor, setOrdenarPor] = useState('start');  // start | end | monto | created_at
  const [direccion, setDireccion] = useState('desc');     // asc | desc
  const [pagina, setPagina] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [saving, setSaving] = useState(false);

  // Debounce para no disparar fetch en cada tecla
  const debouncedBusqueda = useDebounced(busqueda, 350);

  // Params memoizados
  const params = useMemo(() => {
    const p = {
      ordenar_por: ordenarPor,
      direccion,
      page: pagina,
      per_page: perPage,
    };
    if (debouncedBusqueda.trim().length >= 4) {
      p.busqueda = debouncedBusqueda.trim();
    }
    if (isPaid !== '') p.is_paid = isPaid; // "1" o "0"
    return p;
  }, [debouncedBusqueda, isPaid, ordenarPor, direccion, pagina, perPage]);

  // SWR con key-tupla → estable, sin remontar el input
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['/api/events', params, token],
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true, // SWR v2
    }
  );

  const eventos = data?.data || [];
  const meta = data?.meta || {};

  const fmtCurrency = useMemo(
    () =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 2,
      }),
    []
  );

  const onDelete = async (id) => {
    const confirmar = await mostrarConfirmacion(
      '¿Estás seguro que deseas eliminar?',
      'Esta acción eliminará la cita de forma permanente.'
    );
    if (!confirmar) return;

    try {
      setSaving(true);
      await clienteAxios.delete(`/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Si borraste el ÚNICO item de la página y hay páginas previas,
      // bajamos una página para evitar quedarnos en una vista vacía:
      const currentPage = meta?.current_page ?? pagina;
      if (eventos.length === 1 && currentPage > 1) {
        setPagina((prev) => Math.max(1, prev - 1));
        // No llamamos mutate aquí porque cambiar la página ya dispara el refetch
      } else {
        // Revalida la lista con los mismos filtros/paginación
        await mutate();
      }

      mostrarExito('Cita eliminada correctamente.');
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo eliminar la cita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-6 flex items-center gap-3" data-tour="citas-header">
        <h2 className="text-2xl font-semibold">Administrar Citas</h2>
        {isValidating && <span className="text-sm text-gray-500">Actualizando…</span>}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-4 items-center" data-tour="citas-filtros">
        {/* Búsqueda */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por título, paciente o doctor"
            className="border px-3 py-1 rounded w-64"
            autoComplete="off"
          />
          {busqueda && (
            <button
              onClick={() => {
                setBusqueda('');
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
          <p className="text-sm text-yellow-600">Escribí al menos 4 letras para buscar.</p>
        )}

        {/* Filtro de pago */}
        <select
          onChange={(e) => {
            setIsPaid(e.target.value);
            setPagina(1);
          }}
          className="border px-2 py-1 rounded"
          value={isPaid}
        >
          <option value="">Todos (pagados y no pagados)</option>
          <option value="1">Solo pagados</option>
          <option value="0">Solo no pagados</option>
        </select>

        {/* Orden */}
        <select
          onChange={(e) => {
            setOrdenarPor(e.target.value);
            setPagina(1);
          }}
          className="border px-2 py-1 rounded"
          value={ordenarPor}
        >
          <option value="start">Inicio</option>
          <option value="end">Fin</option>
          <option value="monto">Monto</option>
          <option value="created_at">Creación</option>
        </select>

        {/* Dirección */}
        <select
          onChange={(e) => {
            setDireccion(e.target.value);
            setPagina(1);
          }}
          className="border px-2 py-1 rounded"
          value={direccion}
        >
          <option value="desc">↓ Descendente</option>
          <option value="asc">↑ Ascendente</option>
        </select>

        {/* Tamaño de página */}
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
      </div>

      {/* Tabla */}
      {isLoading ? (
        <p className="p-4 text-gray-600">Cargando eventos...</p>
      ) : error ? (
        <p className="p-4 text-red-600">Error al cargar los eventos.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200" data-tour="citas-tabla">
          <table className="min-w-full text-sm text-gray-800 bg-white">
            <thead className="bg-gray-100 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Color</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-left">Doctor</th>
                <th className="px-4 py-3 text-left">Paciente</th>
                <th className="px-4 py-3 text-left">Obra Social</th>
                <th className="px-4 py-3 text-left">Inicio</th>
                <th className="px-4 py-3 text-left">Fin</th>
                <th className="px-4 py-3 text-left">Monto</th>
                <th className="px-4 py-3 text-left">Pago</th>
                <th className="px-4 py-3 text-left">Acción</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50 border-t border-gray-200 transition">
                  <td className="px-4 py-3" style={{ backgroundColor: ev.color }}></td>
                  <td className="px-4 py-3">{ev.title || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {ev.doctor_name ? `${ev.doctor_name}` : '-'}
                      </span>
                      {ev.doctor_lastname && (
                        <span className="text-xs text-gray-500">{ev.doctor_lastname}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{ev.patient_name || '-'}</span>
                      {(ev.patient_phone || ev.patient_email) && (
                        <span className="text-xs text-gray-500">
                          {ev.patient_phone || ev.patient_email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {ev.obra_social_nombre ? (
                      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-sky-100 text-sky-800">
                        {ev.obra_social_nombre}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Particular</span>
                    )}
                  </td>

                  <td className="px-4 py-3">{formatDate(ev.start)}</td>
                  <td className="px-4 py-3">{formatDate(ev.end)}</td>
                  <td className="px-4 py-3 font-medium">
                    {fmtCurrency.format(Number(ev.monto || 0))}
                    {ev.obra_social_nombre && ev.cubierto_obra_social === false && (
                      <div className="mt-1 text-xs font-normal text-gray-500 space-y-0.5">
                        <div>OS cubre: {fmtCurrency.format(Number(ev.monto_cubierto_os || 0))}</div>
                        <div>Paciente: {fmtCurrency.format(Number(ev.monto_paciente_extra || 0))}</div>
                      </div>
                    )}
                    {ev.obra_social_nombre && ev.cubierto_obra_social === true && (
                      <div className="mt-1 text-xs font-normal text-green-600">Cubierto 100% por OS</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${ev.isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {ev.isPaid ? 'Pagado' : 'No pagado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <Link
                      to={`/admin-dash/citas/${ev.id}`}
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-3 rounded"
                    >
                      <p className="flex items-center gap-1">
                        <CalendarCheck />
                      </p>
                    </Link>

                    <Link
                      to={`/admin-dash/pacientes/historial/${ev.idpa}`}
                      className="inline-block bg-blue-300 hover:bg-blue-400 text-white text-xs font-semibold px-3 py-3 rounded"
                    >
                      <p className="flex items-center gap-1">
                        <Stethoscope />
                
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(ev.id)}
                      disabled={saving}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white px-3 py-2 rounded font-semibold shadow hover:shadow-md transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      <p className="flex items-center gap-1">
                        <Trash2 />
                      </p>
                    </button>
                    <NotificacionWhatsapp datos={ev} date={formatDate(ev.start)} />
                  </td>
                </tr>
              ))}
              {eventos.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                    No hay eventos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="mt-4 flex flex-wrap gap-4 items-center">
        <button
          onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          disabled={(meta.current_page || pagina) <= 1}
          type="button"
        >
          Anterior
        </button>

        <span className="text-sm">
          Página {meta.current_page || pagina} de {meta.last_page ?? '…'}
          {typeof meta.from !== 'undefined' &&
            typeof meta.to !== 'undefined' &&
            typeof meta.total !== 'undefined' && (
              <span className="ml-2 text-gray-500">
                ({meta.from}-{meta.to} de {meta.total})
              </span>
            )}
        </span>

        <button
          onClick={() =>
            setPagina((prev) =>
              meta.last_page ? Math.min(meta.last_page, prev + 1) : prev + 1
            )
          }
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          disabled={meta.last_page ? (meta.current_page || pagina) >= meta.last_page : false}
          type="button"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};

export default CitasAdmin;
