import React, { useEffect, useState } from 'react';
import clienteAxios from '../../config/axios';

const NotificacionWhatsapp = ({ datos, date, hora = '' }) => {
    const [direccion, setDireccion] = useState('');

    useEffect(() => {
        clienteAxios.get('/api/tenant-settings')
            .then(({ data }) => setDireccion(data?.address || ''))
            .catch(() => setDireccion(''));
    }, []);

    let mensaje = `
Su cita ha sido agendada correctamente:

📅 Fecha: ${date} ${hora} hs
👩🏻‍💼 Profesional: ${datos?.doctor_name}
📍 Lugar: ${direccion || 'Consultá la dirección con tu clínica'};

Recordatorios importantes:
- Llegar puntualmente a su horario asignado (no es necesario llegar antes)
- Tolerancia de 10 minutos de demora
- Traer estudios previos si los tuviera
- Traer cepillo y elementos de higiene que utilice

⚠ Importante: Por favor respete su horario exacto de cita. Llegar muy temprano puede interrumpir la atención del paciente anterior.

Si necesita cancelar o reprogramar, por favor avísenos con 24 horas de anticipación.

Gracias por confiar en nosotros para su atención odontológica!
`;

    // 👉 encodeURIComponent se encarga de los saltos de línea automáticamente
    return (
        <div className="bg-white py-1 rounded-2xl  ">
            <a
                href={`https://wa.me/${datos?.patient_phone}?text=${encodeURIComponent(mensaje)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-1 px-2 rounded-xl font-medium text-base shadow-sm transition-all duration-200"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                >
                    <path d="M12.04 2C6.52 2 2 6.47 2 12c0 2.11.55 4.09 1.6 5.84L2 22l4.3-1.57A10 10 0 1 0 12.04 2Zm.04 18c-1.7 0-3.32-.46-4.73-1.33l-.34-.2-2.55.94.88-2.47-.22-.35A8.07 8.07 0 0 1 4 12c0-4.45 3.63-8 8.08-8a8 8 0 0 1 8.08 8c0 4.45-3.64 8-8.08 8Zm4.54-5.94c-.25-.13-1.47-.73-1.7-.82-.23-.09-.4-.13-.57.12-.17.25-.65.82-.8.99-.15.17-.3.19-.55.06-.25-.13-1.05-.39-2-1.25-.74-.66-1.25-1.47-1.4-1.72-.15-.25-.02-.39.11-.52.12-.12.25-.3.38-.45.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.57-1.36-.78-1.86-.2-.5-.42-.43-.57-.44h-.49c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.02 2.6c.13.17 1.77 2.7 4.3 3.78.6.26 1.07.42 1.44.54.61.19 1.16.16 1.6.1.49-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.29Z" />
                </svg>
                 Recordatorio
            </a>

            <div className="mt-4 text-gray-600 text-sm leading-relaxed">

                <p>
                    Teléfono: <span className="font-semibold">{datos?.patient_phone || "—"}</span>
                </p>
            </div>
        </div>

    );
}
export default NotificacionWhatsapp;
