# Plan — Onboarding Tour (React Joyride v3)

Solo frontend. Sin cambios de backend. El objetivo: al primer ingreso al admin, un
tour recorre el sidebar explicando cada sección, y al entrar por primera vez a
cada ruta, un tour explica esa pantalla. El usuario puede volver a disparar el
tour cuando quiera desde un botón de ayuda.

## 0. Decisión de librería: react-joyride v3 (no @reactour/tour)

El proyecto usa `react: ^19.0.0`. Investigué compatibilidad antes de elegir:

- **@reactour/tour** tiene un issue abierto y sin resolver (diciembre 2024 →
  marzo 2026, [#659](https://github.com/elrumordelaluz/reactour/issues/659)):
  bundlea su propia copia de React, lo que rompe con "Invalid hook call" /
  instancias duplicadas en React 19. Riesgo real de instalación rota.
- **react-joyride** lanzó v3 en marzo 2026: reescritura con API basada en
  hooks, reemplazó Popper.js por Floating UI, y soporta React 16.8 → 19
  oficialmente.
- El look "moderno" que se busca no depende de la librería en sí — ambas
  permiten reemplazar el tooltip por un componente 100% custom. Con joyride v3
  armamos un tooltip propio (MUI + estilo de marca `#008DD2`) y queda
  indistinguible en UX de reactour, sin el riesgo de compatibilidad.

`npm install react-joyride@^3.0.2`

## 1. Modelo mental

Dos tours distintos, mismo motor:

1. **Tour de sidebar** — un solo Joyride corriendo dentro de `AdminSidebar`,
   con un step por ítem de menú (`Calendario`, `Citas`, `Pacientes`,
   `Profesionales`, `Finanzas`, `Presupuestos`, `Mi Clínica`) + el switcher de
   tenant. Se dispara una sola vez al entrar por primera vez a `/admin-dash`.
2. **Tours de página** — un Joyride por vista (`Calendario`, `CitasAdmin`,
   `PacientesList`, `DoctoresList`, `Finanzas`, `Presupuestos`, `MiClinica`),
   cada uno con sus propios steps apuntando a elementos reales de esa pantalla
   (filtros, botón "crear", tabla, etc). Se dispara la primera vez que el
   usuario entra a esa ruta.

Ambos comparten:
- Persistencia de "ya visto" en `localStorage`, con clave por usuario (y
  tenant) para no mezclar el progreso entre distintas clínicas/usuarios en el
  mismo navegador.
- Un botón de ayuda global (ícono `?`) para re-disparar el tour manualmente
  en cualquier momento, ignorando el flag de "ya visto".

## 2. Persistencia (frontend-only)

Como es solo frontend, el estado de "tour visto" vive en `localStorage`,
scopeado por `user.id`:

```
tour:v1:sidebar:<userId>        → "done" | ausente
tour:v1:page:<routeKey>:<userId> → "done" | ausente
```

`routeKey` = slug fijo por vista (`calendario`, `citas`, `pacientes`,
`doctores`, `finanzas`, `presupuestos`, `mi-clinica`), no el pathname
completo (para no romper con `/admin-dash/citas/:id`).

Limitación aceptada: si el usuario cambia de navegador/dispositivo, ve el
tour de nuevo. Está bien para esta fase — si más adelante se quiere que
persista cross-device, se movería a un campo en el backend (`users.tour_seen`
o tabla `user_tours`), pero eso queda fuera de este plan.

## 3. Arquitectura de componentes (nuevo)

```
src/tours/
  TourContext.jsx        # Provider: estado run/steps activos, helpers start/reset
  useTour.js              # hook de consumo
  storage.js               # helpers get/set de los flags de localStorage
  tooltipTheme.js          # componente custom de tooltip (styles/branding)
  steps/
    sidebar.steps.js
    calendario.steps.js
    citas.steps.js
    pacientes.steps.js
    doctores.steps.js
    finanzas.steps.js
    presupuestos.steps.js
    miClinica.steps.js
```

**`TourContext`** expone:
- `startSidebarTour({ force })`
- `startPageTour(routeKey, steps, { force })`
- `markDone(kind, key)`
- `activeRun` (steps + running boolean que consume el `<Joyride />` montado
  una sola vez en `AdminLayout`)

Un único `<Joyride />` vive en `AdminLayout.jsx`, controlado por el contexto
— evita montar/desmontar instancias distintas por página y problemas de
overlay superpuesto.

## 4. Cambios por archivo

**Nuevos:**
- `src/tours/TourContext.jsx`, `useTour.js`, `storage.js`, `tooltipTheme.js`
- `src/tours/steps/*.steps.js` (uno por vista, arrays de `{ target, content,
  title, placement }`)
- `src/components/HelpTourButton.jsx` — botón flotante `?` con menú: "Recorrer
  el menú" / "Explicar esta pantalla"

**Modificados:**
- `src/layout/AdminLayout.jsx` — envolver el árbol en `<TourProvider>`, montar
  `<Joyride {...activeRun} />` y `<HelpTourButton />`.
- `src/components/AdminSidebar.jsx` — agregar `data-tour="sidebar-<key>"` en
  cada `ListItemButton`/`NavLink` y en `TenantSwitcher`; on-mount (si
  corresponde) forzar `open=true` mientras el tour de sidebar está corriendo
  para que no queden pasos apuntando a un drawer colapsado, y restaurar el
  estado previo al terminar.
- `src/views/Calendario/Calendario.jsx`, `src/views/Citas/CitasAdmin.jsx`,
  `src/views/Usuarios/Pacientes/PacientesList.jsx`,
  `src/views/Usuarios/DoctoresList.jsx`, `src/components/Finanzas/Finanzas.jsx`,
  `src/views/AdminDash/Presupuestos/Presupuestos.jsx`,
  `src/views/AdminDash/MiClinica/MiClinica.jsx` — agregar `data-tour="..."` a
  2-5 elementos clave por vista (filtros, botón crear, tabla/listado,
  acciones principales) + un `useEffect` que llama
  `startPageTour('<routeKey>', steps)` al montar.

## 5. Flujo de disparo automático

1. Login exitoso → tenant resuelto → redirect a `/admin-dash` (ya existe en
   `useAuth.js`).
2. `AdminLayout` monta, `TourProvider` lee `tour:v1:sidebar:<userId>`. Si no
   existe, dispara el tour de sidebar tras un `requestAnimationFrame` (para
   asegurar que el Drawer ya renderizó).
3. Al terminar/saltar el tour de sidebar (`callback` status `FINISHED` o
   `SKIPPED`), se marca `done` y — si el usuario está en `/admin-dash` (index,
   Calendario) — se encadena automáticamente el tour de esa página.
4. Cada vista, en su propio `useEffect`, chequea su flag de página
   independientemente: si el usuario navega directo a `/admin-dash/pacientes`
   sin pasar por el índice, igual ve el tour de esa página la primera vez.
5. Si el usuario navega a mitad de un tour, el `callback` de Joyride debe
   frenar el run (`status: SKIPPED`) vía listener de cambio de ruta
   (`useLocation` + `useEffect`) para no dejar un overlay huérfano.

## 6. Botón de ayuda (re-disparo manual)

`HelpTourButton` — flotante, `position: fixed`, esquina inferior derecha,
visible en todas las rutas de `/admin-dash/*`. Al click, menú con dos
opciones:
- "Recorrer el menú" → `startSidebarTour({ force: true })`
- "Explicar esta pantalla" → `startPageTour(currentRouteKey, steps, { force:
  true })` (usa un mapa `pathname → routeKey` para resolver cuál steps-file
  corresponde a la ruta activa)

`force: true` ignora el flag de `localStorage` pero igual lo reescribe al
terminar (no daña el estado "ya visto" para el próximo login normal).

## 7. Estilo del tooltip

Componente custom (`tooltipTheme.js`) recibiendo el render-prop de joyride
v3, construido con MUI (`Card`, `Typography`, botones "Atrás / Siguiente /
Saltar / Finalizar"), color de marca `#008DD2` consistente con el resto del
admin (mismo gradiente que ya se usa en `AdminSidebar`), contador de paso
(`3/7`), y overlay con spotlight suave. Esto es lo que le da la sensación
"moderna" que se buscaba con reactour, sin el riesgo de compatibilidad.

## 8. Fases de implementación (menor a mayor riesgo)

**Fase 1 — Infraestructura + tour de sidebar**
Instalar librería, crear `TourContext`/`useTour`/`storage`, tooltip custom,
`data-tour` en `AdminSidebar`, montar `Joyride` en `AdminLayout`, tour de
sidebar funcionando end-to-end con persistencia. Sin tours de página todavía.
Riesgo bajo: un solo componente nuevo, no toca vistas existentes más que
agregar atributos `data-tour` inertes.

**Fase 2 — Botón de ayuda / re-disparo manual**
`HelpTourButton` + mapa `pathname → routeKey`. Se puede probar contra el tour
de sidebar de la Fase 1 antes de tener todos los tours de página.

**Fase 3 — Tours de página de mayor tráfico**
`Calendario` y `CitasAdmin` primero (son las vistas de entrada más usadas).
Steps + `data-tour` + `useEffect` de disparo en esas dos vistas.

**Fase 4 — Resto de tours de página**
`PacientesList`, `DoctoresList`, `Finanzas`, `Presupuestos`, `MiClinica`.
Mismo patrón que Fase 3, repetido por vista — riesgo bajo porque el patrón ya
está validado.

**Fase 5 — Pulido**
Manejo de bordes: navegación mid-tour, resize/mobile (sidebar colapsado),
`data-tour` en elementos que se renderizan condicionalmente (ej. tabla vacía
sin filas — el step debe apuntar a un contenedor que siempre exista, no a una
fila).

## 9. Fuera de alcance

- Persistencia cross-device (requeriría backend).
- Tours para `/superadmin-dash` (no lo pidió el usuario; mismo patrón
  aplicaría si se quisiera después).
- Analytics de completado de tour (qué % de usuarios lo termina vs. salta).
