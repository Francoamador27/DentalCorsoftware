import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import $ from "../../../../lib/odontogram.plugin.js";
import {
  ODONTOGRAM_MODE_HAPUS,
  ODONTOGRAM_MODE_DEFAULT,
  ODONTOGRAM_MODE_AMF,
  ODONTOGRAM_MODE_COF,
  ODONTOGRAM_MODE_FIS,
  ODONTOGRAM_MODE_NVT,
  ODONTOGRAM_MODE_RCT,
  ODONTOGRAM_MODE_NON,
  ODONTOGRAM_MODE_UNE,
  ODONTOGRAM_MODE_PRE,
  ODONTOGRAM_MODE_ANO,
  ODONTOGRAM_MODE_CARIES,
  ODONTOGRAM_MODE_CFR,
  ODONTOGRAM_MODE_FMC,
  ODONTOGRAM_MODE_POC,
  ODONTOGRAM_MODE_RRX,
  ODONTOGRAM_MODE_MIS,
  ODONTOGRAM_MODE_IPX,
  ODONTOGRAM_MODE_FRM_ACR,
  ODONTOGRAM_MODE_BRIDGE,
  ODONTOGRAM_MODE_ARROW_TOP_LEFT,
  ODONTOGRAM_MODE_ARROW_TOP_RIGHT,
  ODONTOGRAM_MODE_ARROW_TOP_TURN_LEFT,
  ODONTOGRAM_MODE_ARROW_TOP_TURN_RIGHT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_LEFT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_RIGHT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_LEFT,
  ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_RIGHT,
} from "../../../../lib/odontogram.plugin.js";
import clienteAxios from "../../../../config/axios.js";
import { useParams } from "react-router-dom";
import { mostrarConfirmacion, mostrarError, mostrarExito } from "../../../../utils/Alertas.jsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { usePageTour } from "../../../../tours/TourContext";
import { odontogramaSteps } from "../../../../tours/steps/odontograma.steps";

// ── Helpers ─────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00").toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

// ── Modal: agregar nota después de modificar un diente ──────────────────────

function NoteModal({ toothNum, onAdd, onSkip }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd({ id: genId(), text: trimmed, date: todayStr() });
    setText("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div
        data-tour="odontograma-nota-modal"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: "noteModalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            📌
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Nota para diente</p>
            <p className="text-blue-100 text-xs">#{toothNum}</p>
          </div>
          <button
            onClick={onSkip}
            className="ml-auto w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition text-xs"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-slate-500">
            Describí el procedimiento realizado (opcional, podés omitirlo).
          </p>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
            rows={3}
            placeholder="Ej: Restauración composite cara vestibular…"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#008DD2] focus:border-transparent resize-none bg-slate-50 focus:bg-white transition"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-700 transition px-3 py-2 rounded-lg hover:bg-slate-100"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!text.trim()}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
          >
            Agregar nota
          </button>
        </div>
      </div>
      <style>{`
        @keyframes noteModalIn {
          from { opacity: 0; transform: scale(0.93) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Tooltip de historial de notas por diente ─────────────────────────────────

function NotesTooltip({ toothNum, notes, x, y, onMouseEnter, onMouseLeave, onAdd, onEdit, onDelete }) {
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState("");

  // Posición: ajustar para no salirse de pantalla
  const style = {
    position: "fixed",
    left: Math.min(x + 16, window.innerWidth - 320),
    top: Math.max(y - 20, 8),
    zIndex: 9999,
    width: 300,
    animation: "tooltipIn 0.15s ease",
  };

  const startEdit = (note) => {
    setEditId(note.id);
    setEditText(note.text);
    setAddingNew(false);
  };

  const saveEdit = () => {
    if (editText.trim()) onEdit(toothNum, editId, editText.trim());
    setEditId(null);
  };

  const saveNew = () => {
    if (newText.trim()) {
      onAdd(toothNum, { id: genId(), text: newText.trim(), date: todayStr() });
      setNewText("");
      setAddingNew(false);
    }
  };

  return (
    <div
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
      >
        <span className="text-white text-xs font-bold">🦷 Diente #{toothNum}</span>
        <span className="ml-auto text-blue-100 text-xs">{notes.length} nota{notes.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Lista de notas */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
        {notes.map((note) => (
          <div key={note.id} className="px-3 py-2.5 group">
            {editId === note.id ? (
              <div className="space-y-1.5">
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008DD2] resize-none"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => setEditId(null)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                  >Cancelar</button>
                  <button
                    onClick={saveEdit}
                    className="text-xs text-white px-3 py-1 rounded-lg"
                    style={{ background: "#008DD2" }}
                  >Guardar</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed">{note.text}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(note.date)}</p>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => startEdit(note)}
                    title="Editar"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#008DD2] hover:bg-blue-50 transition"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(toothNum, note.id)}
                    title="Eliminar"
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agregar nueva nota */}
      <div className="border-t border-slate-100 px-3 py-2">
        {addingNew ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNew(); } }}
              rows={2}
              placeholder="Nueva nota…"
              className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008DD2] resize-none"
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={() => setAddingNew(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded">
                Cancelar
              </button>
              <button onClick={saveNew} className="text-xs text-white px-3 py-1 rounded-lg" style={{ background: "#008DD2" }}>
                Agregar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAddingNew(true); setEditId(null); }}
            className="w-full text-xs text-[#008DD2] hover:text-[#006FA5] font-medium py-1 flex items-center justify-center gap-1 hover:bg-blue-50 rounded-lg transition"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Agregar nota
          </button>
        )}
      </div>
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(4px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Tabla resumen de notas ───────────────────────────────────────────────────

function NotesTable({ toothNotes, onEdit, onDelete }) {
  const [editKey, setEditKey] = useState(null); // `${toothNum}_${noteId}`
  const [editText, setEditText] = useState("");

  // Aplanar y ordenar: primero por diente, luego por fecha
  const rows = Object.entries(toothNotes)
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([toothNum, notes]) =>
      notes.map((note) => ({ toothNum: Number(toothNum), note }))
    );

  const startEdit = (toothNum, note) => {
    setEditKey(`${toothNum}_${note.id}`);
    setEditText(note.text);
  };

  const saveEdit = (toothNum, noteId) => {
    if (editText.trim()) onEdit(toothNum, noteId, editText.trim());
    setEditKey(null);
  };

  const cancelEdit = () => setEditKey(null);

  return (
    <div data-tour="odontograma-tabla-notas" className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
      >
        <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h4 className="text-white font-semibold text-sm">Historial de notas</h4>
        <span className="ml-auto text-blue-100 text-xs">{rows.length} nota{rows.length !== 1 ? "s" : ""} en {Object.keys(toothNotes).length} diente{Object.keys(toothNotes).length !== 1 ? "s" : ""}</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left font-semibold w-20">Diente</th>
              <th className="px-4 py-2.5 text-left font-semibold">Nota</th>
              <th className="px-4 py-2.5 text-left font-semibold w-32">Fecha</th>
              <th className="px-4 py-2.5 text-right font-semibold w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ toothNum, note }) => {
              const key = `${toothNum}_${note.id}`;
              const isEditing = editKey === key;
              return (
                <tr key={key} className="hover:bg-slate-50 transition-colors group">
                  {/* Diente */}
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
                    >
                      {toothNum}
                    </span>
                  </td>

                  {/* Nota — editable inline */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(toothNum, note.id); }
                          if (e.key === "Escape") cancelEdit();
                        }}
                        rows={2}
                        className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#008DD2] focus:border-transparent resize-none bg-white"
                      />
                    ) : (
                      <p className="text-slate-700 text-xs leading-relaxed">{note.text}</p>
                    )}
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {fmtDate(note.date)}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => saveEdit(toothNum, note.id)}
                          className="text-xs text-white px-3 py-1 rounded-lg transition"
                          style={{ background: "#008DD2" }}
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(toothNum, note)}
                          title="Editar"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-[#008DD2] hover:bg-blue-50 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(toothNum, note.id)}
                          title="Eliminar"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Odontograma() {
  usePageTour('odontograma', odontogramaSteps);

  const canvasRef = useRef(null);
  const geometryRef = useRef({});
  const hoveredToothRef = useRef(null);
  const tooltipTimerRef = useRef(null);
  const toothNotesRef = useRef({});
  const activeModeRef = useRef(ODONTOGRAM_MODE_DEFAULT);

  const [activeMode, setActiveMode] = useState(ODONTOGRAM_MODE_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [toothNotes, setToothNotes] = useState({});       // { toothNum: [{id,text,date}] }
  const [noteModal, setNoteModal] = useState(null);        // { toothNum } | null
  const [tooltip, setTooltip] = useState(null);            // { toothNum, x, y } | null
  const [patientInfo, setPatientInfo] = useState({ name: '', dni: '' });

  const { id } = useParams();
  const idpa = useMemo(() => id, [id]);

  // Mantener ref sincronizado con state
  useEffect(() => { toothNotesRef.current = toothNotes; }, [toothNotes]);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("AUTH_TOKEN");
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  const setMode = useCallback((mode) => {
    if (!canvasRef.current) return;
    $(canvasRef.current).odontogram("setMode", mode);
    setActiveMode(mode);
  }, []);

  const cargarOdontograma = useCallback(async () => {
    if (!idpa) { setLoading(false); return; }
    try {
      setLoading(true);
      const { data } = await clienteAxios.get(`/api/odontograma/${idpa}`, getAuthHeaders());
      const registros = data?.data?.registros || {};

      // Extraer notas del JSON antes de pasarle geometría al plugin
      const { _notes, ...geometry } = registros;
      if (_notes) setToothNotes(_notes);

      if (Object.keys(geometry).length > 0) {
        $(canvasRef.current).odontogram("setGeometry", geometry);
      } else {
        $(canvasRef.current).odontogram("setGeometryByPos", []);
      }
    } catch (err) {
      console.error("GET odontograma error:", err);
      $(canvasRef.current).odontogram("setGeometryByPos", []);
    } finally {
      setLoading(false);
    }
  }, [idpa]);

  const guardarOdontograma = useCallback(async () => {
    const geometry = geometryRef.current;
    if (!geometry || Object.keys(geometry).length === 0) {
      mostrarError("No realizaste cambios para guardar.");
      return;
    }
    if (!idpa) { alert("Falta el id del paciente en la URL."); return; }

    try {
      // Combinar geometría con notas en el mismo JSON
      const datos = { ...geometry, _notes: toothNotesRef.current };
      const payload = { datos, fecha_modificacion: new Date().toISOString() };
      const { data } = await clienteAxios.post(`/api/odontograma/${idpa}`, payload, getAuthHeaders());
      if (data?.success) mostrarExito("Datos guardados correctamente.");
    } catch (err) {
      console.error("POST odontograma error:", err);
      mostrarError("Error al guardar los datos.");
    }
  }, [idpa]);

  const descargarPNG = useCallback(() => {
    const dataUrl = $(canvasRef.current).odontogram("getDataURL");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "odontograma.png";
    a.click();
  }, []);

  // Fetch nombre del paciente para el PDF
  useEffect(() => {
    if (!idpa) return;
    clienteAxios
      .get(`/api/pacientes/${idpa}`, getAuthHeaders())
      .then(({ data }) => {
        const p = data?.data ?? data;
        const name = [p?.nompa, p?.apepa].filter(Boolean).join(" ");
        setPatientInfo({ name: name || `Paciente #${idpa}`, dni: p?.dni ?? '' });
      })
      .catch(() => setPatientInfo({ name: `Paciente #${idpa}`, dni: '' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idpa]);

  const generarPDF = useCallback(() => {
    // ── Constantes de diseño ───────────────────────────────────────────────
    const BRAND  = "#008DD2";          // rgb(0, 141, 210)
    const STEEL  = "#8cb9ce";          // rgb(140, 185, 206)
    const DARK   = "#1e293b";          // slate-800
    const MUTED  = "#64748b";          // slate-500
    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 15;
    const INNER  = PAGE_W - MARGIN * 2;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // ── Helpers ────────────────────────────────────────────────────────────
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return [r, g, b];
    };
    const setFill  = (hex) => doc.setFillColor(...hexToRgb(hex));
    const setColor = (hex) => doc.setTextColor(...hexToRgb(hex));

    let cursorY = 0;

    // ── Barra superior de color ────────────────────────────────────────────
    setFill(BRAND);
    doc.rect(0, 0, PAGE_W, 22, "F");

    // Línea decorativa más clara en la base del header
    setFill(STEEL);
    doc.rect(0, 21, PAGE_W, 1.5, "F");

    // Título principal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("DentalCor", MARGIN, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(210, 235, 248);
    doc.text("Sistema de Gestión Odontológica", MARGIN, 16.5);

    // Fecha en esquina superior derecha
    const today = new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "long", year: "numeric",
    });
    doc.setFontSize(8);
    doc.setTextColor(210, 235, 248);
    doc.text(today, PAGE_W - MARGIN, 11, { align: "right" });
    doc.setFontSize(7.5);
    doc.text("Generado automáticamente", PAGE_W - MARGIN, 16.5, { align: "right" });

    cursorY = 30;

    // ── Bloque de información del paciente ─────────────────────────────────
    setFill("#f0f9ff");
    doc.roundedRect(MARGIN, cursorY, INNER, 22, 3, 3, "F");
    setFill(BRAND);
    doc.roundedRect(MARGIN, cursorY, 4, 22, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    setColor(DARK);
    doc.text("ODONTOGRAMA CLÍNICO", MARGIN + 8, cursorY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setColor(MUTED);
    const infoLeft  = `Paciente: ${patientInfo.name}`;
    const infoRight = patientInfo.dni ? `DNI: ${patientInfo.dni}   |   ID: #${idpa}` : `ID interno: #${idpa}`;
    doc.text(infoLeft,  MARGIN + 8, cursorY + 13.5);
    doc.text(infoRight, PAGE_W - MARGIN, cursorY + 13.5, { align: "right" });

    doc.setFontSize(7.5);
    setColor("#94a3b8");
    doc.text(`Documento generado el ${today}`, MARGIN + 8, cursorY + 19.5);

    cursorY += 28;

    // ── Imagen del odontograma ─────────────────────────────────────────────
    const imgData = $(canvasRef.current).odontogram("getDataURL");
    // El canvas interno es 900×420 → ratio ≈ 2.14 : 1
    const imgW = INNER;
    const imgH = Math.round(imgW * (420 / 900));

    // Borde suave alrededor de la imagen
    doc.setDrawColor(...hexToRgb("#e2e8f0"));
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, cursorY, INNER, imgH + 2, 3, 3);
    doc.addImage(imgData, "PNG", MARGIN + 1, cursorY + 1, INNER - 2, imgH);
    cursorY += imgH + 8;

    // ── Tabla de notas ─────────────────────────────────────────────────────
    const noteRows = Object.entries(toothNotesRef.current)
      .sort(([a], [b]) => Number(a) - Number(b))
      .flatMap(([toothNum, notes]) =>
        notes.map((note, idx) => [
          idx === 0 ? String(toothNum) : "",   // nro. diente solo en primera fila del grupo
          note.text,
          fmtDate(note.date),
        ])
      );

    if (noteRows.length > 0) {
      // Título de sección
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setColor(DARK);
      doc.text("HISTORIAL DE NOTAS CLÍNICAS", MARGIN, cursorY + 1);

      setFill(BRAND);
      doc.rect(MARGIN, cursorY + 3, 35, 1, "F");

      cursorY += 8;

      autoTable(doc, {
        startY: cursorY,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Diente", "Nota clínica", "Fecha"]],
        body: noteRows,
        styles: {
          fontSize: 8.5,
          cellPadding: 3,
          textColor: hexToRgb(DARK),
          lineColor: hexToRgb("#e2e8f0"),
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: hexToRgb(BRAND),
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255],
        },
        columnStyles: {
          0: { cellWidth: 20, halign: "center", fontStyle: "bold" },
          1: { cellWidth: "auto" },
          2: { cellWidth: 35, halign: "center" },
        },
        didDrawCell: (data) => {
          // Línea izquierda azul en filas de diente (primera de cada grupo)
          if (data.section === "body" && data.column.index === 0 && data.cell.raw !== "") {
            doc.setFillColor(...hexToRgb(STEEL));
            doc.rect(data.cell.x, data.cell.y, 1.2, data.cell.height, "F");
          }
        },
      });
    }

    // ── Footer ─────────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      setFill("#f8fafc");
      doc.rect(0, PAGE_H - 12, PAGE_W, 12, "F");
      doc.setDrawColor(...hexToRgb("#e2e8f0"));
      doc.setLineWidth(0.3);
      doc.line(0, PAGE_H - 12, PAGE_W, PAGE_H - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(MUTED);
      doc.text("DentalCor — Documento confidencial de uso interno", MARGIN, PAGE_H - 5);
      doc.text(`Página ${i} de ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 5, { align: "right" });
    }

    // ── Guardar ────────────────────────────────────────────────────────────
    const safeName = patientInfo.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`odontograma_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [idpa, patientInfo]);

  // ── Tooltip timer helpers ────────────────────────────────────────────────
  const clearTooltipTimer = useCallback(() => clearTimeout(tooltipTimerRef.current), []);
  const startTooltipClose = useCallback(() => {
    clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setTooltip(null), 250);
  }, []);

  // ── Mousemove sobre el canvas ────────────────────────────────────────────
  const handleCanvasMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instance = $(canvas).data("odontogram");
    if (!instance) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let found = null;
    for (const key in instance.teeth) {
      const t = instance.teeth[key];
      if (mx >= t.x1 && mx <= t.x2 && my >= t.y1 && my <= t.y2) {
        found = t.num;
        break;
      }
    }
    hoveredToothRef.current = found;

    if (found && toothNotesRef.current[found]?.length > 0) {
      clearTooltipTimer();
      setTooltip({ toothNum: found, x: e.clientX, y: e.clientY });
    } else {
      startTooltipClose();
    }
  }, [clearTooltipTimer, startTooltipClose]);

  const handleCanvasMouseLeave = useCallback(() => {
    hoveredToothRef.current = null;
    startTooltipClose();
  }, [startTooltipClose]);

  // ── Inicializar plugin ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const $canvas = $(canvas);

    $canvas.odontogram("init", { width: "900px", height: "420px" });

    const onChange = (_, geometry) => {
      geometryRef.current = { ...geometry };

      // Abrir modal de nota solo cuando se modifica algo (no en DEFAULT ni HAPUS)
      const mode = activeModeRef.current;
      if (mode !== ODONTOGRAM_MODE_DEFAULT && mode !== ODONTOGRAM_MODE_HAPUS) {
        const toothNum = hoveredToothRef.current;
        if (toothNum) {
          setNoteModal({ toothNum });
        }
      }
    };

    $canvas.on("change", onChange);

    // Eventos del canvas para tooltip
    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);

    cargarOdontograma();

    return () => {
      $canvas.off("change", onChange);
      $canvas.off();
      $canvas.removeData("odontogram");
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
    };
  }, [cargarOdontograma, handleCanvasMouseMove, handleCanvasMouseLeave]);

  // ── Handlers de notas ────────────────────────────────────────────────────

  // Agregar nota desde el modal post-click
  const handleModalAdd = useCallback((note) => {
    const toothNum = noteModal?.toothNum;
    if (!toothNum) return;
    setToothNotes((prev) => ({
      ...prev,
      [toothNum]: [...(prev[toothNum] || []), note],
    }));
    setNoteModal(null);
  }, [noteModal]);

  // Agregar nota desde el tooltip
  const handleTooltipAdd = useCallback((toothNum, note) => {
    setToothNotes((prev) => ({
      ...prev,
      [toothNum]: [...(prev[toothNum] || []), note],
    }));
  }, []);

  // Editar nota
  const handleEditNote = useCallback((toothNum, noteId, newText) => {
    setToothNotes((prev) => ({
      ...prev,
      [toothNum]: (prev[toothNum] || []).map((n) =>
        n.id === noteId ? { ...n, text: newText } : n
      ),
    }));
  }, []);

  // Eliminar nota
  const handleDeleteNote = useCallback((toothNum, noteId) => {
    setToothNotes((prev) => {
      const updated = (prev[toothNum] || []).filter((n) => n.id !== noteId);
      const next = { ...prev };
      if (updated.length === 0) delete next[toothNum];
      else next[toothNum] = updated;
      return next;
    });
    // Cerrar tooltip si no quedan notas
    setTooltip((t) => {
      if (!t) return t;
      const remaining = (toothNotesRef.current[t.toothNum] || []).filter((n) => n.id !== noteId);
      return remaining.length === 0 ? null : t;
    });
  }, []);

  // ── Toolbar config ───────────────────────────────────────────────────────
  const groups = useMemo(() => [
    {
      title: "Edición",
      items: [
        { label: "Borrar", mode: ODONTOGRAM_MODE_HAPUS, variant: "danger" },
        { label: "Default", mode: ODONTOGRAM_MODE_DEFAULT, variant: "ghost" },
      ],
    },
    {
      title: "Restauraciones",
      items: [
        { label: "Rest. existente", mode: ODONTOGRAM_MODE_FIS, variant: "primary", tour: "odontograma-modo-restauracion" },
        { label: "Rest. requerida", mode: ODONTOGRAM_MODE_AMF, variant: "primary" },
        { label: "Rest. filtrada", mode: ODONTOGRAM_MODE_CARIES, variant: "primary" },
      ],
    },
    {
      title: "Coronas",
      items: [
        { label: "Corona existente", mode: ODONTOGRAM_MODE_POC, variant: "amber" },
        { label: "Corona requerida", mode: ODONTOGRAM_MODE_NVT, variant: "amber" },
      ],
    },
    {
      title: "Extracciones",
      items: [
        { label: "Extracción requerida", mode: ODONTOGRAM_MODE_MIS, variant: "rose" },
        { label: "Extracción existente", mode: ODONTOGRAM_MODE_ANO, variant: "rose" },
      ],
    },
    {
      title: "Endo / Prótesis",
      items: [
        { label: "Conducto", mode: ODONTOGRAM_MODE_RCT, variant: "violet" },
        { label: "Prótesis", mode: ODONTOGRAM_MODE_PRE, variant: "violet" },
        { label: "Puente", mode: ODONTOGRAM_MODE_BRIDGE, variant: "violet" },
        { label: "Prótesis removible", mode: ODONTOGRAM_MODE_FMC, variant: "violet" },
      ],
    },
    {
      title: "Flechas (anotaciones)",
      items: [
        { label: "↑ Izq", mode: ODONTOGRAM_MODE_ARROW_TOP_LEFT, variant: "slate" },
        { label: "↑ Der", mode: ODONTOGRAM_MODE_ARROW_TOP_RIGHT, variant: "slate" },
        { label: "Giro ↑ Izq", mode: ODONTOGRAM_MODE_ARROW_TOP_TURN_LEFT, variant: "slate" },
        { label: "Giro ↑ Der", mode: ODONTOGRAM_MODE_ARROW_TOP_TURN_RIGHT, variant: "slate" },
        { label: "↓ Izq", mode: ODONTOGRAM_MODE_ARROW_BOTTOM_LEFT, variant: "slate" },
        { label: "↓ Der", mode: ODONTOGRAM_MODE_ARROW_BOTTOM_RIGHT, variant: "slate" },
        { label: "Giro ↓ Izq", mode: ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_LEFT, variant: "slate" },
        { label: "Giro ↓ Der", mode: ODONTOGRAM_MODE_ARROW_BOTTOM_TURN_RIGHT, variant: "slate" },
      ],
    },
  ], []);

  const baseBtn =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[.98]";

  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 shadow-sm hover:shadow",
    amber: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 shadow-sm hover:shadow",
    rose: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm hover:shadow",
    violet: "bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 shadow-sm hover:shadow",
    slate: "bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-500 shadow-sm hover:shadow",
    danger: "bg-white text-rose-700 border border-rose-300 hover:bg-rose-50 focus:ring-rose-400",
    ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
    activeRing: "ring-2 ring-offset-2 ring-sky-500",
  };

  const groupCard = "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm";

  // Cantidad total de notas para mostrar en UI
  const totalNotes = Object.values(toothNotes).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <section className="w-full max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold text-slate-800">Odontograma del Paciente</h3>
        {totalNotes > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#008DD2] border border-blue-200">
            📌 {totalNotes} nota{totalNotes !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <div key={g.title} className={groupCard}>
            <div className="mb-2 text-sm font-semibold text-slate-700">{g.title}</div>
            <div className="grid grid-cols-2 gap-2">
              {g.items.map((it) => {
                const isActive = activeMode === it.mode;
                return (
                  <button
                    key={it.label}
                    type="button"
                    data-tour={it.tour}
                    className={`${baseBtn} ${variants[it.variant || "ghost"]} ${isActive ? variants.activeRing : ""}`}
                    onClick={() => setMode(it.mode)}
                    title={it.label}
                  >
                    {it.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div data-tour="odontograma-acciones" className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${baseBtn} ${variants.primary}`}
          onClick={guardarOdontograma}
          disabled={loading}
        >
          {loading ? "Cargando..." : "Guardar"}
        </button>
        <button
          type="button"
          className={`${baseBtn} ${variants.ghost}`}
          onClick={descargarPNG}
        >
          Descargar PNG
        </button>
        <button
          type="button"
          onClick={generarPDF}
          disabled={loading}
          className={`${baseBtn} text-white font-semibold shadow-sm hover:brightness-105 active:scale-[.98] flex items-center gap-1.5`}
          style={{ background: "linear-gradient(135deg, #008DD2, #8cb9ce)" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Exportar PDF
        </button>
        <span className="text-xs text-slate-500 ml-auto">
          Modo: <strong className="text-slate-700">{activeMode}</strong>
          {activeMode !== ODONTOGRAM_MODE_DEFAULT && activeMode !== ODONTOGRAM_MODE_HAPUS && (
            <span className="ml-2 text-[#008DD2]">• Al hacer click se pedirá una nota</span>
          )}
        </span>
      </div>

      {/* Canvas */}
      <div data-tour="odontograma-canvas" className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm relative">
        <canvas
          id="odontogram"
          ref={canvasRef}
          className="w-full max-w-[900px] mx-auto block cursor-crosshair"
        >
          Tu navegador no soporta Canvas.
        </canvas>
      </div>

      {/* Tabla resumen de notas */}
      {totalNotes > 0 && (
        <NotesTable
          toothNotes={toothNotes}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
        />
      )}

      {/* Modal: agregar nota post-click */}
      {noteModal && (
        <NoteModal
          toothNum={noteModal.toothNum}
          onAdd={handleModalAdd}
          onSkip={() => setNoteModal(null)}
        />
      )}

      {/* Tooltip: historial de notas al hacer hover */}
      {tooltip && toothNotes[tooltip.toothNum]?.length > 0 && (
        <NotesTooltip
          toothNum={tooltip.toothNum}
          notes={toothNotes[tooltip.toothNum]}
          x={tooltip.x}
          y={tooltip.y}
          onMouseEnter={clearTooltipTimer}
          onMouseLeave={startTooltipClose}
          onAdd={handleTooltipAdd}
          onEdit={handleEditNote}
          onDelete={handleDeleteNote}
        />
      )}
    </section>
  );
}
