import { useState } from 'react';
import DatosClinica from './DatosClinica';
import SmtpClinica from './SmtpClinica';
import { usePageTour } from '../../../tours/TourContext';
import { miClinicaSteps } from '../../../tours/steps/miClinica.steps';

const TabButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
            active ? 'text-white bg-blue-600' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
        }`}
    >
        {children}
    </button>
);

const MiClinica = () => {
    usePageTour('mi-clinica', miClinicaSteps);

    const [tab, setTab] = useState('datos');

    return (
        <div className="space-y-6">
            <div data-tour="miclinica-header">
                <h1 className="text-2xl font-semibold text-slate-900">Mi Clínica</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Configurá los datos de tu clínica y el correo saliente.
                </p>
            </div>

            <div className="flex items-end gap-2" data-tour="miclinica-tabs">
                <TabButton active={tab === 'datos'} onClick={() => setTab('datos')}>
                    Datos de la clínica
                </TabButton>
                <TabButton active={tab === 'smtp'} onClick={() => setTab('smtp')}>
                    SMTP
                </TabButton>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5" data-tour="miclinica-panel">
                {tab === 'datos' && <DatosClinica />}
                {tab === 'smtp' && <SmtpClinica />}
            </div>
        </div>
    );
};

export default MiClinica;
