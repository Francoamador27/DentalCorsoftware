import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Joyride, EVENTS, STATUS } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import UseAuth from '../hooks/useAuth';
import { isTourSeen, markTourSeen } from './storage';
import TourTooltip from './TourTooltip';
import { sidebarSteps } from './steps/sidebar.steps';

const TourContext = createContext(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour debe usarse dentro de <TourProvider>');
  return ctx;
};

// Hook para que cada vista del admin registre su propio tour de página:
// se dispara solo la primera vez (por usuario) y queda disponible para el
// botón de ayuda para poder repetirlo a demanda.
export const usePageTour = (routeKey, steps) => {
  const { registerPageTour } = useTour();

  useEffect(() => {
    registerPageTour(routeKey, steps);
    return () => registerPageTour(null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);
};

export const TourProvider = ({ children }) => {
  const { user } = UseAuth({ middleware: 'auth' });
  const location = useLocation();
  const userId = user?.id;

  const [tour, setTour] = useState({ steps: [], run: false });
  const [activeTour, setActiveTour] = useState(null); // { kind: 'sidebar' | 'page', key }
  const [currentPageTour, setCurrentPageTour] = useState(null); // { routeKey, steps }
  const pendingRef = useRef(null);

  // Arranca un tour "desde cero": primero vacía el estado y en el siguiente
  // frame carga los steps reales — garantiza un flanco false→true en `run`
  // (react-joyride solo dispara start() cuando la prop `run` cambia) y le da
  // tiempo al DOM de la pantalla a terminar de montar.
  const runTour = useCallback((kind, key, steps) => {
    if (!steps?.length) return;
    pendingRef.current = { steps };
    setActiveTour({ kind, key });
    setTour({ steps: [], run: false });
  }, []);

  useEffect(() => {
    if (tour.run || tour.steps.length || !pendingRef.current) return;
    const { steps } = pendingRef.current;
    pendingRef.current = null;
    const raf = requestAnimationFrame(() => setTour({ steps, run: true }));
    return () => cancelAnimationFrame(raf);
  }, [tour]);

  const startSidebarTour = useCallback(({ force = false } = {}) => {
    if (!force && isTourSeen('sidebar', 'sidebar', userId)) return;
    runTour('sidebar', 'sidebar', sidebarSteps);
  }, [userId, runTour]);

  const startPageTour = useCallback((routeKey, steps, { force = false } = {}) => {
    if (!routeKey || !steps?.length) return;
    if (!force && isTourSeen('page', routeKey, userId)) return;
    runTour('page', routeKey, steps);
  }, [userId, runTour]);

  const registerPageTour = useCallback((routeKey, steps) => {
    if (!routeKey) {
      setCurrentPageTour(null);
      return;
    }
    setCurrentPageTour({ routeKey, steps });
  }, []);

  // Dispara el tour de sidebar una sola vez por usuario, al entrar al admin.
  useEffect(() => {
    if (!userId) return;
    startSidebarTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Encadena el tour de la página actual apenas termina/se salta el de sidebar,
  // y marca como visto lo que termine (FINISHED o SKIPPED cuentan como "visto").
  const handleEvent = useCallback((data) => {
    if (data.type !== EVENTS.TOUR_END) return;

    const finishedTour = activeTour;
    setActiveTour(null);

    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      if (finishedTour) markTourSeen(finishedTour.kind, finishedTour.key, userId);

      if (finishedTour?.kind === 'sidebar' && currentPageTour) {
        startPageTour(currentPageTour.routeKey, currentPageTour.steps);
      }
    }
  }, [activeTour, currentPageTour, userId, startPageTour]);

  // Si el usuario navega a mitad de un tour, lo cortamos: no queremos un
  // overlay apuntando a un elemento que ya no existe en la nueva pantalla.
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathRef.current === location.pathname) return;
    prevPathRef.current = location.pathname;

    if (tour.run) {
      if (activeTour) markTourSeen(activeTour.kind, activeTour.key, userId);
      setActiveTour(null);
      pendingRef.current = null;
      setTour({ steps: [], run: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Auto-registra un tour de página no visto apenas se registra, si no hay
  // ningún otro tour corriendo en ese momento (evita pisar el de sidebar).
  useEffect(() => {
    if (!currentPageTour || activeTour) return;
    if (isTourSeen('sidebar', 'sidebar', userId) && !isTourSeen('page', currentPageTour.routeKey, userId)) {
      startPageTour(currentPageTour.routeKey, currentPageTour.steps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageTour]);

  const replaySidebarTour = useCallback(() => startSidebarTour({ force: true }), [startSidebarTour]);

  const replayCurrentPageTour = useCallback(() => {
    if (!currentPageTour) return;
    startPageTour(currentPageTour.routeKey, currentPageTour.steps, { force: true });
  }, [currentPageTour, startPageTour]);

  const value = useMemo(() => ({
    activeTour,
    currentPageTour,
    registerPageTour,
    startSidebarTour,
    startPageTour,
    replaySidebarTour,
    replayCurrentPageTour,
  }), [activeTour, currentPageTour, registerPageTour, startSidebarTour, startPageTour, replaySidebarTour, replayCurrentPageTour]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <Joyride
        run={tour.run}
        steps={tour.steps}
        continuous
        scrollToFirstStep
        onEvent={handleEvent}
        tooltipComponent={TourTooltip}
        options={{
          primaryColor: '#008DD2',
          showProgress: true,
          spotlightPadding: 8,
          zIndex: 10500,
          overlayColor: 'rgba(4, 24, 42, 0.55)',
          skipBeacon: true,
        }}
      />
    </TourContext.Provider>
  );
};
