import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const MENU = [
  { path: '/', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/alunos', label: 'Alunos', icon: '👥' },
  { path: '/treinos', label: 'Treinos', icon: '💪' },
  { path: '/tracker', label: 'Ao Vivo', icon: '▶️' },
  { path: '/agenda', label: 'Agenda', icon: '📅' },
  { path: '/periodizacao', label: 'Periodização', icon: '📈' },
  { path: '/avaliacoes', label: 'Avaliações', icon: '📋' },
  { path: '/biofeedback', label: 'Biofeedback', icon: '🔬' },
  { path: '/cardio', label: 'Cardio', icon: '🏃' },
  { path: '/semanal', label: 'Resumo Semanal', icon: '📆' },
  { path: '/financeiro', label: 'Financeiro', icon: '💰' },
  { path: '/relatorios', label: 'Relatórios', icon: '📑' },
  { path: '/exercicios', label: 'Exercícios', icon: '🏋️' },
  { path: '/anamnese', label: 'Anamnese', icon: '📝' },
  { path: '/tutorial', label: 'Tutorial', icon: '🎓' },
  { path: '/config', label: 'Configurações', icon: '⚙️' },
];

export default function AppLayout() {
  const { trainerName, initials, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pp_sidebar_collapsed') === 'true');

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('pp_sidebar_collapsed', String(next));
  }

  async function handleLogout() {
    if (!window.confirm('Tem certeza que deseja sair?')) return;
    await signOut();
    navigate('/login');
  }

  return (
    <div className={`app-layout${collapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          {!collapsed && (
            <div className="sidebar-brand">
              <span className="brand-icon">⚡</span>
              <div>
                <div className="brand-name">Personal PRO</div>
                <div className="brand-sub">Sistema de Treinamento</div>
              </div>
            </div>
          )}
          <button className="sidebar-collapse-btn" onClick={toggleCollapse} title={collapsed ? 'Expandir' : 'Recolher'}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {MENU.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{trainerName}</div>
                <div className="user-role">Personal Trainer</div>
              </div>
            )}
          </div>
          <button id="logoutBtn" className="logout-btn" onClick={handleLogout} title="Sair">
            {collapsed ? '🚪' : '🚪 Sair'}
          </button>
        </div>
      </aside>

      <main className="main-content" id="pageContent">
        <Outlet />
      </main>
    </div>
  );
}
