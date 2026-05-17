import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';

function calcAge(birth) {
  if (!birth) return null;
  return Math.floor((Date.now() - new Date(birth)) / (365.25 * 24 * 3600 * 1000));
}
function karvonen(fcMax, fcRep, pct) { return Math.round(fcRep + (fcMax - fcRep) * pct); }

export default function Assessments() {
  const notify = useToast();
  const [tab, setTab] = useState('zones');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [fcMax, setFcMax] = useState('');
  const [fcRep, setFcRep] = useState('');
  const [age, setAge] = useState('');
  const [zones, setZones] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [form, setForm] = useState({ studentId:'', date: new Date().toISOString().slice(0,10), weight:'', height:'', bodyFat:'', muscleMass:'', waist:'', hip:'', notes:'' });

  useEffect(() => {
    db.getAll('students').then(s => setStudents(s.sort((a,b) => a.name?.localeCompare(b.name))));
    db.getAll('assessments').then(setAssessments);
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const s = students.find(x => x.id === selectedStudent);
    if (s?.birthdate) setAge(String(calcAge(s.birthdate) || ''));
  }, [selectedStudent, students]);

  function calcZones() {
    const a = Number(age), fc = Number(fcMax) || (220 - a), rep = Number(fcRep) || 60;
    if (!a && !Number(fcMax)) { notify('Informe a idade ou FC Máxima', 'error'); return; }
    setZones([
      { zone: 'Z1 - Recuperação', pct: '50-60%', min: karvonen(fc, rep, 0.5), max: karvonen(fc, rep, 0.6), color: '#64748b' },
      { zone: 'Z2 - Base Aeróbica', pct: '60-70%', min: karvonen(fc, rep, 0.6), max: karvonen(fc, rep, 0.7), color: '#10b981' },
      { zone: 'Z3 - Aeróbico', pct: '70-80%', min: karvonen(fc, rep, 0.7), max: karvonen(fc, rep, 0.8), color: '#06b6d4' },
      { zone: 'Z4 - Limiar Anaeróbio', pct: '80-90%', min: karvonen(fc, rep, 0.8), max: karvonen(fc, rep, 0.9), color: '#f59e0b' },
      { zone: 'Z5 - VO2 Máx', pct: '90-100%', min: karvonen(fc, rep, 0.9), max: karvonen(fc, rep, 1.0), color: '#ef4444' },
    ]);
  }

  async function saveAssessment(e) {
    e.preventDefault();
    if (!form.studentId) { notify('Selecione um aluno', 'error'); return; }
    const h = Number(form.height) / 100;
    const imc = h > 0 ? (Number(form.weight) / (h * h)).toFixed(1) : null;
    await db.put('assessments', { ...form, imc });
    notify('Avaliação salva!', 'success');
    db.getAll('assessments').then(setAssessments);
    setForm(f => ({ ...f, weight:'', height:'', bodyFat:'', muscleMass:'', waist:'', hip:'', notes:'' }));
  }

  const studentAssessments = assessments.filter(a => a.studentId === form.studentId).sort((a,b) => new Date(b.date) - new Date(a.date));
  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Avaliações</h1><p className="page-subtitle">Medidas corporais e zonas de treino</p></div></div>

      <div className="tab-bar">
        {[['zones','Zonas de Treino'],['body','Avaliação Corporal'],['history','Histórico']].map(([id,label]) => (
          <button key={id} className={`tab-btn${tab===id?' active':''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'zones' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header"><span className="card-title">Calculadora de Zonas (Karvonen)</span></div>
          <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="form-group">
              <label className="form-label">Aluno (auto-preenche a idade)</label>
              <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">Selecione ou preencha manualmente</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Idade</label><input type="number" className="form-input" value={age} onChange={e => setAge(e.target.value)} placeholder="Ex: 30" /></div>
              <div className="form-group"><label className="form-label">FC Máxima (opcional)</label><input type="number" className="form-input" value={fcMax} onChange={e => setFcMax(e.target.value)} placeholder="Auto: 220-idade" /></div>
              <div className="form-group"><label className="form-label">FC Repouso (bpm)</label><input type="number" className="form-input" value={fcRep} onChange={e => setFcRep(e.target.value)} placeholder="Ex: 60" /></div>
            </div>
            <button className="btn btn-primary" onClick={calcZones}>Calcular Zonas</button>
            {zones && (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:'0.5rem' }}>
                {zones.map(z => (
                  <div key={z.zone} style={{ background:'var(--bg-secondary)', borderRadius:8, padding:'12px 16px', borderLeft:`4px solid ${z.color}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{z.zone}</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{z.pct}</div>
                    </div>
                    <div style={{ fontWeight:700, fontSize:'1.1rem', color: z.color }}>{z.min} – {z.max} bpm</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'body' && (
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-header"><span className="card-title">Nova Avaliação Corporal</span></div>
          <form onSubmit={saveAssessment} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Aluno *</label>
                <select className="form-select" value={form.studentId} onChange={e => field('studentId',e.target.value)} required>
                  <option value="">Selecione</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Data</label><input type="date" className="form-input" value={form.date} onChange={e => field('date',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Peso (kg)</label><input type="number" step="0.1" className="form-input" value={form.weight} onChange={e => field('weight',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Altura (cm)</label><input type="number" className="form-input" value={form.height} onChange={e => field('height',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">% Gordura</label><input type="number" step="0.1" className="form-input" value={form.bodyFat} onChange={e => field('bodyFat',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Massa Muscular (kg)</label><input type="number" step="0.1" className="form-input" value={form.muscleMass} onChange={e => field('muscleMass',e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Cintura (cm)</label><input type="number" step="0.1" className="form-input" value={form.waist} onChange={e => field('waist',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Quadril (cm)</label><input type="number" step="0.1" className="form-input" value={form.hip} onChange={e => field('hip',e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" rows={2} value={form.notes} onChange={e => field('notes',e.target.value)} /></div>
            <button type="submit" className="btn btn-primary">Salvar Avaliação</button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="form-group" style={{ maxWidth:300, marginBottom:'1rem' }}>
            <select className="form-select" value={form.studentId} onChange={e => field('studentId',e.target.value)}>
              <option value="">Selecione um aluno</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {studentAssessments.length === 0 ? <div className="empty-state"><div className="empty-icon">📋</div><h3>Nenhuma avaliação encontrada</h3></div> : (
            <div className="table-wrapper"><table className="table">
              <thead><tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>Massa Musc.</th><th>Cintura</th></tr></thead>
              <tbody>{studentAssessments.map(a => (
                <tr key={a.id}>
                  <td>{a.date ? new Date(a.date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{a.weight ? `${a.weight} kg` : '—'}</td>
                  <td>{a.imc || '—'}</td>
                  <td>{a.bodyFat ? `${a.bodyFat}%` : '—'}</td>
                  <td>{a.muscleMass ? `${a.muscleMass} kg` : '—'}</td>
                  <td>{a.waist ? `${a.waist} cm` : '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}
