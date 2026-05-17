import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import { ICONS } from '../../utils/icons';

const MENU = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', exact: true },
  { path: '/alunos', label: 'Alunos', icon: 'students' },
  { path: '/treinos', label: 'Treinos', icon: 'workouts' },
  { path: '/tracker', label: 'Ao Vivo', icon: 'tracker', highlight: true },
  { path: '/agenda', label: 'Agenda', icon: 'calendar' },
  { path: '/periodizacao', label: 'Periodização', icon: 'periodization' },
  { path: '/avaliacoes', label: 'Avaliações', icon: 'assessments' },
  { path: '/biofeedback', label: 'Biofeedback', icon: 'biofeedback' },
  { path: '/cardio', label: 'Cardio', icon: 'workouts' }, // fallback icon
  { path: '/semanal', label: 'Resumo Semanal', icon: 'weekly' },
  { path: '/financeiro', label: 'Financeiro', icon: 'financial' },
  { path: '/relatorios', label: 'Relatórios', icon: 'reports' },
  { path: '/exercicios', label: 'Exercícios', icon: 'exercises' },
  { path: '/anamnese', label: 'Anamnese', icon: 'assessments' },
  { path: '/tutorial', label: 'Tutorial', icon: 'weekly' },
  { path: '/config', label: 'Configurações', icon: 'settings' },
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
                <div className="brand-name">Personal<strong className="logo-pro" style={{background: 'linear-gradient(180deg, #10b981, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>PRO</strong></div>
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
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''} ${item.highlight ? 'sidebar-link-highlight' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="sidebar-icon-svg" dangerouslySetInnerHTML={{ __html: ICONS[item.icon] || '' }}></span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
              {item.highlight && <span className="live-dot"></span>}
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
          <button id="logoutBtn" className="logout-btn" onClick={handleLogout} title="Sair" style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem', padding: '8px', opacity: 0.8, display: 'flex', alignItems: 'center', borderRadius: '6px'}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            {!collapsed && <span style={{marginLeft: 8, fontSize: '0.8rem', fontWeight: 600}}>Sair</span>}
          </button>
        </div>
      </aside>

      <main className="main-content" id="pageContent">
        <Outlet />
      </main>
    </div>
  );
}
