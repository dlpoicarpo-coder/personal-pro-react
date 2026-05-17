import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const ICON_EYE = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

const RM_EXERCISES = [
  'Supino Reto com Barra', 'Agachamento Livre com Barra', 'Levantamento Terra',
  'Desenvolvimento com Barra', 'Puxada Frontal', 'Rosca Direta com Barra',
  'Leg Press 45°', 'Remada Curvada com Barra', 'Supino Inclinado com Halteres',
  'Hip Thrust', 'Stiff com Barra', 'Tríceps Pulley',
];

function rm1Zones(rm1) {
  return [
    { pct: 100, reps: '1', label: 'Força Máxima', color: '#ef4444' },
    { pct: 95, reps: '2-3', label: 'Força Máxima', color: '#ef4444' },
    { pct: 90, reps: '3-4', label: 'Força', color: '#f97316' },
    { pct: 85, reps: '4-6', label: 'Força/Hipertrofia', color: '#f97316' },
    { pct: 80, reps: '6-8', label: 'Hipertrofia', color: '#eab308' },
    { pct: 75, reps: '8-10', label: 'Hipertrofia', color: '#eab308' },
    { pct: 70, reps: '10-12', label: 'Hipertrofia/RML', color: '#22c55e' },
    { pct: 65, reps: '12-15', label: 'Resistência', color: '#22c55e' },
    { pct: 60, reps: '15-20', label: 'Resistência Musc.', color: '#3b82f6' },
    { pct: 50, reps: '20+', label: 'Resistência Musc.', color: '#3b82f6' },
  ].map(z => ({ ...z, load: Math.round(rm1 * (z.pct / 100) * 2) / 2 }));
}

export default function Assessments() {
  const notify = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('composicao');
  const [students, setStudents] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [studentFilter, setStudentFilter] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [viewModal, setViewModal] = useState({ open: false, title: '', content: null });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const s = await db.getAll('students');
    const a = await db.getAll('assessments');
    setStudents(s.sort((x, y) => x.name?.localeCompare(y.name)));
    setAssessments(a.sort((x, y) => new Date(y.date) - new Date(x.date)));
    setLoading(false);
  }

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);
  const filteredAss = useMemo(() => studentFilter ? assessments.filter(a => a.studentId === studentFilter) : assessments, [assessments, studentFilter]);

  const compAss = filteredAss.filter(a => a.type === 'composicao');
  const forcaAss = filteredAss.filter(a => a.type === 'forca');
  const concAss = filteredAss.filter(a => a.type === 'conconi');

  const openNewAss = () => {
    if (['composicao', 'forca', 'conconi'].includes(tab)) {
      setModalType(tab);
    } else {
      setModalType('composicao');
    }
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Excluir esta avaliação?')) {
      await db.delete('assessments', id);
      notify('Avaliação removida', 'success');
      loadAll();
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Avaliações Físicas</h1>
          <p className="page-subtitle">{assessments.length} avaliação(ões) · {[...new Set(assessments.map(a => a.studentId))].length} alunos avaliados</p>
        </div>
        <div className="flex gap-sm">
          <select className="form-select" style={{ minWidth: 180 }} value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
            <option value="">Todos os alunos</option>
            {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openNewAss}>+ Nova Avaliação</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">COMPOSIÇÃO</div>
          <div className="stat-value text-gradient">{compAss.length}</div>
          <div className="stat-change">avaliações</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">FORÇA / 1RM</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{forcaAss.length}</div>
          <div className="stat-change">registros</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">CONCONI</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{concAss.length}</div>
          <div className="stat-change">testes</div>
        </div>
        <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}>
          <div className="stat-label">ALUNOS</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{[...new Set(assessments.map(a => a.studentId))].length}</div>
          <div className="stat-change">avaliados</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'composicao' ? 'active' : ''}`} onClick={() => setTab('composicao')}>Composição Corporal</button>
        <button className={`tab ${tab === 'forca' ? 'active' : ''}`} onClick={() => setTab('forca')}>Força & 1RM</button>
        <button className={`tab ${tab === 'protocolo1rm' ? 'active' : ''}`} onClick={() => setTab('protocolo1rm')}>Protocolo 1RM Submax</button>
        <button className={`tab ${tab === 'conconi' ? 'active' : ''}`} onClick={() => setTab('conconi')}>Protocolo Conconi</button>
        <button className={`tab ${tab === 'zonas' ? 'active' : ''}`} onClick={() => setTab('zonas')}>Zonas de Treino</button>
        <button className={`tab ${tab === 'evolucao' ? 'active' : ''}`} onClick={() => setTab('evolucao')}>Evolução</button>
        <button className={`tab ${tab === 'ficha' ? 'active' : ''}`} onClick={() => setTab('ficha')}>Ficha Completa</button>
      </div>

      {loading ? <div className="page-loading"><div className="spinner" /></div> : (
        <div className="assessment-panel">
          {tab === 'composicao' && <PanelComposicao data={compAss} students={students} onDelete={handleDelete} onView={(title, content) => setViewModal({ open: true, title, content })} />}
          {tab === 'forca' && <PanelForca data={forcaAss} students={students} onDelete={handleDelete} onView={(title, content) => setViewModal({ open: true, title, content })} />}
          {tab === 'protocolo1rm' && <PanelProtocolo1RM students={activeStudents} onSave={loadAll} />}
          {tab === 'conconi' && <PanelConconi data={concAss} students={students} onDelete={handleDelete} />}
          {tab === 'zonas' && <PanelZonas students={activeStudents} assessments={assessments} />}
          {tab === 'evolucao' && <PanelEvolucao students={activeStudents} assessments={assessments} />}
          {tab === 'ficha' && <PanelFicha students={activeStudents} assessments={assessments} />}
        </div>
      )}

      {/* Modals for new assessment */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`+ Avaliação de ${modalType === 'forca' ? 'Força / 1RM' : modalType === 'conconi' ? 'Conconi' : 'Composição Corporal'}`} size={modalType === 'composicao' ? 'xl' : 'lg'}>
        {modalType === 'composicao' && <FormComposicao students={activeStudents} onClose={() => setModalOpen(false)} onSave={loadAll} />}
        {modalType === 'forca' && <FormForca students={activeStudents} onClose={() => setModalOpen(false)} onSave={loadAll} />}
        {modalType === 'conconi' && <FormConconi students={activeStudents} onClose={() => setModalOpen(false)} onSave={loadAll} />}
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.open} onClose={() => setViewModal({ ...viewModal, open: false })} title={viewModal.title} size="lg">
        {viewModal.content}
      </Modal>
    </div>
  );
}

// ==========================================
// PANELS
// ==========================================

function PanelComposicao({ data, students, onDelete, onView }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">—</div><h3>Nenhuma avaliação de composição corporal</h3><p>Clique em "+ Nova Avaliação" para adicionar</p></div>;
  
  const handleView = (a) => {
    const st = students.find(s => s.id === a.studentId);
    const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
    const imcC = imc ? Calc.imcClassificacao(imc) : null;
    onView(`Avaliação — ${st?.name || 'Aluno'}`, (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            ['Data', Calc.formatDate(a.date)],
            ['Peso', a.peso ? a.peso + 'kg' : '-'],
            ['Altura', a.altura ? a.altura + 'cm' : '-'],
            ['IMC', imc ? `${Calc.formatNum(imc)} (${imcC?.label || '-'})` : '-'],
            ['% Gordura', a.percentualGordura ? Calc.formatNum(a.percentualGordura) + '%' : '-'],
            ['Massa Magra', a.massaMagra ? Calc.formatNum(a.massaMagra) + 'kg' : '-'],
            ['Massa Gorda', a.massaGorda ? Calc.formatNum(a.massaGorda) + 'kg' : '-'],
            ['RCQ', a.rcq ? Calc.formatNum(a.rcq) : '-'],
            ['Cintura', a.cintura ? a.cintura + 'cm' : '-'],
            ['Quadril', a.quadril ? a.quadril + 'cm' : '-'],
            ['Braço', a.braco ? a.braco + 'cm' : '-'],
            ['Coxa', a.coxa ? a.coxa + 'cm' : '-'],
            ['PA', a.paSistolica ? `${a.paSistolica}/${a.paDiastolica} mmHg` : '-'],
          ].map(([l, v]) => (
            <div key={l} style={{ padding: 8, background: 'var(--bg-secondary)', borderRadius: 6 }}>
              <div className="text-xs text-muted">{l}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        {a.notes && <div className="text-sm text-muted"><strong>Observações:</strong> {a.notes}</div>}
      </>
    ));
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead><tr><th>Aluno</th><th>Data</th><th>Peso</th><th>Altura</th><th>IMC</th><th>% Gordura</th><th>M. Magra</th><th>M. Gorda</th><th>RCQ</th><th>Cintura</th><th></th></tr></thead>
        <tbody>{data.map(a => {
          const st = students.find(s => s.id === a.studentId);
          const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
          const imcC = imc ? Calc.imcClassificacao(imc) : null;
          return <tr key={a.id}>
            <td>
              <div className="flex items-center gap-sm">
                <div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}</div>
                {st?.name || '?'}
              </div>
            </td>
            <td style={{ fontSize: '0.82rem' }}>{Calc.formatDate(a.date)}</td>
            <td style={{ fontWeight: 600 }}>{a.peso ? a.peso + 'kg' : '-'}</td>
            <td>{a.altura ? a.altura + 'cm' : '-'}</td>
            <td>{imc ? <span className={`badge badge-${imcC.color}`} title={imcC.label}>{Calc.formatNum(imc)}</span> : '-'}</td>
            <td style={{ color: (a.percentualGordura || 0) > 25 ? 'var(--warning)' : 'var(--success)' }}>{a.percentualGordura ? Calc.formatNum(a.percentualGordura) + '%' : '-'}</td>
            <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{a.massaMagra ? Calc.formatNum(a.massaMagra) + 'kg' : '-'}</td>
            <td>{a.massaGorda ? Calc.formatNum(a.massaGorda) + 'kg' : '-'}</td>
            <td>{a.rcq ? Calc.formatNum(a.rcq) : '-'}</td>
            <td>{a.cintura ? a.cintura + 'cm' : '-'}</td>
            <td>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" title="Ver detalhes" onClick={() => handleView(a)} style={{ padding: '4px 6px', color: 'var(--accent)' }}>{ICON_EYE}</button>
                <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => onDelete(a.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
              </div>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function PanelForca({ data, students, onDelete, onView }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">—</div><h3>Nenhuma avaliação de força</h3><p>Registre testes de 1RM e estimativas por exercício</p></div>;

  const byStudent = {};
  data.forEach(a => {
    if (!byStudent[a.studentId]) byStudent[a.studentId] = [];
    byStudent[a.studentId].push(a);
  });

  const handleView = (a) => {
    if (!a.rm1) return;
    const zones = rm1Zones(a.rm1);
    onView(`Zonas de Carga — ${a.exercise}`, (
      <>
        <div style={{ marginBottom: 12, padding: 10, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <div className="text-xs text-muted">1RM estimado · {a.formula || 'Epley'}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{a.rm1}kg</div>
        </div>
        <table className="data-table" style={{ fontSize: '0.82rem' }}>
          <thead><tr><th>%1RM</th><th>Carga</th><th>Reps</th><th>Objetivo</th></tr></thead>
          <tbody>{zones.map(z => <tr key={z.pct}>
            <td style={{ color: z.color, fontWeight: 700 }}>{z.pct}%</td>
            <td style={{ color: z.color, fontWeight: 700 }}>{z.load}kg</td>
            <td>{z.reps}</td>
            <td className="text-xs text-muted">{z.label}</td>
          </tr>)}</tbody>
        </table>
      </>
    ));
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead><tr><th>Aluno</th><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Estimado</th><th>Fórmula</th><th>PR?</th><th></th></tr></thead>
        <tbody>{data.map(a => {
          const st = students.find(s => s.id === a.studentId);
          const studentRecs = (byStudent[a.studentId] || []).filter(x => x.exercise === a.exercise);
          const maxRm1 = Math.max(...studentRecs.map(x => x.rm1 || 0));
          const isPR = a.rm1 && a.rm1 >= maxRm1;
          return <tr key={a.id}>
            <td>
              <div className="flex items-center gap-sm">
                <div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}</div>
                {st?.name || '?'}
              </div>
            </td>
            <td style={{ fontSize: '0.82rem' }}>{Calc.formatDate(a.date)}</td>
            <td style={{ fontWeight: 600 }}>{a.exercise || '-'}</td>
            <td>{a.carga ? a.carga + 'kg' : '-'}</td>
            <td>{a.reps || '-'}</td>
            <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1rem' }}>{a.rm1 ? a.rm1 + 'kg' : '-'}</td>
            <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.formula || 'Epley'}</td>
            <td>{isPR ? <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700 }}>PR ★</span> : ''}</td>
            <td>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-ghost btn-sm" title="Ver zonas de carga" onClick={() => handleView(a)} style={{ padding: '4px 6px', color: 'var(--accent)' }}>{ICON_EYE}</button>
                <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => onDelete(a.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
              </div>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function PanelConconi({ data, students, onDelete }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">—</div><h3>Nenhum teste Conconi</h3><p>Registre testes de limiar anaeróbio</p></div>;
  return (
    <div className="table-container">
      <table className="data-table">
        <thead><tr><th>Aluno</th><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max est.</th><th>Limiar 2</th><th>FC Limiar</th><th></th></tr></thead>
        <tbody>{data.map(a => {
          const st = students.find(s => s.id === a.studentId);
          return <tr key={a.id}>
            <td>
              <div className="flex items-center gap-sm">
                <div className="avatar avatar-sm" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>{st ? st.name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}</div>
                {st?.name || '?'}
              </div>
            </td>
            <td style={{ fontSize: '0.82rem' }}>{Calc.formatDate(a.date)}</td>
            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{a.fcPico ? a.fcPico + ' bpm' : '-'}</td>
            <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{a.vma ? a.vma + ' km/h' : '-'}</td>
            <td style={{ color: 'var(--accent)' }}>{a.vo2max ? Calc.formatNum(a.vo2max) + ' ml/kg/min' : '-'}</td>
            <td>{a.limiar2 ? a.limiar2 + ' km/h' : '-'}</td>
            <td>{a.fcLimiar ? a.fcLimiar + ' bpm' : '-'}</td>
            <td>
              <button className="btn btn-ghost btn-sm" title="Excluir" onClick={() => onDelete(a.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
            </td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function PanelZonas({ students, assessments }) {
  const [zStudent, setZStudent] = useState('');
  const [zAge, setZAge] = useState('');
  const [zFcRep, setZFcRep] = useState('');
  const [zResult, setZResult] = useState(null);

  const [rmStudent, setRmStudent] = useState('');
  const [rmEx, setRmEx] = useState('');
  const [rmValue, setRmValue] = useState('');
  const [rmResult, setRmResult] = useState(null);
  const notify = useToast();

  const handleZStudentChange = (e) => {
    setZStudent(e.target.value);
    const st = students.find(s => s.id === e.target.value);
    if (st?.birthDate) {
      setZAge(Calc.calcularIdade(st.birthDate));
    }
  };

  const handleRmStudentChange = (e) => {
    setRmStudent(e.target.value);
    if (e.target.value && rmEx) {
      const last = assessments
        .filter(a => a.studentId === e.target.value && a.exercise === rmEx && a.rm1)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      if (last) {
        setRmValue(last.rm1);
        notify(`Último 1RM de ${rmEx}: ${last.rm1}kg (${Calc.formatDate(last.date)})`, 'info');
      }
    }
  };

  const calcZones = () => {
    const idade = parseInt(zAge);
    const fcRep = parseInt(zFcRep);
    if (!idade || !fcRep) { notify('Preencha idade e FC repouso', 'warning'); return; }
    const fcMax = Calc.fcMax(idade);
    const zonas = Calc.zonasTreino(fcMax, fcRep);
    setZResult({ fcMax, fcRes: fcMax - fcRep, zonas });
  };

  const calcRmZones = () => {
    const rm1 = parseFloat(rmValue);
    if (!rm1) { notify('Informe o 1RM', 'warning'); return; }
    const zones = rm1Zones(rm1);
    setRmResult({ ex: rmEx || 'Exercício', rm1, zones });
  };

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header"><span className="card-title">Calculadora Zonas de FC (Karvonen)</span></div>
        <p className="text-xs text-muted mb-md">Selecione um aluno ou preencha manualmente</p>
        <div className="form-group">
          <label className="form-label">Aluno (opcional)</label>
          <select className="form-select" value={zStudent} onChange={handleZStudentChange}>
            <option value="">Preencher manualmente</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Idade</label>
            <input className="form-input" type="number" placeholder="Ex: 30" value={zAge} onChange={e => setZAge(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">FC Repouso (bpm)</label>
            <input className="form-input" type="number" placeholder="Ex: 65" value={zFcRep} onChange={e => setZFcRep(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={calcZones} style={{ width: '100%' }}>Calcular Zonas</button>
        {zResult && (
          <div className="mt-lg">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: 10, background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div>
                <div className="text-xs text-muted">FC Máxima (Tanaka)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>{zResult.fcMax} <span style={{ fontSize: '0.8rem' }}>bpm</span></div>
              </div>
              <div>
                <div className="text-xs text-muted">FC Reserva</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{zResult.fcRes} <span style={{ fontSize: '0.8rem' }}>bpm</span></div>
              </div>
            </div>
            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead><tr><th>Zona</th><th>Nome</th><th>% FCR</th><th>FC Mín</th><th>FC Máx</th><th>Objetivo</th></tr></thead>
              <tbody>{zResult.zonas.map(z => (
                <tr key={z.zona}>
                  <td><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: z.cor, marginRight: 6 }}></span>Z{z.zona}</td>
                  <td style={{ fontWeight: 600 }}>{z.nome}</td>
                  <td>{z.min}-{z.max}%</td>
                  <td style={{ color: z.cor, fontWeight: 600 }}>{z.fcMin} bpm</td>
                  <td style={{ color: z.cor, fontWeight: 600 }}>{z.fcMax} bpm</td>
                  <td className="text-xs text-muted">{z.objetivo || '-'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Calculadora Zonas por 1RM</span></div>
        <p className="text-xs text-muted mb-md">Calcule as cargas de treino a partir do 1RM estimado</p>
        <div className="form-group">
          <label className="form-label">Exercício</label>
          <select className="form-select" value={rmEx} onChange={e => {
            setRmEx(e.target.value);
            if (rmStudent && e.target.value) {
              const last = assessments.filter(a => a.studentId === rmStudent && a.exercise === e.target.value && a.rm1).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
              if (last) setRmValue(last.rm1);
            }
          }}>
            <option value="">Selecione ou escolha aluno</option>
            {RM_EXERCISES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Aluno (carrega último 1RM)</label>
          <select className="form-select" value={rmStudent} onChange={handleRmStudentChange}>
            <option value="">Preencher manualmente</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">1RM (kg)</label>
          <input className="form-input" type="number" step="0.5" placeholder="Ex: 100" value={rmValue} onChange={e => setRmValue(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={calcRmZones} style={{ width: '100%' }}>Calcular Zonas de Carga</button>
        {rmResult && (
          <div className="mt-lg">
            <div style={{ marginBottom: 10, padding: 10, background: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div className="text-xs text-muted">{rmResult.ex}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{rmResult.rm1}kg <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1RM</span></div>
            </div>
            <table className="data-table" style={{ fontSize: '0.82rem' }}>
              <thead><tr><th>%1RM</th><th>Carga</th><th>Reps</th><th>Objetivo</th></tr></thead>
              <tbody>{rmResult.zones.map(z => (
                <tr key={z.pct}>
                  <td style={{ color: z.color, fontWeight: 700 }}>{z.pct}%</td>
                  <td style={{ color: z.color, fontWeight: 700 }}>{z.load}kg</td>
                  <td>{z.reps}</td>
                  <td className="text-xs text-muted">{z.label}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PanelProtocolo1RM({ students, onSave }) {
  const [form, setForm] = useState({ studentId: '', exercise: '', formula: 'epley' });
  const [series, setSeries] = useState(Array(5).fill({ carga: '', reps: '' }));
  const notify = useToast();

  const updateSerie = (idx, key, val) => {
    const next = [...series];
    next[idx] = { ...next[idx], [key]: val };
    setSeries(next);
  };

  const getBest = () => {
    const s = series.map((st, i) => ({ set: i + 1, carga: parseFloat(st.carga), reps: parseInt(st.reps), formula: form.formula })).filter(st => st.carga && st.reps);
    return Calc.melhorEstimativa1RM(s);
  };

  const best = getBest();

  const handleSave = async () => {
    if (!form.studentId || !form.exercise) { notify('Selecione aluno e exercício', 'error'); return; }
    const s = series.map((st, i) => ({ set: i + 1, carga: parseFloat(st.carga), reps: parseInt(st.reps) })).filter(st => st.carga && st.reps);
    if (!s.length) { notify('Registre pelo menos uma série', 'error'); return; }
    if (!best?.rm1) { notify('Não foi possível calcular o 1RM', 'error'); return; }

    const all = await db.getAll('assessments');
    const prev = all.filter(a => a.studentId === form.studentId && a.exercise === form.exercise && a.rm1).sort((a, b) => new Date(b.date) - new Date(a.date));
    const isPR = !prev.length || best.rm1 > prev[0].rm1;

    await db.add('assessments', {
      studentId: form.studentId, type: 'forca', exercise: form.exercise,
      carga: best.carga, reps: best.reps, rm1: best.rm1,
      formula: form.formula, series: s, protocolo: 'submax',
      isPR, date: new Date().toISOString().slice(0, 10),
      notes: `Protocolo submax · ${s.length} séries · fórmula ${form.formula}`,
    });

    notify(`1RM ${isPR ? '🏆 PR! ' : ''}Estimado: ${best.rm1}kg salvo!`, 'success');
    setForm({ studentId: '', exercise: '', formula: 'epley' });
    setSeries(Array(5).fill({ carga: '', reps: '' }));
    onSave();
  };

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Protocolo 1RM Submax</span>
          <span className="badge badge-success">Seguro e Preciso</span>
        </div>
        <p className="text-xs text-muted mb-md" style={{ lineHeight: 1.6 }}>
          Estimativa do 1RM sem chegar ao máximo absoluto. Selecione um aluno e exercício, execute as séries e registre a carga e reps de cada uma. O sistema calcula automaticamente o 1RM estimado.
        </p>

        <div className="form-group">
          <label className="form-label">Aluno</label>
          <select className="form-select" value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}>
            <option value="">Selecione</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Exercício</label>
          <input className="form-input" list="rm1protExList" placeholder="Ex: Supino Reto com Barra" value={form.exercise} onChange={e => setForm(f => ({ ...f, exercise: e.target.value }))} />
          <datalist id="rm1protExList">{RM_EXERCISES.map(e => <option key={e} value={e} />)}</datalist>
        </div>
        <div className="form-group">
          <label className="form-label">Fórmula de estimativa</label>
          <select className="form-select" value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}>
            <option value="epley">Epley (padrão)</option>
            <option value="brzycki">Brzycki</option>
            <option value="lander">Lander</option>
            <option value="lombardi">Lombardi</option>
            <option value="mayhew">Mayhew</option>
          </select>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
          <div className="text-xs text-muted mb-sm" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Séries — Registre carga e reps realizadas</div>
          {Calc.protocolo1RM.steps.map((s, i) => {
            const rowRm1 = Calc.rm1Estimado(parseFloat(series[i].carga), parseInt(series[i].reps), form.formula);
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px auto', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{s.set}</div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>~{s.pct}% · {s.reps} reps</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                </div>
                <input className="form-input" type="number" step="0.5" placeholder="kg" value={series[i].carga} onChange={e => updateSerie(i, 'carga', e.target.value)} style={{ textAlign: 'center', fontSize: '0.82rem', padding: '4px 6px' }} />
                <input className="form-input" type="number" min="1" max="20" placeholder="reps" value={series[i].reps} onChange={e => updateSerie(i, 'reps', e.target.value)} style={{ textAlign: 'center', fontSize: '0.82rem', padding: '4px 6px' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, minWidth: 50 }}>{rowRm1 ? rowRm1 + 'kg' : '—'}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, padding: 14, background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="text-xs text-muted mb-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Melhor estimativa de 1RM</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>{best ? best.rm1 + ' kg' : '—'}</div>
          <div className="text-xs text-muted mt-xs">{best ? `Série calculada: ${best.carga}kg × ${best.reps} reps` : 'Preencha as séries acima'}</div>
        </div>

        <button className="btn btn-primary mt-md" onClick={handleSave} style={{ width: '100%' }}>Salvar 1RM Estimado</button>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Instruções do Protocolo</span></div>
        <div style={{ marginBottom: 16 }}>
          <div className="text-xs text-muted mb-sm" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Como executar</div>
          <ol style={{ paddingLeft: 18, lineHeight: 2, fontSize: '0.85rem' }}>
            {Calc.protocolo1RM.instructions.map((ins, i) => <li key={i}>{ins}</li>)}
          </ol>
        </div>
        <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 8, borderLeft: '3px solid var(--warning)', marginBottom: 14 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Segurança</div>
          {Calc.protocolo1RM.safetyNotes.map((n, i) => <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 3 }}>• {n}</div>)}
        </div>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div className="text-xs text-muted mb-sm" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Comparação das fórmulas</div>
          <table className="data-table" style={{ fontSize: '0.8rem' }}>
            <thead><tr><th>Fórmula</th><th>Melhor para</th><th>Reps ideais</th></tr></thead>
            <tbody>
              <tr><td><strong>Epley</strong></td><td>Uso geral — mais usada</td><td>1-10 reps</td></tr>
              <tr><td><strong>Brzycki</strong></td><td>Baixo número de reps</td><td>1-6 reps</td></tr>
              <tr><td><strong>Lander</strong></td><td>Alta precisão geral</td><td>1-10 reps</td></tr>
              <tr><td><strong>Lombardi</strong></td><td>Altas repetições</td><td>6-12 reps</td></tr>
              <tr><td><strong>Mayhew</strong></td><td>Bench press específico</td><td>4-10 reps</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PanelEvolucao({ students, assessments }) {
  const [student, setStudent] = useState('');

  const sAss = assessments.filter(a => a.studentId === student).sort((a, b) => new Date(a.date) - new Date(b.date));
  const comp = sAss.filter(a => a.type === 'composicao');
  const forca = sAss.filter(a => a.type === 'forca');

  const chartData = comp.length >= 2 ? {
    labels: comp.map(a => Calc.formatDate(a.date)),
    datasets: [
      { label: 'Peso (kg)', data: comp.map(a => a.peso || null), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.07)', fill: true, tension: 0.3, pointRadius: 4 },
      { label: 'M. Magra (kg)', data: comp.map(a => a.massaMagra || null), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.07)', fill: true, tension: 0.3, pointRadius: 4 },
    ]
  } : null;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Evolução do Aluno</span>
        <select className="form-select" style={{ width: 'auto' }} value={student} onChange={e => setStudent(e.target.value)}>
          <option value="">Selecione um aluno</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        {!student ? <p className="text-muted text-sm" style={{ padding: 20, textAlign: 'center' }}>Selecione um aluno para ver a evolução</p> : (
          !sAss.length ? <p className="text-muted text-sm" style={{ padding: 20, textAlign: 'center' }}>Nenhuma avaliação para este aluno</p> : (
            <>
              {comp.length >= 2 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ marginBottom: 12 }}>Evolução Corporal</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.82rem' }}>
                      <thead><tr><th>Data</th><th>Peso</th><th>% Gordura</th><th>M. Magra</th><th>IMC</th><th>Cintura</th><th>Δ Peso</th></tr></thead>
                      <tbody>{comp.map((a, i) => {
                        const prev = comp[i - 1];
                        const deltaPeso = prev && a.peso && prev.peso ? (a.peso - prev.peso) : null;
                        const imc = a.peso && a.altura ? Calc.imc(a.peso, a.altura) : null;
                        return <tr key={a.id}>
                          <td style={{ fontSize: '0.78rem' }}>{Calc.formatDate(a.date)}</td>
                          <td style={{ fontWeight: 600 }}>{a.peso ? a.peso + 'kg' : '-'}</td>
                          <td style={{ color: (a.percentualGordura || 0) > 25 ? 'var(--warning)' : 'var(--success)' }}>{a.percentualGordura ? Calc.formatNum(a.percentualGordura) + '%' : '-'}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{a.massaMagra ? Calc.formatNum(a.massaMagra) + 'kg' : '-'}</td>
                          <td>{imc ? Calc.formatNum(imc) : '-'}</td>
                          <td>{a.cintura ? a.cintura + 'cm' : '-'}</td>
                          <td style={{ color: deltaPeso === null ? 'inherit' : deltaPeso < 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            {deltaPeso === null ? '—' : (deltaPeso > 0 ? '+' : '') + Calc.formatNum(deltaPeso) + 'kg'}
                          </td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                  <div style={{ height: 250, marginTop: 16 }}>
                    {chartData && <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />}
                  </div>
                </div>
              )}
              {forca.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                  <h4 style={{ marginBottom: 12 }}>Histórico de Força / 1RM</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.82rem' }}>
                      <thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Est.</th><th>PR?</th></tr></thead>
                      <tbody>{forca.map(a => {
                        const byEx = forca.filter(x => x.exercise === a.exercise);
                        const maxRm1 = Math.max(...byEx.map(x => x.rm1 || 0));
                        const isPR = a.rm1 && a.rm1 >= maxRm1;
                        return <tr key={a.id}>
                          <td style={{ fontSize: '0.78rem' }}>{Calc.formatDate(a.date)}</td>
                          <td style={{ fontWeight: 600 }}>{a.exercise || '-'}</td>
                          <td>{a.carga ? a.carga + 'kg' : '-'}</td>
                          <td>{a.reps || '-'}</td>
                          <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{a.rm1 ? a.rm1 + 'kg' : '-'}</td>
                          <td>{isPR ? <span style={{ color: '#fbbf24', fontWeight: 700 }}>★ PR</span> : ''}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

function PanelFicha({ students, assessments }) {
  const [student, setStudent] = useState('');
  const notify = useToast();
  
  const sAss = assessments.filter(a => a.studentId === student).sort((a, b) => new Date(b.date) - new Date(a.date));
  const comp = sAss.filter(a => a.type === 'composicao');
  const forca = sAss.filter(a => a.type === 'forca');
  const conc = sAss.filter(a => a.type === 'conconi');
  
  const prs = {};
  forca.forEach(a => {
    if (!prs[a.exercise] || a.rm1 > prs[a.exercise].rm1) prs[a.exercise] = a;
  });

  const exportFichaPDF = async () => {
    if (!student) return;
    const st = students.find(s => s.id === student);
    if (!st) return;

    const age = st.birthDate ? Calc.calcularIdade(st.birthDate) : st.age;
    const ini = (st.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8"><title>Ficha — ${st.name}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;color:#222;padding:24px 32px;font-size:12px;line-height:1.5;max-width:900px;margin:0 auto}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #10b981;padding-bottom:12px;margin-bottom:16px}
        .avatar{width:52px;height:52px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;flex-shrink:0}
        h1{font-size:20px;color:#10b981}
        h2{font-size:13px;color:#10b981;border-bottom:1px solid #d1fae5;padding-bottom:4px;margin:16px 0 8px;font-weight:700}
        table{width:100%;border-collapse:collapse;margin-bottom:12px;font-size:11px}
        th{background:#f3f4f6;padding:6px 8px;text-align:left;font-size:10px;text-transform:uppercase;color:#555;border-bottom:2px solid #e5e7eb}
        td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
        tr:nth-child(even) td{background:#fafafa}
        .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
        .badge-success{background:#d1fae5;color:#065f46}
        .badge-warning{background:#fef3c7;color:#92400e}
        .badge-danger{background:#fee2e2;color:#991b1b}
        .badge-info{background:#dbeafe;color:#1e40af}
        .prs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
        .pr-card{padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;background:#fafafa}
        .pr-card .ex{font-size:10px;color:#666;margin-bottom:2px}
        .pr-card .val{font-size:18px;font-weight:800;color:#10b981}
        .pr-card .date{font-size:9px;color:#999}
        .footer{text-align:center;font-size:10px;color:#aaa;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:10px}
        @media print{body{padding:14px 18px}@page{margin:1.5cm}}
      </style>
      <script>window.onload=function(){setTimeout(function(){window.print()},500)}</script>
    </head><body>
      <div class="header">
        <div class="avatar">${ini}</div>
        <div>
          <h1>${st.name||'—'}</h1>
          <p>${st.code||''} · ${age?age+' anos':'—'} · ${st.goal||'—'} · ${st.status||''}</p>
        </div>
        <div style="margin-left:auto;text-align:right">
          <p style="font-size:11px;color:#666">${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      ${comp.length ? `
      <h2>Composição Corporal</h2>
      <table>
        <thead><tr><th>Data</th><th>Peso</th><th>IMC</th><th>% Gordura</th><th>Massa Magra</th><th>Massa Gorda</th><th>Cintura</th><th>RCQ</th></tr></thead>
        <tbody>${comp.map(a=>{
          const imc=a.peso&&a.altura?Calc.imc(a.peso,a.altura):null;
          const imcC=imc?Calc.imcClassificacao(imc):null;
          return `<tr>
            <td>${Calc.formatDate(a.date)}</td>
            <td><strong>${a.peso||'—'}kg</strong></td>
            <td>${imc?`<span class="badge badge-${imcC.color}">${Calc.formatNum(imc)}</span>`:'—'}</td>
            <td>${a.percentualGordura?Calc.formatNum(a.percentualGordura)+'%':'—'}</td>
            <td style="color:#10b981;font-weight:600">${a.massaMagra?Calc.formatNum(a.massaMagra)+'kg':'—'}</td>
            <td>${a.massaGorda?Calc.formatNum(a.massaGorda)+'kg':'—'}</td>
            <td>${a.cintura?a.cintura+'cm':'—'}</td>
            <td>${a.rcq?Calc.formatNum(a.rcq,2):'—'}</td>
          </tr>`;}).join('')}
        </tbody>
      </table>` : ''}

      ${Object.keys(prs).length ? `
      <h2>Records Pessoais — 1RM Estimado</h2>
      <div class="prs">
        ${Object.entries(prs).map(([ex,a])=>`<div class="pr-card">
          <div class="ex">${ex}</div>
          <div class="val">${a.rm1}kg</div>
          <div class="date">${Calc.formatDate(a.date)} ${a.isPR?'· PR':''}${a.protocolo==='submax'?' · Submax':''}</div>
        </div>`).join('')}
      </div>
      <table>
        <thead><tr><th>Data</th><th>Exercício</th><th>Carga</th><th>Reps</th><th>1RM Est.</th><th>Fórmula</th><th>Protocolo</th></tr></thead>
        <tbody>${forca.map(a=>`<tr>
          <td>${Calc.formatDate(a.date)}</td>
          <td><strong>${a.exercise||'—'}</strong></td>
          <td>${a.carga||'—'}kg</td><td>${a.reps||'—'}</td>
          <td style="color:#10b981;font-weight:700">${a.rm1||'—'}kg ${a.isPR?'★':''}</td>
          <td>${a.formula||'Epley'}</td>
          <td>${a.protocolo==='submax'?'Submax':'Direto'}</td>
        </tr>`).join('')}</tbody>
      </table>` : ''}

      ${conc.length ? `
      <h2>Protocolo Conconi / VO₂max</h2>
      <table>
        <thead><tr><th>Data</th><th>FC Pico</th><th>VMA</th><th>VO₂max</th><th>Limiar Anaeróbio</th></tr></thead>
        <tbody>${conc.map(a=>`<tr>
          <td>${Calc.formatDate(a.date)}</td>
          <td>${a.fcPico||'—'} bpm</td>
          <td>${a.vma||'—'} km/h</td>
          <td style="color:#06b6d4;font-weight:700">${a.vo2max||'—'} ml/kg/min</td>
          <td>${a.fcLimiar||'—'} bpm ${a.limiar2?`· ${a.limiar2} km/h`:''}</td>
        </tr>`).join('')}</tbody>
      </table>` : ''}

      <div class="footer">Ficha gerada em ${new Date().toLocaleDateString('pt-BR')} — Personal PRO · Sistema Profissional de Treinamento</div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl; link.target = '_blank'; link.rel = 'noopener';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    notify('Ficha aberta! Use Ctrl+P para salvar como PDF.', 'success');
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Ficha Completa de Avaliações</span>
        <div className="flex gap-sm">
          <select className="form-select" style={{ width: 'auto' }} value={student} onChange={e => setStudent(e.target.value)}>
            <option value="">Selecione um aluno</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!student} onClick={exportFichaPDF}>Exportar PDF</button>
        </div>
      </div>
      <div>
        {!student ? <p className="text-muted text-sm" style={{ padding: 20, textAlign: 'center' }}>Selecione um aluno para ver a ficha completa</p> : (
          !sAss.length ? <p className="text-muted text-sm" style={{ padding: 20, textAlign: 'center' }}>Nenhuma avaliação para este aluno</p> : (
            <div style={{ padding: 20 }}>
              <div className="flex items-center gap-lg mb-lg" style={{ paddingBottom: 16, borderBottom: '2px solid var(--border-active)' }}>
                <div className="avatar avatar-xl" style={{ width: 64, height: 64, fontSize: '1.6rem' }}>
                  {(students.find(s=>s.id===student)?.name||'?').split(' ').filter(Boolean).map(n=>n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{students.find(s=>s.id===student)?.name || '—'}</h2>
                  <div className="text-muted text-sm mt-xs">{sAss.length} avaliações no histórico</div>
                </div>
              </div>
              <div className="grid-2">
                <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs text-muted">Última avaliação de composição</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{comp.length ? Calc.formatDate(comp[0].date) : 'Nenhuma'}</div>
                </div>
                <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="text-xs text-muted">Última avaliação de força</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{forca.length ? Calc.formatDate(forca[0].date) : 'Nenhuma'}</div>
                </div>
              </div>
              <p className="text-sm mt-md text-center">Clique em "Exportar PDF" para gerar um relatório completo de todas as métricas.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}


// ==========================================
// FORMS
// ==========================================

function FormComposicao({ students, onClose, onSave }) {
  const notify = useToast();
  const [form, setForm] = useState({
    studentId: '', date: new Date().toISOString().slice(0, 10), genero: 'M',
    peso: '', altura: '', idadeCalc: '',
    dobra1: '', dobra2: '', dobra3: '',
    cintura: '', quadril: '', pescoco: '', braco: '', coxa: '', panturrilha: '',
    percentualGorduraManual: '', paSistolica: '', paDiastolica: '', notes: ''
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId) { notify('Selecione um aluno', 'error'); return; }
    const d = { ...form, type: 'composicao' };
    d.peso = parseFloat(d.peso) || null;
    d.altura = parseFloat(d.altura) || null;
    if (d.peso && d.altura) d.imc = Math.round(Calc.imc(d.peso, d.altura) * 10) / 10;
    
    const st = students.find(s => s.id === d.studentId);
    const idade = parseInt(d.idadeCalc) || (st?.birthDate ? Calc.calcularIdade(st.birthDate) : 30);
    
    if (d.dobra1 && d.dobra2 && d.dobra3) {
      const pct = Calc.percentualGordura3dobras(d.genero, idade, parseFloat(d.dobra1), parseFloat(d.dobra2), parseFloat(d.dobra3));
      const comp = Calc.composicaoCorporal(d.peso, pct);
      d.percentualGordura = comp.percentualGordura;
      d.massaMagra = comp.massaMagra;
      d.massaGorda = comp.massaGorda;
    } else if (d.percentualGorduraManual) {
      const pct = parseFloat(d.percentualGorduraManual);
      const comp = Calc.composicaoCorporal(d.peso, pct);
      d.percentualGordura = comp.percentualGordura;
      d.massaMagra = comp.massaMagra;
      d.massaGorda = comp.massaGorda;
    }
    
    if (d.cintura && d.quadril) d.rcq = Math.round(Calc.rcq(parseFloat(d.cintura), parseFloat(d.quadril)) * 100) / 100;

    await db.add('assessments', d);
    notify('Avaliação salva!', 'success');
    onClose();
    onSave();
  };

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSave}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Aluno *</label>
          <select className="form-select" required value={form.studentId} onChange={e => field('studentId', e.target.value)}>
            <option value="">Selecione</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Data</label>
          <input className="form-input" type="date" value={form.date} onChange={e => field('date', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Gênero</label>
          <select className="form-select" value={form.genero} onChange={e => field('genero', e.target.value)}>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <h4 style={{ marginBottom: 10 }}>Medidas Básicas</h4>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Peso (kg)</label><input className="form-input" type="number" step="0.1" placeholder="75.5" value={form.peso} onChange={e => field('peso', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Altura (cm)</label><input className="form-input" type="number" step="0.1" placeholder="175" value={form.altura} onChange={e => field('altura', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Idade</label><input className="form-input" type="number" placeholder="30" value={form.idadeCalc} onChange={e => field('idadeCalc', e.target.value)} /></div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <h4 style={{ marginBottom: 6 }}>Dobras Cutâneas — 3 dobras (mm)</h4>
        <p className="text-xs text-muted mb-sm">Protocolo Jackson & Pollock. Masculino: Peitoral, Abdominal, Coxa. Feminino: Tríceps, Suprailíaca, Coxa.</p>
        <div className="form-row">
          <div className="form-group"><label className="form-label">{form.genero === 'F' ? 'Tríceps' : 'Peitoral'}</label><input className="form-input" type="number" step="0.1" placeholder="mm" value={form.dobra1} onChange={e => field('dobra1', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">{form.genero === 'F' ? 'Suprailíaca' : 'Abdominal'}</label><input className="form-input" type="number" step="0.1" placeholder="mm" value={form.dobra2} onChange={e => field('dobra2', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Coxa</label><input className="form-input" type="number" step="0.1" placeholder="mm" value={form.dobra3} onChange={e => field('dobra3', e.target.value)} /></div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <h4 style={{ marginBottom: 10 }}>Circunferências (cm)</h4>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Cintura</label><input className="form-input" type="number" step="0.1" placeholder="cm" value={form.cintura} onChange={e => field('cintura', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Quadril</label><input className="form-input" type="number" step="0.1" placeholder="cm" value={form.quadril} onChange={e => field('quadril', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Pescoço</label><input className="form-input" type="number" step="0.1" placeholder="cm" value={form.pescoco} onChange={e => field('pescoco', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Braço (D)</label><input className="form-input" type="number" step="0.1" placeholder="cm" value={form.braco} onChange={e => field('braco', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Coxa (D)</label><input className="form-input" type="number" step="0.1" placeholder="cm" value={form.coxa} onChange={e => field('coxa', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Panturrilha</label><input className="form-input" type="number" step="0.1" placeholder="cm" value={form.panturrilha} onChange={e => field('panturrilha', e.target.value)} /></div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <h4 style={{ marginBottom: 10 }}>Observações e % Gordura Manual</h4>
        <div className="form-row">
          <div className="form-group"><label className="form-label">% Gordura (manual)</label><input className="form-input" type="number" step="0.1" placeholder="Ex: 18.5" value={form.percentualGorduraManual} onChange={e => field('percentualGorduraManual', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">PA Sistólica (mmHg)</label><input className="form-input" type="number" placeholder="Ex: 120" value={form.paSistolica} onChange={e => field('paSistolica', e.target.value)} /></div>
          <div className="form-group"><label className="form-label">PA Diastólica (mmHg)</label><input className="form-input" type="number" placeholder="Ex: 80" value={form.paDiastolica} onChange={e => field('paDiastolica', e.target.value)} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Observações</label>
          <textarea className="form-textarea" rows={2} placeholder="Notas da avaliação..." value={form.notes} onChange={e => field('notes', e.target.value)} />
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar Avaliação</button>
      </div>
    </form>
  );
}

function FormForca({ students, onClose, onSave }) {
  const notify = useToast();
  const [form, setForm] = useState({ studentId: '', date: new Date().toISOString().slice(0, 10), exercise: '', carga: '', reps: '', formula: 'epley', notes: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.exercise) { notify('Preencha os campos obrigatórios', 'error'); return; }
    const d = { ...form, type: 'forca' };
    d.carga = parseFloat(d.carga) || 0;
    d.reps = parseInt(d.reps) || 1;
    d.rm1 = Calc.rm1Estimado(d.carga, d.reps, d.formula);
    await db.add('assessments', d);
    notify(`1RM salvo: ${d.rm1}kg`, 'success');
    onClose();
    onSave();
  };

  const rm1Est = (form.carga && form.reps) ? Calc.rm1Estimado(parseFloat(form.carga), parseInt(form.reps), form.formula) : null;
  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSave}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Aluno *</label>
          <select className="form-select" required value={form.studentId} onChange={e => field('studentId', e.target.value)}>
            <option value="">Selecione</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Data</label>
          <input className="form-input" type="date" value={form.date} onChange={e => field('date', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Exercício *</label>
        <input className="form-input" list="rmExList" placeholder="Ex: Supino Reto" required value={form.exercise} onChange={e => field('exercise', e.target.value)} />
        <datalist id="rmExList">{RM_EXERCISES.map(e => <option key={e} value={e} />)}</datalist>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Carga testada (kg) *</label><input className="form-input" type="number" step="0.5" required value={form.carga} onChange={e => field('carga', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Reps realizadas *</label><input className="form-input" type="number" min="1" max="30" required value={form.reps} onChange={e => field('reps', e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">Fórmula de estimativa</label>
          <select className="form-select" value={form.formula} onChange={e => field('formula', e.target.value)}>
            <option value="epley">Epley (padrão)</option>
            <option value="brzycki">Brzycki</option>
            <option value="lander">Lander</option>
            <option value="lombardi">Lombardi</option>
          </select>
        </div>
      </div>
      <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginTop: 8 }}>
        <div className="text-xs text-muted mb-xs">1RM Estimado em tempo real</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{rm1Est ? rm1Est + ' kg' : '— kg'}</div>
      </div>
      <div className="form-group mt-sm">
        <label className="form-label">Observações</label>
        <textarea className="form-textarea" rows={2} placeholder="Condições do teste..." value={form.notes} onChange={e => field('notes', e.target.value)} />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar</button>
      </div>
    </form>
  );
}

function FormConconi({ students, onClose, onSave }) {
  const notify = useToast();
  const [form, setForm] = useState({ studentId: '', date: new Date().toISOString().slice(0, 10), fcPico: '', fcLimiar: '', vma: '', limiar2: '', vo2max: '', notes: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId) { notify('Selecione um aluno', 'error'); return; }
    const d = { ...form, type: 'conconi' };
    d.vma = parseFloat(d.vma) || null;
    d.fcPico = parseInt(d.fcPico) || null;
    d.limiar2 = parseFloat(d.limiar2) || null;
    d.fcLimiar = parseInt(d.fcLimiar) || null;
    if (d.vma && !d.vo2max) d.vo2max = Calc.vo2maxConconi(d.vma);
    else d.vo2max = parseFloat(d.vo2max) || null;
    await db.add('assessments', d);
    notify('Teste Conconi salvo!', 'success');
    onClose();
    onSave();
  };

  const field = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'vma') next.vo2max = Calc.vo2maxConconi(parseFloat(v)) || '';
    return next;
  });

  return (
    <form onSubmit={handleSave}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Aluno *</label>
          <select className="form-select" required value={form.studentId} onChange={e => field('studentId', e.target.value)}>
            <option value="">Selecione</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={form.date} onChange={e => field('date', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">FC Pico (bpm)</label><input className="form-input" type="number" placeholder="Ex: 185" value={form.fcPico} onChange={e => field('fcPico', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">FC Limiar Anaeróbio (bpm)</label><input className="form-input" type="number" placeholder="Ex: 160" value={form.fcLimiar} onChange={e => field('fcLimiar', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">VMA (km/h)</label><input className="form-input" type="number" step="0.1" placeholder="Ex: 16.5" value={form.vma} onChange={e => field('vma', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Limiar 2 — velocidade (km/h)</label><input className="form-input" type="number" step="0.1" placeholder="Ex: 13.0" value={form.limiar2} onChange={e => field('limiar2', e.target.value)} /></div>
        <div className="form-group"><label className="form-label">VO₂max estimado</label><input className="form-input" type="number" step="0.1" placeholder="Calculado auto" value={form.vo2max} onChange={e => field('vo2max', e.target.value)} /></div>
      </div>
      <div className="form-group mt-sm">
        <label className="form-label">Observações</label>
        <textarea className="form-textarea" rows={2} placeholder="Protocolo utilizado..." value={form.notes} onChange={e => field('notes', e.target.value)} />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">Salvar Teste</button>
      </div>
    </form>
  );
}
