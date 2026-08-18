// src/pages/Paciente.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import clienteAxios from "../../../config/axios";
import { mostrarError, mostrarExito } from "../../../utils/Alertas";
import { usePatientLookup } from "./hooks/usePatientLookup";
import LookupStatusBadge from "./componentes/LookupStatusBadge";
import PatientImportModal from "./componentes/PatientImportModal";
import ObraSocialModal from "./componentes/ObraSocialModal";

const CREAR_OBRA_SOCIAL = "__crear__";

const toYMD = (val) => {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return String(val).slice(0, 10);
};

const Paciente = () => {
  //si idpaciente no existe buscamos en params
  const { id } = useParams(); // "nuevo" o ID

  const navigate = useNavigate();
  const token = localStorage.getItem("AUTH_TOKEN");
  const isEditing = id && id !== "nuevo";
  const isCreating = !id || id === "nuevo";
  const todayYMD = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Estado alineado 1:1 con tu tabla patients + campos de users
  const [paciente, setPaciente] = useState({
    // patients
    nompa: "",
    apepa: "",
    direc: "",
    sex: "",
    grup: "",
    phon: "",
    cump: "",
    state: 1,
    obra_social_id: "",
    numero_afiliado: "",
    fecha_caducidad: "",

    // users
    email: "",
    password: "",
    dni: "",
    codigo_postal: "",
    provincia: "",
    rol: 3, // 1=Admin, 2=Doctor, 3=Paciente
  });

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // ── Obras sociales ─────────────────────────────────────────────────────
  const [obrasSociales, setObrasSociales] = useState([]);
  const [showObraSocialModal, setShowObraSocialModal] = useState(false);
  const [carnetFile, setCarnetFile] = useState(null);
  const [carnetPreviewUrl, setCarnetPreviewUrl] = useState("");
  const [carnetUrlActual, setCarnetUrlActual] = useState("");

  // Genera (y libera) una vista previa local cuando se selecciona un archivo nuevo
  useEffect(() => {
    if (!carnetFile) {
      setCarnetPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(carnetFile);
    setCarnetPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [carnetFile]);

  const isImageUrl = (url) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url || "");
  const carnetEsImagen = carnetFile
    ? carnetFile.type?.startsWith("image/")
    : isImageUrl(carnetUrlActual);

  useEffect(() => {
    const fetchObrasSociales = async () => {
      try {
        const { data } = await clienteAxios.get("/api/obras-sociales", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setObrasSociales(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error al cargar obras sociales:", error);
      }
    };
    fetchObrasSociales();
  }, [token]);

  // ── Lookup cross-tenant (solo en modo creación) ──────────────────────────
  const { status: lookupStatus, foundData, triggerLookup, reset: resetLookup } = usePatientLookup();
  // Cuando el usuario importa desde el modal, guardamos los IDs para el payload
  const [importMeta, setImportMeta] = useState(null); // { import_user_id, source_patient_id }

  // Cargar datos solo si estamos editando
  useEffect(() => {
    if (!isEditing) return;
    const fetchPaciente = async () => {
      setErrMsg("");
      setLoading(true);
      try {
        const { data } = await clienteAxios(`/api/pacientes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Mapear con tolerancia: si el backend devuelve también datos de user, los tomamos
        setPaciente((prev) => ({
          ...prev,
          // patients
          nompa: data.nompa ?? "",
          apepa: data.apepa ?? "",
          direc: data.direc ?? "",
          sex: data.sex ?? "",
          grup: data.grup ?? "",
          phon: data.phon ?? "",
          cump: toYMD(data.cump),
          state: data.state ?? 1,
          obra_social_id: data.obra_social_id ?? "",
          numero_afiliado: data.numero_afiliado ?? "",
          fecha_caducidad: toYMD(data.fecha_caducidad),

          // users (pueden venir como root o dentro de data.user)
          email: (data.email ?? data.user?.email) ?? "",
          dni: (data.dni ?? data.user?.dni) ?? "",
          codigo_postal: (data.codigo_postal ?? data.user?.codigo_postal) ?? "",
          provincia: (data.provincia ?? data.user?.provincia) ?? "",
          rol: Number((data.rol ?? data.user?.rol) ?? 3),

          // password NO se rellena en edición
          password: "",
        }));

        // Si la obra social del paciente no está en la lista actual (poco común), la agregamos
        // (Laravel serializa la relación obraSocial() como "obra_social")
        if (data.obra_social && data.obra_social.id) {
          setObrasSociales((prev) =>
            prev.some((o) => o.id === data.obra_social.id) ? prev : [...prev, data.obra_social]
          );
        }
        setCarnetUrlActual(data.carnet_url ?? "");
      } catch (error) {
        console.error("Error al cargar el paciente:", error);
        setErrMsg(
          error?.response?.data?.message ||
            "No se pudo cargar la información del paciente."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPaciente();
  }, [id, token, isEditing]);

  // Manejo de inputs
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setPaciente((prev) => ({
      ...prev,
      [name]: name === "state" || name === "rol" ? Number(value) : value,
    }));
  }, []);

  // Selector de Obra Social: "" = Particular, CREAR_OBRA_SOCIAL abre el modal de creación
  const handleObraSocialChange = useCallback((e) => {
    const { value } = e.target;
    if (value === CREAR_OBRA_SOCIAL) {
      setShowObraSocialModal(true);
      return;
    }
    setPaciente((prev) => ({
      ...prev,
      obra_social_id: value,
      ...(value ? {} : { numero_afiliado: "", fecha_caducidad: "" }),
    }));
    if (!value) setCarnetFile(null);
  }, []);

  const handleObraSocialCreated = useCallback((nuevaObraSocial) => {
    setObrasSociales((prev) => [...prev, nuevaObraSocial]);
    setPaciente((prev) => ({ ...prev, obra_social_id: nuevaObraSocial.id }));
    setShowObraSocialModal(false);
  }, []);

  const handleCarnetChange = useCallback((e) => {
    setCarnetFile(e.target.files?.[0] || null);
  }, []);

  // Lógica compartida de llamada a la API
  const doCreate = useCallback(async (payload) => {
    setSaving(true);
    setErrMsg("");
    try {
      await clienteAxios.post(`/api/pacientes`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      mostrarExito("Paciente agregado correctamente");
      navigate("/admin-dash/pacientes");
    } catch (error) {
      console.error(error);
      const firstError =
        error?.response?.data?.errors &&
        Object.values(error.response.data.errors)[0]?.[0];
      setErrMsg(firstError || "Error al crear el paciente.");
      setSaving(false);
    }
  }, [token, navigate]);

  // Convierte el payload plano en FormData (necesario para enviar el archivo del carnet)
  const buildFormData = useCallback((payload) => {
    const fd = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") return;
      fd.append(key, value);
    });
    if (carnetFile) fd.append("carnet", carnetFile);
    return fd;
  }, [carnetFile]);

  // Envío
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones mínimas
    if (!paciente?.nompa?.trim()) return mostrarError("El nombre es obligatorio.");
    if (!paciente?.email?.trim()) return mostrarError("El email es obligatorio.");
    // Al importar no se requiere contraseña (el user ya tiene una)
    if (isCreating && !importMeta && (!paciente?.password?.trim() || paciente.password.length < 6)) {
      return mostrarError("La contraseña es obligatoria y debe tener al menos 6 caracteres.");
    }

    const patientPayload = {
      nompa: paciente.nompa?.trim(),
      apepa: paciente.apepa || null,
      direc: paciente.direc || null,
      sex: paciente.sex || null,
      grup: paciente.grup || null,
      phon: paciente.phon || null,
      cump: paciente.cump ? toYMD(paciente.cump) : null,
      state: paciente.state ?? 1,
      obra_social_id: paciente.obra_social_id || null,
      numero_afiliado: paciente.obra_social_id ? (paciente.numero_afiliado || null) : null,
      fecha_caducidad: paciente.obra_social_id && paciente.fecha_caducidad
        ? toYMD(paciente.fecha_caducidad)
        : null,
    };

    const userPayload = {
      email: paciente.email?.trim() || null,
      dni: paciente.dni || null,
      codigo_postal: paciente.codigo_postal || null,
      provincia: paciente.provincia || null,
      rol: Number(paciente.rol ?? 3),
      ...(isCreating
        ? { password: paciente.password }
        : (paciente.password?.trim() ? { password: paciente.password } : {})),
    };

    if (isCreating) {
      const payload = { ...patientPayload, ...userPayload, ...(importMeta ?? {}) };
      return doCreate(carnetFile ? buildFormData(payload) : payload);
    }

    setSaving(true);
    setErrMsg("");
    try {
      if (carnetFile) {
        const fd = buildFormData({ ...patientPayload, ...userPayload });
        fd.append("_method", "PUT");
        await clienteAxios.post(`/api/pacientes/${id}`, fd, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await clienteAxios.put(`/api/pacientes/${id}`, { ...patientPayload, ...userPayload }, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      mostrarExito("Paciente actualizado correctamente");
      navigate("/admin-dash/pacientes");
    } catch (error) {
      console.error(error);
      const firstError =
        error?.response?.data?.errors &&
        Object.values(error.response.data.errors)[0]?.[0];
      setErrMsg(firstError || "Error al actualizar el paciente.");
    } finally {
      setSaving(false);
    }
  };

  // UI de carga / error
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <div className="h-8 w-64 bg-blue-200 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-blue-200 rounded mt-2 animate-pulse" />
            </div>
            <div className="p-8 space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-5 w-24 bg-gray-200 rounded" />
                    <div className="h-12 bg-gray-200 rounded-xl" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <div className="h-11 w-24 bg-gray-200 rounded-xl" />
                <div className="h-11 w-32 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEditing && !paciente.nompa && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/60 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Paciente no encontrado</h3>
          {errMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {errMsg}
            </div>
          )}
          <button
            onClick={() => navigate("/admin-dash/pacientes")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            Volver a pacientes
          </button>
        </div>
      </div>
    );
  }

  // Render principal
  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isCreating ? "Crear Nuevo Paciente" : "Editar Paciente"}
                </h2>
                <p className="text-blue-100 mt-1">
                  {isCreating
                    ? "Complete la información del nuevo paciente"
                    : `${paciente.nompa} ${paciente.apepa || ""} - ID: ${id}`}
                </p>
              </div>
            </div>
          </div>

          {/* Error global */}
          {errMsg && (
            <div className="mx-8 mt-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-red-700 text-sm mt-1">{errMsg}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {/* ================= Datos personales ================= */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Datos Personales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nº historia */}


                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    name="nompa"
                    value={paciente.nompa || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="Nombre"
                    required
                  />
                </div>

                {/* Apellido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apellido</label>
                  <input
                    type="text"
                    name="apepa"
                    value={paciente.apepa || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="Apellido"
                  />
                </div>

                {/* DNI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">DNI / Documento</label>
                  <input
                    type="text"
                    name="dni"
                    value={paciente.dni || ""}
                    onChange={(e) => { handleChange(e); resetLookup(); setImportMeta(null); }}
                    onBlur={(e) => {
                      if (isCreating && e.target.value.trim().length >= 4)
                        triggerLookup({ dni: e.target.value });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="12345678"
                  />
                  {isCreating && <LookupStatusBadge status={lookupStatus} />}
                </div>

                {/* Sexo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
                  <select
                    name="sex"
                    value={paciente.sex || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white"
                  >
                    <option value="">Seleccione…</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {/* Fecha nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de nacimiento</label>
                  <input
                    type="date"
                    name="cump"
                    value={paciente.cump || ""}
                    onChange={handleChange}
                    max={todayYMD}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Grupo sanguíneo (opcional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grupo Sanguíneo</label>
                  <input
                    type="text"
                    name="grup"
                    value={paciente.grup || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="O+, A-, etc. (opcional)"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="phon"
                    value={paciente.phon || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="+54 3517699950"
                  />
                </div>

                {/* Obra Social */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Obra Social</label>
                  <select
                    name="obra_social_id"
                    value={paciente.obra_social_id || ""}
                    onChange={handleObraSocialChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white"
                  >
                    <option value="">Particular</option>
                    {obrasSociales.map((os) => (
                      <option key={os.id} value={os.id}>{os.nombre}</option>
                    ))}
                    <option value={CREAR_OBRA_SOCIAL}>+ Crear obra social…</option>
                  </select>
                </div>

                {/* Campos condicionales: solo si hay obra social seleccionada (no Particular) */}
                {!!paciente.obra_social_id && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Número de afiliado</label>
                      <input
                        type="text"
                        name="numero_afiliado"
                        value={paciente.numero_afiliado || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                        placeholder="Opcional"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de caducidad</label>
                      <input
                        type="date"
                        name="fecha_caducidad"
                        value={paciente.fecha_caducidad || ""}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Carnet de obra social</label>

                      <div className="flex items-start gap-4">
                        {/* Miniatura: preferimos el archivo recién elegido; si no, el carnet ya guardado */}
                        {(() => {
                          const previewUrl = carnetFile ? carnetPreviewUrl : carnetUrlActual;
                          if (!previewUrl) return null;

                          return carnetEsImagen ? (
                            <a href={previewUrl} target="_blank" rel="noreferrer" className="flex-shrink-0">
                              <img
                                src={previewUrl}
                                alt="Carnet de obra social"
                                className="w-20 h-20 object-cover rounded-xl border border-gray-300 hover:opacity-80 transition"
                              />
                            </a>
                          ) : (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-shrink-0 w-20 h-20 rounded-xl border border-gray-300 bg-gray-100 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-[10px] mt-1">PDF</span>
                            </a>
                          );
                        })()}

                        <div className="flex-1 min-w-0">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleCarnetChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm"
                          />
                          {carnetFile && (
                            <p className="text-xs text-gray-500 mt-1">Nuevo archivo: {carnetFile.name}</p>
                          )}
                          {!carnetFile && carnetUrlActual && (
                            <a
                              href={carnetUrlActual}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-xs text-blue-600 hover:underline mt-1"
                            >
                              Ver carnet actual
                            </a>
                          )}
                          <p className="text-xs text-gray-400 mt-1">Imagen o PDF, opcional.</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ================= Datos de acceso (users) ================= */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m0 0v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m6 0V7a2 2 0 00-2-2H9a2 2 0 00-2 2v2m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Datos de Acceso</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={paciente.email || ""}
                    onChange={(e) => { handleChange(e); resetLookup(); setImportMeta(null); }}
                    onBlur={(e) => {
                      if (isCreating && e.target.value.trim().length >= 4)
                        triggerLookup({ email: e.target.value });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                  {isCreating && <LookupStatusBadge status={lookupStatus} />}
                </div>

                {/* Rol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                  <select
                    name="rol"
                    value={paciente.rol ?? 3}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 bg-gray-50 focus:bg-white"
                  >
                    <option value={3}>Paciente</option>
                  </select>
                </div>

                {/* Password (solo creación o si se rellena) */}
                {!importMeta && (
                <div className={`${isCreating ? "" : "md:col-span-2"}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña {isCreating && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={paciente.password || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder={isCreating ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiar"}
                    minLength={isCreating ? 6 : undefined}
                    required={isCreating}
                  />
                </div>
                )}
              </div>
            </div>

            {/* ================= Dirección (users) ================= */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Información de Domicilio</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dirección (patients.direc) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
                  <input
                    type="text"
                    name="direc"
                    value={paciente.direc || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="Calle, número, piso, depto."
                  />
                </div>

                {/* Código postal (users.codigo_postal) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
                  <input
                    type="text"
                    name="codigo_postal"
                    value={paciente.codigo_postal || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="5000"
                  />
                </div>

                {/* Provincia (users.provincia) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provincia</label>
                  <input
                    type="text"
                    name="provincia"
                    value={paciente.provincia || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 hover:border-gray-400 bg-gray-50 focus:bg-white"
                    placeholder="Córdoba, Buenos Aires, etc."
                  />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/admin-dash/pacientes")}
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl text-white font-medium transition-all duration-200 ${
                  saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5"
                }`}
              >
                {saving ? "Guardando…" : isCreating ? "Crear paciente" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    {/* Modal de importación cross-tenant */}
    {isCreating && lookupStatus === 'found' && foundData && (
      <PatientImportModal
        foundData={foundData}
        onConfirm={(data) => {
          resetLookup();
          // Construir y enviar el payload directamente — sin requerir acción adicional del usuario
          doCreate({
            nompa:             data.nompa?.trim(),
            apepa:             data.apepa   || null,
            email:             data.email?.trim(),
            dni:               data.dni     || null,
            phon:              data.phon    || null,
            direc:             data.direc   || null,
            sex:               data.sex     || null,
            cump:              data.cump    ? toYMD(data.cump) : null,
            grup:              data.grup    || null,
            state:             1,
            rol:               3,
            import_user_id:    data.import_user_id,
            source_patient_id: data.source_patient_id,
          });
        }}
        onClose={() => resetLookup()}
      />
    )}

    {/* Modal de creación de obra social */}
    {showObraSocialModal && (
      <ObraSocialModal
        onCreated={handleObraSocialCreated}
        onClose={() => setShowObraSocialModal(false)}
      />
    )}
    </>
  );
};

export default Paciente;
