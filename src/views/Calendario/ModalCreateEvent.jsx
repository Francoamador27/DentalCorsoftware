import { useEffect, useRef, useState, useCallback } from "react";
import clienteAxios from "../../config/axios";

/* ====================== */
/*   UserSelector (OUT)   */
/* ====================== */
function UserSelector({
  label,
  query,
  setQuery,
  results,
  loading,
  showDropdown,
  setShowDropdown,
  selectedUser,
  setSelectedUser,
  inputRef,
  containerRef,
  placeholder
}) {
  return (
    <div ref={containerRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      <label style={{ fontWeight: 500 }}>{label} *</label>

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (!value.trim()) setSelectedUser(null);
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#0ea5e9";
          if (results.length > 0) setShowDropdown(true);
        }}
        onBlur={(e) => (e.target.style.borderColor = "#e1e5e9")}
        placeholder={placeholder}
        autoComplete="off"
        required
        style={{
          padding: "12px 14px",
          borderRadius: showDropdown ? "8px 8px 0 0" : "8px",
          border: showDropdown ? "1px solid #e1e5e9" : "2px solid #e1e5e9",
          fontSize: 14,
          outline: "none",
          transition: "all 0.2s"
        }}
      />

      {showDropdown && (results.length > 0 || loading) && (
        <div
          style={{
            border: "2px solid #e1e5e9",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            background: "#fff",
            maxHeight: "250px",
            overflowY: "auto",
            position: "absolute",
            zIndex: 1000,
            top: "100%",
            left: 0,
            right: 0,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "12px 14px",
                color: "#6b7280",
                fontSize: 14,
                fontStyle: "italic",
                textAlign: "center"
              }}
            >
              🔍 Buscando...
            </div>
          ) : (
            <>
              {selectedUser && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedUser(null);
                    setQuery("");
                    setShowDropdown(false);
                  }}
                  style={{
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f4f6",
                    background: "#fef2f2",
                    fontSize: 14,
                    color: "#dc2626",
                    fontStyle: "italic",
                    textAlign: "center"
                  }}
                >
                  ✗ Limpiar selección
                </div>
              )}

              {results.map((user) => (
                <div
                  key={user.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedUser(user);
                    setQuery(`${user.name}${user.line2 ? " · " + user.line2 : ""}`);
                    setShowDropdown(false);
                  }}
                  style={{
                    padding: "12px 14px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f3f4f6",
                    background: selectedUser?.id === user.id ? "#e0f2fe" : "transparent",
                    transition: "background-color 0.15s",
                    display: "grid",
                    gap: "4px"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedUser?.id !== user.id) e.currentTarget.style.backgroundColor = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedUser?.id !== user.id) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <div
                    style={{
                      fontWeight: selectedUser?.id === user.id ? 600 : 500,
                      fontSize: 14,
                      color: selectedUser?.id === user.id ? "#0369a1" : "#374151"
                    }}
                  >
                    {selectedUser?.id === user.id && "✓ "}
                    {user.name}
                  </div>
                  {user.line2 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: selectedUser?.id === user.id ? "#0284c7" : "#6b7280"
                      }}
                    >
                      {user.line2}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {selectedUser && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)",
            borderRadius: 6,
            border: "1px solid #bae6fd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#0369a1", fontWeight: 500 }}>✓ Seleccionado:</span>
            <strong style={{ color: "#0c4a6e" }}>{selectedUser.name}</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedUser(null);
              setQuery("");
              setShowDropdown(false);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#0369a1",
              fontSize: 12,
              textDecoration: "underline",
              padding: "2px 4px"
            }}
          >
            cambiar
          </button>
        </div>
      )}
    </div>
  );
}

/* ====================== */
/*  ModalCreateEvent (IN) */
/* ====================== */
export default function ModalCreateEvent({ dateStr, dateObj, onCreate, onClose, fmt }) {
  const [title, setTitle] = useState("Cita");
  const [time, setTime] = useState("09:00");

  // duración como STRING para permitir borrar/tipear
  const [duration, setDuration] = useState("60");
  const [creating, setCreating] = useState(false);

  // 💰 monto y ✅ pagado
  const [amount, setAmount] = useState("");
  const [isPaid, setIsPaid] = useState(false);

  // 🏥 obra social del paciente seleccionado
  const [cubiertoObraSocial, setCubiertoObraSocial] = useState(true);
  const [montoCubiertoOS, setMontoCubiertoOS] = useState("");
  const [montoPacienteExtra, setMontoPacienteExtra] = useState("");

  // ---- Buscar y seleccionar paciente ----
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // ---- Buscar y seleccionar doctor ----
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctorResults, setDoctorResults] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  const patientInputRef = useRef(null);
  const doctorInputRef = useRef(null);
  const patientDebounceTimer = useRef(null);
  const doctorDebounceTimer = useRef(null);
  const patientContainerRef = useRef(null);
  const doctorContainerRef = useRef(null);

  // --- handlers de duración (DENTRO del componente) ---
  const handleDurationChange = (e) => {
    const v = e.target.value;
    if (v === "") return setDuration("");         // permitir vacío
    if (/^\d{0,3}$/.test(v)) setDuration(v);      // hasta 3 dígitos
  };

  const clampDuration = () => {
    const n = parseInt(duration, 10);
    if (isNaN(n)) return setDuration("");         // queda vacío si no hay número
    const clamped = Math.min(480, Math.max(15, n));
    const snapped = Math.round(clamped / 15) * 15; // opcional: ajustar a step 15
    setDuration(String(snapped));
  };

  // Cerrar dropdowns cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (patientContainerRef.current && !patientContainerRef.current.contains(event.target)) {
        setShowPatientDropdown(false);
      }
      if (doctorContainerRef.current && !doctorContainerRef.current.contains(event.target)) {
        setShowDoctorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup de timers al desmontar
  useEffect(() => {
    return () => {
      if (patientDebounceTimer.current) clearTimeout(patientDebounceTimer.current);
      if (doctorDebounceTimer.current) clearTimeout(doctorDebounceTimer.current);
    };
  }, []);

  // Resetear campos de obra social cuando cambia el paciente seleccionado
  useEffect(() => {
    setCubiertoObraSocial(true);
    setMontoCubiertoOS("");
    setMontoPacienteExtra("");
  }, [selectedPatient?.id]);

  /**
   * Busca y normaliza resultados según el tipo.
   * Retorna items con forma: { id, name, line2, email }
   */
  const searchUsers = useCallback(async (query, endpoint, kind, setResults, setLoading, setDropdown) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setDropdown(false);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("AUTH_TOKEN");

    try {
      const { data: json } = await clienteAxios.get(endpoint, {
        params: {
          busqueda: query.trim(),
          per_page: 15,
          direccion: "desc"
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      const arr = Array.isArray(json?.data) ? json.data : [];
      const items = arr
        .map((u) => {
          if (kind === "patient") {
            // Paciente: shape con idpa/nompa/apepa y user anidado
            const id = u?.idpa ?? null;
            const name = [u?.nompa, u?.apepa].filter(Boolean).join(" ").trim() || "(Sin nombre)";
            const email = u?.user?.email ?? "";
            const dni = u?.user?.dni ?? "";
            const phone = u?.phon ?? "";
            // línea secundaria prioriza email, luego dni, luego phone
            const line2 = email || dni || phone || "";
            // Laravel serializa la relación obraSocial() como "obra_social" (snake_case)
            return id ? { id, name, line2, email, obraSocial: u?.obra_social ?? null } : null;
          } else {
            // Doctor: shape simple con id/name/specialty/email/phone
            const id = u?.id ?? null;
            const name = u?.name || "(Sin nombre)";
            const email = u?.email ?? "";
            const specialty = u?.specialty ?? "";
            const phone = u?.phone ?? "";
            const line2 = specialty || email || phone || "";
            return id ? { id, name, line2, email } : null;
          }
        })
        .filter(Boolean);

      setResults(items);
      setDropdown(items.length > 0);
    } catch (e) {
      console.error(`Error buscando en ${endpoint}:`, e);
      setResults([]);
      setDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Búsqueda de pacientes con debounce
  useEffect(() => {
    if (patientDebounceTimer.current) clearTimeout(patientDebounceTimer.current);

    patientDebounceTimer.current = setTimeout(() => {
      searchUsers(
        patientQuery,
        "/api/pacientes",
        "patient",
        setPatientResults,
        setLoadingPatients,
        setShowPatientDropdown
      );
    }, 300);
  }, [patientQuery, searchUsers]);

  // Búsqueda de doctores con debounce
  useEffect(() => {
    if (doctorDebounceTimer.current) clearTimeout(doctorDebounceTimer.current);

    doctorDebounceTimer.current = setTimeout(() => {
      searchUsers(
        doctorQuery,
        "/api/doctores",
        "doctor",
        setDoctorResults,
        setLoadingDoctors,
        setShowDoctorDropdown
      );
    }, 300);
  }, [doctorQuery, searchUsers]);

  function addMinutesUTC(dateStr, timeStr, minutes) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [hh, mm] = timeStr.split(":").map(Number);
    const base = Date.UTC(y, m - 1, d, hh, mm, 0);
    const added = new Date(base + minutes * 60000);
    const yyyy = added.getUTCFullYear();
    const MM = String(added.getUTCMonth() + 1).padStart(2, "0");
    const DD = String(added.getUTCDate()).padStart(2, "0");
    const HH = String(added.getUTCHours()).padStart(2, "0");
    const MI = String(added.getUTCMinutes()).padStart(2, "0");
    return `${yyyy}-${MM}-${DD}T${HH}:${MI}:00Z`;
  }

  // Crear cita
  const handleCreate = useCallback(() => {
    if (!title.trim()) return alert("Por favor ingresa un motivo");
    if (!selectedPatient) return alert("Por favor selecciona un paciente");
    if (!selectedDoctor) return alert("Por favor selecciona un doctor");
    if (!time) return alert("Por favor selecciona un horario");
    setCreating(true);

    const durMin = parseInt(duration, 10);
    if (!durMin || durMin < 15) return alert("La duración mínima es 15 minutos");

    const [hours, minutes] = time.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return alert("Formato de hora inválido");

    const end = addMinutesUTC(dateStr, time, durMin);
    const fecha = `${dateStr}T${time}:00Z`;

    const tieneObraSocial = !!selectedPatient.obraSocial;

    const payload = {
      title: title.trim(),
      fecha,
      end,
      allDay: false,
      // IDs y nombres normalizados del selector
      patientId: selectedPatient.id,        // idpa
      patientName: selectedPatient.name,    // nompa + apepa
      doctorId: selectedDoctor.id,          // id
      doctorName: selectedDoctor.name,      // name
      // compat anterior
      userId: selectedPatient.id,
      userName: selectedPatient.name,
      // datos de cobranza
      amount: amount ? Number(amount) : null,
      isPaid,
      // datos de obra social del paciente
      obraSocialId: selectedPatient.obraSocial?.id ?? null,
      cubiertoObraSocial: tieneObraSocial ? cubiertoObraSocial : null,
      montoCubiertoOS: tieneObraSocial && !cubiertoObraSocial && montoCubiertoOS
        ? Number(montoCubiertoOS)
        : null,
      montoPacienteExtra: tieneObraSocial && !cubiertoObraSocial && montoPacienteExtra
        ? Number(montoPacienteExtra)
        : null,
    };

    onCreate(payload);
  }, [
    title, selectedPatient, selectedDoctor, time, duration, amount, isPaid, dateStr, onCreate,
    cubiertoObraSocial, montoCubiertoOS, montoPacienteExtra,
  ]);

  const isFormValid =
    title.trim() &&
    time &&
    !isNaN(parseInt(duration, 10)) &&
    parseInt(duration, 10) >= 15 &&
    selectedPatient &&
    selectedDoctor;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
        overflowY: "auto"
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
          margin: "auto",
          position: "relative"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "5px 24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
          }}
        >
          <h3 id="modal-title" style={{ margin: 0, color: "#1f2937", fontWeight: 600 }}>
            Nueva Cita Médica
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              border: "none",
              background: "rgba(0,0,0,0.1)",
              fontSize: 18,
              cursor: "pointer",
              padding: "8px 10px",
              borderRadius: "6px",
              color: "#6b7280",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.1)";
              e.currentTarget.style.color = "#6b7280";
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            maxHeight: "calc(90vh - 140px)",
            overflowY: "auto",
            padding: "24px"
          }}
        >
          <div style={{ display: "grid", gap: 20 }}>
            <div
              style={{
                padding: "12px 16px",
                background: "#f0f9ff",
                borderRadius: 8,
                border: "1px solid #bae6fd"
              }}
            >
              <strong style={{ color: "#0c4a6e" }}>Día seleccionado:</strong>{" "}
              <span style={{ color: "#075985" }}>{dateStr}</span>
            </div>

            {/* Motivo */}
            <label style={{ display: "grid", gap: 8 }}>
              <span style={{ fontWeight: 600, color: "#374151" }}>Motivo de la cita *</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Consulta general, revisión, tratamiento..."
                required
                style={{
                  padding: "14px 16px",
                  borderRadius: 8,
                  border: "2px solid #e5e7eb",
                  fontSize: 14,
                  transition: "all 0.2s",
                  outline: "none"
                }}
                onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
            </label>

            {/* Selector de Paciente */}
            <UserSelector
              label="Seleccionar Paciente"
              query={patientQuery}
              setQuery={setPatientQuery}
              results={patientResults}
              loading={loadingPatients}
              showDropdown={showPatientDropdown}
              setShowDropdown={setShowPatientDropdown}
              selectedUser={selectedPatient}
              setSelectedUser={setSelectedPatient}
              inputRef={patientInputRef}
              containerRef={patientContainerRef}
              placeholder="Buscar paciente por nombre, email o DNI"
            />

            {/* Selector de Doctor */}
            <UserSelector
              label="Seleccionar Doctor"
              query={doctorQuery}
              setQuery={setDoctorQuery}
              results={doctorResults}
              loading={loadingDoctors}
              showDropdown={showDoctorDropdown}
              setShowDropdown={setShowDoctorDropdown}
              selectedUser={selectedDoctor}
              setSelectedUser={setSelectedDoctor}
              inputRef={doctorInputRef}
              containerRef={doctorContainerRef}
              placeholder="Buscar doctor por nombre o especialidad"
            />

            {/* Horario y Duración */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Horario *</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Duración (min) *</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="15"
                  max="480"
                  step="15"
                  value={duration}
                  onChange={handleDurationChange}
                  onBlur={clampDuration}
                  required
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                />
              </label>
            </div>

            {/* 💰 Monto + ✅ Pagado */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end" }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Monto de la cita *</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 5000"
                  required
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none"
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                />
              </label>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Pagado</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    onClick={() => setIsPaid((p) => !p)}
                    role="switch"
                    aria-checked={isPaid}
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsPaid((p) => !p)}
                    style={{
                      width: 52,
                      height: 30,
                      borderRadius: 999,
                      background: isPaid ? "#22c55e" : "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      padding: 3,
                      transition: "all 0.25s",
                      boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.05)"
                    }}
                    title={isPaid ? "Pagado" : "No pagado"}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#fff",
                        transform: `translateX(${isPaid ? "22px" : "0"})`,
                        transition: "all 0.25s",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
                      }}
                    />
                  </div>
                  <span style={{ color: isPaid ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                    {isPaid ? "Sí" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* 🏥 Obra Social del paciente seleccionado */}
            {selectedPatient?.obraSocial && (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                  padding: "16px",
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    Obra Social: <strong style={{ color: "#374151" }}>{selectedPatient.obraSocial.nombre}</strong>
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 600, color: "#374151", fontSize: 14 }}>
                      ¿Cubierto por la obra social?
                    </span>
                    <div
                      onClick={() => setCubiertoObraSocial((p) => !p)}
                      role="switch"
                      aria-checked={cubiertoObraSocial}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setCubiertoObraSocial((p) => !p)}
                      style={{
                        width: 52,
                        height: 30,
                        borderRadius: 999,
                        background: cubiertoObraSocial ? "#22c55e" : "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        padding: 3,
                        transition: "all 0.25s",
                        boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.05)"
                      }}
                      title={cubiertoObraSocial ? "Sí" : "No"}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: "#fff",
                          transform: `translateX(${cubiertoObraSocial ? "22px" : "0"})`,
                          transition: "all 0.25s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
                        }}
                      />
                    </div>
                    <span style={{ color: cubiertoObraSocial ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                      {cubiertoObraSocial ? "Sí" : "No"}
                    </span>
                  </div>
                </div>

                {!cubiertoObraSocial && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: "#374151" }}>Monto que cubre la obra social</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={montoCubiertoOS}
                        onChange={(e) => setMontoCubiertoOS(e.target.value)}
                        placeholder="Ej: 3000"
                        style={{
                          padding: "14px 16px",
                          borderRadius: 8,
                          border: "2px solid #e5e7eb",
                          fontSize: 14,
                          outline: "none"
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontWeight: 600, color: "#374151" }}>Extra a pagar por el paciente</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={montoPacienteExtra}
                        onChange={(e) => setMontoPacienteExtra(e.target.value)}
                        placeholder="Ej: 2000"
                        style={{
                          padding: "14px 16px",
                          borderRadius: 8,
                          border: "2px solid #e5e7eb",
                          fontSize: 14,
                          outline: "none"
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#0ea5e9")}
                        onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            gap: 12,
            justifyContent: "flex-end",
            background: "#f9fafb"
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "2px solid #d1d5db",
              background: "#ffffff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              color: "#374151",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "#d1d5db";
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!isFormValid || creating}
            style={{
              padding: "12px 24px",
              borderRadius: 8,
              border: "none",
              background: isFormValid && !creating
                ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                : "#9ca3af",
              color: "#ffffff",
              cursor: isFormValid && !creating ? "pointer" : "not-allowed",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: isFormValid && !creating ? "0 4px 14px rgba(14, 165, 233, 0.4)" : "none",
              transition: "all 0.2s"
            }}
          >
            {creating ? "⏳ Creando..." : "✓ Crear Cita"}
          </button>
        </div>
      </div>
    </div>
  );
}
