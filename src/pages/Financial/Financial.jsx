import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ICON_WA  = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
const ICON_CHECK = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
const ICON_EDIT = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

const PAYMENT_METHODS = ['Pix','Cartão de Crédito','Cartão de Débito','Dinheiro','Transferência','Boleto'];

function fmtBRL(v) { return 'R$ ' + Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Financial() {
  const notify = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [trainerSettings, setTrainerSettings] = useState(null);

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [recordModal, setRecordModal] = useState(null); // null, {type: 'new'}, {type: 'edit', data}
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [payModal, setPayModal] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const s = await db.getAll('students');
    const r = await db.getAll('financial');
    const sess = await db.getAll('sessions');
    const sett = await db.get('settings', 'trainer');
    
    setStudents(s);
    setRecords(r);
    setSessions(sess);
    setTrainerSettings(sett);
    setLoading(false);
  }

  const getPixKey = () => trainerSettings?.pixKey || '[configure sua chave Pix em Configurações]';

  const sendWhatsAppMsg = (phone, msg) => {
    const p = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${p}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);

  // Calculations
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => {
      const order = { overdue: 0, pending: 1, paid: 2 };
      const aStatus = (a.status === 'pending' && new Date(a.dueDate) < now) ? 'overdue' : a.status;
      const bStatus = (b.status === 'pending' && new Date(b.dueDate) < now) ? 'overdue' : b.status;
      if (order[aStatus] !== order[bStatus]) return order[aStatus] - order[bStatus];
      return new Date(b.dueDate) - new Date(a.dueDate);
    });
  }, [records, now]);

  const inThisMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  };

  const monthRecs = records.filter(r => inThisMonth(r.dueDate));
  const totalExpect = monthRecs.reduce((t, r) => t + (r.amount||0), 0);
  
  const paidThisMonth = records.filter(r => {
    if (r.status !== 'paid') return false;
    const refDate = r.paidDate || r.dueDate;
    return inThisMonth(refDate);
  });
  const totalPaid = paidThisMonth.reduce((t, r) => t + (r.amount||0), 0);
  const totalPend = monthRecs.filter(r => r.status !== 'paid').reduce((t, r) => t + (r.amount||0), 0);
  
  const overdue = records.filter(r => r.status === 'pending' && new Date(r.dueDate) < now);
  const overdueAmt = overdue.reduce((t, r) => t + (r.amount||0), 0);
  
  const collRate = monthRecs.length > 0 
    ? Math.round((monthRecs.filter(r=>r.status==='paid').length / monthRecs.length) * 100) 
    : (paidThisMonth.length > 0 ? 100 : 0);

  const defaulters = activeStudents.filter(s => overdue.some(r => r.studentId === s.id));

  const monthSessions = sessions.filter(x => {
    const d = new Date(x.date);
    return x.status === 'completed' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const chartData = useMemo(() => {
    const labels = [], paid = [], expected = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const mo = d.getMonth(), yr = d.getFullYear();
      const inMonth = (ds) => { if (!ds) return false; const dd = new Date(ds); return dd.getMonth() === mo && dd.getFullYear() === yr; };
      labels.push(d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
      paid.push(records.filter(r => r.status === 'paid' && inMonth(r.paidDate || r.dueDate)).reduce((t, r) => t + (r.amount||0), 0));
      expected.push(records.filter(r => inMonth(r.dueDate)).reduce((t, r) => t + (r.amount||0), 0));
    }
    return {
      labels,
      datasets: [
        { label: 'Recebido', data: paid, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 5 },
        { label: 'Esperado', data: expected, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 5 }
      ]
    };
  }, [records, thisMonth, thisYear]);

  const filteredRecords = sortedRecords.filter(r => {
    const st = r.status === 'pending' && new Date(r.dueDate) < now ? 'overdue' : r.status;
    const matchTab = tab === 'all' || st === tab;
    const stName = (students.find(s => s.id === r.studentId)?.name || '').toLowerCase();
    const matchSearch = !search || stName.includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  // Actions
  const handleDelete = async (id) => {
    if (window.confirm('Excluir este registro financeiro?')) {
      await db.delete('financial', id);
      notify('Registro excluído.', 'success');
      loadData();
    }
  };

  const handleChargeAll = async () => {
    const byStudent = {};
    overdue.forEach(r => { byStudent[r.studentId] = (byStudent[r.studentId] || []).concat(r); });
    let count = 0;
    const pix = getPixKey();
    for (const [sid, recs] of Object.entries(byStudent)) {
      const st = students.find(s => s.id === sid);
      if (!st?.phone) continue;
      const total = recs.reduce((t, r) => t + (r.amount||0), 0);
      const days = Math.floor((now - new Date(recs.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0].dueDate))/86400000);
      const msg = `Olá ${st.name.split(' ')[0]}! 👋\n\nIdentificamos *${recs.length} parcela(s)* em aberto no valor de *${fmtBRL(total)}* (${days} dias em atraso).\n\nChave Pix: ${pix}\n\nQualquer dúvida estou à disposição! 💪`;
      sendWhatsAppMsg(st.phone, msg);
      count++;
      await new Promise(r => setTimeout(r, 800)); // small delay between popups
    }
    notify(`Cobrança enviada para ${count} aluno(s)!`, 'success');
  };

  const handleRemind = (r) => {
    const st = students.find(s => s.id === r.studentId);
    if (!st?.phone) return;
    const pix = getPixKey();
    const due = Calc.formatDate(r.dueDate);
    const msg = `Olá ${st.name.split(' ')[0]}! 👋\n\nPassando para lembrar que sua mensalidade de *${fmtBRL(r.amount)}* com vencimento em *${due}* está pendente.\n\nChave Pix: ${pix}\n\nQualquer dúvida estou à disposição! 💪`;
    sendWhatsAppMsg(st.phone, msg);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div><h1 className="page-title">Gestão Financeira</h1><p className="page-subtitle">{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p></div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => setGenModalOpen(true)}>⚡ Gerar Mensalidades</button>
          <button className="btn btn-primary" onClick={() => setRecordModal({ type: 'new' })}>+ Novo Registro</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 16 }}>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">ESPERADO</div><div className="stat-value text-gradient" style={{ fontSize: '1.2rem' }}>{fmtBRL(totalExpect)}</div><div className="stat-change">este mês</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">RECEBIDO</div><div className="stat-value" style={{ color: 'var(--success)', fontSize: '1.2rem' }}>{fmtBRL(totalPaid)}</div><div className="stat-change positive">{collRate}% de taxa de coleta</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">PENDENTE</div><div className="stat-value" style={{ color: 'var(--warning)', fontSize: '1.2rem' }}>{fmtBRL(totalPend)}</div><div className="stat-change">{monthRecs.filter(r=>r.status==='pending').length} cobrança(s)</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">VENCIDO</div><div className="stat-value" style={{ color: 'var(--danger)', fontSize: '1.2rem' }}>{fmtBRL(overdueAmt)}</div><div className="stat-change">{overdue.length} registro(s)</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">INADIMPLENTES</div><div className="stat-value" style={{ color: defaulters.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{defaulters.length}</div><div className="stat-change">de {activeStudents.length} ativos</div>
        </div>
      </div>

      <div className="grid-2 mb-lg">
        <div className="card">
          <div className="card-header"><span className="card-title">Receita — Últimos 6 Meses</span></div>
          <div style={{ height: 180 }}><Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#64748b', font: { size: 9 }, callback: v => 'R$' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v.toFixed(0)) }, grid: { color: 'rgba(148,163,184,0.07)' } }, x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } } } }} /></div>
          <div className="flex gap-md mt-sm" style={{ justifyContent: 'center' }}><span className="text-xs" style={{ color: '#10b981' }}>■ Recebido</span><span className="text-xs" style={{ color: 'rgba(16,185,129,0.25)' }}>■ Esperado</span></div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ color: defaulters.length > 0 ? 'var(--danger)' : 'inherit' }}>Inadimplência {defaulters.length > 0 ? `(${defaulters.length})` : '✓'}</span>
            {defaulters.length > 0 && <button className="btn btn-ghost btn-sm" onClick={handleChargeAll} style={{ color: '#25d366', fontSize: '0.78rem' }}>{ICON_WA} Cobrar todos</button>}
          </div>
          {defaulters.length ? defaulters.map(s => {
            const sOverdue = overdue.filter(r=>r.studentId===s.id);
            const total = sOverdue.reduce((t,r)=>t+(r.amount||0),0);
            const oldest = sOverdue.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate))[0];
            const days = Math.floor((now-new Date(oldest.dueDate))/86400000);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="avatar avatar-sm" style={{ width: 32, height: 32 }}>{s.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</div>
                  <div className="text-xs" style={{ color: 'var(--danger)' }}>{sOverdue.length} parcela(s) · {days}d em atraso · {fmtBRL(total)}</div>
                </div>
                {s.phone && <button className="btn btn-ghost btn-sm" onClick={() => sendWhatsAppMsg(s.phone, `Olá ${s.name.split(' ')[0]}! 👋\n\nIdentificamos parcelas em aberto no valor de *${fmtBRL(total)}* (${days} dias em atraso).\n\nChave Pix: ${getPixKey()}\n\nQualquer dúvida estou à disposição! 💪`)} style={{ padding: '4px 6px', color: '#25d366' }}>{ICON_WA}</button>}
              </div>
            );
          }) : <div className="empty-state" style={{ padding: 24 }}><div style={{ fontSize: '2rem' }}>✓</div><p className="text-muted text-sm">Todos os alunos em dia!</p></div>}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>Todos ({records.length})</button>
        <button className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pendentes ({records.filter(r=>r.status==='pending').length})</button>
        <button className={`tab ${tab === 'overdue' ? 'active' : ''}`} onClick={() => setTab('overdue')}>Vencidos ({overdue.length})</button>
        <button className={`tab ${tab === 'paid' ? 'active' : ''}`} onClick={() => setTab('paid')}>Pagos ({records.filter(r=>r.status==='paid').length})</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Registros Financeiros</span>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" className="form-input" placeholder="Buscar aluno..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, width: 180, fontSize: '0.82rem' }} />
          </div>
        </div>

        {filteredRecords.length ? (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Aluno</th><th>Descrição</th><th>Valor</th><th>Vencimento</th><th>Pagamento</th><th>Método</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filteredRecords.map(r => {
                  const st = students.find(s => s.id === r.studentId);
                  const isOverdue = r.status === 'pending' && new Date(r.dueDate) < now;
                  const statusLabel = r.status === 'paid' ? 'Pago' : isOverdue ? 'Vencido' : 'Pendente';
                  const statusBadge = r.status === 'paid' ? 'success' : isOverdue ? 'danger' : 'warning';
                  return (
                    <tr key={r.id}>
                      <td><div className="flex items-center gap-sm"><div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div><span style={{ fontSize: '0.85rem' }}>{st?.name||'?'}</span></div></td>
                      <td style={{ fontSize: '0.82rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '-'}</td>
                      <td><strong style={{ color: r.status === 'paid' ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--text-primary)' }}>{fmtBRL(r.amount)}</strong></td>
                      <td style={{ fontSize: '0.82rem', color: isOverdue ? 'var(--danger)' : 'inherit', fontWeight: isOverdue ? 600 : 400 }}>{Calc.formatDate(r.dueDate)}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.paidDate ? Calc.formatDate(r.paidDate) : '-'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{r.paymentMethod || '-'}</td>
                      <td><span className={`badge badge-${statusBadge}`}>{statusLabel}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                          {r.status !== 'paid' && (
                            <>
                              <button className="btn btn-ghost btn-sm" title="Marcar como pago" onClick={() => setPayModal(r)} style={{ padding: '4px 6px', color: 'var(--success)' }}>{ICON_CHECK}</button>
                              {st?.phone && <button className="btn btn-ghost btn-sm" title="Cobrar via WhatsApp" onClick={() => handleRemind(r)} style={{ padding: '4px 6px', color: '#25d366' }}>{ICON_WA}</button>}
                            </>
                          )}
                          <button className="btn btn-ghost btn-sm" title="Editar" onClick={() => setRecordModal({ type: 'edit', data: r })} style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{ICON_EDIT}</button>
                          <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => handleDelete(r.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state" style={{ padding: 40 }}><div className="empty-icon">—</div><h3>Nenhum registro encontrado</h3><p>Altere os filtros ou adicione um novo registro.</p></div>}
      </div>

      <div className="card mt-lg">
        <div className="card-header"><span className="card-title">Sessões Realizadas — {now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span></div>
        <div className="table-container">
          <table className="data-table">
            <thead><tr><th>Aluno</th><th>Realizadas</th><th>Esperadas</th><th>Progresso</th><th title="Mensalidade ÷ sessões esperadas">Custo/sessão</th><th title="Custo por sessão × sessões realizadas">Valor proporcional</th></tr></thead>
            <tbody>
              {activeStudents.map(s => {
                const ms = monthSessions.filter(x=>x.studentId===s.id).length;
                const exp = s.expectedSessions || 12;
                const pct = Math.min(100, Math.round((ms/exp)*100));
                const fee = s.monthlyFee ? parseFloat(s.monthlyFee) : null;
                const perSess = fee && exp ? (fee/exp).toFixed(2) : '-';
                const generated = fee && ms ? ((fee/exp)*ms).toFixed(2) : '-';
                return (
                  <tr key={s.id}>
                    <td><div className="flex items-center gap-sm"><div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: '0.6rem' }}>{s.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>{s.name}</div></td>
                    <td><strong style={{ color: 'var(--primary)' }}>{ms}</strong></td>
                    <td>{exp}</td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className="progress-bar" style={{ width: 90, height: 6 }}><div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--primary)' : 'var(--warning)' }}></div></div><span style={{ fontSize: '0.78rem', color: pct >= 100 ? 'var(--success)' : pct < 50 ? 'var(--warning)' : 'inherit' }}>{pct}%</span></div></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{perSess !== '-' ? 'R$ ' + perSess : '-'}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{generated !== '-' ? 'R$ ' + generated : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-sm" style={{ padding: '0 4px' }}>* <strong>Custo/sessão</strong> = mensalidade ÷ sessões esperadas no mês · <strong>Valor proporcional</strong> = custo/sessão × sessões realizadas</p>
      </div>

      <FormRecordModal isOpen={!!recordModal} onClose={() => setRecordModal(null)} data={recordModal?.data} activeStudents={activeStudents} onSave={loadData} notify={notify} />
      <GenMonthlyModal isOpen={genModalOpen} onClose={() => setGenModalOpen(false)} activeStudents={activeStudents} onSave={loadData} notify={notify} />
      <PayModal isOpen={!!payModal} onClose={() => setPayModal(null)} record={payModal} onSave={loadData} notify={notify} />
    </div>
  );
}

function FormRecordModal({ isOpen, onClose, data, activeStudents, onSave, notify }) {
  const [form, setForm] = useState({ studentId: '', amount: '', dueDate: new Date(new Date().getFullYear(), new Date().getMonth()+1, 5).toISOString().slice(0,10), paymentMethod: 'Pix', description: '', status: 'pending', paidDate: '', notes: '' });

  useEffect(() => {
    if (isOpen && data) setForm({ ...data, amount: data.amount || '' });
    else if (isOpen) setForm({ studentId: '', amount: '', dueDate: new Date(new Date().getFullYear(), new Date().getMonth()+1, 5).toISOString().slice(0,10), paymentMethod: 'Pix', description: '', status: 'pending', paidDate: '', notes: '' });
  }, [isOpen, data]);

  const handleSubmit = async () => {
    if (!form.studentId) return notify('Selecione um aluno', 'error');
    const toSave = { ...form, amount: parseFloat(form.amount) || 0 };
    if (data?.id) await db.put('financial', { ...data, ...toSave });
    else await db.add('financial', toSave);
    notify('Registro salvo!', 'success');
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={data ? 'Editar Registro' : '+ Novo Registro'} size="md">
      <div className="form-row">
        <div className="form-group"><label className="form-label">Aluno *</label>
          <select className="form-select" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}>
            <option value="">Selecione</option>
            {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Valor (R$)</label><input className="form-input" type="number" step="0.01" placeholder="500.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Vencimento</label><input className="form-input" type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Forma de Pagamento</label>
          <select className="form-select" value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Descrição</label><input className="form-input" placeholder="Ex: Mensalidade Maio/2026" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Status</label>
          <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Data do Pagamento</label><input className="form-input" type="date" value={form.paidDate} onChange={e => setForm({ ...form, paidDate: e.target.value })} disabled={form.status !== 'paid'} /></div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><input className="form-input" placeholder="Notas adicionais..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSubmit}>Salvar</button>
      </div>
    </Modal>
  );
}

function GenMonthlyModal({ isOpen, onClose, activeStudents, onSave, notify }) {
  const [startMonth, setStartMonth] = useState(new Date().toISOString().slice(0,7));
  const [months, setMonths] = useState(6);
  const [dueDay, setDueDay] = useState(5);
  const [defAmount, setDefAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [selected, setSelected] = useState([]);

  useEffect(() => { if (isOpen) setSelected(activeStudents.map(s => s.id)); }, [isOpen, activeStudents]);

  const handleGen = async () => {
    if (!selected.length) return notify('Selecione ao menos um aluno', 'error');
    let count = 0;
    for (const sid of selected) {
      const st = activeStudents.find(s => s.id === sid);
      const amount = defAmount ? parseFloat(defAmount) : (parseFloat(st?.monthlyFee) || 0);
      if (!amount) continue;
      for (let m = 0; m < months; m++) {
        const [y, mo] = startMonth.split('-').map(Number);
        const date = new Date(y, mo - 1 + m, dueDay);
        const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        await db.add('financial', {
          studentId: sid, amount, dueDate: date.toISOString().slice(0, 10),
          paymentMethod, description: `Mensalidade ${monthName}`, status: 'pending',
        });
        count++;
      }
    }
    notify(`${count} mensalidade(s) gerada(s)!`, 'success');
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Gerar Mensalidades" size="lg">
      <p className="text-muted text-sm mb-md">Gera registros de cobrança automaticamente para todos os alunos selecionados.</p>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Mês Inicial</label><input className="form-input" type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Quantos meses</label>
          <select className="form-select" value={months} onChange={e => setMonths(Number(e.target.value))}>
            <option value={1}>1 mês</option><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Dia de Vencimento</label><input className="form-input" type="number" min="1" max="28" value={dueDay} onChange={e => setDueDay(Number(e.target.value))} /></div>
        <div className="form-group"><label className="form-label">Valor Padrão (R$)</label><input className="form-input" type="number" step="0.01" placeholder="Usa o cadastro do aluno" value={defAmount} onChange={e => setDefAmount(e.target.value)} /><div className="form-hint">Deixe vazio para usar o valor cadastrado de cada aluno</div></div>
      </div>
      <div className="form-group"><label className="form-label">Forma de Pagamento Padrão</label>
        <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select>
      </div>
      <div className="form-group"><label className="form-label">Alunos</label>
        <div className="flex gap-xs" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(activeStudents.map(s => s.id))}>Selecionar todos</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected([])}>Desmarcar todos</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {activeStudents.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', background: selected.includes(s.id) ? 'rgba(16,185,129,0.05)' : 'transparent' }}>
              <input type="checkbox" checked={selected.includes(s.id)} onChange={e => setSelected(e.target.checked ? [...selected, s.id] : selected.filter(x => x !== s.id))} />
              {s.name.split(' ')[0]} {s.monthlyFee && <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>R${s.monthlyFee}</span>}
            </label>
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleGen}>⚡ Gerar</button>
      </div>
    </Modal>
  );
}

function PayModal({ isOpen, onClose, record, onSave, notify }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('');

  useEffect(() => {
    if (isOpen && record) {
      setDate(new Date().toISOString().slice(0, 10));
      setMethod(record.paymentMethod || 'Pix');
    }
  }, [isOpen, record]);

  const handleSave = async () => {
    await db.put('financial', { ...record, status: 'paid', paidDate: date, paymentMethod: method });
    notify('Pagamento confirmado!', 'success');
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Pagamento" size="sm">
      <div className="form-group"><label className="form-label">Data do pagamento</label><input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Método utilizado</label>
        <select className="form-select" value={method} onChange={e => setMethod(e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}</select>
      </div>
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave}>✓ Confirmar</button>
      </div>
    </Modal>
  );
}
