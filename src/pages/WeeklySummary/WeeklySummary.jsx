import React, { useState, useEffect } from 'react';
import db from '../../lib/db';

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function inWeek(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export default function WeeklySummary() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [cardio, setCardio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([db.getAll('students'), db.getAll('sessions'), db.getAll('cardio_sessions')]).then(([s, se, c]) => {
      setStudents(s.filter(x => x.status === 'Ativo').sort((a,b) => a.name?.localeCompare(b.name)));
      setSessions(se);
      setCardio(c);
      setLoading(false);
    });
  }, []);

  const { start, end } = getWeekDates(weekOffset);
  const fmt = d => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  const weekLabel = `${fmt(start)} – ${fmt(end)}`;

  const weekSessions = sessions.filter(s => s.date && inWeek(s.date, start, end));
  const weekCardio = cardio.filter(c => c.date && inWeek(c.date, start, end));

  const totalMin = weekSessions.reduce((a, s) => a + (s.duration ? Math.round(s.duration/60) : 0), 0);
  const totalCardioMin = weekCardio.reduce((a, c) => a + (Number(c.duration)||0), 0);

  function studentStats(studentId) {
    const st = weekSessions.filter(s => s.studentId === studentId);
    const cd = weekCardio.filter(c => c.studentId === studentId);
    const totalSets = st.reduce((a, s) => a + (s.exerciseLogs?.reduce((b, ex) => b + ex.logs?.length, 0) || 0), 0);
    const doneSets = st.reduce((a, s) => a + (s.exerciseLogs?.reduce((b, ex) => b + (ex.logs?.filter(l => l.done)?.length || 0), 0) || 0), 0);
    return { sessions: st.length, cardio: cd.length, totalSets, doneSets, mins: st.reduce((a, s) => a + (s.duration ? Math.round(s.duration/60) : 0), 0) };
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const activeWithActivity = students.filter(s => {
    const st = studentStats(s.id);
    return st.sessions > 0 || st.cardio > 0;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Resumo Semanal</h1><p className="page-subtitle">Visão geral da semana de treinos</p></div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setWeekOffset(o => o-1)}>‹ Anterior</button>
          <span style={{ fontWeight:700, color:'var(--text-primary)', padding:'0 0.5rem', minWidth:130, textAlign:'center' }}>{weekLabel}</span>
          <button className="btn btn-outline btn-sm" onClick={() => setWeekOffset(o => Math.min(o+1, 0))} disabled={weekOffset === 0}>Próxima ›</button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:'1.5rem' }}>
        {[
          ['💪 Sessões Musculação', weekSessions.length, '#10b981'],
          ['🏃 Sessões Cardio', weekCardio.length, '#06b6d4'],
          ['⏱ Minutos Musculação', `${totalMin} min`, '#8b5cf6'],
          ['🔥 Minutos Cardio', `${totalCardioMin} min`, '#f59e0b'],
        ].map(([l,v,c]) => (
          <div key={l} className="stat-card">
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color:c }}>{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Per student */}
      {activeWithActivity.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Nenhuma atividade esta semana</h3>
          <p>Os dados aparecerão conforme as sessões forem registradas</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {activeWithActivity.map(s => {
            const st = studentStats(s.id);
            const completion = st.totalSets > 0 ? Math.round((st.doneSets/st.totalSets)*100) : null;
            return (
              <div key={s.id} className="card">
                <div className="card-header">
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,var(--accent),#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white' }}>{s.name?.charAt(0)}</div>
                    <span className="card-title">{s.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                    {st.sessions > 0 && <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>💪 {st.sessions} sessão(ões) · {st.mins} min</span>}
                    {st.cardio > 0 && <span style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>🏃 {st.cardio} cardio</span>}
                    {completion !== null && <span className={`badge badge-${completion>=80?'success':completion>=50?'warning':'danger'}`}>{completion}% concluído</span>}
                  </div>
                </div>
                {weekSessions.filter(x => x.studentId === s.id).length === 0 && (
                  <div style={{ padding:'1rem 1.5rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>Nenhuma sessão de musculação registrada esta semana</div>
                )}
                {weekSessions.filter(x => x.studentId === s.id).map((sess, i) => {
                  const total = sess.exerciseLogs?.reduce((a,ex) => a + (ex.logs?.length||0), 0) || 0;
                  const done = sess.exerciseLogs?.reduce((a,ex) => a + (ex.logs?.filter(l=>l.done)?.length||0), 0) || 0;
                  return (
                    <div key={i} style={{ padding:'0.75rem 1.5rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)' }}>{sess.date ? new Date(sess.date).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}) : 'Sem data'}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>{done}/{total} séries · {sess.duration ? Math.round(sess.duration/60)+' min' : '—'}</div>
                      </div>
                      <div className="progress-bar-bg" style={{ width:120 }}>
                        <div className="progress-bar-fill" style={{ width: total>0 ? `${Math.round((done/total)*100)}%` : '0%' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
