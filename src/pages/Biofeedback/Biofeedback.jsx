import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';

const INDICATORS = ['Energia','Sono','Dor Muscular','Estresse','Humor','Apetite'];
const PAIN_REGIONS = ['Pescoço','Ombro D','Ombro E','Cotovelo D','Cotovelo E','Punho D','Punho E','Lombar','Joelho D','Joelho E','Tornozelo D','Tornozelo E'];

function colorForVal(v) {
  if (v == null) return 'var(--text-muted)';
  if (v <= 3) return '#ef4444';
  if (v <= 6) return '#f59e0b';
  return '#10b981';
}

export default function Biofeedback() {
  const notify = useToast();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({ studentId:'', date: new Date().toISOString().slice(0,10), energia:5, sono:5, dorMuscular:5, estresse:5, humor:5, apetite:5, painRegions:[], notes:'' });
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('form');

  useEffect(() => {
    db.getAll('students').then(s => setStudents(s.sort((a,b) => a.name?.localeCompare(b.name))));
  }, []);

  useEffect(() => {
    if (!selectedStudent) { setRecords([]); return; }
    setLoading(true);
    db.getAll('biofeedback').then(all => {
      setRecords(all.filter(r => r.studentId === selectedStudent).sort((a,b) => new Date(b.date)-new Date(a.date)));
      setLoading(false);
    });
  }, [selectedStudent]);

  function togglePain(region) {
    setForm(f => ({ ...f, painRegions: f.painRegions.includes(region) ? f.painRegions.filter(r => r !== region) : [...f.painRegions, region] }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.studentId) { notify('Selecione um aluno', 'error'); return; }
    await db.put('biofeedback', { ...form });
    notify('Biofeedback registrado!', 'success');
    setSelectedStudent(form.studentId);
    setView('history');
  }

  const latest = records[0];
  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const SliderRow = ({ label, k }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'0.75rem' }}>
      <span style={{ width:120, color:'var(--text-secondary)', fontSize:'0.9rem' }}>{label}</span>
      <input type="range" min={1} max={10} value={form[k]} onChange={e => field(k, Number(e.target.value))} style={{ flex:1 }} />
      <span style={{ width:32, fontWeight:700, color: colorForVal(form[k]), textAlign:'center' }}>{form[k]}</span>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Biofeedback</h1><p className="page-subtitle">Monitoramento de bem-estar e recuperação</p></div></div>

      <div className="tab-bar">
        <button className={`tab-btn${view==='form'?' active':''}`} onClick={() => setView('form')}>Registrar</button>
        <button className={`tab-btn${view==='history'?' active':''}`} onClick={() => setView('history')}>Histórico</button>
      </div>

      {view === 'form' && (
        <div className="card" style={{ maxWidth:580 }}>
          <div className="card-header"><span className="card-title">Novo Registro</span></div>
          <form onSubmit={handleSave} style={{ padding:'1.5rem' }}>
            <div className="form-row" style={{ marginBottom:'1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Aluno *</label>
                <select className="form-select" value={form.studentId} onChange={e => field('studentId',e.target.value)} required>
                  <option value="">Selecione</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input type="date" className="form-input" value={form.date} onChange={e => field('date',e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom:'1.5rem' }}>
              <div style={{ fontWeight:600, marginBottom:'1rem', color:'var(--text-secondary)' }}>Indicadores (1–10)</div>
              <SliderRow label="⚡ Energia" k="energia" />
              <SliderRow label="😴 Sono" k="sono" />
              <SliderRow label="💪 Dor Muscular" k="dorMuscular" />
              <SliderRow label="😤 Estresse" k="estresse" />
              <SliderRow label="😊 Humor" k="humor" />
              <SliderRow label="🍽️ Apetite" k="apetite" />
            </div>

            <div style={{ marginBottom:'1.25rem' }}>
              <div style={{ fontWeight:600, marginBottom:'0.75rem', color:'var(--text-secondary)' }}>Regiões de Dor (selecione)</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {PAIN_REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => togglePain(r)}
                    style={{ padding:'4px 12px', borderRadius:20, border:'1px solid', borderColor: form.painRegions.includes(r) ? '#ef4444' : 'var(--border)', background: form.painRegions.includes(r) ? 'rgba(239,68,68,0.15)' : 'transparent', color: form.painRegions.includes(r) ? '#ef4444' : 'var(--text-muted)', cursor:'pointer', fontSize:'0.82rem' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom:'1.25rem' }}>
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => field('notes',e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-full">Salvar Biofeedback</button>
          </form>
        </div>
      )}

      {view === 'history' && (
        <div>
          <div className="form-group" style={{ maxWidth:280, marginBottom:'1rem' }}>
            <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Selecione um aluno</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {loading ? <div className="page-loading"><div className="spinner" /></div> :
            records.length === 0 ? <div className="empty-state"><div className="empty-icon">🔬</div><h3>Nenhum registro encontrado</h3></div> : (
              <div className="table-wrapper"><table className="table">
                <thead><tr><th>Data</th><th>Energia</th><th>Sono</th><th>Dor</th><th>Estresse</th><th>Humor</th><th>Apetite</th><th>Regiões de Dor</th></tr></thead>
                <tbody>{records.map(r => (
                  <tr key={r.id}>
                    <td>{r.date ? new Date(r.date).toLocaleDateString('pt-BR') : '—'}</td>
                    {['energia','sono','dorMuscular','estresse','humor','apetite'].map(k => (
                      <td key={k} style={{ color: colorForVal(r[k]), fontWeight:700 }}>{r[k] ?? '—'}</td>
                    ))}
                    <td style={{ fontSize:'0.8rem' }}>{r.painRegions?.join(', ') || '—'}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )
          }
        </div>
      )}
    </div>
  );
}
