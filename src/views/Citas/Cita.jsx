// src/pages/Cita.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useSWR from 'swr';
import clienteAxios from '../../config/axios';
import DoctorSelector from '../../components/DoctorSelector';
import { formatDate } from '../../utils/formatDate';

// ⬇️ dayjs para manejar UTC en inputs
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { mostrarConfirmacion, mostrarError, mostrarExito } from '../../utils/Alertas';
dayjs.extend(utc);

// ---------- Helpers de fechas (para inputs, en UTC) ----------
/** De ISO/DB (con Z o "Y-m-d H:i:s") → valor para <input datetime-local> en UTC */
const toInputDatetimeLocalUTC = (value) => {
  if (!value) return '';
  const s = String(value).replace(' ', 'T'); // por si viene "Y-m-d H:i:s"
  const d = dayjs.utc(s);
  if (!d.isValid()) return '';
  return d.format('YYYY-MM-DDTHH:mm'); // SIN zona → input lo muestra literal
};
/** De <input datetime-local> → ISO en UTC (con Z) */
const fromInputToISO_UTC = (inputVal) => {
  if (!inputVal) return null; // inputVal = "YYYY-MM-DDTHH:mm" sin TZ
  const d = dayjs.utc(inputVal);
  return d.isValid() ? d.toISOString() : null;
};

// ---------- Formato moneda ----------
const useFmtCurrency = () =>
  useMemo(
    () =>
      new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 2,
      }),
    []
  );

const Cita = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('AUTH_TOKEN');
  const fmtCurrency = useFmtCurrency();

  // SWR + auth
  const fetcher = (url) =>
    clienteAxios(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

  const { data, error, isLoading, mutate } = useSWR(`/api/events/${id}`, fetcher, {
    revalidateOnFocus: false,
  });

  // Estado del formulario
  const [form, setForm] = useState({
    title: '',
    start: '', // YYYY-MM-DDTHH:mm (interpretable en UTC)
    end: '',
    amount: 0,
    isPaid: false,
    color: '#0ea5e9',
    doctorId: '',
    patientId: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // 🏥 Obra social del paciente
  const [obraSocialNombre, setObraSocialNombre] = useState(null);
  const [cubiertoObraSocial, setCubiertoObraSocial] = useState(true);
  const [montoCubiertoOS, setMontoCubiertoOS] = useState('');
  const [montoPacienteExtra, setMontoPacienteExtra] = useState('');

  // Poblar formulario con los datos del recurso
  useEffect(() => {
    const ev = data?.data;
    if (!ev) return;

    const startSrc = ev.start_iso || ev.start_raw || ev.start;
    const endSrc = ev.end_iso || ev.end_raw || ev.end;

    const docId = ev.idodc || ev.doctorId || '';
    const docName = [ev.doctor_name, ev.doctor_lastname].filter(Boolean).join(' ').trim();

    setForm({
      title: ev.title || '',
      // 👇 renderizar en UTC exacto (tal cual BD)
      start: toInputDatetimeLocalUTC(startSrc),
      end: toInputDatetimeLocalUTC(endSrc),
      amount: typeof ev.monto !== 'undefined' ? ev.monto : ev.amount ?? 0,
      isPaid: typeof ev.chec !== 'undefined' ? !!ev.chec : !!ev.isPaid,
      color: ev.color || '#0ea5e9',
      doctorId: docId,
      patientId: ev.idpa || ev.patientId || '',
    });

    setSelectedDoctor(
      docId
        ? { id: Number(docId), name: docName || '(Sin nombre)', email: ev.doctor_email || '' }
        : null
    );

    setObraSocialNombre(ev.obra_social_nombre ?? null);
    setCubiertoObraSocial(ev.cubierto_obra_social ?? true);
    setMontoCubiertoOS(ev.monto_cubierto_os ?? '');
    setMontoPacienteExtra(ev.monto_paciente_extra ?? '');
  }, [data]);

  // Sincronizar doctorId al cambiar selección
  useEffect(() => {
    setForm((f) => ({ ...f, doctorId: selectedDoctor?.id ?? '' }));
  }, [selectedDoctor]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // 👇 Tomar el valor del input (UTC) y convertir a ISO UTC (con Z)
    const startISO = fromInputToISO_UTC(form.start);
    const endISO = fromInputToISO_UTC(form.end);

    if (!startISO || !endISO) {
      alert('Revisá las fechas: deben ser válidas.');
      return;
    }

    const tieneObraSocial = !!obraSocialNombre;

    const payload = {
      title: form.title,
      start: startISO, // ISO en UTC
      end: endISO,     // ISO en UTC
      amount: Number(form.amount),
      isPaid: !!form.isPaid,
      doctorId: form.doctorId ? Number(form.doctorId) : null,
      color: form.color,
      cubiertoObraSocial: tieneObraSocial ? cubiertoObraSocial : null,
      montoCubiertoOS: tieneObraSocial && !cubiertoObraSocial && montoCubiertoOS
        ? Number(montoCubiertoOS)
        : null,
      montoPacienteExtra: tieneObraSocial && !cubiertoObraSocial && montoPacienteExtra
        ? Number(montoPacienteExtra)
        : null,
    };

    try {
      setSaving(true);
      await clienteAxios.put(`/api/events/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await mutate();
      alert('Cita actualizada correctamente.');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'Error al actualizar la cita.');
    } finally {
      setSaving(false);
    }
  };

  const onCancel = async () => {
    if (!confirm('¿Cancelar esta cita?')) return;
    try {
      setSaving(true);
      await clienteAxios.post(`/api/events/${id}/cancel`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await mutate();
      alert('Cita cancelada.');
    } catch (err) {
      console.error(err);
      alert('No se pudo cancelar la cita.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {

    const confirmar = await mostrarConfirmacion(
      "¿Estás seguro que deseas eliminar?",
      "Esta acción eliminará la cita de forma permanente."
    );
    if (!confirmar) return;
    try {
      setSaving(true);
      await clienteAxios.delete(`/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      mostrarExito('Cita eliminada correctamente.');
      navigate('/admin-dash/citas');
    } catch (err) {
      console.error(err);
      mostrarError('No se pudo eliminar la cita.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="h-8 w-48 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg animate-pulse" />
              <div className="h-6 w-20 bg-gradient-to-r from-green-200 to-green-300 rounded-full animate-pulse" />
            </div>
            <div className="h-10 w-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg animate-pulse" />
          </div>
          
          {/* Cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
                <div className="h-3 w-16 bg-gradient-to-r from-slate-200 to-slate-300 rounded mb-3 animate-pulse" />
                <div className="h-5 w-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded mb-2 animate-pulse" />
                <div className="h-4 w-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded animate-pulse" />
              </div>
            ))}
          </div>
          
          {/* Form skeleton */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-3xl shadow-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-gradient-to-r from-slate-200 to-slate-300 rounded mb-2 animate-pulse" />
                  <div className="h-12 w-full bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6">
        <div className="bg-white/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error al cargar</h2>
          <p className="text-red-600 mb-4">No se pudo cargar la información de la cita.</p>
          <Link 
            to="/admin-dash/citas"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl transition-all duration-200"
          >
            ← Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  const ev = data?.data;
  const startSrc = ev?.start_iso || ev?.start_raw || ev?.start;
  const endSrc = ev?.end_iso || ev?.end_raw || ev?.end;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header con glassmorphism */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
         
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Cita 
              </h1>
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm transition-all duration-200 ${
              form.isPaid 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200' 
                : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-orange-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                form.isPaid ? 'bg-green-200' : 'bg-orange-200'
              } animate-pulse`} />
              {form.isPaid ? 'Pagada' : 'Pendiente'}
            </div>
          </div>
          
          <Link
            to="/admin-dash/citas"
            className="sm:ml-auto inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-slate-700 px-4 py-2.5 rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </Link>
        </div>

        {/* Tarjetas de información con glassmorphism */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/80 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Paciente</p>
            <p className="font-semibold text-slate-800 text-lg mb-1">{ev?.patient_name} {ev?.patient_lastname}</p>
            <p className="text-sm text-slate-600">{ev?.patient_email || ev?.patient_phone || '-'}</p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/80 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Doctor</p>
            <p className="font-semibold text-slate-800 text-lg mb-1">
              {selectedDoctor?.name || [ev?.doctor_name, ev?.doctor_lastname].filter(Boolean).join(' ')}
            </p>
            <p className="text-xs text-slate-500">ID: {form.doctorId || '-'}</p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/80 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Inicio</p>
            <p className="font-semibold text-slate-800 text-lg">{formatDate(startSrc, true)}</p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/80 hover:-translate-y-1">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Fin</p>
            <p className="font-semibold text-slate-800 text-lg">{formatDate(endSrc, true)}</p>
          </div>
        </div>

        {/* Formulario principal con glassmorphism */}
        <form onSubmit={onSubmit} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl shadow-2xl p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Título */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Título
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onChange}
                className="w-full bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-slate-800 placeholder-slate-400 shadow-sm"
                placeholder="Descripción de la cita"
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
                Color
              </label>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <input
                    type="color"
                    name="color"
                    value={form.color}
                    onChange={onChange}
                    className="h-12 w-16 p-1 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm cursor-pointer group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all duration-200"></div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 shadow-sm">
                  <span className="text-xs font-mono text-slate-600">{form.color}</span>
                </div>
              </div>
            </div>

            {/* Inicio */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Fecha y hora de inicio
              </label>
              <input
                type="datetime-local"
                name="start"
                value={form.start}
                onChange={onChange}
                className="w-full bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200 text-slate-800 shadow-sm"
              />
            </div>

            {/* Fin */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Fecha y hora de fin
              </label>
              <input
                type="datetime-local"
                name="end"
                value={form.end}
                onChange={onChange}
                className="w-full bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-200 text-slate-800 shadow-sm"
              />
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Monto
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={form.amount}
                  onChange={onChange}
                  className="w-full bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all duration-200 text-slate-800 placeholder-slate-400 shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Estado de pago */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl px-6 py-4 shadow-sm">
                <div className="relative">
                  <input
                    id="isPaid"
                    type="checkbox"
                    name="isPaid"
                    checked={form.isPaid}
                    onChange={onChange}
                    className="w-5 h-5 rounded border-2 border-slate-300 text-green-600 focus:ring-green-500 focus:ring-2 focus:ring-offset-2 transition-all duration-200 cursor-pointer"
                  />
                </div>
                <label htmlFor="isPaid" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Marcar como pagado
                </label>
              </div>
            </div>

            {/* 🏥 Obra Social del paciente */}
            {obraSocialNombre && (
              <div className="md:col-span-2 space-y-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    Obra Social: <span className="font-bold text-slate-800">{obraSocialNombre}</span>
                  </p>

                  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                    <span className="text-sm font-semibold text-slate-700">¿Cubierto por la obra social?</span>
                    <input
                      type="checkbox"
                      checked={cubiertoObraSocial}
                      onChange={(e) => setCubiertoObraSocial(e.target.checked)}
                      className="peer sr-only"
                      aria-label="Cubierto por la obra social"
                    />
                    <span className="relative h-6 w-12 rounded-full bg-gray-300 transition-colors peer-checked:bg-[#008DD2] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#008DD2]">
                      <span className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 peer-checked:translate-x-6" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {cubiertoObraSocial ? 'Sí' : 'No'}
                    </span>
                  </label>
                </div>

                {!cubiertoObraSocial && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Monto que cubre la obra social</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={montoCubiertoOS}
                          onChange={(e) => setMontoCubiertoOS(e.target.value)}
                          placeholder="Ej: 3000"
                          className="w-full bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-all duration-200 text-slate-800 placeholder-slate-400 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Extra a pagar por el paciente</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={montoPacienteExtra}
                          onChange={(e) => setMontoPacienteExtra(e.target.value)}
                          placeholder="Ej: 2000"
                          className="w-full bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-200 text-slate-800 placeholder-slate-400 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Doctor Selector */}
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Doctor asignado
              </label>
              <div className="bg-white/30 backdrop-blur-sm border border-white/20 rounded-xl p-4">
                <DoctorSelector value={selectedDoctor} onChange={(doc) => setSelectedDoctor(doc)} />
              </div>
              {!form.doctorId && (
                <div className="flex items-center gap-2 mt-2 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-700 font-medium">Seleccioná un doctor para guardar los cambios.</p>
                </div>
              )}
            </div>

            {/* Paciente ID */}
            <div className="md:col-span-2 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                ID Paciente
              </label>
              <input
                type="number"
                name="patientId"
                value={form.patientId}
                onChange={onChange}
                className="w-full bg-slate-50/80 backdrop-blur-sm border border-slate-200/50 rounded-xl px-4 py-3 text-slate-600 shadow-sm cursor-not-allowed"
                readOnly
              />
              <p className="text-xs text-slate-500 ml-1">Este campo es de solo lectura</p>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white/80 px-4 py-1 rounded-full text-slate-500 font-medium shadow-sm">Acciones</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              type="submit"
              disabled={saving || !form.doctorId}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:shadow-sm transition-all duration-200 disabled:cursor-not-allowed group"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar cambios
                </>
              )}
            </button>

            {/* <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-400 disabled:to-slate-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:shadow-sm transition-all duration-200 disabled:cursor-not-allowed group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar cita
            </button> */}

            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:shadow-sm transition-all duration-200 disabled:cursor-not-allowed group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar cita
            </button>

            <Link
              to="/admin-dash/citas"
              className="ml-auto inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm hover:bg-white/90 text-slate-700 px-6 py-3 rounded-xl border border-white/30 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al listado
            </Link>
          </div>
        </form>

        {/* Footer con información adicional */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-600 font-medium">Sistema actualizado en tiempo real</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cita;