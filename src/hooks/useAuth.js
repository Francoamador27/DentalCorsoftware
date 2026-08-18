import clienteAxios from "../config/axios";
import useSWR from "swr";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ── Helpers de localStorage ───────────────────────────────────────────────────
const getTenants      = () => JSON.parse(localStorage.getItem('TENANTS')       || '[]');
const getActiveTenant = () => JSON.parse(localStorage.getItem('ACTIVE_TENANT') || 'null');

const UseAuth = ({ middleware, url }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [tenants, setTenants]             = useState(getTenants);
  const [activeTenant, setActiveTenant]   = useState(getActiveTenant);
  const hasRedirectedRef = useRef(false);

  // ── SWR: usuario autenticado ─────────────────────────────────────────────
  const { data: user, error, mutate } = useSWR(
    '/api/user',
    async () => {
      const token = localStorage.getItem('AUTH_TOKEN');
      if (!token) throw new Error('No token');
      const res = await clienteAxios('/api/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      dedupingInterval: 60000,
      onError: (err) => {
        if (err.message === 'No token') return;
        console.error('Error auth:', err);
      }
    }
  );

  const isLoading = !user && !error;

  // ── Seleccionar tenant activo ────────────────────────────────────────────
  const selectTenant = (tenant) => {
    localStorage.setItem('ACTIVE_TENANT', JSON.stringify(tenant));
    setActiveTenant(tenant);
    // Limpiar estado de bloqueo del tenant anterior
    sessionStorage.removeItem('TENANT_BLOCKED');
  };

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (datos, setErrores, setLoading) => {
    try {
      setLoading?.(true);
      const { data } = await clienteAxios.post('/api/login', datos);

      if (!data?.token) throw new Error('No se recibió token');

      localStorage.setItem('AUTH_TOKEN', data.token);
      clienteAxios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      // Guardar tenants recibidos del backend
      const receivedTenants = data.tenants ?? [];
      localStorage.setItem('TENANTS', JSON.stringify(receivedTenants));
      setTenants(receivedTenants);

      // Si tiene un solo tenant → seleccionarlo automáticamente
      if (receivedTenants.length === 1) {
        selectTenant(receivedTenants[0]);
      } else {
        // Limpiar tenant activo previo para forzar la selección
        localStorage.removeItem('ACTIVE_TENANT');
        setActiveTenant(null);
      }

      setErrores?.(null);
      hasRedirectedRef.current = false;
      await mutate();
    } catch (error) {
      setErrores?.(error.response?.data?.errors || 'Error al iniciar sesión');
    } finally {
      setLoading?.(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────────────────
  const register = async (datos, setErrores) => {
    try {
      const { data } = await clienteAxios.post('/api/register', datos);

      if (!data?.token) throw new Error('No se recibió token');

      localStorage.setItem('AUTH_TOKEN', data.token);
      clienteAxios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

      setErrores?.(null);
      hasRedirectedRef.current = false;
      await mutate();
    } catch (error) {
      setErrores?.(Object.values(error.response?.data?.errors || { error: 'Error' }));
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      setLoggingOut(true);
      const token = localStorage.getItem('AUTH_TOKEN');
      if (token) {
        await clienteAxios.post('/api/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      localStorage.removeItem('AUTH_TOKEN');
      localStorage.removeItem('TENANTS');
      localStorage.removeItem('ACTIVE_TENANT');
      sessionStorage.removeItem('TENANT_BLOCKED');
      delete clienteAxios.defaults.headers.common['Authorization'];

      setTenants([]);
      setActiveTenant(null);
      await mutate(null, { revalidate: false });

      setLoggingOut(false);
      hasRedirectedRef.current = false;
      window.location.href = '/auth/login';
    }
  };

  // ── Redirecciones post-login ─────────────────────────────────────────────
  useEffect(() => {
    if (loggingOut || isLoading || hasRedirectedRef.current) return;

    const onLoginPage = location.pathname === '/auth/login' || location.pathname.startsWith('/auth/login/');

    if (middleware === 'guest' && user && onLoginPage) {
      hasRedirectedRef.current = true;

      if (user.role === 'superadmin') {
        navigate('/superadmin-dash');
        return;
      }

      // Si tiene múltiples tenants y no eligió ninguno → selector
      const currentTenants = getTenants();
      const currentActive  = getActiveTenant();

      // Sin tenants asignados → selector mostrará pantalla vacía
      if (currentTenants.length === 0) {
        navigate('/select-tenant');
        return;
      }

      if (currentTenants.length > 1 && !currentActive) {
        navigate('/select-tenant');
        return;
      }

      // Un solo tenant o ya tiene activo → ir al panel
      if (user.role === 'admin') {
        navigate('/admin-dash');
      } else {
        navigate(url || '/mi-cuenta');
      }
      return;
    }

    if (middleware === 'guest' && url && user && user.role === 'user') {
      hasRedirectedRef.current = true;
      navigate(url);
      return;
    }

    if (middleware === 'auth' && error && error.message !== 'No token') {
      hasRedirectedRef.current = true;
      navigate('/auth/login');
    }
  }, [user, error, loggingOut, isLoading, middleware, url, location.pathname]);

  return {
    login,
    register,
    logout,
    user,
    error,
    isLoading,
    tenants,
    activeTenant,
    selectTenant,
  };
};

export default UseAuth;
