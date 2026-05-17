import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, RadialLinearScale, Filler } from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import { useToast } from '../../components/Toast/Toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Filler, Title, Tooltip, Legend);

function analyzeBiofeedback(data) {
  const alerts = [];
  if (data.sleep <= 4) alerts.push({ metric: 'Sono', value: data.sleep, action: 'Sono muito ruim' });
  if (data.stress >= 8) alerts.push({ metric: 'Estresse', value: data.stress, action: 'Estresse alto' });
  if (data.energy <= 4) alerts.push({ metric: 'Energia', value: data.energy, action: 'Baixa energia' });
  if (data.pain >= 6) alerts.push({ metric: 'Dor', value: data.pain, action: 'Dor significativa' });
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

export default function Reports() {
  const notify = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCycle, setSelectedCycle] = useState('');
  
  const [studentData, setStudentData] = useState({ workouts: [], sessions: [], biofeedback: [], assessments: [], macros: [], cycles: [] });

  useEffect(() => {
    db.getAll('students').then(s => {
      setStudents(s);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedStudent) loadStudentData(selectedStudent);
    else setStudentData({ workouts: [], sessions: [], biofeedback: [], assessments: [], macros: [], cycles: [] });
  }, [selectedStudent]);

  async function loadStudentData(sid) {
    const [w, s, b, a, m] = await Promise.all([
      db.getAll('workouts'), db.getAll('sessions'), db.getAll('biofeedback'), db.getAll('assessments'), db.getAll('macrocycles')
    ]);
    const workouts = w.filter(x => String(x.studentId) === String(sid));
    const sessions = s.filter(x => String(x.studentId) === String(sid));
    const cycles = [...new Set([...workouts.map(x => x.cycle || x.ciclo || x.mesocycle || x.fase), ...sessions.map(x => x.cycle || x.ciclo || x.mesocycle || x.fase)].filter(Boolean))].sort();
    
    setStudentData({
      workouts, sessions, 
      biofeedback: b.filter(x => String(x.studentId) === String(sid)).sort((a1, b1) => new Date(a1.date) - new Date(b1.date)),
      assessments: a.filter(x => String(x.studentId) === String(sid)),
      macros: m.filter(x => String(x.studentId) === String(sid)),
      cycles
    });
  }

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);
  const student = students.find(s => s.id === selectedStudent);

  const workouts = useMemo(() => selectedCycle ? studentData.workouts.filter(w => (w.cycle || w.ciclo || w.mesocycle || w.fase) === selectedCycle) : studentData.workouts, [studentData.workouts, selectedCycle]);
  const sessions = useMemo(() => {
    let sess = studentData.sessions;
    if (selectedCycle) {
      const wNames = workouts.map(w => w.name);
      sess = sess.filter(s => (s.cycle || s.ciclo || s.mesocycle || s.fase) === selectedCycle || wNames.includes(s.workoutName));
    }
    return sess.sort((a,b)=>new Date(a.date)-new Date(b.date));
  }, [studentData.sessions, selectedCycle, workouts]);

  const completed = sessions.filter(s => s.status === 'completed');
  const bf = studentData.biofeedback;
  const recent10 = bf.slice(-10);
  
  const avgPse = recent10.length ? (recent10.reduce((s, b) => s + (b.pse || 0), 0) / recent10.length).toFixed(1) : '-';
  const avgSleep = recent10.length ? (recent10.reduce((s, b) => s + (b.sleep || 0), 0) / recent10.length).toFixed(1) : '-';
  const totalLoad = bf.reduce((s, b) => s + (b.trainingLoad || 0), 0);
  const totalVolAllSessions = completed.reduce((t, s) => t + Math.round(s.totalVolume || 0), 0);
  const avgVolPerSession = completed.length ? Math.round(totalVolAllSessions / completed.length) : 0;
  const maxVolSession = completed.length ? Math.max(...completed.map(s => Math.round(s.totalVolume || 0))) : 0;
  const avgDuration = completed.length ? Math.round(completed.reduce((t, s) => t + (s.totalDuration || 0), 0) / completed.length / 60) : 0;

  const pseNum = parseFloat(avgPse) || 0;
  const sleepNum = parseFloat(avgSleep) || 0;

  const loadProgression = useMemo(() => {
    const lp = {};
    sessions.forEach(s => {
      (s.setLog || []).forEach(set => {
        const exName = (s.exercises || [])[set.exIdx]?.name;
        if (!exName || !set.load || set.load <= 0) return;
        if (!lp[exName]) lp[exName] = [];
        lp[exName].push({ date: s.date, load: set.load, reps: set.reps || 0, vol: set.load * (set.reps || 1) });
      });
    });
    return Object.entries(lp).filter(([, sets]) => sets.length >= 2).map(([name, sets]) => {
      const first = sets[0], last = sets[sets.length - 1];
      const maxLoad = Math.max(...sets.map(s => s.load)), minLoad = Math.min(...sets.map(s => s.load));
      const delta = last.load - first.load;
      const pct = first.load > 0 ? Math.round((delta / first.load) * 100) : 0;
      const totalVol = sets.reduce((t, s) => t + s.vol, 0);
      return { name, first, last, maxLoad, minLoad, delta, pct, totalVol, sessions: sets.length, points: sets };
    }).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 8);
  }, [sessions]);

  // Chart data
  const wks = {}; bf.forEach(b => { if (!b.trainingLoad) return; const d = new Date(b.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const k = ws.toISOString().slice(0, 10); wks[k] = (wks[k] || 0) + b.trainingLoad; });
  const wksKeys = Object.keys(wks).sort().slice(-12);
  
  const freqC = {}; completed.forEach(s => { const d = new Date(s.date || s.createdAt); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const k = ws.toISOString().slice(0, 10); freqC[k] = (freqC[k] || 0) + 1; });
  const freqKeys = Object.keys(freqC).sort().slice(-8);

  const bfWellness = bf.filter(b => b.sleep || b.mood || b.energy || b.stress);
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }, scales: { y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#94a3b8' }, grid: { display: false } } } };

  const handleExportPDF = () => {
    window.print();
  };

  const handleWaExport = () => {
    if (!student?.phone) return notify('Aluno sem telefone cadastrado', 'warning');
    const msg = `📊 *Seu Relatório de Performance — Personal PRO*\n\n👤 Aluno: *${student.name}*\n📅 Ciclo: ${selectedCycle || 'Geral'}\n\n🏋 *Treinos*\n• Sessões realizadas: ${completed.length}\n• Volume total: ${totalVolAllSessions}kg\n\n📈 *Indicadores*\n• Sono médio: ${avgSleep}/10\n• PSE médio: ${avgPse}/10\n\n✅ Continue assim!`;
    const phone = student.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page" id="report-page">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #reportArea, #reportArea * { visibility: visible; }
          #reportArea { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .page-header { display: none !important; }
          .card { border: none !important; box-shadow: none !important; margin-bottom: 20px !important; }
        }
      `}} />
      <div className="page-header no-print" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div><h1 className="page-title">Relatórios de Performance</h1><p className="page-subtitle">Dossiê compacto com gráficos de evolução</p></div>
        <div className="flex gap-sm">
          <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={{ minWidth: 220 }}>
            <option value="">Selecione um aluno</option>
            {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {selectedStudent && (
            <>
              <select className="form-select" value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} style={{ minWidth: 160 }}>
                <option value="">Todos os ciclos</option>
                {studentData.cycles.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={handleWaExport} style={{ color: '#25d366', borderColor: '#25d366' }}>WA</button>
              <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>Gerar PDF</button>
            </>
          )}
        </div>
      </div>

      {!selectedStudent ? (
        <div className="empty-state"><div className="empty-icon" style={{ fontSize: '2rem' }}>—</div><h3>Selecione um aluno</h3><p className="text-muted">Escolha um aluno para ver o relatório completo</p></div>
      ) : (
        <div id="reportArea">
          <div className="flex items-center gap-lg mb-lg">
            <div className="avatar avatar-lg" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>{student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div>
              <h2 style={{ margin: 0 }}>{student.name}</h2>
              <div className="text-muted">{student.code} · {student.goal || '-'} · {student.age || '-'} anos</div>
              <div className="text-xs text-muted mt-xs">Ciclo: <strong style={{ color: 'var(--primary)' }}>{selectedCycle || 'Todos os Ciclos'}</strong></div>
            </div>
          </div>

          <div className="stats-grid mb-lg" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
            <div className="stat-card"><div className="stat-label">Sessões</div><div className="stat-value text-gradient">{completed.length}</div><div className="text-xs text-muted" style={{ marginTop: 4 }}>realizadas</div></div>
            <div className="stat-card"><div className="stat-label">Volume Total</div><div className="stat-value text-gradient">{(totalVolAllSessions/1000).toFixed(1)}t</div><div className="text-xs text-muted" style={{ marginTop: 4 }}>{totalVolAllSessions.toLocaleString('pt-BR')} kg</div></div>
            <div className="stat-card"><div className="stat-label">PSE Média</div><div className="stat-value" style={{ color: pseNum > 8 ? 'var(--danger)' : pseNum > 6 ? 'var(--warning)' : 'var(--success)' }}>{avgPse}</div><div className="text-xs text-muted" style={{ marginTop: 4 }}>{pseNum > 8 ? 'Alta — atenção' : pseNum > 6 ? 'Adequada' : 'Leve'}</div></div>
            <div className="stat-card"><div className="stat-label">Sono Médio</div><div className="stat-value" style={{ color: sleepNum < 5 ? 'var(--danger)' : sleepNum < 7 ? 'var(--warning)' : 'var(--success)' }}>{avgSleep}</div><div className="text-xs text-muted" style={{ marginTop: 4 }}>{sleepNum < 5 ? 'Insuficiente' : sleepNum < 7 ? 'Regular' : 'Bom'}</div></div>
            <div className="stat-card"><div className="stat-label">Carga Total</div><div className="stat-value text-gradient">{Math.round(totalLoad)}</div><div className="text-xs text-muted" style={{ marginTop: 4 }}>PSE × duração</div></div>
          </div>

          <div className="stats-grid mb-lg" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div className="stat-card" style={{ padding: 12, textAlign: 'center' }}><div className="stat-label" style={{ fontSize: '0.65rem' }}>Média/Sessão</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>{avgVolPerSession.toLocaleString('pt-BR')} kg</div><div className="text-xs text-muted" style={{ marginTop: 2 }}>volume por treino</div></div>
            <div className="stat-card" style={{ padding: 12, textAlign: 'center' }}><div className="stat-label" style={{ fontSize: '0.65rem' }}>Maior Volume</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--warning)' }}>{maxVolSession.toLocaleString('pt-BR')} kg</div><div className="text-xs text-muted" style={{ marginTop: 2 }}>em uma sessão</div></div>
            <div className="stat-card" style={{ padding: 12, textAlign: 'center' }}><div className="stat-label" style={{ fontSize: '0.65rem' }}>Duração Média</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{avgDuration} min</div><div className="text-xs text-muted" style={{ marginTop: 2 }}>por sessão</div></div>
          </div>

          <div className="card mb-lg" style={{ borderLeft: '3px solid var(--primary)', background: 'rgba(16,185,129,0.03)' }}>
            <div className="card-header"><span className="card-title">Resumo</span></div>
            <p className="text-sm" style={{ lineHeight: 1.8 }}>
              {pseNum > 8 ? 'Atenção: Seus treinos estão muito intensos! Vamos reduzir um pouco o ritmo para seu corpo se recuperar melhor. ' : pseNum > 6 ? 'Você está treinando no nível ideal! Continue assim, seu corpo está respondendo muito bem. ' : 'Você ainda tem bastante fôlego! Podemos aumentar a intensidade gradualmente. '}
              {sleepNum > 0 && sleepNum < 6 ? 'Seu sono está abaixo do ideal — tente dormir entre 7 e 9 horas. ' : sleepNum >= 7 ? 'Ótimo sono! Isso ajuda muito na recuperação. ' : ''}
              {completed.length > 0 && `Você completou ${completed.length} sessão(ões) no período.`}
            </p>
          </div>

          {loadProgression.length > 0 ? (
            <div className="card mb-lg">
              <div className="card-header"><span className="card-title">Progressão de Carga por Exercício</span><span className="text-xs text-muted">{loadProgression.length} exercícios</span></div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Exercício</th><th style={{ textAlign: 'center' }}>1ª Carga</th><th style={{ textAlign: 'center' }}>Última</th><th style={{ textAlign: 'center' }}>Máximo</th><th style={{ textAlign: 'center' }}>Δ Carga</th><th style={{ textAlign: 'center' }}>Evolução</th></tr></thead>
                  <tbody>
                    {loadProgression.map((p, i) => {
                      const deltaColor = p.delta > 0 ? 'var(--success)' : p.delta < 0 ? 'var(--danger)' : 'var(--text-muted)';
                      return (
                        <tr key={i}>
                          <td><strong style={{ fontSize: '0.85rem' }}>{p.name}</strong></td>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.first.load}kg</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.last.load}kg</td>
                          <td style={{ textAlign: 'center', color: 'var(--warning)', fontWeight: 600 }}>{p.maxLoad}kg</td>
                          <td style={{ textAlign: 'center', color: deltaColor, fontWeight: 700 }}>{p.delta > 0 ? '+' : ''}{p.delta}kg</td>
                          <td style={{ textAlign: 'center' }}><span style={{ color: deltaColor, fontWeight: 700 }}>{p.delta > 0 ? '↑' : p.delta < 0 ? '↓' : '='} {Math.abs(p.pct)}%</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-sm" style={{ height: 200, position: 'relative' }}>
                <Line data={{
                  datasets: loadProgression.slice(0,3).map((p, i) => {
                    const colors = ['#10b981','#06b6d4','#f59e0b'];
                    return { label: p.name, data: p.points.map(pt => ({ x: Calc.formatDate(pt.date).slice(0,5), y: pt.load })), borderColor: colors[i], backgroundColor: colors[i]+'15', tension: 0.3, fill: false };
                  })
                }} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { type: 'category' } } }} />
              </div>
            </div>
          ) : (
            <div className="card mb-lg"><div className="card-header"><span className="card-title">Progressão de Carga</span></div><p className="text-muted text-sm" style={{ padding: '16px 0' }}>Sem sessões suficientes registradas.</p></div>
          )}

          <div className="grid-2 mb-lg">
            <div className="card">
              <div className="card-header"><span className="card-title">Evolução do Bem-estar</span></div>
              <div style={{ height: 280, position: 'relative' }}>
                {bfWellness.length > 1 ? (
                  <Line data={{
                    labels: bfWellness.map(b => Calc.formatDate(b.date).slice(0,5)),
                    datasets: [
                      { label: 'Sono', data: bfWellness.map(b => b.sleep || null), borderColor: '#8b5cf6', fill: false, tension: 0.3 },
                      { label: 'Disp.', data: bfWellness.map(b => b.mood || null), borderColor: '#10b981', fill: false, tension: 0.3 },
                      { label: 'Energ.', data: bfWellness.map(b => b.energy || null), borderColor: '#06b6d4', fill: false, tension: 0.3 },
                      { label: 'Estresse', data: bfWellness.map(b => b.stress || null), borderColor: '#f59e0b', borderDash: [5,3], fill: false, tension: 0.3 },
                    ]
                  }} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { min: 0, max: 10 } } }} />
                ) : <p className="text-muted text-center" style={{ marginTop: 100 }}>Dados insuficientes</p>}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Carga Semanal</span></div>
              <div style={{ height: 280, position: 'relative' }}>
                <Bar data={{
                  labels: wksKeys.map(k => new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                  datasets: [{ label: 'Carga', data: wksKeys.map(k => wks[k]), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }]
                }} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              </div>
            </div>
          </div>

          <div className="grid-2 mb-lg">
            <div className="card">
              <div className="card-header"><span className="card-title">Frequência Semanal</span></div>
              <div style={{ height: 220, position: 'relative' }}>
                <Bar data={{
                  labels: freqKeys.map(k => new Date(k + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
                  datasets: [{ label: 'Sessões', data: freqKeys.map(k => freqC[k]), backgroundColor: 'rgba(6,182,212,0.5)', borderColor: '#06b6d4', borderWidth: 1, borderRadius: 4 }]
                }} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }} />
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Radar de Wellness</span></div>
              <div style={{ height: 220, position: 'relative' }}>
                {bf.length > 0 ? (() => {
                  const l5 = bf.slice(-5); const avg = k => l5.reduce((s, b) => s + (b[k] || 0), 0) / l5.length;
                  return <Radar data={{
                    labels: ['Sono', 'Disposição', 'Energia', 'Baixo Estresse', 'Sem Dor'],
                    datasets: [{ label: 'Média (últimos 5)', data: [avg('sleep'), avg('mood'), avg('energy'), 10 - avg('stress'), 10 - (avg('pain') || 0)], backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', pointBackgroundColor: '#10b981' }]
                  }} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } }, plugins: { legend: { display: false } } }} />
                })() : <p className="text-muted text-center" style={{ marginTop: 80 }}>Sem registros</p>}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
