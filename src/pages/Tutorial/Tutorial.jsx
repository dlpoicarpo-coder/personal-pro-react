import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { icon: '👥', title: 'Cadastro de Alunos', route: '/alunos', desc: 'Comece cadastrando seus alunos com dados pessoais, objetivo e status. Cada aluno é isolado por conta — nenhum trainer vê dados de outro.' },
  { icon: '💪', title: 'Criação de Treinos', route: '/treinos', desc: 'Monte treinos personalizados com exercícios da biblioteca. Defina séries, reps, carga e descanso para cada exercício.' },
  { icon: '📈', title: 'Periodização', route: '/periodizacao', desc: 'Crie macrociclos (Linear, DUP ou por Blocos). O sistema gera automaticamente a progressão de intensidade semana a semana.' },
  { icon: '📅', title: 'Agenda', route: '/agenda', desc: 'Agende treinos no calendário. Permite repetição semanal automática para treinos fixos. Clique num dia para agendar ou ver eventos.' },
  { icon: '▶️', title: 'Treino ao Vivo', route: '/tracker', desc: 'Acompanhe a sessão em tempo real. Timer automático, registro de séries/reps/carga e progress bar de conclusão.' },
  { icon: '📋', title: 'Avaliações', route: '/avaliacoes', desc: 'Registre avaliações corporais (peso, IMC, gordura) e calcule automaticamente as Zonas de FC via Karvonen baseado na idade do aluno.' },
  { icon: '🔬', title: 'Biofeedback', route: '/biofeedback', desc: 'Monitore bem-estar com sliders 1–10 para Energia, Sono, Dor, Estresse, Humor e Apetite. Identifique padrões de recuperação.' },
  { icon: '🏃', title: 'Treino Cardiovascular', route: '/cardio', desc: 'Planeje sessões de cardio com 6 métodos: Z2, Z4, HIIT, Tabata, SIT e Polarizado. FC-alvo calculada por aluno.' },
  { icon: '💰', title: 'Financeiro', route: '/financeiro', desc: 'Controle mensalidades, pacotes e pagamentos. Veja totais de receita recebida e pendente.' },
  { icon: '📑', title: 'Relatórios', route: '/relatorios', desc: 'Dossiê completo do aluno: gráfico de evolução corporal, periodização colorida e radar de bem-estar.' },
  { icon: '📝', title: 'Anamnese', route: '/anamnese', desc: 'Gere um link público para novos alunos preencherem o formulário de anamnese. Os dados chegam aqui e você converte em aluno.' },
  { icon: '⚙️', title: 'Configurações', route: '/config', desc: 'Configure seu nome, CREF, tema claro/escuro e faça backup dos dados.' },
];

export default function Tutorial() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tutorial Interativo</h1>
          <p className="page-subtitle">Guia completo do Personal PRO — {STEPS.length} módulos</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'1.5rem', alignItems:'start' }}>
        {/* Step list */}
        <div className="card" style={{ position:'sticky', top:'1rem' }}>
          <div className="card-header"><span className="card-title">Módulos</span></div>
          <div style={{ padding:'0.5rem' }}>
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.65rem 0.9rem', borderRadius:8, border:'none', background: active===i ? 'rgba(16,185,129,0.12)' : 'transparent', color: active===i ? 'var(--accent)' : 'var(--text-secondary)', cursor:'pointer', textAlign:'left', fontWeight: active===i ? 700 : 500, fontSize:'0.875rem', transition:'all 0.15s' }}>
                <span style={{ fontSize:'1.1rem', width:24, textAlign:'center' }}>{s.icon}</span>
                <span>{s.title}</span>
                {active===i && <span style={{ marginLeft:'auto', fontSize:'0.7rem' }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Step detail */}
        <div>
          <div className="card">
            <div className="card-header">
              <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                <span style={{ fontSize:'2rem' }}>{STEPS[active].icon}</span>
                <span className="card-title" style={{ fontSize:'1.1rem' }}>{STEPS[active].title}</span>
              </div>
              <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{active+1}/{STEPS.length}</span>
            </div>
            <div style={{ padding:'2rem 1.5rem' }}>
              <p style={{ color:'var(--text-secondary)', lineHeight:1.8, fontSize:'1rem', marginBottom:'2rem' }}>{STEPS[active].desc}</p>
              <button className="btn btn-primary" onClick={() => navigate(STEPS[active].route)}>Ir para {STEPS[active].title} →</button>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1rem' }}>
            <button className="btn btn-outline" onClick={() => setActive(a => Math.max(0,a-1))} disabled={active===0}>‹ Anterior</button>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              {STEPS.map((_,i) => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background: i===active ? 'var(--accent)' : 'var(--border)', transition:'background 0.2s' }} />)}
            </div>
            <button className="btn btn-primary" onClick={() => setActive(a => Math.min(STEPS.length-1,a+1))} disabled={active===STEPS.length-1}>Próximo ›</button>
          </div>
        </div>
      </div>
    </div>
  );
}
