import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { Line, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [biofeedback, setBiofeedback] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { db.getAll('students').then(s => setStudents(s.sort((a,b) => a.name?.localeCompare(b.name)))); }, []);

  async function loadReport(sid) {
    setSelectedStudent(sid); if (!sid) return;
    setLoading(true);
    const [a, b, s, m] = await Promise.all([
      db.getAll('assessments'), db.getAll('biofeedback'), db.getAll('sessions'), db.getAll('macrocycles')
    ]);
    setAssessments(a.filter(x => x.studentId === sid).sort((a,b) => new Date(a.date)-new Date(b.date)));
    setBiofeedback(b.filter(x => x.studentId === sid).sort((a,b) => new Date(a.date)-new Date(b.date)));
    setSessions(s.filter(x => x.studentId === sid).sort((a,b) => new Date(a.date)-new Date(b.date)));
    setMacros(m.filter(x => x.studentId === sid));
    setLoading(false);
  }

  const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'var(--text-secondary)' } } }, scales: { x: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.05)' } } } };

  const weightData = assessments.length > 1 ? {
    labels: assessments.map(a => a.date ? new Date(a.date).toLocaleDateString('pt-BR') : ''),
    datasets: [
      { label: 'Peso (kg)', data: assessments.map(a => a.weight), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.4 },
      { label: '% Gordura', data: assessments.map(a => a.bodyFat), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
    ]
  } : null;

  const biofeedbackAvg = biofeedback.length > 0 ? {
    energia: biofeedback.reduce((s,r) => s + (r.energia||0), 0) / biofeedback.length,
    sono: biofeedback.reduce((s,r) => s + (r.sono||0), 0) / biofeedback.length,
    dorMuscular: biofeedback.reduce((s,r) => s + (r.dorMuscular||0), 0) / biofeedback.length,
    estresse: biofeedback.reduce((s,r) => s + (r.estresse||0), 0) / biofeedback.length,
    humor: biofeedback.reduce((s,r) => s + (r.humor||0), 0) / biofeedback.length,
    apetite: biofeedback.reduce((s,r) => s + (r.apetite||0), 0) / biofeedback.length,
  } : null;

  const radarData = biofeedbackAvg ? {
    labels: ['Energia','Sono','Dor Muscular','Estresse','Humor','Apetite'],
    datasets: [{ label: 'Média Biofeedback', data: Object.values(biofeedbackAvg).map(v => v.toFixed(1)), backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10b981', pointBackgroundColor: '#10b981' }]
  } : null;

  const student = students.find(s => s.id === selectedStudent);
  const activeMacro = macros.find(m => m.studentId === selectedStudent);

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Relatórios</h1><p className="page-subtitle">Dossiê de performance do aluno</p></div></div>

      <div className="form-group" style={{ maxWidth:300, marginBottom:'1.5rem' }}>
        <label className="form-label">Selecione o Aluno</label>
        <select className="form-select" value={selectedStudent} onChange={e => loadReport(e.target.value)}>
          <option value="">Selecione</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading && <div className="page-loading"><div className="spinner" /></div>}

      {selectedStudent && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
          {/* Student summary */}
          <div className="card">
            <div className="card-header"><span className="card-title">Resumo do Aluno</span></div>
            <div style={{ padding:'1rem 1.5rem', display:'flex', gap:'2rem', flexWrap:'wrap' }}>
              <div><div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Nome</div><div style={{ fontWeight:600 }}>{student?.name}</div></div>
              <div><div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Objetivo</div><div style={{ fontWeight:600 }}>{student?.goal || '—'}</div></div>
              <div><div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Sessões</div><div style={{ fontWeight:600, color:'#10b981' }}>{sessions.length}</div></div>
              <div><div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Avaliações</div><div style={{ fontWeight:600 }}>{assessments.length}</div></div>
              {activeMacro && <div><div style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>Macrociclo Ativo</div><div style={{ fontWeight:600 }}>{activeMacro.name} ({activeMacro.weeks}sem)</div></div>}
            </div>
          </div>

          {/* Periodization */}
          {activeMacro && (
            <div className="card">
              <div className="card-header"><span className="card-title">Periodização — {activeMacro.name}</span></div>
              <div style={{ display:'flex', gap:4, padding:'1rem 1.5rem', flexWrap:'wrap' }}>
                {(activeMacro.weekIntensities||[]).map((w,i) => {
                  const c = w.intensity<=55?'#64748b':w.intensity<=65?'#10b981':w.intensity<=75?'#06b6d4':w.intensity<=82?'#f59e0b':w.intensity<=89?'#f97316':'#ef4444';
                  return <div key={i} style={{ background:c, borderRadius:6, padding:'4px 8px', color:'#fff', fontSize:'0.72rem', textAlign:'center', minWidth:40 }}><div style={{ fontWeight:700 }}>S{w.week}</div><div>{w.intensity}%</div></div>;
                })}
              </div>
            </div>
          )}

          {/* Weight/body chart */}
          {weightData && (
            <div className="card">
              <div className="card-header"><span className="card-title">Evolução Corporal</span></div>
              <div style={{ padding:'1rem 1.5rem', height:260 }}><Line data={weightData} options={chartDefaults} /></div>
              <div style={{ padding:'0 1.5rem 1rem', color:'var(--text-muted)', fontSize:'0.82rem' }}>Gráfico de peso e percentual de gordura ao longo das avaliações. Queda no peso + redução de gordura indica recomposição corporal positiva.</div>
            </div>
          )}

          {/* Radar */}
          {radarData && (
            <div className="card">
              <div className="card-header"><span className="card-title">Radar de Bem-Estar (Biofeedback Médio)</span></div>
              <div style={{ padding:'1rem', height:300, display:'flex', justifyContent:'center' }}><Radar data={radarData} options={{ ...chartDefaults, scales: { r: { suggestedMin:0, suggestedMax:10, ticks:{ color:'var(--text-muted)' }, grid:{ color:'rgba(255,255,255,0.1)' }, pointLabels:{ color:'var(--text-secondary)' } } } }} /></div>
              <div style={{ padding:'0 1.5rem 1rem', color:'var(--text-muted)', fontSize:'0.82rem' }}>Média de todos os registros de biofeedback. Valores acima de 7 indicam boa recuperação; abaixo de 4 requerem atenção.</div>
            </div>
          )}

          {assessments.length === 0 && sessions.length === 0 && biofeedback.length === 0 && (
            <div className="empty-state"><div className="empty-icon">📑</div><h3>Nenhum dado disponível</h3><p>Adicione avaliações, sessões e biofeedback para gerar o relatório</p></div>
          )}
        </div>
      )}
    </div>
  );
}
