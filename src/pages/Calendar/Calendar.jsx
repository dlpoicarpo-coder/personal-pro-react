import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const ICON_WA = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
const ICON_EDIT = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;

const DURATIONS = [30, 45, 50, 60, 75, 90, 120];
const WEEKDAYS = [
  { id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' },
  { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' },
];

export default function Calendar() {
  const notify = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStudent, setFilterStudent] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [s, e] = await Promise.all([db.getAll('students'), db.getAll('schedules')]);
    setStudents(s);
    setEvents(e);
    setLoading(false);
  }

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);
  const filteredEvents = useMemo(() => filterStudent ? events.filter(e => e.studentId === filterStudent) : events, [events, filterStudent]);
  const today = new Date().toISOString().slice(0, 10);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const monthEvents = useMemo(() => filteredEvents.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [filteredEvents, currentMonth, currentYear]);

  const total = monthEvents.length;
  const done = monthEvents.filter(e => e.status === 'completed').length;
  const missed = monthEvents.filter(e => e.status === 'missed').length;
  const rate = total > 0 ? Math.round((done / total) * 100) : 0;

  const dayEvents = useMemo(() => filteredEvents.filter(e => e.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || '')), [filteredEvents, selectedDate]);
  const upcomingEvents = useMemo(() => filteredEvents.filter(e => e.date >= today && e.status !== 'completed').sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0, 20), [filteredEvents, today]);

  const statusColors = { scheduled: 'info', confirmed: 'primary', completed: 'success', missed: 'danger' };
  const statusLabels = { scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Realizado', missed: 'Faltou' };

  const handlePrevMonth = () => {
    let m = currentMonth - 1, y = currentYear;
    if (m < 0) { m = 11; y--; }
    setCurrentMonth(m); setCurrentYear(y);
  };
  const handleNextMonth = () => {
    let m = currentMonth + 1, y = currentYear;
    if (m > 11) { m = 0; y++; }
    setCurrentMonth(m); setCurrentYear(y);
  };
  const handleToday = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear()); setCurrentMonth(d.getMonth()); setSelectedDate(d.toISOString().slice(0, 10));
  };

  const deleteEvent = async (id) => {
    if (window.confirm('Remover este agendamento?')) {
      await db.delete('schedules', id);
      notify('Agendamento removido', 'success');
      loadAll();
    }
  };

  const updateStatus = async (id, status) => {
    const ev = await db.get('schedules', id);
    if (ev) {
      await db.put('schedules', { ...ev, status });
      notify('Status atualizado', 'success');
      loadAll();
    }
  };

  const startTracker = async (ev) => {
    if (ev?.studentId && ev?.workoutId) {
      sessionStorage.setItem('pp_autostart', JSON.stringify({ studentId: ev.studentId, workoutId: ev.workoutId, workoutName: ev.workoutName || '' }));
    }
    navigate('/tracker');
  };

  const sendWhatsAppMsg = (phone, msg) => {
    const p = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${p}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleReminder = (ev, st) => {
    if (!st?.phone) return notify('Aluno sem telefone cadastrado', 'warning');
    const link = `${window.location.origin}${window.location.pathname}#/form/pre/${st.id}`;
    const first = st.name.split(' ')[0];
    const msg = `Olá ${first}! Passando para lembrar do seu treino: *${ev.workoutName || 'Sessão de Treino'}* agendado para o dia *${Calc.formatDate(ev.date)}* às *${ev.time || '00:00'}*.\n\nPor favor, responda rapidamente nosso check-in pré-treino para que possamos ajustar a intensidade se necessário: ${link}`;
    sendWhatsAppMsg(st.phone, msg);
  };

  const handleWaPre = (st) => {
    if (!st?.phone) return notify('Aluno sem telefone cadastrado', 'warning');
    const link = `${window.location.origin}${window.location.pathname}#/form/pre/${st.id}`;
    const first = st.name.split(' ')[0];
    const msg = `Fala ${first}! Bora pro treino? 🚀\nResponda rápido o biofeedback para a gente ajustar as cargas de hoje: ${link}`;
    sendWhatsAppMsg(st.phone, msg);
  };

  const handleWaPost = async (st) => {
    if (!st?.phone) return notify('Aluno sem telefone cadastrado', 'warning');
    const sessions = await db.getAll('sessions');
    const last = sessions.filter(s => s.studentId === st.id && s.status === 'completed').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const link = `${window.location.origin}${window.location.pathname}#/form/post/${last?.id || 'none'}`;
    const first = st.name.split(' ')[0];
    const msg = `Treino concluído, ${first}! 💪\nComo foi a sessão de hoje? Avalie rapidamente seu esforço para registrarmos na sua evolução: ${link}`;
    sendWhatsAppMsg(st.phone, msg);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div><h1 className="page-title">Agenda de Treinos</h1><p className="page-subtitle">Agende sessões e envie lembretes automáticos</p></div>
        <div className="flex gap-sm">
          <select className="form-select" style={{ minWidth: 180 }} value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">Todos os alunos</option>
            {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setAddModalOpen(true)}>+ Agendar Treino</button>
        </div>
      </div>

      {total > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">NO MÊS</div><div className="stat-value text-gradient">{total}</div><div className="stat-change">agendamentos</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">REALIZADOS</div><div className="stat-value" style={{ color: 'var(--success)' }}>{done}</div><div className="stat-change positive">{rate}% de adesão</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">FALTAS</div><div className="stat-value" style={{ color: missed > 0 ? 'var(--danger)' : 'var(--success)' }}>{missed}</div><div className="stat-change">este mês</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">PENDENTES</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{total - done - missed}</div><div className="stat-change">agendados</div></div>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><button className="btn btn-ghost btn-sm" onClick={handlePrevMonth}>← </button><span className="card-title" style={{ textTransform: 'capitalize' }}>{monthName}</span><button className="btn btn-ghost btn-sm" onClick={handleNextMonth}> →</button></div>
          <div className="calendar-grid">
            {WEEKDAYS.map(d => <div key={d.id} className="cal-header">{d.label.slice(0,3)}</div>)}
            {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="cal-day cal-empty"></div>)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const d = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const dEvs = filteredEvents.filter(e => e.date === dateStr);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              return (
                <div key={d} className={`cal-day ${isToday ? 'cal-today' : ''} ${isSelected ? 'cal-selected' : ''} ${dEvs.length ? 'cal-has-events' : ''}`} data-date={dateStr} onClick={() => setSelectedDate(dateStr)}>
                  <span className="cal-day-num">{d}</span>
                  {dEvs.slice(0, 3).map((ev, ei) => {
                    const st = students.find(s => s.id === ev.studentId);
                    return <div key={ei} className="cal-ev-mini" style={{ background: `var(--${statusColors[ev.status] || 'info'})` }} title={`${ev.time || ''} ${st?.name || ''}`}>{ev.time ? ev.time.slice(0, 5) : ''}</div>;
                  })}
                  {dEvs.length > 3 && <span className="cal-more">+{dEvs.length - 3}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-sm mt-md" style={{ justifyContent: 'center' }}><button className="btn btn-ghost btn-sm" onClick={handleToday}>Hoje</button></div>
        </div>

        <div className="card" id="dayEventsCard">
          <div className="card-header"><span className="card-title" id="dayTitle">{selectedDate === today ? 'Hoje' : Calc.formatDate(selectedDate)} — {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
          <div id="dayEventsList">
            {dayEvents.length ? dayEvents.map(ev => {
              const st = students.find(s => s.id === ev.studentId);
              const statusColor = statusColors[ev.status] || 'info';
              const isMissed = ev.status === 'missed';
              return (
                <div key={ev.id} className="event-card" style={{ borderLeft: `3px solid var(--${statusColor})`, marginBottom: 10, padding: 12, borderRadius: '0 8px 8px 0', background: isMissed ? 'rgba(239,68,68,0.04)' : 'var(--bg-page)', opacity: isMissed ? 0.85 : 1 }}>
                  <div className="flex items-center justify-between mb-sm">
                    <div className="flex items-center gap-sm">
                      <div className="avatar avatar-sm">{st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                      <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{st?.name || '?'}</div><div className="text-xs text-muted">{ev.time || '—'} · {ev.duration || 60}min</div></div>
                    </div>
                    <span className={`badge badge-${statusColor}`}>{statusLabels[ev.status] || ev.status}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>{ev.workoutName || 'Treino não definido'}{ev.notes && <span style={{ color: 'var(--text-secondary)' }}> · {ev.notes}</span>}</div>
                  <div className="flex gap-xs" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-primary btn-sm start-tracker" onClick={() => startTracker(ev)} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>▶ Iniciar</button>
                    <button className="btn btn-ghost btn-sm" title="Lembrete WhatsApp" onClick={() => handleReminder(ev, st)} style={{ color: '#25d366', display: 'flex', alignItems: 'center', gap: 4 }}>{ICON_WA} Lembrete</button>
                    <button className="btn btn-ghost btn-sm" title="Link Pré-treino" onClick={() => handleWaPre(st)} style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>{ICON_WA} Pré</button>
                    <button className="btn btn-ghost btn-sm" title="Link Pós-treino" onClick={() => handleWaPost(st)} style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>{ICON_WA} Pós</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                      <select className="form-select" style={{ width: 'auto', padding: '3px 6px', fontSize: '0.75rem' }} value={ev.status} onChange={e => updateStatus(ev.id, e.target.value)}>{Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                      <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => setEditEvent(ev)} style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{ICON_EDIT}</button>
                      <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => deleteEvent(ev.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
                    </div>
                  </div>
                </div>
              );
            }) : <div className="empty-state" style={{ padding: 30 }}><p className="text-muted text-sm">Nenhum treino neste dia</p></div>}
          </div>
        </div>
      </div>

      <div className="card mt-lg">
        <div className="card-header"><span className="card-title">Próximas Sessões</span><div className="flex gap-md text-xs text-muted"><span style={{ color: 'var(--success)' }}>● Confirmado</span><span style={{ color: 'var(--info)' }}>● Agendado</span><span style={{ color: 'var(--danger)' }}>● Faltou</span></div></div>
        {upcomingEvents.length ? (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Data</th><th>Hora</th><th>Aluno</th><th>Treino</th><th>Dur.</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {upcomingEvents.map(ev => {
                  const st = students.find(s => s.id === ev.studentId);
                  const sc = statusColors[ev.status] || 'info';
                  return (
                    <tr key={ev.id}>
                      <td>{Calc.formatDate(ev.date)}</td><td>{ev.time || '—'}</td>
                      <td><div className="flex items-center gap-sm"><div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>{st?.name || '?'}</div></td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.workoutName || '-'}</td><td>{ev.duration || 60}min</td>
                      <td><span className={`badge badge-${sc}`}>{statusLabels[ev.status] || ev.status}</span></td>
                      <td><div style={{ display: 'flex', gap: 4 }}><button className="btn btn-primary btn-sm" onClick={() => startTracker(ev)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>▶</button><button className="btn btn-ghost btn-sm" title="WhatsApp" onClick={() => handleReminder(ev, st)} style={{ padding: '4px 6px', color: '#25d366' }}>{ICON_WA}</button><button className="btn btn-ghost btn-sm" title="Editar" onClick={() => setEditEvent(ev)} style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{ICON_EDIT}</button><button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => deleteEvent(ev.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-muted text-center" style={{ padding: 20 }}>Nenhuma sessão futura agendada</p>}
      </div>

      <AddEventModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} activeStudents={activeStudents} onSave={loadAll} notify={notify} />
      <EditEventModal isOpen={!!editEvent} onClose={() => setEditEvent(null)} event={editEvent} activeStudents={activeStudents} onSave={loadAll} notify={notify} />
    </div>
  );
}

function AddEventModal({ isOpen, onClose, activeStudents, onSave, notify }) {
  const [form, setForm] = useState({ studentId: '', workoutId: '', date: new Date().toISOString().slice(0, 10), time: '07:00', duration: 60, repeat: '', notes: '' });
  const [weekdays, setWeekdays] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => { if (!isOpen) { setForm({ studentId: '', workoutId: '', date: new Date().toISOString().slice(0, 10), time: '07:00', duration: 60, repeat: '', notes: '' }); setWeekdays([]); } }, [isOpen]);

  useEffect(() => {
    if (form.studentId) db.getAll('workouts').then(w => setWorkouts(w.filter(x => x.studentId === form.studentId)));
    else setWorkouts([]);
  }, [form.studentId]);

  const handleSubmit = async () => {
    if (!form.studentId || !form.date) return notify('Preencha aluno e data', 'error');
    const wk = form.workoutId ? workouts.find(w => w.id === form.workoutId) : null;
    const d = { ...form, workoutName: wk ? wk.name : '', status: 'scheduled', duration: Number(form.duration) || 60 };
    const repeatWeeks = Number(form.repeat) || 0;

    if (weekdays.length > 0 && repeatWeeks > 0) {
      const startDate = new Date(d.date + 'T12:00:00');
      for (let week = 0; week < repeatWeeks; week++) {
        for (const dayId of weekdays) {
          const eventDate = new Date(startDate);
          eventDate.setDate(startDate.getDate() + (week * 7) + ((dayId - startDate.getDay() + 7) % 7));
          if (eventDate >= startDate) await db.add('schedules', { ...d, date: eventDate.toISOString().slice(0, 10) });
        }
      }
    } else {
      await db.add('schedules', { ...d });
      if (repeatWeeks > 0) {
        for (let i = 1; i < repeatWeeks; i++) {
          const nd = new Date(d.date + 'T12:00:00'); nd.setDate(nd.getDate() + 7 * i);
          await db.add('schedules', { ...d, date: nd.toISOString().slice(0, 10) });
        }
      }
    }
    notify('Treino(s) agendado(s)!', 'success');
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="+ Agendar Treino" size="md">
      <div className="form-row">
        <div className="form-group"><label className="form-label">Aluno *</label><select className="form-select" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Selecione</option>{activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Treino</label><select className="form-select" value={form.workoutId} onChange={e => setForm({ ...form, workoutId: e.target.value })}><option value="">Selecione aluno</option>{workouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      </div>
      <div className="form-group"><label className="form-label">Dias da Semana</label>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          {WEEKDAYS.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={weekdays.includes(d.id)} onChange={e => setWeekdays(e.target.checked ? [...weekdays, d.id] : weekdays.filter(x => x !== d.id))} style={{ accentColor: 'var(--primary)' }} /> {d.label}
            </label>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Data Início *</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Horário</label><input className="form-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Duração (min)</label><select className="form-select" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}>{DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
      </div>
      <div className="form-group"><label className="form-label">Semanas de Repetição</label><select className="form-select" value={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.value })}><option value="">Apenas esta data</option><option value="4">4 semanas</option><option value="8">8 semanas</option><option value="12">12 semanas</option><option value="16">16 semanas</option></select></div>
      <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Foco em pernas" /></div>
      <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit}>Agendar</button></div>
    </Modal>
  );
}

function EditEventModal({ isOpen, onClose, event, activeStudents, onSave, notify }) {
  const [form, setForm] = useState({ workoutId: '', date: '', time: '', duration: 60, status: 'scheduled', notes: '' });
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    if (isOpen && event) {
      setForm({ workoutId: event.workoutId || '', date: event.date, time: event.time || '07:00', duration: event.duration || 60, status: event.status || 'scheduled', notes: event.notes || '' });
      db.getAll('workouts').then(w => setWorkouts(w.filter(x => x.studentId === event.studentId)));
    }
  }, [isOpen, event]);

  const handleSubmit = async () => {
    const wk = form.workoutId ? workouts.find(w => w.id === form.workoutId) : null;
    await db.put('schedules', { ...event, date: form.date, time: form.time, duration: Number(form.duration) || 60, status: form.status, workoutId: form.workoutId || event.workoutId, workoutName: wk ? wk.name : event.workoutName, notes: form.notes });
    notify('Agendamento atualizado!', 'success');
    onSave();
    onClose();
  };

  const st = event ? activeStudents.find(s => s.id === event.studentId) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Agendamento" size="md">
      <div className="form-group"><label className="form-label">Aluno</label><input className="form-input" value={st?.name || '?'} disabled /></div>
      <div className="form-group"><label className="form-label">Treino</label><select className="form-select" value={form.workoutId} onChange={e => setForm({ ...form, workoutId: e.target.value })}><option value="">Sem treino definido</option>{workouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
        <div className="form-group"><label className="form-label">Horário</label><input className="form-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Duração (min)</label><select className="form-select" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}>{DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Status</label><select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="scheduled">Agendado</option><option value="confirmed">Confirmado</option><option value="completed">Realizado</option><option value="missed">Faltou</option></select></div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ex: Foco em pernas" /></div>
      <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit}>Salvar</button></div>
    </Modal>
  );
}
