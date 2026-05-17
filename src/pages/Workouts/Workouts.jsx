import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';
import { generateWorkoutPDF, downloadPDF } from '../../lib/pdf-generator';

const ICON_EYE = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const ICON_PDF = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const ICON_EDIT = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const ICON_PLAY = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;

const EMPTY_WORKOUT = { studentId: '', name: '', date: '', cycle: '', notes: '', exercises: [] };
const EMPTY_EXERCISE = { name: '', sets: 3, reps: '12', load: '', rest: '60', method: '', loadType: 'weight' };

export default function Workouts() {
  const notify = useToast();
  const navigate = useNavigate();

  const [workouts, setWorkouts] = useState([]);
  const [students, setStudents] = useState([]);
  const [macros, setMacros] = useState([]);
  const [allEx, setAllEx] = useState([]);
  const [allMethods, setAllMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStudent, setFilterStudent] = useState('all');
  const [filterCycle, setFilterCycle] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_WORKOUT);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [saving, setSaving] = useState(false);

  // View modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingWorkout, setViewingWorkout] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [w, s, m, e, meth] = await Promise.all([
      db.getAll('workouts'), db.getAll('students'), db.getAll('macrocycles'),
      db.getAll('exercises'), db.getAll('methods')
    ]);
    setWorkouts(w.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setStudents(s.filter(st => st.status === 'Ativo').sort((a, b) => a.name?.localeCompare(b.name)));
    setMacros(m);
    setAllEx(e);
    setAllMethods(meth || []);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_WORKOUT, date: new Date().toISOString().slice(0, 10) });
    setSelectedExercises([{ ...EMPTY_EXERCISE }]);
    setModalOpen(true);
  }

  function openEdit(w) {
    setEditing(w);
    setForm({ studentId: w.studentId || '', name: w.name || '', date: w.date || new Date().toISOString().slice(0, 10), cycle: w.cycle || '', notes: w.notes || '' });
    setSelectedExercises(w.exercises?.length ? JSON.parse(JSON.stringify(w.exercises)) : [{ ...EMPTY_EXERCISE }]);
    setModalOpen(true);
  }

  function openView(w) {
    setViewingWorkout(w);
    setViewOpen(true);
  }

  async function handlePdf(w) {
    const st = students.find(s => s.id === w.studentId) || { name: 'Aluno', code: '---' };
    const ts = await db.get('settings', 'trainer') || {};
    const workoutToPrint = { ...w, _trainerName: ts.trainerName || '', _trainerCref: ts.cref || '' };
    try {
      const doc = await generateWorkoutPDF(st, workoutToPrint, w.exercises);
      downloadPDF(doc, `Treino_${w.name.replace(/\s/g, '_')}_${st.code}.pdf`);
      notify('PDF gerado!', 'success');
    } catch (e) {
      notify('Erro ao gerar PDF: ' + e.message, 'error');
    }
  }

  async function handleDelete(w) {
    if (!window.confirm('Excluir este treino?')) return;
    await db.delete('workouts', w.id);
    notify('Treino excluído', 'warning');
    loadAll();
  }

  function handleStart(w) {
    sessionStorage.setItem('pp_autostart', JSON.stringify({ studentId: w.studentId, workoutId: w.id }));
    navigate('/tracker');
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.studentId || !form.name.trim()) { notify('Aluno e nome são obrigatórios', 'error'); return; }
    setSaving(true);
    const item = { ...(editing || {}), ...form, exercises: selectedExercises };
    if (editing) await db.put('workouts', item);
    else await db.add('workouts', item);
    notify(editing ? 'Treino atualizado!' : 'Treino criado!', 'success');
    setSaving(false);
    setModalOpen(false);
    loadAll();
  }

  const addExercise = () => setSelectedExercises(prev => [...prev, { ...EMPTY_EXERCISE }]);
  const removeExercise = (idx) => setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
  const updateExercise = (idx, key, val) => {
    setSelectedExercises(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };

      // Auto-fill logic when method changes
      if (key === 'method') {
        const methodObj = allMethods.find(m => m.name === val);
        if (methodObj) {
          if (methodObj.sets && !next[idx].sets) next[idx].sets = methodObj.sets.replace(/[^0-9]/g, '') || 3;
          if (methodObj.repsHint) next[idx].reps = methodObj.repsHint;
          if (methodObj.restHint) {
            const match = methodObj.restHint.match(/(\d+)/);
            if (match) next[idx].rest = match[1];
          }
        }
      }

      // Auto-fill logic when name changes
      if (key === 'name') {
        const exObj = allEx.find(e => e.name.toLowerCase() === val.toLowerCase());
        if (exObj) {
          if (exObj.loadType) next[idx].loadType = exObj.loadType;
          if (exObj.defaultReps && (!next[idx].reps || next[idx].reps === '12')) next[idx].reps = exObj.defaultReps;
        }
      }

      return next;
    });
  };

  const getStudent = id => students.find(s => s.id === id);
  const getMacro = id => macros.find(m => m.id === id);

  // Filter computation
  const activeMacrosIds = new Set(macros.filter(m => m.status === 'active').map(m => m.id));
  const filtered = workouts.filter(w => {
    const matchStudent = filterStudent === 'all' || w.studentId === filterStudent;
    const matchCycle = filterCycle === '' || (filterCycle === 'active' ? activeMacrosIds.has(w.macrocycleId) : w.macrocycleId === filterCycle);
    const matchSearch = !search || (w.name || '').toLowerCase().includes(search.toLowerCase());
    return matchStudent && matchCycle && matchSearch;
  });

  const fromMacroCount = workouts.filter(w => w.macrocycleId).length;
  const manualCount = workouts.filter(w => w.studentId).length - fromMacroCount;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Prescrição de Treinos</h1>
          <p className="page-subtitle">{workouts.length} treino(s) registrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Treino</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">TOTAL</div>
          <div className="stat-value text-gradient">{workouts.length}</div>
          <div className="stat-change">treinos cadastrados</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">DE MACROCICLOS</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{fromMacroCount}</div>
          <div className="stat-change">gerados automaticamente</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">MANUAIS</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{manualCount}</div>
          <div className="stat-change">criados pelo personal</div>
        </div>
      </div>

      <div className="flex gap-sm mb-md" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input type="text" className="form-input" placeholder="Buscar treino..." style={{ paddingLeft: 32 }} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${filterStudent === 'all' ? 'active' : ''}`} onClick={() => setFilterStudent('all')}>Todos</button>
          {students.map(s => (
            <button key={s.id} className={`tab ${filterStudent === s.id ? 'active' : ''}`} onClick={() => setFilterStudent(s.id)}>{s.name.split(' ')[0]}</button>
          ))}
        </div>
        <select className="form-select" style={{ minWidth: 200 }} value={filterCycle} onChange={e => setFilterCycle(e.target.value)}>
          <option value="">Todos os ciclos</option>
          <option value="active">Apenas ciclo ativo</option>
          {macros.map(m => {
            const st = getStudent(m.studentId);
            return <option key={m.id} value={m.id}>{st ? st.name.split(' ')[0] : '?'} — {m.name}</option>;
          })}
        </select>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">—</div>
            <h3>Nenhum treino criado</h3>
            <p>Crie o primeiro treino ou gere via Periodização</p>
            <button className="btn btn-primary mt-sm" onClick={openNew}>+ Novo Treino</button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Aluno</th><th>Treino</th><th>Data</th><th>Fase</th><th>Exercícios</th><th>Semana</th><th></th></tr></thead>
              <tbody>
                {filtered.map(w => {
                  const st = getStudent(w.studentId);
                  const macro = getMacro(w.macrocycleId);
                  const intensityColor = !w.intensityPct ? '' : w.intensityPct >= 85 ? 'var(--danger)' : w.intensityPct >= 75 ? 'var(--warning)' : w.intensityPct >= 65 ? 'var(--accent)' : 'var(--success)';
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="flex items-center gap-sm">
                          <div className="avatar avatar-sm" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}</div>
                          <span style={{ fontSize: '0.85rem' }}>{st?.name || '?'}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{w.name || 'Treino'}</div>
                        {w.cycle && <div className="text-xs text-muted">{w.cycle}</div>}
                        {macro && <div className="text-xs" style={{ color: 'var(--primary)' }}>{macro.name}</div>}
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{Calc.formatDate(w.date)}</td>
                      <td>
                        {w.isDeload ? <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>Deload</span> : w.phase ? <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{w.phase}</span> : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td><span className="badge badge-info">{(w.exercises || []).length}</span></td>
                      <td>
                        {w.intensityPct ? <span style={{ fontSize: '0.82rem', fontWeight: 700, color: intensityColor }}>{w.intensityPct}%</span> : <span className="text-muted text-xs">—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button className="btn btn-ghost btn-sm" title="Iniciar treino" onClick={() => handleStart(w)} style={{ padding: '4px 8px', color: 'var(--primary)' }}>{ICON_PLAY}</button>
                          <button className="btn btn-ghost btn-sm" title="Ver" onClick={() => openView(w)} style={{ padding: '4px 6px', color: 'var(--accent)' }}>{ICON_EYE}</button>
                          <button className="btn btn-ghost btn-sm" title="PDF" onClick={() => handlePdf(w)} style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{ICON_PDF}</button>
                          <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => openEdit(w)} style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{ICON_EDIT}</button>
                          <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => handleDelete(w)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Edit/Add Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Treino' : '+ Novo Treino'} size="xl">
        <form id="workoutForm" onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Aluno *</label>
              <select className="form-select" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} required>
                <option value="">Selecione</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nome do Treino *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Treino A - Superior" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Ciclo</label>
              <input className="form-input" value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))} placeholder="Ex: Ciclo 1 - Adaptação" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" rows="2" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Orientações gerais..." />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <div className="flex items-center justify-between mb-md">
              <h4 style={{ margin: 0 }}>Exercícios</h4>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addExercise}>+ Exercício</button>
            </div>
            <div>
              {selectedExercises.map((ex, idx) => {
                const isTime = ex.loadType === 'time';
                const isBW = ex.loadType === 'bodyweight';
                const methodObj = allMethods.find(m => m.name === ex.method);
                return (
                  <div key={idx} className="exercise-row" style={{ display: 'grid', gridTemplateColumns: '2fr 56px 68px 72px 60px 100px 90px 28px', gap: 5, alignItems: 'end', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-primary)', marginBottom: 6, border: '1px solid var(--border)' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>Exercício</label>
                      <input className="form-input" list="exerciseList" value={ex.name} onChange={e => updateExercise(idx, 'name', e.target.value)} placeholder="Nome" style={{ fontSize: '0.82rem' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>Séries</label>
                      <input className="form-input" type="number" min="1" value={ex.sets} onChange={e => updateExercise(idx, 'sets', parseInt(e.target.value) || 0)} style={{ textAlign: 'center', fontSize: '0.82rem', padding: '4px 6px' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>Reps/Tempo</label>
                      <input className="form-input" value={ex.reps} onChange={e => updateExercise(idx, 'reps', e.target.value)} placeholder="12" style={{ textAlign: 'center', fontSize: '0.82rem', padding: '4px 6px' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>{isTime ? 'Intensidade' : isBW ? 'Extra (kg)' : 'Carga (kg)'}</label>
                      <input className="form-input" value={ex.load} onChange={e => updateExercise(idx, 'load', e.target.value)} placeholder={isTime ? 'km/h/W' : isBW ? '+kg' : 'kg'} style={{ textAlign: 'center', fontSize: '0.82rem', padding: '4px 6px' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>Desc.(s)</label>
                      <input className="form-input" value={ex.rest} onChange={e => updateExercise(idx, 'rest', e.target.value)} style={{ textAlign: 'center', fontSize: '0.82rem', padding: '4px 6px' }} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>Tipo carga</label>
                      <select className="form-select" value={ex.loadType} onChange={e => updateExercise(idx, 'loadType', e.target.value)} style={{ fontSize: '0.78rem', padding: '4px 6px' }}>
                        <option value="weight">Peso (kg)</option>
                        <option value="bodyweight">P.Corporal</option>
                        <option value="time">Tempo/Int.</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: 2, opacity: 0.65 }}>Método</label>
                      <select className="form-select" value={ex.method} onChange={e => updateExercise(idx, 'method', e.target.value)} style={{ fontSize: '0.78rem', padding: '4px 6px' }}>
                        <option value="">— Nenhum —</option>
                        {allMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExercise(idx)} style={{ color: 'var(--danger)', padding: 4, alignSelf: 'flex-end', marginBottom: 2 }} title="Remover">{ICON_DEL}</button>
                    {methodObj && methodObj.description && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 3, gridColumn: '1/-1', padding: '4px 6px', background: 'rgba(6,182,212,0.07)', borderRadius: 4 }}>
                        💡 {methodObj.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <datalist id="exerciseList">{allEx.map(e => <option key={e.id} value={e.name} />)}</datalist>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Treino'}</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      {viewingWorkout && (
        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title={viewingWorkout.name} size="lg">
          <div className="flex items-center gap-md mb-md">
            <div className="avatar">{getStudent(viewingWorkout.studentId)?.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{getStudent(viewingWorkout.studentId)?.name || '?'}</div>
              <div className="text-muted text-xs">
                {Calc.formatDate(viewingWorkout.date)}
                {viewingWorkout.cycle ? ` · ${viewingWorkout.cycle}` : ''}
                {viewingWorkout.macrocycleId ? ` · ${getMacro(viewingWorkout.macrocycleId)?.name}` : ''}
                {viewingWorkout.phase ? ` · ${viewingWorkout.phase}` : ''}
              </div>
            </div>
            {viewingWorkout.intensityPct && <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{viewingWorkout.intensityPct}% 1RM</span>}
          </div>
          {viewingWorkout.notes && <p className="text-sm text-muted mb-md">{viewingWorkout.notes}</p>}
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>#</th><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Desc.</th><th>Método</th><th>Tipo</th></tr></thead>
              <tbody>
                {(viewingWorkout.exercises || []).map((e, i) => {
                  const isTime = e.loadType === 'time';
                  const isBW = e.loadType === 'bodyweight';
                  const loadDisplay = isTime ? (e.load ? e.load + 's' : '-') : isBW ? (e.load ? '+' + e.load + 'kg' : 'PC') : (e.load ? e.load + 'kg' : '-');
                  const typeLabel = isTime ? 'Tempo' : isBW ? 'P.Corporal' : 'Peso';
                  const typeColor = isTime ? 'var(--accent)' : isBW ? 'var(--success)' : 'var(--text-muted)';
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td><strong>{e.name}</strong></td>
                      <td style={{ textAlign: 'center' }}>{e.sets}</td>
                      <td style={{ textAlign: 'center' }}>{e.reps}</td>
                      <td style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>{loadDisplay}</td>
                      <td style={{ textAlign: 'center' }}>{e.rest ? e.rest + 's' : '-'}</td>
                      <td>{e.method || '-'}</td>
                      <td><span style={{ fontSize: '0.72rem', color: typeColor }}>{typeLabel}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
}
