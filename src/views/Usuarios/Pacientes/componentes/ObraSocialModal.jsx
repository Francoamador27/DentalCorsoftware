import { useState } from "react";
import clienteAxios from "../../../../config/axios";
import { mostrarError } from "../../../../utils/Alertas";

/**
 * Modal para crear una nueva Obra Social (nombre + descripción opcional).
 * Al confirmar, crea el registro en el backend y devuelve los datos creados
 * para que el formulario padre la agregue a la lista y la seleccione.
 */
const ObraSocialModal = ({ onCreated, onClose }) => {
  const token = localStorage.getItem("AUTH_TOKEN");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return mostrarError("El nombre de la obra social es obligatorio.");

    setSaving(true);
    setErrMsg("");
    try {
      const { data } = await clienteAxios.post(
        "/api/obras-sociales",
        { nombre: nombre.trim(), descripcion: descripcion.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onCreated(data.data);
    } catch (error) {
      const firstError =
        error?.response?.data?.errors &&
        Object.values(error.response.data.errors)[0]?.[0];
      setErrMsg(firstError || error?.response?.data?.message || "Error al crear la obra social.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <div
          className="px-6 py-5 text-white"
          style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold leading-tight">Nueva obra social</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {errMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {errMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                placeholder="Ej: OSDE, Swiss Medical, IOMA..."
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                placeholder="Notas u observaciones (opcional)"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:brightness-105 active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
            >
              {saving ? "Guardando…" : "Crear obra social"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(-8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ObraSocialModal;
