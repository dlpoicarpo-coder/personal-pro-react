import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const GROUPS = ['Peito','Costas','Ombros','Bíceps','Tríceps','Quadríceps','Posterior','Glúteos','Panturrilha','Abdômen','Core','Cardio','Corpo Inteiro','Mobilidade'];
const CATEGORIES = ['Musculação','Funcional','Cardio','Mobilidade'];
const EQUIPMENTS = ['Barra','Halteres','Cabo','Máquina','Peso corporal','Kettlebell','Elástico','Outro'];

export default function Exercises() {
  const notify = useToast();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', muscleGroup:'', category:'Musculação', equipment:'', description:'' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadExercises(); }, []);

  async function loadExercises() {
    setLoading(true);
    const data = await db.getAll('exercises');
    setExercises(data.sort((a,b) => a.name?.localeCompare(b.name)));
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm({ name:'', muscleGroup:'', category:'Musculação', equipment:'', description:'' }); setModalOpen(true); }
  function openEdit(ex) { setEditing(ex); setForm({ name: ex.name||'', muscleGroup: ex.muscleGroup||'', category: ex.category||'Musculação', equipment: ex.equipment||'', description: ex.description||'' }); setModalOpen(true); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { notify('Nome é obrigatório', 'error'); return; }
    setSaving(true);
    await db.put('exercises', { ...(editing||{}), ...form });
    notify(editing ? 'Exercício atualizado!' : 'Exercício adicionado!', 'success');
    setSaving(false); setModalOpen(false); loadExercises();
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir exercício?')) return;
    await db.delete('exercises', id);
    notify('Exercício excluído', 'warning');
    loadExercises();
  }

  const filtered = exercises.filter(ex => {
    const q = search.toLowerCase();
    return (!search || ex.name?.toLowerCase().includes(q) || ex.description?.toLowerCase().includes(q))
      && (!filterGroup || ex.muscleGroup === filterGroup)
      && (!filterCat || ex.category === filterCat);
  });

  const grouped = filtered.reduce((acc, ex) => {
    const g = ex.muscleGroup || 'Outros';
    if (!acc[g]) acc[g] = [];
    acc[g].push(ex);
    return acc;
  }, {});

  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Biblioteca de Exercícios</h1><p className="page-subtitle">{exercises.length} exercícios cadastrados</p></div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Exercício</button>
      </div>

      <div className="filters-bar">
        <input className="form-input search-input" placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1 }} />
        <select className="form-select" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} style={{ width:160 }}>
          <option value="">Todos os grupos</option>
          {GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>
        <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ width:140 }}>
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🏋️</div><h3>Nenhum exercício encontrado</h3></div>
      ) : (
        Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b)).map(([group, exs]) => (
          <div key={group} className="card mb-lg">
            <div className="card-header">
              <span className="card-title">{group}</span>
              <span className="badge badge-info">{exs.length}</span>
            </div>
            <div style={{ padding:'0 0.5rem 0.5rem' }}>
              {exs.map(ex => (
                <div key={ex.id} style={{ borderBottom:'1px solid var(--border)', padding:'0.75rem 1rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ flex:1, cursor:'pointer' }} onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)}>
                      <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{ex.name}</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:2 }}>
                        {ex.category} · {ex.equipment || 'Sem equipamento'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(ex)}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ex.id)}>✕</button>
                    </div>
                  </div>
                  {expandedId === ex.id && ex.description && (
                    <div style={{ marginTop:'0.5rem', padding:'0.75rem', background:'var(--bg-tertiary)', borderRadius:6, fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
                      {ex.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Exercício' : 'Novo Exercício'}>
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="form-group"><label className="form-label">Nome *</label><input className="form-input" value={form.name} onChange={e => field('name',e.target.value)} required autoFocus /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Grupo Muscular</label>
              <select className="form-select" value={form.muscleGroup} onChange={e => field('muscleGroup',e.target.value)}>
                <option value="">Selecione</option>
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Categoria</label>
              <select className="form-select" value={form.category} onChange={e => field('category',e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Equipamento</label>
            <select className="form-select" value={form.equipment} onChange={e => field('equipment',e.target.value)}>
              <option value="">Selecione</option>
              {EQUIPMENTS.map(eq => <option key={eq}>{eq}</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Descrição / Execução</label><textarea className="form-textarea" rows={3} value={form.description} onChange={e => field('description',e.target.value)} placeholder="Descreva a execução correta do exercício..." /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
