import React, { useEffect, useMemo, useState, useRef } from "react";
import clienteAxios from "../../config/axios";
import {
  dateToYmd,
  dateToTime24Local,
  buildLocalDateFrom,
  diffMinutes,
  clampDuration15,
  buildUTCDateFrom,
} from "../../utils/time";
import { CalendarPlus, ChevronDown, Download } from "lucide-react";
import DoctorSelector from "../../components/DoctorSelector";
import TimePicker12 from "../../components/TimePicker12";
import NotificacionWhatsapp from "../../components/NotificacionWhatsapp/NotificacionWhatsapp";
import { Link } from "react-router-dom";

/**
 * UI en LOCAL con AM/PM.
 * Envía al backend ISO UTC con Z (toISOString()).
 */
export default function ModalShowEvent({
  selected,
  closeModal,
  handleDelete,
  onSaved,
}) {
  if (!selected) return null;

  const xp = selected.extendedProps || {};
  console.log("selected", xp.chec);
  const displayColor =
    selected.backgroundColor ||
    selected.borderColor ||
    selected.textColor ||
    xp.color ||
    "#0ea5e9";

  // ------ estado editable (LOCAL + 12h) ------
  const [date, setDate] = useState(""); // "YYYY-MM-DD" (LOCAL)
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [time24, setTime24] = useState("09:00"); // "HH:mm" (LOCAL, puente para AM/PM)
  const [duration, setDuration] = useState("60");
  const [datos, setDatos] = useState(); // minutos
  const [amount, setAmount] = useState(xp.monto ?? xp.amount ?? "");
  const [isPaid, setIsPaid] = useState(Boolean(xp.chec ?? xp.chec ?? false));

  // 🏥 Obra social del paciente
  const [cubiertoObraSocial, setCubiertoObraSocial] = useState(
    xp.cubiertoObraSocial ?? true
  );
  const [montoCubiertoOS, setMontoCubiertoOS] = useState(
    xp.montoCubiertoOS ?? ""
  );
  const [montoPacienteExtra, setMontoPacienteExtra] = useState(
    xp.montoPacienteExtra ?? ""
  );
  const initialDoctor = useMemo(() => {
    const name = [xp.doctor_name, xp.doctor_lastname]
      .filter(Boolean)
      .join(" ")
      .trim();
    return xp.doctorId
      ? { id: xp.doctorId, name: name || xp.doctorName || "Doctor" }
      : null;
  }, [xp.doctorId, xp.doctor_name, xp.doctor_lastname, xp.doctorName]);
  const [selectedDoctor, setSelectedDoctor] = useState(initialDoctor);
  function formatLikeToStringUTC(input) {
    const d = input instanceof Date ? input : new Date(input);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const pad = (n) => String(n).padStart(2, "0");

    return (
      `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    );
  }
  // Inicialización: tomamos start/end y los mostramos en LOCAL + AM/PM
  useEffect(() => {
    if (!selected?.start || !selected?.end) return;
    setDatos(xp);
    const start = xp?.raw?.start
      ? new Date(xp.raw.start)
      : new Date(selected.start);
    const end = xp?.raw?.end ? new Date(xp.raw.end) : new Date(selected.end);
    const d = new Date(xp?.raw?.start);
    let fechaStart = new Intl.DateTimeFormat("es-AR", {
      timeZone: "UTC",
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(d);

    console.log(fechaStart); //22/8/25, 23:00
    let dia = fechaStart.split(" ")[0];
    dia = dia.replace(",", "");

    let hora = fechaStart.split(" ")[1];

    setHora(hora);
    console.log("hora", hora);
    setDia(dia);
    setDate(dateToYmd(start)); // LOCAL
    setTime24(hora); // LOCAL -> TimePicker 12h
    setDuration(String(diffMinutes(start, end)));
    setAmount(xp.monto ?? xp.amount ?? "");
    setIsPaid(Boolean(xp.chec ?? xp.chec ?? false));
    setSelectedDoctor(initialDoctor);
    setCubiertoObraSocial(xp.cubiertoObraSocial ?? true);
    setMontoCubiertoOS(xp.montoCubiertoOS ?? "");
    setMontoPacienteExtra(xp.montoPacienteExtra ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Payload: construir Date LOCAL desde date + time24, luego enviar ISO UTC
  const currentPayload = useMemo(() => {
    if (!date || !time24 || !duration) return null;
    console.log("date", date);
    console.log("time24", time24);
    const startLocal = buildUTCDateFrom(date, time24); // LOCAL
    const endLocal = new Date(
      startLocal.getTime() + (parseInt(duration, 10) || 0) * 60000,
    );
    const tieneObraSocial = !!xp.obraSocialNombre;

    return {
      id: selected.id,
      title: selected.title,
      startISO: startLocal.toISOString(), //
      endISO: endLocal.toISOString(),
      amount: Number(amount || 0),
      isPaid,
      doctorId: selectedDoctor?.id ?? null,
      doctorName: selectedDoctor?.name ?? null,
      cubiertoObraSocial: tieneObraSocial ? cubiertoObraSocial : null,
      montoCubiertoOS: tieneObraSocial && !cubiertoObraSocial && montoCubiertoOS
        ? Number(montoCubiertoOS)
        : null,
      montoPacienteExtra: tieneObraSocial && !cubiertoObraSocial && montoPacienteExtra
        ? Number(montoPacienteExtra)
        : null,
    };
  }, [
    date,
    time24,
    duration,
    amount,
    isPaid,
    selected?.id,
    selected?.title,
    selectedDoctor,
    cubiertoObraSocial,
    montoCubiertoOS,
    montoPacienteExtra,
    xp.obraSocialNombre,
  ]);

  const handleSave = async () => {
    if (!currentPayload) return;
    if (!date || !time24) return alert("Completá fecha y hora");
    const dur = parseInt(duration, 10);
    if (!dur || dur < 15) return alert("La duración mínima es 15 minutos");
    if (!selectedDoctor?.id) return alert("Seleccioná un doctor");

    try {
      const token = localStorage.getItem("AUTH_TOKEN");
      await clienteAxios.put(
        `/api/events/${selected.id}`,
        {
          title: selected.title,
          start: currentPayload.startISO, // ISO UTC "....Z"
          end: currentPayload.endISO,
          amount: currentPayload.amount,
          isPaid: currentPayload.isPaid,
          doctorId: currentPayload.doctorId,
          doctorName: currentPayload.doctorName,
          cubiertoObraSocial: currentPayload.cubiertoObraSocial,
          montoCubiertoOS: currentPayload.montoCubiertoOS,
          montoPacienteExtra: currentPayload.montoPacienteExtra,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
      );
      onSaved?.();
      closeModal();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "No se pudo guardar los cambios");
    }
  };

  const stop = (e) => e.stopPropagation();
  console.log("datos", datos);
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 50,
      }}
    >
      <div
        onClick={stop}
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 650,
          maxHeight: "90vh",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,.2)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: displayColor,
                boxShadow: `0 0 0 2px ${displayColor}20`,
              }}
            />
            <h3
              style={{
                margin: 0,
                color: "#111827",
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {selected.title || "Sin título"}
            </h3>
          </div>
          <button
            onClick={closeModal}
            aria-label="Cerrar"
            style={{
              border: "none",
              background: "#f3f4f6",
              fontSize: 18,
              cursor: "pointer",
              width: 32,
              height: 32,
              borderRadius: "50%",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}

        {/* DATOS DEL PACIENTE */}

        <div
          style={{
            padding: "20px 24px",
            display: "grid",
            gap: 16,
            overflowY: "auto",
            maxHeight: "calc(90vh - 160px)",
          }}
        >
          {/* Datos del Paciente + Sincronizar calendario */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <section>
              <h4
                style={{
                  color: "#374151",
                  fontSize: 16,
                  fontWeight: 600,
                  padding: "12px 24px",
                }}
              >
                Datos del Paciente
              </h4>
              <div
                style={{ padding: "0 24px 12px", color: "#6b7280", fontSize: 14 }}
              >
                <div>
                  <strong>Nombre:</strong> {datos?.patient_name || "—"}{" "}
                  {datos?.patient_lastname || "—"}
                </div>
                <NotificacionWhatsapp datos={datos} date={date} hora={hora} />
                <div>
                  <strong>Email:</strong>{" "}
                  {datos?.patient_email ? (
                    <a
                      href={`mailto:${datos.patient_email}`}
                      style={{ color: "#0ea5e9", textDecoration: "underline" }}
                    >
                      {datos.patient_email}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </section>

            {/* Panel de sincronización inline */}
            <CalendarSyncDropdown
              selected={selected}
              currentPayload={currentPayload}
              inline
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <strong style={{ color: "#374151", fontSize: 14 }}>Fecha</strong>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <strong style={{ color: "#374151", fontSize: 14 }}>Hora</strong>
              {/* TimePicker 12h */}
              <TimePicker12 value24={time24} onChange={setTime24} />
            </label>
          </div>

          {/* Duración */}
          <label style={{ display: "grid", gap: 6 }}>
            <strong style={{ color: "#374151", fontSize: 14 }}>
              Duración (min)
            </strong>
            <input
              type="number"
              min="15"
              max="480"
              step="15"
              value={duration}
              onChange={(e) => setDuration(String(e.target.value))}
              onBlur={() => setDuration(String(clampDuration15(duration)))}
              style={inputStyle}
            />
          </label>

          {/* Monto */}
          <label style={{ display: "grid", gap: 6 }}>
            <strong style={{ color: "#374151", fontSize: 14 }}>Monto</strong>
            <input
              type="number"
              min="0"
              step="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={inputStyle}
            />
          </label>

          {/* Pago */}
          <div className="grid gap-2">
            <strong className="text-sm text-gray-700">Estado del pago</strong>

            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              {/* Toggle */}
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="peer sr-only"
                aria-label="Estado del pago"
              />
              <span
                className="
        relative h-6 w-12 rounded-full
        bg-gray-300 transition-colors
        peer-checked:bg-[#008DD2]
        peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#008DD2]
      "
              >
                <span
                  className="
          absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow
          transition-all duration-300
          peer-checked:translate-x-6
        "
                />
              </span>

              {/* Etiqueta dinámica */}
              <span className="text-sm text-gray-700">
                {isPaid ? "Pagado" : "Pendiente"}
              </span>
            </label>
          </div>

          {/* 🏥 Obra Social del paciente */}
          {xp.obraSocialNombre && (
            <div className="grid gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="text-sm text-gray-500">
                  Obra Social:{" "}
                  <strong className="text-gray-700">{xp.obraSocialNombre}</strong>
                </span>

                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <span className="text-sm font-semibold text-gray-700">
                    ¿Cubierto por la obra social?
                  </span>
                  <input
                    type="checkbox"
                    checked={cubiertoObraSocial}
                    onChange={(e) => setCubiertoObraSocial(e.target.checked)}
                    className="peer sr-only"
                    aria-label="Cubierto por la obra social"
                  />
                  <span
                    className="
        relative h-6 w-12 rounded-full
        bg-gray-300 transition-colors
        peer-checked:bg-[#008DD2]
        peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#008DD2]
      "
                  >
                    <span
                      className="
          absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow
          transition-all duration-300
          peer-checked:translate-x-6
        "
                    />
                  </span>
                  <span className="text-sm text-gray-700">
                    {cubiertoObraSocial ? "Sí" : "No"}
                  </span>
                </label>
              </div>

              {!cubiertoObraSocial && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <strong style={{ color: "#374151", fontSize: 14 }}>
                      Monto que cubre la obra social
                    </strong>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={montoCubiertoOS}
                      onChange={(e) => setMontoCubiertoOS(e.target.value)}
                      placeholder="Ej: 3000"
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <strong style={{ color: "#374151", fontSize: 14 }}>
                      Extra a pagar por el paciente
                    </strong>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={montoPacienteExtra}
                      onChange={(e) => setMontoPacienteExtra(e.target.value)}
                      placeholder="Ej: 2000"
                      style={inputStyle}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Doctor */}
          <DoctorSelector value={selectedDoctor} onChange={setSelectedDoctor} />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleDelete}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#dc2626",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              🗑 Eliminar
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              to={`/admin-dash/pacientes/historial/${datos?.patientId || ""}`}
              style={{ textDecoration: "none" }}
            >
              <button
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "#6b7280",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                📋Historial Paciente
              </button>
            </Link>

            <button
              onClick={handleSave}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                background: "#0ea5e9",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              💾 Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  background: "#fff",
  color: "#111827",
  outline: "none",
};

/* ── Dropdown / Panel "Sincronizar calendario" ───────────────────────────── */
function CalendarSyncDropdown({ selected, currentPayload, inline = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const xp = selected?.extendedProps || {};

  // Formatear fecha LOCAL para Google Calendar (YYYYMMDDTHHmmss sin Z)
  // Usa getters UTC porque startISO almacena la hora local como si fuera UTC (convención del sistema)
  const toGCalDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
  };

  const buildGoogleUrl = () => {
    const start =
      currentPayload?.startISO || xp?.raw?.start || selected?.startStr;
    const end = currentPayload?.endISO || xp?.raw?.end || selected?.endStr;
    if (!start || !end) return null;

    const title = encodeURIComponent(selected?.title || "Turno odontológico");
    const doctorName = [xp.doctor_name, xp.doctor_lastname]
      .filter(Boolean)
      .join(" ");
    const details = encodeURIComponent(
      `Turno con Dr. ${doctorName || "—"}. Paciente: ${xp.patient_name || ""} ${xp.patient_lastname || ""}`.trim(),
    );
    const dates = `${toGCalDate(start)}/${toGCalDate(end)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
  };

  const buildOutlookUrl = () => {
    const start =
      currentPayload?.startISO || xp?.raw?.start || selected?.startStr;
    const end = currentPayload?.endISO || xp?.raw?.end || selected?.endStr;
    if (!start || !end) return null;

    const title = encodeURIComponent(selected?.title || "Turno odontológico");
    const doctorName = [xp.doctor_name, xp.doctor_lastname]
      .filter(Boolean)
      .join(" ");
    const body = encodeURIComponent(
      `Turno con Dr. ${doctorName || "—"}. Paciente: ${xp.patient_name || ""} ${xp.patient_lastname || ""}`.trim(),
    );
    // Extraer los valores UTC como datetime local sin sufijo Z para que Outlook
    // no interprete los tiempos como UTC (misma convención que el resto del sistema)
    const fmtOutlook = (iso) => {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    };
    const s = fmtOutlook(start);
    const e = fmtOutlook(end);

    return `https://outlook.live.com/calendar/0/action/compose?subject=${title}&startdt=${s}&enddt=${e}&body=${body}`;
  };

  const handleDownloadIcs = () => {
    const token = localStorage.getItem("AUTH_TOKEN");
    const activeTenant = JSON.parse(
      localStorage.getItem("ACTIVE_TENANT") || "null",
    );
    const baseUrl = import.meta.env.VITE_API_URL;
    const url = `${baseUrl}api/events/${selected.id}/ics`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(activeTenant?.id ? { "X-Tenant-ID": activeTenant.id } : {}),
      },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `turno-${selected.id}.ics`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert("No se pudo descargar el archivo .ics"));
    setOpen(false);
  };

  const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z"
        fill="#FBBC05"
      />
      <path
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z"
        fill="#EA4335"
      />
    </svg>
  );

  const OutlookIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 0 1-.588.234h-8.42v-6.56l1.56 1.14a.31.31 0 0 0 .18.06.29.29 0 0 0 .18-.06l6.95-5.14c.06-.04.12-.06.19-.06s.13.02.19.06z"
        fill="#0072C6"
      />
      <path
        d="M15.17 8.41l-1.2.88-.72.53V6.674h8.42c.23 0 .43.08.59.24.16.15.24.35.24.57v.64l-6.95 5.14a.29.29 0 0 1-.18.06.31.31 0 0 1-.18-.06L15.17 8.41z"
        fill="#0072C6"
      />
      <path
        d="M7.5 11.97c0-1.3.43-2.38 1.29-3.24.86-.86 1.97-1.29 3.33-1.29 1.28 0 2.32.43 3.14 1.29.81.86 1.22 1.95 1.22 3.27 0 1.34-.41 2.44-1.24 3.3-.83.86-1.88 1.29-3.16 1.29-1.28 0-2.35-.42-3.22-1.26-.87-.84-1.36-1.96-1.36-3.36zm2.41.08c0 .84.19 1.52.58 2.02.39.5.88.76 1.48.76s1.09-.25 1.47-.76c.38-.51.57-1.19.57-2.04 0-.85-.19-1.53-.58-2.03-.39-.51-.87-.76-1.46-.76s-1.08.26-1.48.77c-.39.51-.58 1.19-.58 2.04z"
        fill="#0072C6"
      />
      <path d="M0 3.449l8.813-1.28v19.67L0 20.546V3.449z" fill="#0072C6" />
    </svg>
  );

  const AppleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#555">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );

  const menuItems = [
    {
      label: "Google Calendar",
      icon: <GoogleIcon />,
      onClick: () => {
        const url = buildGoogleUrl();
        if (url) window.open(url, "_blank");
        setOpen(false);
      },
    },
    {
      label: "Outlook Calendar",
      icon: <OutlookIcon />,
      onClick: () => {
        const url = buildOutlookUrl();
        if (url) window.open(url, "_blank");
        setOpen(false);
      },
    },
    {
      label: "Apple Calendar",
      icon: <AppleIcon />,
      onClick: handleDownloadIcs,
    },
    {
      label: "Descargar archivo .ics",
      icon: <Download size={16} className="text-gray-500" />,
      onClick: handleDownloadIcs,
    },
  ];

  // Modo panel: opciones siempre visibles, sin botón trigger
  if (inline) {
    return (
      <div style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "12px 14px",
        alignSelf: "start",
        marginTop: 8,
      }}>
        <p style={{
          margin: "0 0 8px",
          fontSize: 11,
          color: "#9ca3af",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}>
          Agregar a calendario
        </p>
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "8px 10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "#374151",
              textAlign: "left",
              borderRadius: 8,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ display: "flex", alignItems: "center", width: 16, justifyContent: "center" }}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#fff",
          color: "#374151",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <CalendarPlus size={16} />
        Sincronizar
        <ChevronDown
          size={14}
          style={{
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: 0,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 30px rgba(0,0,0,.15)",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            zIndex: 100,
            minWidth: 220,
            animation: "calSyncIn 0.15s ease",
          }}
        >
          <div
            style={{ padding: "8px 12px", borderBottom: "1px solid #f3f4f6" }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#9ca3af",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Agregar a calendario
            </p>
          </div>
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                color: "#374151",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f9fafb")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: 16,
                  justifyContent: "center",
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes calSyncIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
