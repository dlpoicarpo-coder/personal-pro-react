import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const DAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const WEEKDAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

export default function Calendar() {
  const notify = useToast();
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayEvents, setDayEvents] = useState([]);
  const [form, setForm] = useState({ studentId: '', workoutId: '', weekdays: [], time: '', notes: '' });
  const [filterStudent, setFilterStudent] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [ev, st, wo] = await Promise.all([db.getAll('calendar_events'), db.getAll('students'), db.getAll('workouts')]);
    setEvents(ev);
    setStudents(st.filter(s => s.status === 'Ativo').sort((a,b) => a.name?.localeCompare(b.name)));
    setWorkouts(wo);
  }

  function prevMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  function openDay(day) {
    if (!day) return;
    setSelectedDay(day);
    const dateStr = day.toISOString().slice(0,10);
    const evs = events.filter(e => {
      if (e.date === dateStr) return true;
      if (e.weekdays?.includes(day.getDay())) return true;
      return false;
    }).filter(e => !filterStudent || e.studentId === filterStudent);
    setDayEvents(evs);
    setForm({ studentId: '', workoutId: '', weekdays: [], time: '', notes: '' });
    setModalOpen(true);
  }

  function toggleWeekday(d) {
    setForm(f => ({ ...f, weekdays: f.weekdays.includes(d) ? f.weekdays.filter(x => x !== d) : [...f.weekdays, d] }));
  }

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!form.studentId) { notify('Selecione um aluno', 'error'); return; }
    const dateStr = selectedDay.toISOString().slice(0,10);
    const event = { ...form, date: dateStr, createdAt: new Date().toISOString() };
    await db.put('calendar_events', event);
    notify('Evento agendado!', 'success');
    loadAll();
    setModalOpen(false);
  }

  async function deleteEvent(id) {
    await db.delete('calendar_events', id);
    notify('Evento removido', 'warning');
    loadAll();
    setModalOpen(false);
  }

  const days = getCalendarDays(viewDate.getFullYear(), viewDate.getMonth());
  const monthName = viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const filteredEvents = filterStudent ? events.filter(e => e.studentId === filterStudent) : events;
  const getStudentName = id => students.find(s => s.id === id)?.name || '';
  const getWorkoutName = id => workouts.find(w => w.id === id)?.name || '';
  const studentWorkouts = workouts.filter(w => w.studentId === form.studentId);

  function dayHasEvent(day) {
    if (!day) return false;
    const ds = day.toISOString().slice(0,10);
    return filteredEvents.some(e => e.date === ds || e.weekdays?.includes(day.getDay()));
  }

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Agenda</h1><p className="page-subtitle">Agendamento de treinos</p></div>
        <select className="form-select" style={{ width: 200 }} value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
          <option value="">Todos os alunos</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="calendar-nav">
          <button className="btn btn-outline btn-sm" onClick={prevMonth}>‹</button>
          <span className="calendar-month">{monthName}</span>
          <button className="btn btn-outline btn-sm" onClick={nextMonth}>›</button>
        </div>
        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="calendar-day-header">{d}</div>)}
          {days.map((day, i) => {
            const isToday = day && day.toDateString() === today.toDateString();
            const hasEvent = dayHasEvent(day);
            return (
              <div key={i} className={`calendar-day${day ? ' active' : ''}${isToday ? ' today' : ''}${hasEvent ? ' has-event' : ''}`} onClick={() => openDay(day)}>
                {day && <span className="day-number">{day.getDate()}</span>}
                {hasEvent && <div className="event-dot" />}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedDay ? selectedDay.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' }) : ''} size="md">
        {dayEvents.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Treinos agendados</div>
            {dayEvents.map(ev => (
              <div key={ev.id} className="event-item">
                <div><strong>{getStudentName(ev.studentId)}</strong> · {getWorkoutName(ev.workoutId) || 'Treino livre'}</div>
                {ev.time && <div className="text-muted">{ev.time}</div>}
                <button className="btn btn-sm btn-danger" onClick={() => deleteEvent(ev.id)}>Remover</button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Agendar novo treino</div>
          <div className="form-group">
            <label className="form-label">Aluno *</label>
            <select className="form-select" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value, workoutId: '' }))}>
              <option value="">Selecione</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Treino</label>
            <select className="form-select" value={form.workoutId} onChange={e => setForm(f => ({ ...f, workoutId: e.target.value }))} disabled={!form.studentId}>
              <option value="">Treino livre</option>
              {studentWorkouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Horário</label>
            <input type="time" className="form-input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Repetir nos dias</label>
            <div className="weekdays-picker">
              {WEEKDAYS.map((d,i) => (
                <button key={i} type="button" className={`weekday-btn${form.weekdays.includes(i) ? ' selected' : ''}`} onClick={() => toggleWeekday(i)}>{DAYS[i]}</button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Fechar</button>
            <button type="submit" className="btn btn-primary">Agendar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
