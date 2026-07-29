import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

// Layouts — thin wrappers, kept eager
import Layout from "./layout/Layout";
import AuthLayout from "./layout/AuthLayout";
import AdminLayout from "./layout/AdminLayout";
import SuperAdminLayout from "./layout/SuperAdminLayout";

// Landing routes
const Inicio = lazy(() => import("./views/Inicio"));
const Login = lazy(() => import("./views/Login"));
const Register = lazy(() => import("./views/Register"));
const MyAccount = lazy(() => import("./views/MyAccount"));
const NotFound = lazy(() => import("./components/NotFound"));
const ResetPassword = lazy(() => import("./views/ResetPassword"));
const Contacto = lazy(() => import("./components/Contacto"));
const QuienesSomos = lazy(() => import("./components/QuienesSomos"));
const Precios = lazy(() => import("./components/Precios"));
const Ejemplos = lazy(() => import("./components/Ejemplos"));
const ServiciosFront = lazy(() => import("./components/ServiciosFront"));
const ServiciosShow = lazy(() => import("./components/Servicios/ServiciosShow"));
const PaginasWeb = lazy(() => import("./components/PaginasWeb"));
const TenantSelector = lazy(() => import("./views/TenantSelector"));

// Admin routes
const Calendario = lazy(() => import("./views/Calendario/Calendario"));
const Cita = lazy(() => import("./views/Citas/Cita"));
const CitasAdmin = lazy(() => import("./views/Citas/CitasAdmin"));
const DoctoresList = lazy(() => import("./views/Usuarios/DoctoresList"));
const Doctor = lazy(() => import("./views/Usuarios/Doctor"));
const PacientesList = lazy(() => import("./views/Usuarios/Pacientes/PacientesList"));
const Paciente = lazy(() => import("./views/Usuarios/Pacientes/Paciente"));
const HistorialPaciente = lazy(() => import("./views/Usuarios/Pacientes/HistorialPaciente"));
const Finanzas = lazy(() => import("./components/Finanzas/Finanzas"));
const MiClinica = lazy(() => import("./views/AdminDash/MiClinica/MiClinica"));
const Presupuestos = lazy(() => import("./views/AdminDash/Presupuestos/Presupuestos"));

// SuperAdmin routes
const SuperAdminDash = lazy(() => import("./views/SuperAdmin/SuperAdminDash"));
const TenantsList = lazy(() => import("./views/SuperAdmin/Tenants/TenantsList"));
const CreateAdminForTenant = lazy(() => import("./views/SuperAdmin/Tenants/CreateAdminForTenant"));
const SuperAdminTestimonios = lazy(() => import("./views/SuperAdmin/Testimonios/SuperAdminTestimonios"));
const SuperAdminEjemplos = lazy(() => import("./views/SuperAdmin/Ejemplos/SuperAdminEjemplos"));
const SuperAdminServicios = lazy(() => import("./views/SuperAdmin/Servicios/SuperAdminServicios"));
const EditServicios = lazy(() => import("./components/Servicios/EditServicios"));
const SuperAdminChatbot = lazy(() => import("./views/SuperAdmin/Chatbot/SuperAdminChatbot"));
const SuperAdminMailConfig = lazy(() => import("./views/SuperAdmin/MailConfig/SuperAdminMailConfig"));
const SuperAdminConfiguraciones = lazy(() => import("./views/SuperAdmin/Configuraciones/SuperAdminConfiguraciones"));
const UsuariosList = lazy(() => import("./views/SuperAdmin/Usuarios/UsuariosList"));

const Spinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 border-4 border-[#008DD2] border-t-transparent rounded-full animate-spin" />
  </div>
);

const s = (el) => <Suspense fallback={<Spinner />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: s(<Inicio />) },
      { path: "/servicios", element: s(<ServiciosFront />) },
      { path: "/servicios/:id", element: s(<ServiciosShow />) },
      { path: "/contacto", element: s(<Contacto />) },
      { path: "/quienes-somos", element: s(<QuienesSomos />) },
      { path: "/precios", element: s(<Precios />) },
      { path: "/ejemplos", element: s(<Ejemplos />) },
      { path: "/paginas-web", element: s(<PaginasWeb />) },
      { path: "auth/login", element: s(<Login />) },
      { path: "auth/login/:slug", element: s(<Login />) },
      { path: "auth/reset-password", element: s(<ResetPassword />) },
    ],
  },
  {
    path: "/select-tenant",
    element: s(<TenantSelector />),
  },
  {
    path: "/mi-cuenta",
    element: <AuthLayout />,
    children: [{ index: true, element: s(<MyAccount />) }],
  },
  {
    path: "/admin-dash",
    element: <AdminLayout />,
    children: [
      { index: true, element: s(<Calendario />) },
      { path: "/admin-dash/citas", element: s(<CitasAdmin />) },
      { path: "/admin-dash/citas/:id", element: s(<Cita />) },
      { path: "/admin-dash/pacientes", element: s(<PacientesList />) },
      { path: "/admin-dash/pacientes/:id", element: s(<Paciente />) },
      { path: "/admin-dash/pacientes/historial/:id", element: s(<HistorialPaciente />) },
      { path: "/admin-dash/doctores", element: s(<DoctoresList />) },
      { path: "/admin-dash/doctores/:id", element: s(<Doctor />) },
      { path: "/admin-dash/finanzas", element: s(<Finanzas />) },
      { path: "/admin-dash/configuraciones", element: s(<MiClinica />) },
      { path: "/admin-dash/presupuestos", element: s(<Presupuestos />) },
    ],
  },
  {
    path: "/superadmin-dash",
    element: <SuperAdminLayout />,
    children: [
      { index: true, element: s(<SuperAdminDash />) },
      { path: "/superadmin-dash/tenants", element: s(<TenantsList />) },
      { path: "/superadmin-dash/tenants/:id/admin", element: s(<CreateAdminForTenant />) },
      { path: "/superadmin-dash/testimonios", element: s(<SuperAdminTestimonios />) },
      { path: "/superadmin-dash/ejemplos", element: s(<SuperAdminEjemplos />) },
      { path: "/superadmin-dash/servicios", element: s(<SuperAdminServicios />) },
      { path: "/superadmin-dash/servicios/editar/:id", element: s(<EditServicios />) },
      { path: "/superadmin-dash/chatbot", element: s(<SuperAdminChatbot />) },
      { path: "/superadmin-dash/mail-config", element: s(<SuperAdminMailConfig />) },
      { path: "/superadmin-dash/configuraciones", element: s(<SuperAdminConfiguraciones />) },
      { path: "/superadmin-dash/usuarios", element: s(<UsuariosList />) },
    ],
  },
  {
    path: "*",
    element: s(<NotFound />),
  },
]);

export default router;
