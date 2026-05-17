import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import Modal from '../../components/Modal/Modal';
const GOALS = ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Força Máxima', 'Saúde', 'Reabilitação', 'Performance', 'Qualidade de Vida'];
const STATUSES = ['Ativo', 'Inativo', 'Em avaliação', 'Suspenso'];
const FREQS = ['2x por semana', '3x por semana', '4x por semana', '5x por semana', '6x por semana'];
const TIMES = ['Manhã (5-9h)', 'Manhã (9-12h)', 'Tarde (12-17h)', 'Noite (17-22h)'];

const ICON_EDIT = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const ICON_DELETE = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const ICON_WA = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
const ICON_EYE = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

function calcAge(birth) {
  if (!birth) return null;
  const diff = Date.now() - new Date(birth).getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

const EMPTY_STUDENT = { name: '', code: '', birthDate: '', gender: '', phone: '', email: '', goal: '', status: 'Ativo', weeklyFrequency: '', preferredTime: '', weight: '', height: '', monthlyFee: '', notes: '' };

export default function Students() {
  const notify = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = new student
  const [form, setForm] = useState(EMPTY_STUDENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    const [data, sessions] = await Promise.all([db.getAll('students'), db.getAll('sessions')]);
    const enriched = data.map(s => {
      const completed = sessions.filter(x => x.studentId === s.id && x.status === 'completed');
      const last = completed.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      const daysSince = last ? Math.floor((Date.now() - new Date(last.date)) / 86400000) : null;
      return { ...s, _lastSession: last, _daysSince: daysSince, _totalSessions: completed.length };
    });
    setStudents(enriched.sort((a, b) => a.name?.localeCompare(b.name)));
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
    if (!item.code) item.code = item.name.substring(0,3).toUpperCase() + '-' + String(Math.floor(Math.random()*900)+100);
    if (item.birthDate) item.age = calcAge(item.birthDate);
    
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
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Alunos</h1>
          <p className="subtitle">{students.length} cadastrado(s) · {students.filter(s=>s.status==='Ativo').length} ativo(s)</p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" className="form-input" placeholder="Buscar aluno..." style={{ paddingLeft: 34, minWidth: 200 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Novo Aluno</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>Todos ({students.length})</button>
        <button className={`tab ${filterStatus === 'Ativo' ? 'active' : ''}`} onClick={() => setFilterStatus('Ativo')}>Ativos ({students.filter(s => s.status === 'Ativo').length})</button>
        <button className={`tab ${filterStatus === 'Inativo' ? 'active' : ''}`} onClick={() => setFilterStatus('Inativo')}>Inativos ({students.filter(s => s.status === 'Inativo').length})</button>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">—</div>
            <h3>Nenhum aluno cadastrado</h3>
            <p>Clique em "+ Novo Aluno" para adicionar o primeiro</p>
            <button className="btn btn-primary mt-sm" onClick={openNew}>+ Novo Aluno</button>
          </div>
        ) : (
          <div className="students-grid stagger-children">
            {filtered.map(s => {
              const initials = s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
              const age = calcAge(s.birthDate);
              const dayColor = s._daysSince === null ? 'var(--text-muted)' : s._daysSince > 14 ? 'var(--danger)' : s._daysSince > 7 ? 'var(--warning)' : 'var(--success)';
              const phone = s.phone?.replace(/\D/g, '') || '';
              const waUrl = phone ? `https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}` : null;

              return (
                <div key={s.id} className="card student-card">
                  <div className="flex items-center gap-md mb-sm">
                    <div className="avatar avatar-lg" style={{ fontSize: '1.1rem' }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      <div className="text-muted text-xs">{s.code || ''}{age ? ` · ${age} anos` : ''}{s.gender ? ` · ${s.gender === 'M' ? 'Masc.' : 'Fem.'}` : ''}</div>
                    </div>
                    <span className={`badge ${s.status === 'Ativo' ? 'badge-success' : 'badge-warning'}`}>{s.status}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    {s.goal && (
                      <div style={{ padding: '6px 8px', background: 'var(--bg-page)', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Objetivo</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 1 }}>{s.goal}</div>
                      </div>
                    )}
                    {s.weeklyFrequency && (
                      <div style={{ padding: '6px 8px', background: 'var(--bg-page)', borderRadius: 6 }}>
                        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Frequência</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 1 }}>{s.weeklyFrequency}</div>
                      </div>
                    )}
                    <div style={{ padding: '6px 8px', background: 'var(--bg-page)', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Último treino</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 1, color: dayColor }}>
                        {s._daysSince === null ? '—' : s._daysSince === 0 ? 'Hoje' : `${s._daysSince}d atrás`}
                      </div>
                    </div>
                    <div style={{ padding: '6px 8px', background: 'var(--bg-page)', borderRadius: 6 }}>
                      <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Total sessões</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: 1 }}>{s._totalSessions}</div>
                    </div>
                  </div>

                  <div className="flex gap-xs" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                    <button className="btn btn-ghost btn-sm" title="Ver perfil" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {ICON_EYE} <span style={{ fontSize: '0.78rem' }}>Ver</span>
                    </button>
                    <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => openEdit(s)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      {ICON_EDIT} <span style={{ fontSize: '0.78rem' }}>Editar</span>
                    </button>
                    {waUrl && (
                      <a href={waUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" title="WhatsApp" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: '#25d366', textDecoration: 'none' }}>
                        {ICON_WA} <span style={{ fontSize: '0.78rem' }}>WA</span>
                      </a>
                    )}
                    <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => handleDelete(s)} style={{ color: 'var(--danger)', padding: '6px 8px' }}>
                      {ICON_DELETE}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Aluno' : '+ Novo Aluno'} size="lg">
        <form onSubmit={handleSave} id="studentForm">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input className="form-input" value={form.name} onChange={e => field('name', e.target.value)} required placeholder="Ex: João da Silva" />
            </div>
            <div className="form-group">
              <label className="form-label">Código</label>
              <input className="form-input" value={form.code} onChange={e => field('code', e.target.value)} placeholder="Gerado automaticamente" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data de Nascimento</label>
              <input type="date" className="form-input" value={form.birthDate} onChange={e => field('birthDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Gênero</label>
              <select className="form-select" value={form.gender} onChange={e => field('gender', e.target.value)}>
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Telefone / WhatsApp</label>
              <input className="form-input" value={form.phone} onChange={e => field('phone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={form.email} onChange={e => field('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Objetivo Principal</label>
              <select className="form-select" value={form.goal} onChange={e => field('goal', e.target.value)}>
                <option value="">Selecione</option>
                {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => field('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Frequência Semanal</label>
              <select className="form-select" value={form.weeklyFrequency} onChange={e => field('weeklyFrequency', e.target.value)}>
                <option value="">Selecione</option>
                {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Horário Preferido</label>
              <select className="form-select" value={form.preferredTime} onChange={e => field('preferredTime', e.target.value)}>
                <option value="">Selecione</option>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Peso atual (kg)</label>
              <input type="number" step="0.1" className="form-input" value={form.weight} onChange={e => field('weight', e.target.value)} placeholder="Ex: 75.5" />
            </div>
            <div className="form-group">
              <label className="form-label">Altura (cm)</label>
              <input type="number" className="form-input" value={form.height} onChange={e => field('height', e.target.value)} placeholder="Ex: 175" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Plano / Mensalidade (R$)</label>
            <input type="number" step="0.01" className="form-input" value={form.monthlyFee} onChange={e => field('monthlyFee', e.target.value)} placeholder="Ex: 250.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" rows={3} value={form.notes} onChange={e => field('notes', e.target.value)} placeholder="Lesões, restrições, preferências..." />
          </div>
          
          <div className="flex gap-sm mt-md">
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
