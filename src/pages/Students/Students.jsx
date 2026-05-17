import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const GOALS = ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Força', 'Saúde', 'Reabilitação', 'Performance'];
const STATUSES = ['Ativo', 'Inativo', 'Pausado'];
const ZONES = ['', 'Zona 1 - Recuperação (<65% FC)', 'Zona 2 - Aeróbico (65-75%)', 'Zona 3 - Limiar (75-80%)', 'Zona 4 - Alta Intensidade (80-90%)', 'Zona 5 - VO2 Max (90-100%)'];

function calcAge(birth) {
  if (!birth) return null;
  const diff = Date.now() - new Date(birth).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

const EMPTY_STUDENT = { name: '', code: '', birthdate: '', gender: '', phone: '', email: '', goal: '', status: 'Ativo', trainingZone: '', notes: '' };

export default function Students() {
  const notify = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = new student
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    const data = await db.getAll('students');
    setStudents(data.sort((a, b) => a.name?.localeCompare(b.name)));
    setLoading(false);
  }

  function openNew() { setEditing(null); setForm(EMPTY_STUDENT); setModalOpen(true); }
  function openEdit(s) { setEditing(s); setForm({ ...EMPTY_STUDENT, ...s }); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { notify('Nome é obrigatório', 'error'); return; }
    setSaving(true);
    const item = editing ? { ...editing, ...form } : { ...form };
    await db.put('students', item);
    notify(editing ? 'Aluno atualizado!' : 'Aluno cadastrado!', 'success');
    setSaving(false);
    closeModal();
    loadStudents();
  }

  async function handleDelete(student) {
    if (!window.confirm(`Excluir "${student.name}"? Esta ação não pode ser desfeita.`)) return;
    await db.delete('students', student.id);
    notify('Aluno excluído', 'warning');
    loadStudents();
  }

  const filtered = students.filter(s => {
    const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alunos</h1>
          <p className="page-subtitle">{students.length} cadastrados · {students.filter(s=>s.status==='Ativo').length} ativos</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Aluno</button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          className="form-input search-input"
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Student cards */}
      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>{search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}</h3>
            <p>{!search && 'Clique em "+ Novo Aluno" para começar'}</p>
          </div>
        ) : (
          <div className="student-grid">
            {filtered.map(s => (
              <div key={s.id} className="student-card">
                <div className="student-avatar">{s.name?.charAt(0).toUpperCase()}</div>
                <div className="student-info">
                  <div className="student-name">{s.name}</div>
                  {s.code && <div className="student-code">#{s.code}</div>}
                  {s.birthdate && <div className="student-meta">{calcAge(s.birthdate)} anos</div>}
                  <div className="student-meta">{s.goal || 'Sem objetivo definido'}</div>
                </div>
                <div className="student-actions">
                  <span className={`badge badge-${s.status === 'Ativo' ? 'success' : s.status === 'Inativo' ? 'danger' : 'warning'}`}>{s.status}</span>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(s)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Aluno' : 'Novo Aluno'} size="lg">
        <form onSubmit={handleSave} className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input className="form-input" value={form.name} onChange={e => field('name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="form-input" value={form.code} onChange={e => field('code', e.target.value)} placeholder="Ex: A001" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data de Nascimento</label>
              <input type="date" className="form-input" value={form.birthdate} onChange={e => field('birthdate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Gênero</label>
              <select className="form-select" value={form.gender} onChange={e => field('gender', e.target.value)}>
                <option value="">Selecione</option>
                <option>Masculino</option>
                <option>Feminino</option>
                <option>Outro</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone / WhatsApp</label>
              <input className="form-input" value={form.phone} onChange={e => field('phone', e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" value={form.email} onChange={e => field('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Objetivo</label>
              <select className="form-select" value={form.goal} onChange={e => field('goal', e.target.value)}>
                <option value="">Selecione</option>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => field('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Zona-Alvo de Treino</label>
            <select className="form-select" value={form.trainingZone} onChange={e => field('trainingZone', e.target.value)}>
              {ZONES.map(z => <option key={z} value={z}>{z || 'Não definido'}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={e => field('notes', e.target.value)} placeholder="Observações, restrições, histórico..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
