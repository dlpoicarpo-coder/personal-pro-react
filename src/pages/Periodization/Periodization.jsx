import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const PHASES = [
  { id: 'hypertrophy', label: 'Hipertrofia', color: '#10b981', intensity: 70 },
  { id: 'strength', label: 'Força', color: '#8b5cf6', intensity: 85 },
  { id: 'endurance', label: 'Resistência', color: '#06b6d4', intensity: 65 },
  { id: 'power', label: 'Potência', color: '#f59e0b', intensity: 90 },
  { id: 'deload', label: 'Deload', color: '#64748b', intensity: 50 },
];

function intensityColor(pct) {
  if (pct <= 55) return '#64748b';
  if (pct <= 65) return '#10b981';
  if (pct <= 75) return '#06b6d4';
  if (pct <= 82) return '#f59e0b';
  if (pct <= 89) return '#f97316';
  return '#ef4444';
}

export default function Periodization() {
  const notify = useToast();
  const [macros, setMacros] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterStudent, setFilterStudent] = useState('');
  const [form, setForm] = useState({ studentId: '', name: '', startDate: '', weeks: 12, type: 'linear', weekIntensities: [] });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [m, s] = await Promise.all([db.getAll('macrocycles'), db.getAll('students')]);
    setMacros(m.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setStudents(s.sort((a,b) => a.name?.localeCompare(b.name)));
    setLoading(false);
  }

  function buildWeekIntensities(weeks, type) {
    return Array.from({ length: Number(weeks) || 12 }, (_, i) => {
      const w = i + 1;
      const isDeload = w % 4 === 0;
      let intensity = 60;
      if (!isDeload) {
        if (type === 'linear') intensity = Math.min(60 + (w * 2.5), 90);
        else if (type === 'undulating') intensity = w % 2 === 0 ? 75 : 65;
        else if (type === 'block') intensity = w <= 4 ? 65 : w <= 8 ? 78 : 88;
      }
      return { week: w, phase: isDeload ? 'deload' : 'hypertrophy', intensity: isDeload ? 50 : Math.round(intensity) };
    });
  }

  function openNew() {
    const wi = buildWeekIntensities(12, 'linear');
    setForm({ studentId: '', name: '', startDate: new Date().toISOString().slice(0,10), weeks: 12, type: 'linear', weekIntensities: wi });
    setModalOpen(true);
  }

  function handleTypeChange(type) {
    const wi = buildWeekIntensities(form.weeks, type);
    setForm(f => ({ ...f, type, weekIntensities: wi }));
  }
  function handleWeeksChange(w) {
    const wi = buildWeekIntensities(w, form.type);
    setForm(f => ({ ...f, weeks: w, weekIntensities: wi }));
  }
  function updateWeekIntensity(idx, val) {
    setForm(f => ({ ...f, weekIntensities: f.weekIntensities.map((w,i) => i === idx ? { ...w, intensity: Number(val) } : w) }));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.studentId || !form.name) { notify('Preencha aluno e nome', 'error'); return; }
    await db.put('macrocycles', { ...form, weeks: Number(form.weeks) });
    notify('Macrociclo criado!', 'success');
    setModalOpen(false);
    loadAll();
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir macrociclo?')) return;
    await db.delete('macrocycles', id);
    notify('Macrociclo excluído', 'warning');
    loadAll();
  }

  const getStudentName = id => students.find(s => s.id === id)?.name || 'Aluno';
  const filtered = filterStudent ? macros.filter(m => m.studentId === filterStudent) : macros;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Periodização</h1><p className="page-subtitle">Macrociclos e planejamento de treino</p></div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <select className="form-select" style={{ width:180 }} value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">Todos os alunos</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Macrociclo</button>
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📈</div><h3>Nenhum macrociclo criado</h3></div>
      ) : (
        filtered.map(m => (
          <div key={m.id} className="card mb-lg">
            <div className="card-header">
              <div>
                <span className="card-title">{m.name}</span>
                <span className="text-muted" style={{ marginLeft:'1rem', fontSize:'0.85rem' }}>{getStudentName(m.studentId)} · {m.weeks} semanas · {m.type}</span>
              </div>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}>Excluir</button>
            </div>
            <div className="week-timeline" style={{ display:'flex', gap:4, padding:'1rem', flexWrap:'wrap' }}>
              {(m.weekIntensities || []).map((w, i) => (
                <div key={i} className="week-block" style={{ background: intensityColor(w.intensity), borderRadius:6, padding:'4px 8px', fontSize:'0.72rem', color:'#fff', textAlign:'center', minWidth:42 }}>
                  <div style={{ fontWeight:700 }}>S{w.week}</div>
                  <div>{w.intensity}%</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Macrociclo" size="xl">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Aluno *</label>
              <select className="form-select" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required>
                <option value="">Selecione</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Macrociclo *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Ciclo Hipertrofia 2025" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo de Periodização</label>
              <select className="form-select" value={form.type} onChange={e => handleTypeChange(e.target.value)}>
                <option value="linear">Linear</option>
                <option value="undulating">Ondulatória (DUP)</option>
                <option value="block">Por Blocos</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nº de Semanas</label>
              <select className="form-select" value={form.weeks} onChange={e => handleWeeksChange(e.target.value)}>
                {[4,8,12,16,20,24].map(n => <option key={n} value={n}>{n} semanas</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data de Início</label>
              <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginTop:'1rem' }}>
            <div style={{ fontWeight:600, marginBottom:'0.75rem', color:'var(--text-secondary)' }}>Intensidade por Semana (%)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {form.weekIntensities.map((w, i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:2 }}>S{w.week}</div>
                  <input type="number" min={40} max={100} style={{ width:52, padding:'4px', background: intensityColor(w.intensity), border:'none', borderRadius:6, color:'#fff', textAlign:'center', fontWeight:700, fontSize:'0.8rem' }}
                    value={w.intensity} onChange={e => updateWeekIntensity(i, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop:'1.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Salvar Macrociclo</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
