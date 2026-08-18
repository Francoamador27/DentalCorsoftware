/**
 * Calendario con fetch por rango, sin loops - SOLUCIÓN DEFINITIVA
 */
import React, { useRef, useState, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import ModalShowEvent from './ModalShowEvent';
import ModalCreateEvent from './ModalCreateEvent';
import clienteAxios from '../../config/axios';
import { usePageTour } from '../../tours/TourContext';
import { calendarioSteps } from '../../tours/steps/calendario.steps';
import './calendario.css';

// ✅ SOLUCIÓN: Funciones helper fuera del componente (estables por naturaleza)
const normalizeDate = (val) => {
  if (!val) return null;
  if (typeof val === 'string' && val.includes('T')) return val;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.replace(' ', 'T');
  const [dd, mm, yyyy] = String(val).split('/');
  if (dd && mm && yyyy) return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  return val;
};

const mapApiEvent = (e) => ({
  id: String(e.id ?? e.uuid ?? e._id ?? Math.random()),
  title: e.title ?? e.name ?? 'Sin título',
  start: normalizeDate(e.start ?? e.start_at ?? e.fecha_inicio),
  end: (e.end ?? e.end_at ?? e.fecha_fin ?? null)?.replace?.(' ', 'T') ?? null,
  allDay: Boolean(e.allDay ?? e.all_day ?? e.todo_dia ?? false),
  color: e.color || undefined,
  extendedProps: {
    doctorId: e.idodc ?? e.doctor_id ?? null,
    patientId: e.idpa ?? e.patient_id ?? null,
    doctor_name: e.doctor_name ?? null,
    doctor_lastname: e.doctor_lastname ?? null,
    patient_name: e.patient_name ?? null,
    patient_lastname: e.patient_lastname ?? null,
    patient_email: e.patient_email ?? null,
    patient_phone: e.patient_phone ?? null,
    monto: e.monto ?? null,
    chec: e.chec ?? null,
    day_of_week: e.day_of_week ?? null,
    day_of_month: e.day_of_month ?? null,
    raw: e,
  },
});

function Calendar() {
  usePageTour('calendario', calendarioSteps);

  const calendarRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedDate, setSelectedDate] = useState({ dateStr: null, dateObj: null });
  
  // ✅ SOLUCIÓN: Token estable
  const token = useMemo(() => localStorage.getItem('AUTH_TOKEN'), []);

  // ✅ SOLUCIÓN: Función fetchEvents completamente estable
  const fetchEvents = useCallback(async (info, success, failure) => {
    console.log('🔄 Fetching events for range:', info.startStr, 'to', info.endStr);
    
    try {
      const { data } = await clienteAxios.get('/api/events', {
        params: {
          start: info.startStr,
          end: info.endStr,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const list = Array.isArray(data) ? data : (data?.data ?? []);
      const mappedEvents = list.map(mapApiEvent);
      console.log('data', data);
      success(mappedEvents);
      
    } catch (err) {
      console.error('❌ Error cargando eventos:', err);
      failure(err);
    }
  }, [token]);

  // ✅ SOLUCIÓN: eventSources completamente estable
  const eventSources = useMemo(() => [
    {
      id: 'api-events', 
      events: fetchEvents,
    }
  ], [fetchEvents]);

  const refetch = useCallback(() => {
    calendarRef.current?.getApi?.()?.refetchEvents();
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await clienteAxios.delete(`/api/events/${selected.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      closeModal();
      refetch();
    } catch (e) {
      console.error('No se pudo eliminar el evento', e);
      alert(e?.response?.data?.message || 'No se pudo eliminar el evento.');
    } finally {
      setSaving(false);
    }
  }, [selected, token, closeModal, refetch]);

  const handleCreateFromDay = useCallback(async (data) => {
    try {
      setSaving(true);
      const toLocalOffsetISO = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        const off = -d.getTimezoneOffset();
        const sign = off >= 0 ? '+' : '-';
        const hh = pad(Math.trunc(Math.abs(off) / 60));
        const mm = pad(Math.abs(off) % 60);
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
               `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mm}`;
      };

      const payload = {
        ...data,
        start: data.fecha ?? (data.start instanceof Date ? toLocalOffsetISO(data.start) : data.start),
        end: data.endStr ?? (data.end instanceof Date ? toLocalOffsetISO(data.end) : data.end),
      };

      await clienteAxios.post('/api/events', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      refetch();
      setOpenCreate(false);
      setSelectedDate({ dateStr: null, dateObj: null });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || 'No se pudo crear la cita. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  }, [token, refetch]);

  const fmt = (d) =>
    d ? new Date(d).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }) : '—';

  return (
    <div className="calendar-wrapper">
      {/* Header personalizado */}
      <div className="calendar-header">
        <h2>Calendario de Citas</h2>
        <div className="calendar-header-meta">
          {saving && (
            <span className="calendar-saving-badge">
              <span className="calendar-saving-dot" />
              Guardando…
            </span>
          )}
          <span className="calendar-status">
            <span className="calendar-status-dot" />
            En línea
          </span>
        </div>
      </div>

      {/* Barra de progreso de carga */}
      {loading && <div className="calendar-loading-bar" />}

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        timeZone="America/Argentina/Buenos_Aires"
        locales={[esLocale]}
        locale="es"
        firstDay={1}
        buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda' }}
        weekText="Sem"
        allDayText="Todo el día"
        weekends
        selectable
        editable
        
        // ✅ SOLUCIÓN: eventSources completamente estable
        eventSources={eventSources}
        
        // ✅ SOLUCIÓN: Controlar loading externamente
        loading={(isLoading) => setLoading(isLoading)}
        
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        
        dateClick={(info) => {
          setSelectedDate({ dateStr: info.dateStr, dateObj: info.date });
          setOpenCreate(true);
        }}
        
        eventClick={(info) => {
          setSelected(info.event);
          setOpen(true);
        }}
      />

      {open && selected && (
        <ModalShowEvent
          selected={selected}
          closeModal={closeModal}
          handleDelete={handleDelete}
          fmt={fmt}
        />
      )}

      {openCreate && selectedDate.dateStr && (
        <ModalCreateEvent
          dateStr={selectedDate.dateStr}
          dateObj={selectedDate.dateObj}
          fmt={(d) =>
            d
              ? d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: '2-digit' })
              : '—'
          }
          onCreate={handleCreateFromDay}
          onClose={() => {
            setOpenCreate(false);
            setSelectedDate({ dateStr: null, dateObj: null });
          }}
        />
      )}
    </div>
  );
}

export default Calendar;