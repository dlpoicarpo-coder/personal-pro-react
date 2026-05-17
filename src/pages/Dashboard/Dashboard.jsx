import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function Avatar({ name, size = 'sm', style = {} }) {
  const initials = name?.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const sz = size === 'sm' ? 36 : 48;
  return (
    <div style={{ width: sz, height: sz, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size === 'sm' ? '0.75rem' : '0.95rem', color: '#fff', flexShrink: 0, ...style }}>
      {initials}
    </div>
  );
}

function StatCard({ value, label, sub, subColor }) {
  return (
    <div className="stat-card">
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg,var(--accent),#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: subColor || 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

const rowStyle = { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '8px 0', borderBottom: '1px solid var(--border)' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [students, workouts, assessments, biofeedback, sessions, schedules, financial] = await Promise.all([
      db.getAll('students'), db.getAll('workouts'), db.getAll('assessments'),
      db.getAll('biofeedback'), db.getAll('sessions'), db.getAll('calendar_events'), db.getAll('financial')
    ]);

    const now = new Date();
    const thisMonth = now.getMonth(), thisYear = now.getFullYear();
    const activeStudents = students.filter(s => s.status === 'Ativo');

    const monthSessions = sessions.filter(s => {
      if (s.status !== 'completed') return false;
      const d = new Date(s.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const todayStr = now.toISOString().slice(0, 10);
    const todaySchedules = schedules.filter(s => (s.date === todayStr || s.weekdays?.includes(now.getDay())) && s.studentId);

    const monthRevenue = financial
      .filter(f => { if (f.status !== 'Pago') return false; const d = new Date(f.paidDate || f.dueDate || 0); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
      .reduce((t, f) => t + (parseFloat(f.amount) || 0), 0);

    const monthScheduled = schedules.filter(s => { const d = new Date(s.date); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; });
    const adherenceRate = monthScheduled.length > 0 ? Math.round((monthSessions.length / monthScheduled.length) * 100) : 0;

    const recentBf = [...biofeedback].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    const avgSleep = recentBf.length ? (recentBf.reduce((s, b) => s + (b.sono || 0), 0) / recentBf.length).toFixed(1) : '—';
    const alerts = recentBf.filter(b => (b.sono || 10) < 5 || (b.estresse || 0) >= 8 || (b.dorMuscular || 0) >= 6);

    const needsAssessment = activeStudents.filter(s => {
      const last = assessments.filter(a => a.studentId === s.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (!last) return true;
      return (now - new Date(last.date)) > 30 * 86400000;
    });

    // Weekly bar chart data (sessions per weekday, last 7 days)
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekData = new Array(7).fill(0);
    sessions.forEach(s => {
      const d = new Date(s.date);
      const diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < 7) weekData[d.getDay()]++;
    });

    setData({ students, activeStudents, monthSessions, todaySchedules, monthRevenue, adherenceRate, avgSleep, alerts, needsAssessment, recentBf, days, weekData, now });
  }

  if (!data) return <div className="page-loading"><div className="spinner" /></div>;
  const { students, activeStudents, monthSessions, todaySchedules, monthRevenue, adherenceRate, avgSleep, alerts, needsAssessment, recentBf, days, weekData, now } = data;

  const getStudent = id => students.find(s => s.id === id);
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const chartData = {
    labels: days,
    datasets: [{ label: 'Sessões', data: weekData, backgroundColor: 'rgba(16,185,129,0.6)', borderColor: 'rgb(16,185,129)', borderWidth: 1, borderRadius: 6 }]
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{dateStr}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tracker')}>▶ Iniciar Treino</button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard value={activeStudents.length} label="Alunos Ativos" sub={`de ${students.length} cadastrados`} />
        <StatCard value={monthSessions.length} label="Sessões no Mês"
          sub={`${adherenceRate}% de adesão`} subColor={adherenceRate >= 70 ? 'var(--accent)' : '#ef4444'} />
        <StatCard value={monthRevenue > 0 ? `R$ ${Math.round(monthRevenue).toLocaleString('pt-BR')}` : '—'}
          label="Receita do Mês" sub={now.toLocaleDateString('pt-BR', { month: 'long' })} />
        <StatCard value={avgSleep} label="Média de Sono" sub="últimos check-ins" />
      </div>

      {/* Biofeedback Alerts */}
      {alerts.length > 0 && (
        <div className="card mb-lg" style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: '#f59e0b' }}>
              ⚠️ Alertas de Biofeedback ({alerts.length})
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/biofeedback')}>Ver todos →</button>
          </div>
          <div style={{ padding: '0 1.5rem' }}>
            {alerts.slice(0, 3).map((b, i) => {
              const st = getStudent(b.studentId);
              const issues = [];
              if ((b.sono || 10) < 5) issues.push(`Sono baixo: ${b.sono}/10`);
              if ((b.estresse || 0) >= 8) issues.push(`Estresse alto: ${b.estresse}/10`);
              if ((b.dorMuscular || 0) >= 6) issues.push(`Dor: ${b.dorMuscular}/10`);
              return (
                <div key={i} style={{ ...rowStyle }}>
                  <Avatar name={st?.name || '?'} style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{st?.name || 'Aluno'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>{issues.join(' · ')}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{Calc.formatDate(b.date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: Treinos Hoje + Alunos Ativos */}
      <div className="charts-grid mb-lg">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Treinos Hoje</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/agenda')}>Agenda →</button>
          </div>
          {todaySchedules.length > 0 ? (
            <div style={{ padding: '0 1.5rem' }}>
              {todaySchedules.slice(0, 5).map((s, i) => {
                const st = getStudent(s.studentId);
                return (
                  <div key={i} style={rowStyle}>
                    <Avatar name={st?.name || '?'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{st?.name || 'Aluno'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.time || ''}{s.workoutName ? ` · ${s.workoutName}` : ''}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/tracker')}>▶</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Nenhum treino agendado para hoje</p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/agenda')}>Ver Agenda</button>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Alunos Ativos</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/alunos')}>Ver todos →</button>
          </div>
          {activeStudents.length > 0 ? (
            <div style={{ padding: '0 1.5rem' }}>
              {activeStudents.slice(0, 5).map((s, i) => {
                // last completed session
                const lastSession = data.students && [...(data.monthSessions || [])].filter(x => x.studentId === s.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                const daysSince = lastSession ? Math.floor((now - new Date(lastSession.date)) / 86400000) : null;
                return (
                  <div key={i} style={rowStyle}>
                    <Avatar name={s.name} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.goal || 'Sem objetivo'}</div>
                    </div>
                    {daysSince !== null && <span style={{ fontSize: '0.75rem', color: daysSince > 7 ? '#f59e0b' : 'var(--accent)' }}>{daysSince}d</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-secondary)' }}>Nenhum aluno</h3>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/alunos')}>+ Novo Aluno</button>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Biofeedback + Reavaliação Pendente */}
      <div className="charts-grid mb-lg">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Biofeedback Recente</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/biofeedback')}>Ver todos →</button>
          </div>
          {recentBf.length > 0 ? (
            <div style={{ padding: '0 1.5rem' }}>
              {recentBf.slice(0, 5).map((b, i) => {
                const st = getStudent(b.studentId);
                const sleepColor = (b.sono || 0) < 5 ? '#ef4444' : (b.sono || 0) < 7 ? '#f59e0b' : 'var(--accent)';
                return (
                  <div key={i} style={rowStyle}>
                    <Avatar name={st?.name || '?'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{st?.name || 'Aluno'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{Calc.formatDate(b.date)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <span style={{ color: sleepColor }}>Sono {b.sono || '—'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Humor {b.humor || '—'}</span>
                      <span>Est {b.estresse || '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Os check-ins aparecerão aqui</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Reavaliação Pendente</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/avaliacoes')}>Avaliações →</button>
          </div>
          {needsAssessment.length > 0 ? (
            <div style={{ padding: '0 1.5rem' }}>
              {needsAssessment.slice(0, 5).map((s, i) => {
                const lastAss = data.students && [...([] /* assessments filtered */)]
                  .filter(a => a.studentId === s.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                return (
                  <div key={i} style={rowStyle}>
                    <Avatar name={s.name} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nunca avaliado</div>
                    </div>
                    <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => navigate('/avaliacoes')}>Avaliar</button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Todos os alunos estão em dia ✅</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="card">
        <div className="card-header"><span className="card-title">Atividade Semanal</span></div>
        <div style={{ height: 220, padding: '1rem 1.5rem' }}>
          <Bar data={chartData} options={chartOpts} />
        </div>
      </div>
    </div>
  );
}
