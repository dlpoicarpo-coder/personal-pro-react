import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const EMPTY_WORKOUT = { studentId: '', name: '', type: 'A', description: '', exercises: [] };

export default function Workouts() {
  const notify = useToast();
  const [workouts, setWorkouts] = useState([]);
  const [students, setStudents] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_WORKOUT);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [w, s, e] = await Promise.all([db.getAll('workouts'), db.getAll('students'), db.getAll('exercises')]);
    setWorkouts(w.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setStudents(s.filter(s => s.status === 'Ativo').sort((a, b) => a.name?.localeCompare(b.name)));
    setExercises(e.sort((a, b) => a.name?.localeCompare(b.name)));
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(EMPTY_WORKOUT); setSelectedExercises([]); setModalOpen(true); }
  function openEdit(w) {
    setEditing(w);
    setForm({ studentId: w.studentId || '', name: w.name || '', type: w.type || 'A', description: w.description || '', exercises: w.exercises || [] });
    setSelectedExercises(w.exercises || []);
    setModalOpen(true);
  }

  function addExercise() {
    setSelectedExercises(prev => [...prev, { exerciseId: '', sets: 3, reps: '12', weight: '', rest: '60s', notes: '' }]);
  }

  function updateExercise(idx, key, val) {
    setSelectedExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [key]: val } : ex));
  }

  function removeExercise(idx) {
    setSelectedExercises(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.studentId) { notify('Selecione um aluno', 'error'); return; }
    if (!form.name.trim()) { notify('Nome do treino é obrigatório', 'error'); return; }
    setSaving(true);
    const item = { ...(editing || {}), ...form, exercises: selectedExercises };
    await db.put('workouts', item);
    notify(editing ? 'Treino atualizado!' : 'Treino criado!', 'success');
    setSaving(false);
    setModalOpen(false);
    loadAll();
  }

  async function handleDelete(w) {
    if (!window.confirm(`Excluir treino "${w.name}"?`)) return;
    await db.delete('workouts', w.id);
    notify('Treino excluído', 'warning');
    loadAll();
  }

  const filtered = filterStudent ? workouts.filter(w => w.studentId === filterStudent) : workouts;
  const getStudentName = (id) => students.find(s => s.id === id)?.name || 'Aluno';
  const getExerciseName = (id) => exercises.find(e => e.id === id)?.name || '—';
  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Treinos</h1>
          <p className="page-subtitle">{workouts.length} treinos cadastrados</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Treino</button>
      </div>

      <div className="filters-bar">
        <select className="form-select" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
          <option value="">Todos os alunos</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💪</div>
            <h3>Nenhum treino cadastrado</h3>
            <p>Crie treinos personalizados para seus alunos</p>
          </div>
        ) : (
          <div className="workouts-grid">
            {filtered.map(w => (
              <div key={w.id} className="workout-card">
                <div className="workout-header">
                  <div>
                    <div className="workout-type-badge">Treino {w.type || 'A'}</div>
                    <div className="workout-name">{w.name}</div>
                    <div className="workout-student">{getStudentName(w.studentId)}</div>
                  </div>
                  <div className="workout-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => openEdit(w)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(w)}>Excluir</button>
                  </div>
                </div>
                {w.exercises?.length > 0 && (
                  <div className="workout-exercises">
                    {w.exercises.slice(0, 4).map((ex, i) => (
                      <div key={i} className="exercise-item">
                        <span className="exercise-name">{getExerciseName(ex.exerciseId)}</span>
                        <span className="exercise-meta">{ex.sets}×{ex.reps} {ex.weight ? `· ${ex.weight}kg` : ''}</span>
                      </div>
                    ))}
                    {w.exercises.length > 4 && <div className="exercise-more">+{w.exercises.length - 4} exercícios</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Treino' : 'Novo Treino'} size="xl">
        <form onSubmit={handleSave}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Aluno *</label>
              <select className="form-select" value={form.studentId} onChange={e => field('studentId', e.target.value)} required>
                <option value="">Selecione o aluno</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.type} onChange={e => field('type', e.target.value)}>
                {['A','B','C','D','E','F'].map(t => <option key={t}>Treino {t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nome do Treino *</label>
            <input className="form-input" value={form.name} onChange={e => field('name', e.target.value)} placeholder="Ex: Peito e Tríceps" required />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição / Observações</label>
            <textarea className="form-textarea" rows={2} value={form.description} onChange={e => field('description', e.target.value)} />
          </div>

          {/* Exercises */}
          <div className="section-title" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            Exercícios
            <button type="button" className="btn btn-sm btn-outline" style={{ marginLeft: '1rem' }} onClick={addExercise}>+ Adicionar</button>
          </div>

          {selectedExercises.map((ex, idx) => (
            <div key={idx} className="exercise-row">
              <select className="form-select" style={{ flex: 2 }} value={ex.exerciseId} onChange={e => updateExercise(idx, 'exerciseId', e.target.value)}>
                <option value="">Selecione o exercício</option>
                {exercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input className="form-input" style={{ width: 60 }} value={ex.sets} onChange={e => updateExercise(idx, 'sets', e.target.value)} placeholder="Séries" type="number" min={1} />
              <input className="form-input" style={{ width: 80 }} value={ex.reps} onChange={e => updateExercise(idx, 'reps', e.target.value)} placeholder="Reps" />
              <input className="form-input" style={{ width: 80 }} value={ex.weight} onChange={e => updateExercise(idx, 'weight', e.target.value)} placeholder="Carga" />
              <input className="form-input" style={{ width: 80 }} value={ex.rest} onChange={e => updateExercise(idx, 'rest', e.target.value)} placeholder="Descanso" />
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeExercise(idx)}>✕</button>
            </div>
          ))}

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Treino'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
