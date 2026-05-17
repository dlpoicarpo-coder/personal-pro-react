import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const chartOpts = (title) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: 'var(--text-secondary)', font: { family: 'Inter' } } } },
  scales: {
    x: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
  }
});

export default function Dashboard() {
  const { trainerName } = useAuth();
  const [stats, setStats] = useState({ students: 0, activeStudents: 0, sessions: 0, workouts: 0, revenue: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [sessionsChartData, setSessionsChartData] = useState(null);
  const [studentStatusData, setStudentStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [students, sessions, workouts, financial] = await Promise.all([
        db.getAll('students'),
        db.getAll('sessions'),
        db.getAll('workouts'),
        db.getAll('financial'),
      ]);

      const activeStudents = students.filter(s => s.status === 'Ativo').length;
      const revenue = financial.filter(f => f.status === 'Pago').reduce((s, f) => s + (f.amount || 0), 0);

      setStats({
        students: students.length,
        activeStudents,
        sessions: sessions.length,
        workouts: workouts.length,
        revenue
      });

      // Recent sessions (last 5)
      const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      const withNames = await Promise.all(sorted.map(async s => {
        const student = await db.get('students', s.studentId);
        return { ...s, studentName: student?.name || 'Aluno' };
      }));
      setRecentSessions(withNames);

      // Sessions per last 7 days
      const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
      const sessPerDay = last7.map(day => sessions.filter(s => s.date?.slice(0, 10) === day).length);
      setSessionsChartData({
        labels: last7.map(d => d.slice(5)),
        datasets: [{
          label: 'Sessões',
          data: sessPerDay,
          fill: true,
          backgroundColor: 'rgba(16,185,129,0.15)',
          borderColor: '#10b981',
          tension: 0.4
        }]
      });

      // Student status donut
      const ativo = activeStudents;
      const inativo = students.filter(s => s.status === 'Inativo').length;
      const pausado = students.filter(s => s.status === 'Pausado').length;
      setStudentStatusData({
        labels: ['Ativos', 'Inativos', 'Pausados'],
        datasets: [{
          data: [ativo, inativo, pausado],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
          borderWidth: 0
        }]
      });
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {trainerName.split(' ')[0]}! 👋</h1>
          <p className="page-subtitle">Visão geral da sua plataforma</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }}>👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeStudents}</div>
            <div className="stat-label">Alunos Ativos</div>
          </div>
          <div className="stat-sub">de {stats.students} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' }}>💪</div>
          <div className="stat-info">
            <div className="stat-value">{stats.sessions}</div>
            <div className="stat-label">Sessões Realizadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>📋</div>
          <div className="stat-info">
            <div className="stat-value">{stats.workouts}</div>
            <div className="stat-label">Treinos Criados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>💰</div>
          <div className="stat-info">
            <div className="stat-value">R$ {stats.revenue.toFixed(2)}</div>
            <div className="stat-label">Receita Confirmada</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {sessionsChartData && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Sessões — Últimos 7 dias</span>
            </div>
            <div style={{ height: 220 }}>
              <Line data={sessionsChartData} options={chartOpts('Sessões')} />
            </div>
          </div>
        )}
        {studentStatusData && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Status dos Alunos</span>
            </div>
            <div style={{ height: 220, display: 'flex', justifyContent: 'center' }}>
              <Doughnut data={studentStatusData} options={{ ...chartOpts(), scales: undefined }} />
            </div>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sessões Recentes</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Data</th>
                <th>Duração</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map(s => (
                <tr key={s.id}>
                  <td>{s.studentName}</td>
                  <td>{s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td>{s.duration ? `${Math.round(s.duration / 60)} min` : '—'}</td>
                  <td><span className={`badge badge-${s.status === 'completed' ? 'success' : 'warning'}`}>{s.status || 'Em andamento'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
