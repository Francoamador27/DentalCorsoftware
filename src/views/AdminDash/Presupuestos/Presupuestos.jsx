import { useState, useEffect } from 'react';
import { Download, Trash2, FileText, Plus, CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import clienteAxios from '../../../config/axios';
import PresupuestoForm from './PresupuestoForm';
import { generarPresupuestoPDF } from './generarPresupuestoPDF';
import { usePageTour } from '../../../tours/TourContext';
import { presupuestosSteps } from '../../../tours/steps/presupuestos.steps';

const fmt = (n) => Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ESTADO_CONFIG = {
    borrador:  { label: 'Borrador',  icon: <Clock size={12} />,        cls: 'bg-slate-100 text-slate-600' },
    publicado: { label: 'Publicado', icon: <CheckCircle size={12} />,   cls: 'bg-blue-50 text-blue-600' },
    enviado:   { label: 'Enviado',   icon: <Send size={12} />,          cls: 'bg-blue-50 text-blue-600' },
    aceptado:  { label: 'Aceptado',  icon: <CheckCircle size={12} />,   cls: 'bg-green-50 text-green-600' },
    rechazado: { label: 'Rechazado', icon: <XCircle size={12} />,       cls: 'bg-red-50 text-red-500' },
};

const Presupuestos = () => {
    usePageTour('presupuestos', presupuestosSteps);

    const [tab, setTab]               = useState('lista');
    const [presupuestos, setPresupuestos] = useState([]);
    const [clinica, setClinica]       = useState(null);
    const [loading, setLoading]       = useState(true);
    const [downloading, setDownloading] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([
                clienteAxios.get('/api/presupuestos'),
                clienteAxios.get('/api/tenant-settings'),
            ]);
            setPresupuestos(pRes.data);
            setClinica(cRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleDownload = async (p) => {
        setDownloading(p.id);
        try {
            // Cargar con items si no los tiene
            let data = p;
            if (!p.items) {
                const { data: full } = await clienteAxios.get(`/api/presupuestos/${p.id}`);
                data = full;
            }
            await generarPresupuestoPDF(data, clinica);
        } finally {
            setDownloading(null);
        }
    };

    const handleDelete = async (p) => {
        if (!confirm(`¿Eliminar el presupuesto ${p.numero}?`)) return;
        setDeletingId(p.id);
        try {
            await clienteAxios.delete(`/api/presupuestos/${p.id}`);
            setPresupuestos(prev => prev.filter(x => x.id !== p.id));
        } catch {
            alert('Error al eliminar.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreated = (nuevo) => {
        setPresupuestos(prev => [nuevo, ...prev]);
        setTab('lista');
    };

    const tabCls = (id) =>
        `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${
            tab === id
                ? 'border-[#008DD2] text-[#008DD2]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
        }`;

    return (
        <div className="space-y-5">
            {/* Título */}
            <div data-tour="presupuestos-header">
                <h1 className="text-2xl font-bold text-gray-800">Presupuestos</h1>
                <p className="text-gray-500 text-sm mt-1">Creá y gestioná presupuestos para tus pacientes</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200" data-tour="presupuestos-tabs">
                <button className={tabCls('lista')} onClick={() => setTab('lista')}>
                    <FileText size={16} /> Lista de presupuestos
                </button>
                <button className={tabCls('crear')} onClick={() => setTab('crear')}>
                    <Plus size={16} /> Nuevo presupuesto
                </button>
            </div>

            {/* ── Tab Lista ── */}
            {tab === 'lista' && (
                <>
                    {loading && <p className="text-sm text-slate-400">Cargando...</p>}
                    {!loading && presupuestos.length === 0 && (
                        <div className="text-center py-16 text-slate-400">
                            <FileText size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">No hay presupuestos aún.</p>
                            <button
                                onClick={() => setTab('crear')}
                                className="mt-4 text-sm text-[#008DD2] hover:underline"
                            >
                                Crear el primero
                            </button>
                        </div>
                    )}
                    {!loading && presupuestos.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium">N°</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Paciente</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-medium">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {presupuestos.map(p => {
                                        const est = ESTADO_CONFIG[p.estado] ?? ESTADO_CONFIG.borrador;
                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{p.numero}</td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {p.fecha ? new Date(p.fecha.slice(0,10) + 'T00:00:00').toLocaleDateString('es-AR') : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-slate-800">{p.paciente_nombre}</p>
                                                    {p.paciente_email && (
                                                        <p className="text-xs text-slate-400">{p.paciente_email}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${est.cls}`}>
                                                        {est.icon} {est.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                                                    ${fmt(p.total)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleDownload(p)}
                                                            disabled={downloading === p.id}
                                                            className="p-1.5 rounded hover:bg-blue-50 text-blue-500 transition disabled:opacity-40"
                                                            title="Descargar PDF"
                                                        >
                                                            {downloading === p.id
                                                                ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                                                                : <Download size={15} />
                                                            }
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p)}
                                                            disabled={deletingId === p.id}
                                                            className="p-1.5 rounded hover:bg-red-50 text-red-400 transition disabled:opacity-40"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && (
                        <p className="text-xs text-gray-400 text-right">
                            {presupuestos.length} presupuesto{presupuestos.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </>
            )}

            {/* ── Tab Crear ── */}
            {tab === 'crear' && (
                <PresupuestoForm onCreated={handleCreated} />
            )}
        </div>
    );
};

export default Presupuestos;
