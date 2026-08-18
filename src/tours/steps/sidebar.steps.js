// Targets = data-tour de src/components/AdminSidebar.jsx
export const sidebarSteps = [
  {
    target: '[data-tour="sidebar-brand"]',
    title: '¡Bienvenido a tu panel!',
    content: 'Este es el menú principal del admin. Te mostramos rápido para qué sirve cada sección.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-calendario"]',
    title: 'Calendario',
    content: 'Acá ves y creás los turnos de tus pacientes en formato calendario.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-citas"]',
    title: 'Citas',
    content: 'Listado completo de citas con filtros y búsqueda, ideal para gestión diaria.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-pacientes"]',
    title: 'Pacientes',
    content: 'Administrá la ficha de cada paciente: datos, historial y archivos.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-doctores"]',
    title: 'Profesionales',
    content: 'Gestioná los doctores y profesionales que atienden en tu clínica.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-finanzas"]',
    title: 'Finanzas',
    content: 'Estadísticas, ingresos y gastos de tu clínica en un solo lugar.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-presupuestos"]',
    title: 'Presupuestos',
    content: 'Creá y enviá presupuestos a tus pacientes en formato PDF.',
    placement: 'right',
  },
  {
    target: '[data-tour="sidebar-configuraciones"]',
    title: 'Mi Clínica',
    content: 'Configurá los datos de tu clínica y el correo saliente (SMTP).',
    placement: 'right',
  },
  {
    target: '[data-tour="help-tour-button"]',
    title: '¿Necesitás repasar algo?',
    content: 'Volvé a ver este recorrido o el de cualquier pantalla cuando quieras haciendo click acá.',
    placement: 'left',
  },
];
