import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const ICON_WA  = <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;

const PAIN_REGIONS = [{ id: 'cervical', label: 'Cervical' }, { id: 'ombros', label: 'Ombros' }, { id: 'lombar', label: 'Lombar' }, { id: 'quadril', label: 'Quadril' }, { id: 'joelhos', label: 'Joelhos' }, { id: 'tornozelos', label: 'Tornozelos' }];

function analyzeBiofeedback(data) {
  const alerts = [];
  if (data.sleep <= 4) alerts.push({ metric: 'Sono', value: data.sleep, action: 'Sono muito ruim. Avaliar redução de carga.' });
  if (data.stress >= 8) alerts.push({ metric: 'Estresse', value: data.stress, action: 'Estresse alto. Foco em recuperação.' });
  if (data.energy <= 4) alerts.push({ metric: 'Energia', value: data.energy, action: 'Baixa energia. Evitar treinos intensos.' });
  if (data.pain >= 6) alerts.push({ metric: 'Dor', value: data.pain, action: 'Dor significativa. Adaptar exercícios.' });
  return alerts;
}

function overallStatus(data) {
  let score = 0;
  if (data.sleep >= 7) score++; else if (data.sleep <= 4) score--;
  if (data.stress <= 4) score++; else if (data.stress >= 8) score--;
  if (data.energy >= 7) score++; else if (data.energy <= 4) score--;
  if (data.pain <= 3) score++; else if (data.pain >= 7) score--;
  if (score >= 2) return { label: 'Excelente', color: 'success' };
  if (score <= -2) return { label: 'Atenção', color: 'danger' };
  return { label: 'Regular', color: 'warning' };
}

function trainingRecommendation(data) {
  const status = overallStatus(data);
  if (status.color === 'danger') return { label: 'Reduzir volume/intensidade' };
  if (status.color === 'warning') return { label: 'Manter carga planejada' };
  return { label: 'Pronto para alta intensidade' };
}

function colorForVal(val, inverse) {
  if (val == null) return 'var(--text-muted)';
  if (inverse) return val >= 7 ? 'var(--danger)' : val >= 5 ? 'var(--warning)' : 'var(--success)';
  return val <= 3 ? 'var(--danger)' : val <= 5 ? 'var(--warning)' : 'var(--success)';
}

function computeWeeklyLoads(entries) {
  const weeks = {};
  entries.forEach(e => {
    if (!e.trainingLoad) return;
    const d = new Date(e.date);
    const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const key = ws.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] || 0) + e.trainingLoad;
  });
  return Object.keys(weeks).sort().map(k => ({ week: k, load: weeks[k] }));
}

export default function Biofeedback() {
  const notify = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filterStudent, setFilterStudent] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const s = await db.getAll('students');
    const b = await db.getAll('biofeedback');
    setStudents(s);
    setEntries(b.sort((a, b) => new Date(b.date) - new Date(a.date)));
    setLoading(false);
  }

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);
  const filteredEntries = useMemo(() => filterStudent ? entries.filter(e => e.studentId === filterStudent) : entries, [entries, filterStudent]);
  const recent30 = entries.slice(0, 30);
  
  const today = new Date().toDateString();
  const todayBf = entries.filter(e => new Date(e.date).toDateString() === today);
  const avgSleep = recent30.length ? (recent30.reduce((t, e) => t + (e.sleep || 0), 0) / recent30.length).toFixed(1) : '-';
  const avgStress = recent30.length ? (recent30.reduce((t, e) => t + (e.stress || 0), 0) / recent30.length).toFixed(1) : '-';

  const alerts = [];
  todayBf.forEach(e => {
    const st = students.find(s => s.id === e.studentId);
    analyzeBiofeedback(e).forEach(a => alerts.push({ ...a, studentName: st?.name || '?' }));
  });

  const handleDelete = async (id) => {
    if (window.confirm('Excluir este registro de biofeedback?')) {
      await db.delete('biofeedback', id);
      notify('Registro excluído.', 'success');
      loadData();
    }
  };

  const sendWhatsAppMsg = (phone, msg) => {
    const p = phone.replace(/\D/g, '');
    const url = `https://wa.me/55${p}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleWaPre = (st) => {
    if (!st?.phone) return notify('Aluno sem telefone cadastrado', 'warning');
    const link = `${window.location.origin}${window.location.pathname}#/form/pre/${st.id}`;
    const first = st.name.split(' ')[0];
    const msg = `Fala ${first}! Bora pro treino? 🚀\nResponda rápido o biofeedback para a gente ajustar as cargas de hoje: ${link}`;
    sendWhatsAppMsg(st.phone, msg);
  };

  // ACWR calculations
  const student = filterStudent ? students.find(s => s.id === filterStudent) : null;
  let acwrSection = null;
  if (student && filteredEntries.length >= 2) {
    const weeklyLoads = computeWeeklyLoads(filteredEntries);
    const currentLoad = weeklyLoads[weeklyLoads.length - 1]?.load || 0;
    const chronic4 = weeklyLoads.slice(-5, -1).map(w => w.load);
    const chronicAvg = chronic4.length ? chronic4.reduce((a, b) => a + b, 0) / chronic4.length : 0;
    const acwr = chronicAvg > 0 ? Calc.acwr(currentLoad, chronicAvg) : 0;
    const cls = Calc.acwrClassificacao(acwr);

    acwrSection = (
      <div className="card mb-lg">
        <div className="card-header"><span className="card-title">ACWR — Carga Aguda:Crônica ({student.name})</span></div>
        <p className="text-xs text-muted mb-md">Ratio ideal entre 0.8 e 1.3. Abaixo = possível destreino, acima = risco de lesão.</p>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
          <div className="stat-card" style={{ textAlign: 'center', padding: 10 }}><div className="stat-label">Carga Aguda (7d)</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{currentLoad}</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 10 }}><div className="stat-label">Carga Crônica (28d)</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{Math.round(chronicAvg)}</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 10 }}><div className="stat-label">ACWR</div><div className="stat-value" style={{ fontSize: '1.3rem', color: `var(--${cls.color})` }}>{acwr.toFixed(2)}</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 10 }}><div className="stat-label">Status</div><div style={{ fontSize: '0.9rem', fontWeight: 700, color: `var(--${cls.color})`, marginTop: 4 }}>{cls.label}</div></div>
        </div>
        <div style={{ position: 'relative', height: 18, background: 'linear-gradient(to right,#3b82f6 0%,#22c55e 25%,#22c55e 44%,#f97316 62%,#ef4444 100%)', borderRadius: 9, marginBottom: 6 }}>
          {acwr > 0 && <div style={{ position: 'absolute', top: -5, left: `${Math.min(97, Math.max(1, (acwr / 2) * 100))}%`, transform: 'translateX(-50%)', width: 12, height: 28, background: 'white', borderRadius: 4, border: '2px solid #1e293b', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}></div>}
        </div>
        <div className="flex justify-between text-xs text-muted mb-md">
          <span>0</span><span style={{ color: '#3b82f6' }}>Destreino</span><span style={{ color: '#22c55e' }}>Ideal 0.8–1.3</span><span style={{ color: '#ef4444' }}>Risco</span><span>2+</span>
        </div>
        {weeklyLoads.length >= 2 && (
          <div style={{ height: 110 }}>
            <Bar data={{
              labels: weeklyLoads.slice(-8).map(w => w.week.slice(5)),
              datasets: [{ label: 'Carga Semanal', data: weeklyLoads.slice(-8).map(w => w.load), backgroundColor: weeklyLoads.slice(-8).map((_, i, arr) => i === arr.length - 1 ? 'rgba(16,185,129,0.6)' : 'rgba(99,102,241,0.4)'), borderRadius: 4 }]
            }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(148,163,184,0.07)' } }, x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } } } }} />
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div><h1 className="page-title">Biofeedback & Wellness</h1><p className="page-subtitle">Análise científica do bem-estar e prontidão para o treino</p></div>
        <div className="flex gap-sm">
          <select className="form-select" style={{ minWidth: 200 }} value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">Todos os alunos</option>
            {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>+ Registrar</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">HOJE</div><div className="stat-value text-gradient">{todayBf.length}</div><div className="stat-change">check-ins</div></div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">SONO MÉDIO</div><div className="stat-value" style={{ color: parseFloat(avgSleep) < 6 ? 'var(--warning)' : 'var(--success)' }}>{avgSleep}</div><div className="stat-change">últimos 30 registros</div></div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">ESTRESSE MÉDIO</div><div className="stat-value" style={{ color: parseFloat(avgStress) >= 7 ? 'var(--danger)' : parseFloat(avgStress) >= 5 ? 'var(--warning)' : 'var(--success)' }}>{avgStress}</div><div className="stat-change">últimos 30 registros</div></div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">ALERTAS HOJE</div><div className="stat-value" style={{ color: alerts.length > 0 ? 'var(--danger)' : 'var(--success)' }}>{alerts.length}</div><div className="stat-change">{alerts.length > 0 ? 'requerem atenção' : 'tudo bem'}</div></div>
      </div>

      {alerts.length > 0 && (
        <div className="card mb-lg" style={{ borderLeft: '3px solid var(--danger)', background: 'rgba(239,68,68,0.03)' }}>
          <div className="card-header"><span className="card-title" style={{ color: 'var(--danger)' }}>Alertas de Hoje ({alerts.length})</span></div>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', marginTop: 5, flexShrink: 0 }}></div>
              <div><strong>{a.studentName}</strong> <span style={{ color: 'var(--danger)' }}>— {a.metric}: {a.value}/10</span><div className="text-xs text-muted mt-xs">{a.action}</div></div>
            </div>
          ))}
        </div>
      )}

      {acwrSection}

      <div className="card">
        <div className="card-header"><span className="card-title">Registros {student ? `— ${student.name}` : ''}</span><span className="text-xs text-muted">{Math.min(30, filteredEntries.length)}/{filteredEntries.length}</span></div>
        {filteredEntries.length > 0 ? (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Data</th>{!student && <th>Aluno</th>}<th>Sono</th><th>Disp.</th><th>Energ.</th><th>Estresse</th><th>Dor</th><th>PSE</th><th>Carga</th><th>Status</th><th>Recomendação</th><th></th></tr></thead>
                <tbody>
                  {filteredEntries.slice(0, 30).map(e => {
                    const st = students.find(s => s.id === e.studentId);
                    const status = overallStatus(e);
                    const rec = trainingRecommendation(e);
                    const painLabel = Array.isArray(e.painRegions) && e.painRegions.length > 0 ? e.painRegions.slice(0,2).join(', ') + (e.painRegions.length > 2 ? ` +${e.painRegions.length-2}` : '') : e.painRegion || '';
                    return (
                      <tr key={e.id}>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{Calc.formatDate(e.date)}</td>
                        {!student && <td><div className="flex items-center gap-sm"><div className="avatar avatar-sm" style={{ width: 22, height: 22, fontSize: '0.6rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div><span style={{ fontSize: '0.82rem' }}>{st?.name||'?'}</span></div></td>}
                        <td style={{ fontWeight: 600, color: colorForVal(e.sleep, false) }}>{e.sleep || '-'}</td>
                        <td style={{ color: colorForVal(e.mood, false) }}>{e.mood || '-'}</td>
                        <td style={{ color: colorForVal(e.energy, false) }}>{e.energy || '-'}</td>
                        <td style={{ fontWeight: 600, color: colorForVal(e.stress, true) }}>{e.stress || '-'}</td>
                        <td style={{ color: colorForVal(e.pain, true) }}>{e.pain || '-'}{painLabel && <div style={{ fontSize: '0.62rem', color: 'var(--warning)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{painLabel}</div>}</td>
                        <td><strong style={{ color: (e.pse||0)>8 ? 'var(--danger)' : (e.pse||0)>6 ? 'var(--warning)' : 'var(--success)' }}>{e.pse || '-'}</strong></td>
                        <td style={{ fontSize: '0.8rem' }}>{e.trainingLoad || '-'}</td>
                        <td><span className={`badge badge-${status.color}`} style={{ fontSize: '0.7rem' }}>{status.label}</span></td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.label}</td>
                        <td><div style={{ display: 'flex', gap: 3 }}>{st?.phone && <button className="btn btn-ghost btn-sm" title="WhatsApp" onClick={() => handleWaPre(st)} style={{ padding: '4px 5px', color: '#25d366' }}>{ICON_WA}</button>}<button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => handleDelete(e.id)} style={{ padding: '4px 5px', color: 'var(--danger)' }}>{ICON_DEL}</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredEntries.length >= 3 && (
              <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="text-xs text-muted mb-sm" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tendência — últimas {Math.min(filteredEntries.length, 14)} entradas</div>
                <div style={{ height: 140 }}>
                  <Line data={{
                    labels: filteredEntries.slice(0, 14).reverse().map(e => Calc.formatDate(e.date).slice(0, 5)),
                    datasets: [
                      { label: 'Sono', data: filteredEntries.slice(0, 14).reverse().map(e => e.sleep || null), borderColor: '#6366f1', tension: 0.3, pointRadius: 3, borderWidth: 1.5, fill: false },
                      { label: 'Disposição', data: filteredEntries.slice(0, 14).reverse().map(e => e.mood || null), borderColor: '#10b981', tension: 0.3, pointRadius: 3, borderWidth: 1.5, fill: false },
                      { label: 'Energia', data: filteredEntries.slice(0, 14).reverse().map(e => e.energy || null), borderColor: '#f59e0b', tension: 0.3, pointRadius: 3, borderWidth: 1.5, fill: false },
                      { label: 'Estresse', data: filteredEntries.slice(0, 14).reverse().map(e => e.stress || null), borderColor: '#ef4444', tension: 0.3, pointRadius: 3, borderWidth: 1.5, fill: false, borderDash: [4, 2] }
                    ]
                  }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } } }, scales: { y: { min: 1, max: 10, ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: 'rgba(148,163,184,0.07)' } }, x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } } } }} />
                </div>
              </div>
            )}
          </>
        ) : <div className="empty-state" style={{ padding: 40 }}><p className="text-muted">Nenhum registro ainda</p></div>}
      </div>

      <AddBioModal isOpen={modalOpen} onClose={() => setModalOpen(false)} activeStudents={activeStudents} onSave={loadData} notify={notify} />
    </div>
  );
}

function AddBioModal({ isOpen, onClose, activeStudents, onSave, notify }) {
  const [form, setForm] = useState({ studentId: '', date: new Date().toISOString().slice(0, 10), sleep: 5, mood: 5, energy: 5, stress: 5, pain: 5, painDescription: '', pse: 7, duration: 60, notes: '' });
  const [painRegions, setPainRegions] = useState([]);

  useEffect(() => { if (!isOpen) { setForm({ studentId: '', date: new Date().toISOString().slice(0, 10), sleep: 5, mood: 5, energy: 5, stress: 5, pain: 5, painDescription: '', pse: 7, duration: 60, notes: '' }); setPainRegions([]); } }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.studentId) return notify('Selecione o aluno', 'error');
    const toSave = { ...form, painRegions, trainingLoad: Calc.cargaTreino(form.pse, form.duration) };
    await db.add('biofeedback', toSave);
    const alerts = analyzeBiofeedback(toSave);
    if (alerts.length) {
      const st = activeStudents.find(s => s.id === form.studentId);
      notify(`${st?.name}: ${alerts.map(a => a.metric).join(', ')} requerem atenção`, 'warning');
    } else {
      notify('Biofeedback registrado!', 'success');
    }
    onSave();
    onClose();
  };

  const fields = [
    { id: 'sleep', label: 'Como dormiu?', hint: '1 = muito mal · 10 = muito bem' },
    { id: 'mood', label: 'Como está sua disposição?', hint: '1 = péssima · 10 = excelente' },
    { id: 'energy', label: 'Nível de energia agora?', hint: '1 = exausto · 10 = energizado' },
    { id: 'stress', label: 'Nível de estresse?', hint: '1 = relaxado · 10 = muito estressado' },
    { id: 'pain', label: 'Sente alguma dor?', hint: '1 = nenhuma · 10 = dor intensa' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="+ Registrar Biofeedback" size="lg">
      <div className="form-row">
        <div className="form-group"><label className="form-label">Aluno *</label><select className="form-select" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Selecione</option>{activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
      </div>
      {fields.map(f => (
        <div key={f.id} className="form-group" style={{ marginBottom: 14 }}>
          <div className="flex items-center justify-between mb-xs"><label className="form-label" style={{ margin: 0 }}>{f.label}</label><span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{form[f.id]}</span></div>
          <input type="range" min="1" max="10" value={form[f.id]} onChange={e => setForm({ ...form, [f.id]: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--primary)' }} />
          <div className="flex justify-between text-xs text-muted mt-xs"><span>{f.hint.split('·')[0].trim()}</span><span>{f.hint.split('·')[1]?.trim() || ''}</span></div>
        </div>
      ))}
      {form.pain >= 3 && (
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Locais de dor <span className="text-muted text-xs">(pode marcar mais de um)</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {PAIN_REGIONS.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: `1px solid ${painRegions.includes(r.id) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem', background: painRegions.includes(r.id) ? 'rgba(16,185,129,0.1)' : 'transparent', color: painRegions.includes(r.id) ? 'var(--primary)' : 'inherit', transition: 'all 0.15s' }}>
                <input type="checkbox" style={{ display: 'none' }} checked={painRegions.includes(r.id)} onChange={e => setPainRegions(e.target.checked ? [...painRegions, r.id] : painRegions.filter(x => x !== r.id))} /> {r.label}
              </label>
            ))}
          </div>
          <div className="form-group mt-sm"><input className="form-input" placeholder="Descrição da dor (opcional)..." value={form.painDescription} onChange={e => setForm({ ...form, painDescription: e.target.value })} /></div>
        </div>
      )}
      <div className="form-row">
        <div className="form-group"><label className="form-label">PSE — Esforço percebido no treino</label><div className="flex items-center gap-sm"><input type="range" min="1" max="10" value={form.pse} onChange={e => setForm({ ...form, pse: Number(e.target.value) })} style={{ flex: 1, accentColor: 'var(--primary)' }} /><span style={{ fontWeight: 800, color: 'var(--primary)', minWidth: 20 }}>{form.pse}</span></div></div>
        <div className="form-group"><label className="form-label">Duração do treino (min)</label><input className="form-input" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /></div>
      </div>
      <div className="form-group"><label className="form-label">Observações</label><textarea className="form-textarea" rows="2" placeholder="Notas sobre o treino ou bem-estar..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}></textarea></div>
      <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit}>Salvar</button></div>
    </Modal>
  );
}
