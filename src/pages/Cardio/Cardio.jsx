import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';

function karvonen(age, fcRep, pct) {
  const fcMax = 220 - age;
  return Math.round(fcRep + (fcMax - fcRep) * pct);
}

const METHODS = [
  { id: 'z2', name: 'Zona 2 — Base Aeróbica', pct: [0.65, 0.75], duration: '30–60 min', desc: 'Ritmo conversacional. Fundo aeróbico. Ideal para iniciantes e recuperação.' },
  { id: 'z4', name: 'Zona 4 — Limiar Anaeróbio', pct: [0.80, 0.90], duration: '15–30 min', desc: 'Ritmo de corrida de 10km. Melhora o limiar de lactato.' },
  { id: 'hiit', name: 'HIIT 30:60', pct: [0.90, 1.0], duration: '8–12 rounds', desc: '30s esforço máximo / 60s recuperação ativa. Alto gasto calórico.' },
  { id: 'tabata', name: 'Tabata', pct: [0.90, 1.0], duration: '4 min / bloco', desc: '20s esforço máximo / 10s repouso × 8 rounds.' },
  { id: 'sit', name: 'SIT — Sprint Interval', pct: [0.95, 1.0], duration: '4–6 sprints', desc: 'Sprints de 10–30s máximos. Maior melhora de VO2max.' },
  { id: 'polarized', name: 'Polarizado 80/20', pct: [0.65, 0.75], duration: '80% leve / 20% intenso', desc: '80% do volume em Z2 + 20% em Z4/Z5. Modelo élite.' },
];

const EMPTY = { studentId: '', method: '', date: new Date().toISOString().slice(0,10), duration: '', distance: '', avgHr: '', maxHr: '', calories: '', notes: '', protocol: '' };

export default function Cardio() {
  const notify = useToast();
  const [tab, setTab] = useState('plan');
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [zones, setZones] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.getAll('students').then(s => setStudents(s.sort((a,b) => a.name?.localeCompare(b.name))));
    db.getAll('cardio_sessions').then(s => setSessions(s.sort((a,b) => new Date(b.date) - new Date(a.date))));
  }, []);

  useEffect(() => {
    if (!selectedStudent) { setZones(null); return; }
    const st = students.find(s => s.id === selectedStudent);
    if (!st?.birthdate) return;
    const age = Math.floor((Date.now() - new Date(st.birthdate)) / (365.25*24*3600*1000));
    const fcRep = 60;
    setZones(METHODS.map(m => ({ ...m, minBpm: karvonen(age, fcRep, m.pct[0]), maxBpm: karvonen(age, fcRep, m.pct[1]) })));
  }, [selectedStudent, students]);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.studentId || !form.method) { notify('Selecione aluno e método', 'error'); return; }
    setSaving(true);
    await db.put('cardio_sessions', { ...form });
    notify('Sessão cardio registrada!', 'success');
    setSaving(false);
    setForm(EMPTY);
    db.getAll('cardio_sessions').then(s => setSessions(s.sort((a,b) => new Date(b.date)-new Date(a.date))));
    setTab('history');
  }

  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const studentSessions = selectedStudent ? sessions.filter(s => s.studentId === selectedStudent) : sessions;
  const getStudentName = id => students.find(s => s.id === id)?.name || '—';

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Treino Cardiovascular</h1><p className="page-subtitle">Zonas de FC, HIIT, SIT, Polarizado e mais</p></div>
      </div>

      <div className="tab-bar">
        {[['plan','Planejar'],['register','Registrar Sessão'],['history','Histórico']].map(([id,l]) => (
          <button key={id} className={`tab-btn${tab===id?' active':''}`} onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      {/* Planner */}
      {tab === 'plan' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
          <div className="form-group" style={{ maxWidth:280 }}>
            <label className="form-label">Calcular zonas para o aluno</label>
            <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Selecione (usa idade cadastrada)</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
            {METHODS.map(m => {
              const z = zones?.find(z => z.id === m.id);
              return (
                <div key={m.id} className="card" style={{ borderLeft:'4px solid var(--accent)' }}>
                  <div className="card-header"><span className="card-title">{m.name}</span></div>
                  <div style={{ padding:'1rem 1.25rem' }}>
                    <div style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:'0.75rem', lineHeight:1.6 }}>{m.desc}</div>
                    <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
                      <div><div style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>Duração</div><div style={{ fontWeight:700, color:'var(--text-primary)' }}>{m.duration}</div></div>
                      <div><div style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>Intensidade</div><div style={{ fontWeight:700, color:'var(--text-primary)' }}>{Math.round(m.pct[0]*100)}–{Math.round(m.pct[1]*100)}% FC</div></div>
                      {z && <div><div style={{ fontSize:'0.72rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:700 }}>FC Alvo (bpm)</div><div style={{ fontWeight:700, color:'var(--accent)' }}>{z.minBpm}–{z.maxBpm}</div></div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register */}
      {tab === 'register' && (
        <div className="card" style={{ maxWidth:600 }}>
          <div className="card-header"><span className="card-title">Nova Sessão Cardiovascular</span></div>
          <form onSubmit={handleSave} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Aluno *</label>
                <select className="form-select" value={form.studentId} onChange={e => field('studentId',e.target.value)} required>
                  <option value="">Selecione</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Data</label><input type="date" className="form-input" value={form.date} onChange={e => field('date',e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Método / Protocolo *</label>
              <select className="form-select" value={form.method} onChange={e => field('method',e.target.value)} required>
                <option value="">Selecione</option>
                {METHODS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Duração (min)</label><input type="number" className="form-input" value={form.duration} onChange={e => field('duration',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Distância (km)</label><input type="number" step="0.01" className="form-input" value={form.distance} onChange={e => field('distance',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">FC Média (bpm)</label><input type="number" className="form-input" value={form.avgHr} onChange={e => field('avgHr',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">FC Máxima (bpm)</label><input type="number" className="form-input" value={form.maxHr} onChange={e => field('maxHr',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Calorias (kcal)</label><input type="number" className="form-input" value={form.calories} onChange={e => field('calories',e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" rows={2} value={form.notes} onChange={e => field('notes',e.target.value)} /></div>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Salvando...' : 'Registrar Sessão'}</button>
          </form>
        </div>
      )}

      {/* History */}
      {tab === 'history' && (
        <div>
          <div className="form-group" style={{ maxWidth:260, marginBottom:'1rem' }}>
            <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Todos os alunos</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {studentSessions.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🏃</div><h3>Nenhuma sessão cardio registrada</h3></div>
          ) : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Aluno</th><th>Data</th><th>Método</th><th>Duração</th><th>Distância</th><th>FC Média</th><th>Calorias</th></tr></thead>
              <tbody>{studentSessions.map(s => (
                <tr key={s.id}>
                  <td>{getStudentName(s.studentId)}</td>
                  <td>{s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{METHODS.find(m => m.id === s.method)?.name || s.method || '—'}</td>
                  <td>{s.duration ? `${s.duration} min` : '—'}</td>
                  <td>{s.distance ? `${s.distance} km` : '—'}</td>
                  <td>{s.avgHr ? `${s.avgHr} bpm` : '—'}</td>
                  <td>{s.calories ? `${s.calories} kcal` : '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
