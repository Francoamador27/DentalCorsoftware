import React, { useState } from 'react';
import useSWR from 'swr';
import clienteAxios from '../../config/axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Estadisticas = () => {
    const token = localStorage.getItem('AUTH_TOKEN');
    
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // Construir query params
    const params = new URLSearchParams();
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    const query = params.toString();

    // Fetcher para estadísticas
    const fetcherEstadisticas = () =>
        clienteAxios(`/api/estadisticas?${query}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }).then(res => res.data);

    const { data, error, isLoading } = useSWR(`/api/estadisticas?${query}`, fetcherEstadisticas);

    const estadisticas = data?.data || null;

    // Configuración del gráfico
    const chartData = estadisticas ? {
        labels: ['Ingresos Cobrados', 'Ingresos Pendientes', 'Gastos'],
        datasets: [
            {
                label: 'Monto ($)',
                data: [
                    estadisticas.ingresos_cobrados.total,
                    estadisticas.ingresos_pendientes.total,
                    estadisticas.gastos.total,
                ],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.7)',   // Verde para cobrados
                    'rgba(59, 130, 246, 0.7)',  // Azul para pendientes
                    'rgba(239, 68, 68, 0.7)',   // Rojo para gastos
                ],
                borderColor: [
                    'rgb(34, 197, 94)',
                    'rgb(59, 130, 246)',
                    'rgb(239, 68, 68)',
                ],
                borderWidth: 2,
            },
        ],
    } : null;

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Resumen Financiero',
                font: {
                    size: 18,
                    weight: 'bold',
                },
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `$${context.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '$' + value.toLocaleString('es-AR');
                    }
                }
            },
        },
    };

    const formatCurrency = (value) => {
        return `$${parseFloat(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (isLoading) return <p className="p-4 text-gray-600">Cargando estadísticas...</p>;
    if (error) return <p className="p-4 text-red-600">Error al cargar las estadísticas.</p>;

    return (
        <div className="p-4 max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">Estadísticas Financieras</h2>

            {/* Filtros de fecha */}
            <div className="mb-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Filtrar por Rango de Fechas</h3>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium mb-1">Desde</label>
                        <input
                            type="date"
                            value={fechaDesde}
                            onChange={(e) => setFechaDesde(e.target.value)}
                            className="border px-3 py-2 rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Hasta</label>
                        <input
                            type="date"
                            value={fechaHasta}
                            onChange={(e) => setFechaHasta(e.target.value)}
                            className="border px-3 py-2 rounded"
                        />
                    </div>

                    {(fechaDesde || fechaHasta) && (
                        <button
                            onClick={() => {
                                setFechaDesde('');
                                setFechaHasta('');
                            }}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
                        >
                            Limpiar Filtros
                        </button>
                    )}
                </div>
            </div>

            {estadisticas && (
                <>
                    {/* Tarjetas de resumen */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-md">
                            <h3 className="text-sm font-medium text-green-600 mb-2">Ingresos Cobrados</h3>
                            <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(estadisticas.ingresos_cobrados.total)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {estadisticas.ingresos_cobrados.cantidad} eventos
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-md">
                            <h3 className="text-sm font-medium text-blue-600 mb-2">Ingresos Pendientes</h3>
                            <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(estadisticas.ingresos_pendientes.total)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {estadisticas.ingresos_pendientes.cantidad} eventos
                            </p>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-md">
                            <h3 className="text-sm font-medium text-red-600 mb-2">Gastos</h3>
                            <p className="text-2xl font-bold text-red-700">
                                {formatCurrency(estadisticas.gastos.total)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {estadisticas.gastos.cantidad} registros
                            </p>
                        </div>

                        <div className={`border rounded-xl p-6 shadow-md ${
                            estadisticas.resumen.balance >= 0 
                                ? 'bg-emerald-50 border-emerald-200' 
                                : 'bg-rose-50 border-rose-200'
                        }`}>
                            <h3 className={`text-sm font-medium mb-2 ${
                                estadisticas.resumen.balance >= 0 
                                    ? 'text-emerald-600' 
                                    : 'text-rose-600'
                            }`}>Balance</h3>
                            <p className={`text-2xl font-bold ${
                                estadisticas.resumen.balance >= 0 
                                    ? 'text-emerald-700' 
                                    : 'text-rose-700'
                            }`}>
                                {formatCurrency(estadisticas.resumen.balance)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                {estadisticas.resumen.porcentaje_cobrado}% cobrado
                            </p>
                        </div>
                    </div>

                    {/* Gráfico de barras */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
                        <div style={{ height: '400px' }}>
                            {chartData && <Bar data={chartData} options={chartOptions} />}
                        </div>
                    </div>

                    {/* Información adicional */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-md mb-6">
                        <h3 className="text-lg font-semibold mb-4">Resumen Detallado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Ingresos Totales Esperados:</p>
                                <p className="text-xl font-bold text-gray-800">
                                    {formatCurrency(estadisticas.resumen.ingresos_totales_esperados)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Porcentaje de Cobro:</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                                        <div
                                            className="bg-green-500 h-4 rounded-full transition-all"
                                            style={{ width: `${estadisticas.resumen.porcentaje_cobrado}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xl font-bold text-gray-800">
                                        {estadisticas.resumen.porcentaje_cobrado}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ingresos cobrados: Obra Social vs Particular */}
                    {estadisticas.por_obra_social && (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold mb-4">Ingresos Cobrados por Obra Social</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="bg-sky-50 border border-sky-200 rounded-xl p-6 shadow-md">
                                    <h4 className="text-sm font-medium text-sky-600 mb-2">Cobrado vía Obra Social</h4>
                                    <p className="text-2xl font-bold text-sky-700">
                                        {formatCurrency(estadisticas.por_obra_social.cubierto_os.total)}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {estadisticas.por_obra_social.cubierto_os.cantidad} eventos ·{' '}
                                        {estadisticas.por_obra_social.cubierto_os.porcentaje}% de lo cobrado
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-md">
                                    <h4 className="text-sm font-medium text-amber-600 mb-2">Cobrado Particular</h4>
                                    <p className="text-2xl font-bold text-amber-700">
                                        {formatCurrency(estadisticas.por_obra_social.particular.total)}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {estadisticas.por_obra_social.particular.cantidad} eventos ·{' '}
                                        {estadisticas.por_obra_social.particular.porcentaje}% de lo cobrado
                                    </p>
                                </div>
                            </div>

                            {estadisticas.por_obra_social.sin_clasificar?.cantidad > 0 && (
                                <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 mb-6 flex items-start gap-3">
                                    <span className="text-gray-500">⚠️</span>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700">
                                            {formatCurrency(estadisticas.por_obra_social.sin_clasificar.total)} sin clasificar
                                            ({estadisticas.por_obra_social.sin_clasificar.cantidad} {estadisticas.por_obra_social.sin_clasificar.cantidad === 1 ? 'cita' : 'citas'})
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Son citas de pacientes que tienen obra social asignada, pero la cita nunca definió
                                            si estaba cubierta o no. Abrilas desde el calendario y guardá los cambios para
                                            clasificarlas — no se están contando ni como Obra Social ni como Particular.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {estadisticas.por_obra_social.detalle.length > 0 ? (
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-600 mb-3">Desglose por Obra Social</h4>
                                    <div className="space-y-3">
                                        {estadisticas.por_obra_social.detalle.map((item) => {
                                            const max = estadisticas.por_obra_social.detalle[0]?.total || 1;
                                            const width = max > 0 ? (item.total / max) * 100 : 0;
                                            return (
                                                <div key={item.obra_social} className="flex items-center gap-3">
                                                    <span className="w-40 shrink-0 text-sm text-gray-700 truncate" title={item.obra_social}>
                                                        {item.obra_social}
                                                    </span>
                                                    <div className="flex-1 bg-gray-100 rounded-full h-4">
                                                        <div
                                                            className="bg-sky-500 h-4 rounded-full transition-all"
                                                            style={{ width: `${width}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="w-28 shrink-0 text-right text-sm font-semibold text-gray-800">
                                                        {formatCurrency(item.total)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No hay cobros vinculados a obras sociales en el período seleccionado.
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Estadisticas;