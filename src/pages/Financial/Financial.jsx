import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';

const STATUS = ['Pendente','Pago','Atrasado','Cancelado'];
const TYPES = ['Mensalidade','Avaliação','Pacote','Outro'];

export default function Financial() {
  const notify = useToast();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ studentId:'', type:'Mensalidade', amount:'', dueDate:'', status:'Pendente', notes:'' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [r, s] = await Promise.all([db.getAll('financial'), db.getAll('students')]);
    setRecords(r.sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate)));
    setStudents(s.sort((a,b) => a.name?.localeCompare(b.name)));
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.studentId || !form.amount) { notify('Preencha aluno e valor', 'error'); return; }
    await db.put('financial', { ...form, amount: Number(form.amount) });
    notify('Registro salvo!', 'success');
    setShowForm(false);
    setForm({ studentId:'', type:'Mensalidade', amount:'', dueDate:'', status:'Pendente', notes:'' });
    loadAll();
  }

  async function togglePaid(rec) {
    const updated = { ...rec, status: rec.status === 'Pago' ? 'Pendente' : 'Pago' };
    await db.put('financial', updated);
    loadAll();
  }

  async function handleDelete(id) {
    if (!window.confirm('Excluir registro?')) return;
    await db.delete('financial', id);
    loadAll();
  }

  const getStudentName = id => students.find(s => s.id === id)?.name || '—';
  const filtered = filterStatus ? records.filter(r => r.status === filterStatus) : records;
  const totals = { total: records.reduce((a,r) => a + (r.amount||0), 0), paid: records.filter(r => r.status==='Pago').reduce((a,r) => a + (r.amount||0), 0), pending: records.filter(r => r.status==='Pendente').reduce((a,r) => a + (r.amount||0), 0) };
  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const badgeClass = s => s==='Pago'?'success':s==='Atrasado'?'danger':s==='Cancelado'?'warning':'info';

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Financeiro</h1><p className="page-subtitle">Controle de pagamentos</p></div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>+ Novo Registro</button>
      </div>

      {/* KPI */}
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:'1.5rem' }}>
        {[['💰 Total','total','#10b981'],['✅ Recebido','paid','#10b981'],['⏳ Pendente','pending','#f59e0b']].map(([l,k,c]) => (
          <div key={k} className="stat-card">
            <div style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{l}</div>
            <div style={{ fontSize:'1.5rem', fontWeight:700, color:c, marginTop:4 }}>R$ {totals[k].toFixed(2)}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth:560, marginBottom:'1.5rem' }}>
          <div className="card-header"><span className="card-title">Novo Registro Financeiro</span></div>
          <form onSubmit={handleSave} style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Aluno *</label>
                <select className="form-select" value={form.studentId} onChange={e => field('studentId',e.target.value)} required>
                  <option value="">Selecione</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.type} onChange={e => field('type',e.target.value)}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Valor (R$) *</label><input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => field('amount',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Vencimento</label><input type="date" className="form-input" value={form.dueDate} onChange={e => field('dueDate',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => field('status',e.target.value)}>
                  {STATUS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Observações</label><input className="form-input" value={form.notes} onChange={e => field('notes',e.target.value)} /></div>
            <div className="modal-footer" style={{ padding:0 }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-bar">
        <select className="form-select" style={{ width:180 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        <div className="table-wrapper"><table className="table">
          <thead><tr><th>Aluno</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>{filtered.map(r => (
            <tr key={r.id}>
              <td>{getStudentName(r.studentId)}</td>
              <td>{r.type}</td>
              <td style={{ fontWeight:700 }}>R$ {Number(r.amount||0).toFixed(2)}</td>
              <td>{r.dueDate ? new Date(r.dueDate).toLocaleDateString('pt-BR') : '—'}</td>
              <td><span className={`badge badge-${badgeClass(r.status)}`}>{r.status}</span></td>
              <td style={{ display:'flex', gap:6 }}>
                <button className="btn btn-sm btn-outline" onClick={() => togglePaid(r)}>{r.status==='Pago'?'Desfazer':'✓ Pago'}</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>Excluir</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
