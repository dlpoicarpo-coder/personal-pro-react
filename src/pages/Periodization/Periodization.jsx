import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;
const ICON_CHECK = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ICON_EYE = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

const PERIODIZATION_MODELS = {
  linear: { label: 'Linear' },
  reverse_linear: { label: 'Linear Reversa' },
  undulating: { label: 'Ondulatória (DUP)' },
  block: { label: 'Em Blocos' },
  conjugate: { label: 'Conjugada' },
  concurrent: { label: 'Concorrente' },
  polarized: { label: 'Polarizado' },
  hiit: { label: 'HIIT' },
  lsd: { label: 'LSD' },
  threshold: { label: 'Limiar' },
  fartlek: { label: 'Fartlek' },
};

function generateInternalWeeklyPlan(modelType, totalWeeks, deloadEvery) {
  const weeks = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const isDeload = deloadEvery > 0 && w % deloadEvery === 0;
    if (isDeload) {
      weeks.push({ week: w, phase: 'deload', label: 'Deload', intensityPct: 50, volumePct: 40, repsRange: '12-15' });
      continue;
    }
    const progress = (w - 1) / Math.max(totalWeeks - 1, 1);
    if (modelType === 'undulating') {
      const cycle = (w - 1) % 3;
      const progressBonus = Math.round(progress * 10);
      if (cycle === 0) weeks.push({ week: w, phase: 'Força', label: `Semana ${w} — Força`, intensityPct: 82 + progressBonus, volumePct: 55, repsRange: '4-6' });
      else if (cycle === 1) weeks.push({ week: w, phase: 'Hipertrofia', label: `Semana ${w} — Hipertrofia`, intensityPct: 70 + Math.round(progressBonus * 0.7), volumePct: 80, repsRange: '8-12' });
      else weeks.push({ week: w, phase: 'Metabólico', label: `Semana ${w} — Metabólico`, intensityPct: 58 + Math.round(progressBonus * 0.5), volumePct: 95, repsRange: '15-20' });
    } else if (modelType === 'block') {
      const third = Math.ceil(totalWeeks / 3);
      if (w <= third) weeks.push({ week: w, phase: 'Acumulação', label: `Semana ${w} — Acumulação`, intensityPct: 60 + Math.round((w / third) * 8), volumePct: 90, repsRange: '12-15' });
      else if (w <= third * 2) weeks.push({ week: w, phase: 'Intensificação', label: `Semana ${w} — Intensificação`, intensityPct: 75 + Math.round(((w - third) / third) * 10), volumePct: 65, repsRange: '5-8' });
      else weeks.push({ week: w, phase: 'Realização', label: `Semana ${w} — Realização`, intensityPct: 88 + Math.round(((w - third * 2) / third) * 7), volumePct: 40, repsRange: '2-4' });
    } else if (modelType === 'conjugate') {
      const isME = w % 2 !== 0;
      weeks.push({ week: w, phase: isME ? 'Esforço Máximo' : 'Esforço Dinâmico', label: `Semana ${w} — ${isME ? 'ME' : 'DE'}`, intensityPct: isME ? 92 + Math.round(progress * 3) : 55, volumePct: isME ? 40 : 70, repsRange: isME ? '1-3' : '3-5' });
    } else if (modelType === 'concurrent') {
      const isStrength = w % 2 !== 0;
      weeks.push({ week: w, phase: isStrength ? 'Força' : 'Metabólico', label: `Semana ${w}`, intensityPct: isStrength ? 68 + Math.round(progress * 12) : 58, volumePct: isStrength ? 70 : 90, repsRange: isStrength ? '8-12' : '15-20' });
    } else if (modelType === 'polarized') {
      const isHighInt = w % 5 === 0;
      weeks.push({ week: w, phase: isHighInt ? 'Alta Intensidade (Z4/Z5)' : 'Baixa Intensidade (Z1/Z2)', label: `Semana ${w}`, intensityPct: isHighInt ? 88 : 55, volumePct: isHighInt ? 50 : 90, repsRange: isHighInt ? '4-6' : '15-20' });
    } else {
      const models = {
        linear:        { start: 55, end: 92, volStart: 85, volEnd: 55 },
        reverse_linear:{ start: 85, end: 50, volStart: 55, volEnd: 90 },
        hiit:          { start: 65, end: 90, volStart: 80, volEnd: 65 },
        lsd:           { start: 50, end: 70, volStart: 90, volEnd: 80 },
        threshold:     { start: 60, end: 82, volStart: 85, volEnd: 70 },
        fartlek:       { start: 58, end: 80, volStart: 82, volEnd: 68 },
      };
      const m = models[modelType] || models.linear;
      const intensityPct = Math.round(m.start + (m.end - m.start) * progress);
      const volumePct    = Math.round(m.volStart + (m.volEnd - m.volStart) * progress);
      const repsRange    = intensityPct >= 88 ? '2-4' : intensityPct >= 78 ? '4-6' : intensityPct >= 68 ? '6-10' : intensityPct >= 58 ? '10-12' : '12-15';
      const phase = intensityPct >= 85 ? 'Pico' : intensityPct >= 75 ? 'Força' : intensityPct >= 65 ? 'Hipertrofia' : 'Adaptação';
      weeks.push({ week: w, phase, label: `Semana ${w}`, intensityPct, volumePct, repsRange });
    }
  }
  return weeks;
}

const TRAINING_DAYS = [{ id: 0, label: 'Dom' }, { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' }, { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }];
const HOURS = ['05:00','06:00','07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

const BUILT_IN_WORKOUT_TEMPLATES = [
  {
    id: 'full_body_ab', name: 'Full Body A/B', days: 2, desc: '2x por semana · Treino completo alternado',
    sessions: [
      { name: 'Full Body A', exercises: [ { name: 'Agachamento Livre com Barra', sets: 4, reps: '10-12', rest: 90 }, { name: 'Supino Reto com Barra', sets: 4, reps: '10-12', rest: 90 }, { name: 'Puxada Frontal', sets: 3, reps: '10-12', rest: 75 }, { name: 'Desenvolvimento com Halteres', sets: 3, reps: '12', rest: 75 }, { name: 'Prancha Frontal', sets: 3, reps: '30s', rest: 60 } ] },
      { name: 'Full Body B', exercises: [ { name: 'Leg Press 45°', sets: 4, reps: '12-15', rest: 90 }, { name: 'Supino Inclinado com Halteres', sets: 3, reps: '12', rest: 75 }, { name: 'Remada Curvada com Barra', sets: 4, reps: '10-12', rest: 90 }, { name: 'Elevação Lateral', sets: 3, reps: '15', rest: 60 }, { name: 'Hip Thrust', sets: 3, reps: '12', rest: 75 } ] }
    ]
  },
  {
    id: 'abc_3x', name: 'ABC — 3x por semana', days: 3, desc: 'A: Peito/Tríceps · B: Costas/Bíceps · C: Pernas/Ombros',
    sessions: [
      { name: 'Treino A — Peito e Tríceps', exercises: [ { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', rest: 120 }, { name: 'Supino Inclinado com Halteres', sets: 3, reps: '10-12', rest: 90 }, { name: 'Crucifixo Reto', sets: 3, reps: '12', rest: 75 }, { name: 'Tríceps Pulley', sets: 3, reps: '12-15', rest: 60 }, { name: 'Tríceps Testa', sets: 3, reps: '10-12', rest: 75 } ] },
      { name: 'Treino B — Costas e Bíceps', exercises: [ { name: 'Puxada Frontal', sets: 4, reps: '8-10', rest: 120 }, { name: 'Remada Curvada com Barra', sets: 4, reps: '10-12', rest: 90 }, { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', rest: 75 }, { name: 'Rosca Direta com Barra', sets: 3, reps: '10-12', rest: 75 }, { name: 'Rosca Alternada com Halteres', sets: 3, reps: '12', rest: 60 } ] },
      { name: 'Treino C — Pernas e Ombros', exercises: [ { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', rest: 120 }, { name: 'Leg Press 45°', sets: 3, reps: '12-15', rest: 90 }, { name: 'Mesa Flexora', sets: 3, reps: '12', rest: 75 }, { name: 'Desenvolvimento com Halteres', sets: 4, reps: '10-12', rest: 90 }, { name: 'Elevação Lateral', sets: 3, reps: '15', rest: 60 } ] }
    ]
  },
  {
    id: 'upper_lower', name: 'Upper / Lower — 4x por semana', days: 4, desc: 'Superior A/B · Inferior A/B — Alternado',
    sessions: [
      { name: 'Superior A', exercises: [ { name: 'Supino Reto com Barra', sets: 4, reps: '6-8', rest: 120 }, { name: 'Puxada Frontal', sets: 4, reps: '6-8', rest: 120 }, { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', rest: 90 }, { name: 'Rosca Direta com Barra', sets: 3, reps: '10-12', rest: 75 }, { name: 'Tríceps Pulley', sets: 3, reps: '10-12', rest: 75 } ] },
      { name: 'Inferior A', exercises: [ { name: 'Agachamento Livre com Barra', sets: 4, reps: '6-8', rest: 120 }, { name: 'Stiff com Barra', sets: 3, reps: '8-10', rest: 90 }, { name: 'Cadeira Extensora', sets: 3, reps: '12-15', rest: 75 }, { name: 'Hip Thrust', sets: 4, reps: '10-12', rest: 90 }, { name: 'Panturrilha em Pé', sets: 4, reps: '15-20', rest: 60 } ] },
      { name: 'Superior B', exercises: [ { name: 'Supino Inclinado com Halteres', sets: 4, reps: '8-10', rest: 90 }, { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', rest: 90 }, { name: 'Elevação Lateral', sets: 4, reps: '12-15', rest: 60 }, { name: 'Rosca Martelo', sets: 3, reps: '12', rest: 60 }, { name: 'Tríceps Corda', sets: 3, reps: '12-15', rest: 60 } ] },
      { name: 'Inferior B', exercises: [ { name: 'Leg Press 45°', sets: 4, reps: '10-12', rest: 90 }, { name: 'Mesa Flexora', sets: 3, reps: '12', rest: 75 }, { name: 'Agachamento Búlgaro', sets: 3, reps: '10', rest: 75 }, { name: 'Abdução na Máquina', sets: 3, reps: '15', rest: 60 }, { name: 'Panturrilha Sentado', sets: 3, reps: '15-20', rest: 60 } ] }
    ]
  },
  {
    id: 'push_pull_legs', name: 'Push / Pull / Legs', days: 3, desc: 'Push · Pull · Legs — 3 a 6x por semana',
    sessions: [
      { name: 'Push — Peito, Ombros e Tríceps', exercises: [ { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', rest: 120 }, { name: 'Supino Inclinado com Halteres', sets: 3, reps: '10-12', rest: 90 }, { name: 'Desenvolvimento com Halteres', sets: 4, reps: '10-12', rest: 90 }, { name: 'Elevação Lateral', sets: 3, reps: '15', rest: 60 }, { name: 'Tríceps Pulley', sets: 3, reps: '12-15', rest: 60 }, { name: 'Tríceps Testa', sets: 3, reps: '10-12', rest: 75 } ] },
      { name: 'Pull — Costas e Bíceps', exercises: [ { name: 'Puxada Frontal', sets: 4, reps: '8-10', rest: 120 }, { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', rest: 90 }, { name: 'Remada Unilateral com Halter', sets: 3, reps: '10-12', rest: 75 }, { name: 'Face Pull', sets: 3, reps: '15', rest: 60 }, { name: 'Rosca Direta com Barra', sets: 3, reps: '10-12', rest: 75 }, { name: 'Rosca Martelo', sets: 3, reps: '12', rest: 60 } ] },
      { name: 'Legs — Pernas e Glúteos', exercises: [ { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', rest: 120 }, { name: 'Leg Press 45°', sets: 3, reps: '12-15', rest: 90 }, { name: 'Stiff com Barra', sets: 3, reps: '10-12', rest: 90 }, { name: 'Hip Thrust', sets: 4, reps: '10-12', rest: 90 }, { name: 'Cadeira Extensora', sets: 3, reps: '15', rest: 60 }, { name: 'Panturrilha em Pé', sets: 4, reps: '15-20', rest: 60 } ] }
    ]
  },
  {
    id: 'adaptacao_anatomica', name: 'Adaptação Anatômica', days: 2, desc: 'Iniciantes · Osteopenia · Reabilitação · 2x/sem',
    sessions: [
      { name: 'Sessão A — Full Body Leve', exercises: [ { name: 'Leg Press 45°', sets: 3, reps: '15', rest: 75 }, { name: 'Supino Reto com Barra', sets: 3, reps: '15', rest: 75 }, { name: 'Remada Baixa (Sentado)', sets: 3, reps: '15', rest: 75 }, { name: 'Desenvolvimento com Halteres', sets: 3, reps: '15', rest: 60 }, { name: 'Prancha Frontal', sets: 3, reps: '20s', rest: 60 } ] },
      { name: 'Sessão B — Full Body Leve', exercises: [ { name: 'Cadeira Extensora', sets: 3, reps: '15', rest: 75 }, { name: 'Peck Deck (Voador)', sets: 3, reps: '15', rest: 60 }, { name: 'Puxada Frontal', sets: 3, reps: '15', rest: 75 }, { name: 'Elevação Lateral', sets: 3, reps: '15', rest: 60 }, { name: 'Hip Thrust', sets: 3, reps: '15', rest: 75 } ] }
    ]
  }
];

export default function Periodization() {
  const notify = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [macros, setMacros] = useState([]);
  const [customCycles, setCustomCycles] = useState([]);
  const [filterStudent, setFilterStudent] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTpl, setSelectedTpl] = useState(null); // 'built_in_X' or 'cycle_X'
  const [form, setForm] = useState({ studentId: '', name: 'Macrociclo 1', type: 'linear', totalWeeks: 12, deloadEvery: 4, startDate: new Date().toISOString().slice(0, 10), trainingDays: [1, 3, 5], trainingTime: '07:00', sessionDuration: 60 });
  const [exerciseLoads, setExerciseLoads] = useState({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [s, m, c] = await Promise.all([db.getAll('students'), db.getAll('macrocycles'), db.getAll('cycles')]);
    setStudents(s.sort((a, b) => a.name?.localeCompare(b.name)));
    
    const parsedMacros = m.map(macro => {
      const parsed = { ...macro };
      if (typeof parsed.weeks === 'string') try { parsed.weeks = JSON.parse(parsed.weeks); } catch(e) { parsed.weeks = []; }
      if (typeof parsed.weekDetails === 'string') try { parsed.weekDetails = JSON.parse(parsed.weekDetails); } catch(e) { parsed.weekDetails = null; }
      if (typeof parsed.trainingDays === 'string') try { parsed.trainingDays = JSON.parse(parsed.trainingDays); } catch(e) { parsed.trainingDays = []; }
      if (!Array.isArray(parsed.weeks)) parsed.weeks = [];
      return parsed;
    });

    setMacros(parsedMacros.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setCustomCycles(c.filter(cy => cy.isTemplate));
    setLoading(false);
  }

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);
  const filteredMacros = useMemo(() => filterStudent ? macros.filter(m => m.studentId === filterStudent) : macros, [macros, filterStudent]);

  const handleFinish = async (macro) => {
    if (!window.confirm('Marcar este macrociclo como finalizado?')) return;
    await db.put('macrocycles', { ...macro, status: 'finished' });
    notify('Macrociclo finalizado!', 'success');
    loadAll();
  };

  const handleDelete = async (macroId) => {
    if (!window.confirm('Excluir macrociclo e todos os treinos gerados?')) return;
    const workouts = await db.getAll('workouts');
    for (const w of workouts.filter(w => w.macrocycleId === macroId)) await db.delete('workouts', w.id);
    const schedules = await db.getAll('schedules');
    for (const s of schedules.filter(s => s.macrocycleId === macroId)) await db.delete('schedules', s.id);
    await db.delete('macrocycles', macroId);
    notify('Macrociclo removido', 'success');
    loadAll();
  };

  const currentTemplateObj = useMemo(() => {
    if (!selectedTpl) return null;
    if (selectedTpl.startsWith('cycle_')) {
      const cy = customCycles.find(c => c.id === selectedTpl.replace('cycle_', ''));
      if (!cy) return null;
      return {
        name: cy.name,
        sessions: (cy.workouts || []).map(w => ({ name: w.name, exercises: (w.exercises || []).map(ex => ({ name: ex.name, sets: ex.sets || 3, reps: ex.reps || '10-12', rest: ex.rest || 60 })) }))
      };
    }
    return BUILT_IN_WORKOUT_TEMPLATES.find(t => t.id === selectedTpl);
  }, [selectedTpl, customCycles]);

  const templateExercises = useMemo(() => currentTemplateObj ? currentTemplateObj.sessions.flatMap(s => s.exercises) : [], [currentTemplateObj]);

  const handleGenerate = async () => {
    if (!form.studentId) return notify('Selecione um aluno', 'error');
    if (!currentTemplateObj) return notify('Selecione um modelo de treino', 'error');

    const totalWeeks = Number(form.totalWeeks) || 12;
    const deloadEvery = form.deloadEvery === '' ? 0 : Number(form.deloadEvery);
    const sessionDur = Number(form.sessionDuration) || 60;
    
    const macro = {
      ...form, totalWeeks, deloadEvery, sessionDuration: sessionDur,
      status: 'active', createdAt: new Date().toISOString(),
      workoutModelName: currentTemplateObj.name
    };

    macro.weeks = generateInternalWeeklyPlan(macro.type, totalWeeks, deloadEvery);
    
    const sessions = currentTemplateObj.sessions || [{ name: currentTemplateObj.name, exercises: currentTemplateObj.exercises || [] }];
    const allExNames = sessions.flatMap(s => s.exercises).map(e => e.name);

    macro.weekDetails = macro.weeks.map((w, i) => {
      const isDeload = w.phase === 'deload';
      const prevWeek = i > 0 ? macro.weeks[i-1] : null;
      return {
        week: w.week, phase: w.label || w.phase,
        sets: isDeload ? '2-3' : w.volumePct > 80 ? '4-5' : w.volumePct > 60 ? '3-4' : '3',
        reps: w.repsRange || '10-12', intensity: w.intensityPct,
        rpe: isDeload ? '4-5' : w.intensityPct >= 85 ? '8-9' : w.intensityPct >= 70 ? '7-8' : '6-7',
        volDelta: prevWeek ? Math.round(w.volumePct - prevWeek.volumePct) : 0,
        trainA: allExNames.slice(0,3).join(', ') || '-',
        trainB: allExNames.slice(3,6).join(', ') || '-',
      };
    });

    const savedMacro = await db.add('macrocycles', macro);
    let generatedWorkouts = 0;

    for (let w = 0; w < totalWeeks; w++) {
      const weekPlan = macro.weeks[w];
      const weekStart = new Date(macro.startDate);
      weekStart.setDate(weekStart.getDate() + (w * 7));
      const baseIntensity = macro.weeks[0]?.intensityPct || 60;
      const isDeload = weekPlan.phase === 'deload';
      const loadMultiplier = isDeload ? 0.6 : 1 + ((weekPlan.intensityPct - baseIntensity) / 100);

      for (let di = 0; di < form.trainingDays.length; di++) {
        const session = sessions[di % sessions.length];
        const dayOfWeek = form.trainingDays[di];
        const date = new Date(weekStart);
        const currentDay = date.getDay();
        
        let diff = dayOfWeek - currentDay;
        if (w === 0 && diff < 0) diff += 7;
        else if (diff < 0) diff += 7;
        date.setDate(date.getDate() + diff);

        const wkExercises = session.exercises.map(ex => {
          const oneRM = exerciseLoads[ex.name] || 60;
          const exType = document.querySelector(`[data-ex-key="${ex.name}"]`)?.dataset.type || 'weight';
          let load;
          if (exType === 'time') load = Math.round(oneRM * loadMultiplier);
          else if (exType === 'bodyweight') load = Math.round(oneRM * loadMultiplier * 2) / 2;
          else {
            load = Math.round(oneRM * (weekPlan.intensityPct / 100) * 2) / 2;
            if (isDeload) load = Math.round(oneRM * 0.5 * 2) / 2;
          }
          return { ...ex, load, oneRM, week: w + 1 };
        });

        const savedWorkout = await db.add('workouts', {
          studentId: macro.studentId, macrocycleId: savedMacro.id,
          name: `${session.name} — Sem ${w+1}`, date: date.toISOString().slice(0,10),
          exercises: wkExercises, phase: weekPlan.label || weekPlan.phase,
          intensityPct: weekPlan.intensityPct, isDeload
        });

        await db.add('schedules', {
          studentId: macro.studentId, workoutId: savedWorkout.id, macrocycleId: savedMacro.id,
          date: date.toISOString().slice(0,10), time: macro.trainingTime, duration: macro.sessionDuration,
          workoutName: savedWorkout.name, status: 'scheduled', repeat: 'none'
        });
        generatedWorkouts++;
      }
    }

    await db.put('macrocycles', { ...savedMacro, generatedWorkouts, weekDetails: macro.weekDetails, weeks: macro.weeks });
    notify(`Macrociclo gerado — ${generatedWorkouts} sessões criadas`, 'success');
    setIsModalOpen(false);
    loadAll();
  };

  const BODYWEIGHT_KEYWORDS = ['prancha','flexão','burpee','barra fixa','pull-up','dip','afundo','superman','bird dog','russian twist','abdominal','crunch','mountain climber','jumping jack','polichinelo','ponte'];
  const TIMED_PATTERN = /^\d+s$/i;

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div><h1 className="page-title">Periodização</h1><p className="page-subtitle">Planejamento científico de macrociclos</p></div>
        <div className="flex gap-sm">
          <select className="form-select" style={{ minWidth: 180 }} value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">Todos os alunos</option>
            {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { setForm({ studentId: '', name: 'Macrociclo 1', type: 'linear', totalWeeks: 12, deloadEvery: 4, startDate: new Date().toISOString().slice(0, 10), trainingDays: [1, 3, 5], trainingTime: '07:00', sessionDuration: 60 }); setSelectedTpl(null); setIsModalOpen(true); }}>+ Novo Macrociclo</button>
        </div>
      </div>

      {macros.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">ATIVOS</div><div className="stat-value text-gradient">{macros.filter(m=>m.status==='active').length}</div><div className="stat-change">macrociclos em curso</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">FINALIZADOS</div><div className="stat-value" style={{ color: 'var(--accent)' }}>{macros.filter(m=>m.status!=='active').length}</div><div className="stat-change">ciclos concluídos</div></div>
          <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">TREINOS GERADOS</div><div className="stat-value" style={{ color: 'var(--success)' }}>{macros.reduce((t,m)=>t+(m.generatedWorkouts||0),0)}</div><div className="stat-change">no total</div></div>
        </div>
      )}

      {filteredMacros.length ? filteredMacros.map(m => {
        const st = students.find(s => s.id === m.studentId);
        const now = Date.now();
        const startMs = new Date(m.startDate).getTime();
        const currentWeek = Math.max(1, Math.min(m.totalWeeks, Math.ceil((now - startMs) / (7 * 86400000))));
        const isActive = m.status === 'active';
        const pct = Math.round((currentWeek / m.totalWeeks) * 100);
        const currentWeekData = (m.weeks || [])[currentWeek - 1];
        const currentPhase = currentWeekData?.phase || '—';
        const currentIntensity = currentWeekData?.intensityPct || 0;
        const intensityColor = currentIntensity >= 85 ? '#ef4444' : currentIntensity >= 75 ? '#f97316' : currentIntensity >= 65 ? '#eab308' : currentIntensity > 0 ? '#22c55e' : 'var(--text-muted)';
        
        return (
          <div key={m.id} className="card mb-lg macro-card">
            <div className="card-header">
              <div className="flex items-center gap-md" style={{ flex: 1, minWidth: 0 }}>
                <div className="avatar">{st ? st.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st ? st.name : '?'} — {m.name}</div>
                  <div className="text-xs text-muted">{m.totalWeeks} semanas · {PERIODIZATION_MODELS[m.type]?.label || m.type} · Início: {Calc.formatDate(m.startDate)} {m.workoutModelName && `· ${m.workoutModelName}`} {m.trainingDays?.length > 0 && `· ${m.trainingDays.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d]).join(', ')}`}</div>
                </div>
              </div>
              <div className="flex gap-xs items-center" style={{ flexShrink: 0 }}>
                <span className={`badge badge-${isActive ? 'success' : 'warning'}`}>{isActive ? 'Ativo' : 'Finalizado'}</span>
                {isActive && <button className="btn btn-ghost btn-sm" title="Finalizar macrociclo" onClick={() => handleFinish(m)} style={{ padding: '4px 6px', color: 'var(--success)' }}>{ICON_CHECK}</button>}
                <button className="btn btn-ghost btn-sm" title="Excluir macrociclo" onClick={() => handleDelete(m.id)} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
              </div>
            </div>

            {isActive && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, margin: '12px 0' }}>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-page)', borderRadius: 8 }}><div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Semana atual</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{currentWeek}</div><div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>de {m.totalWeeks}</div></div>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-page)', borderRadius: 8 }}><div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Fase</div><div style={{ fontSize: '0.88rem', fontWeight: 700, color: intensityColor, marginTop: 4 }}>{currentPhase}</div></div>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-page)', borderRadius: 8 }}><div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Intensidade</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color: intensityColor }}>{currentIntensity || '—'}{currentIntensity ? '%' : ''}</div></div>
                  <div style={{ textAlign: 'center', padding: 8, background: 'var(--bg-page)', borderRadius: 8 }}><div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Progresso</div><div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{pct}%</div></div>
                </div>
                <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, marginBottom: 12 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 3, transition: 'width 0.5s' }}></div>
                </div>
              </>
            )}

            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', gap: 3, minWidth: 'max-content', paddingBottom: 4, alignItems: 'flex-end' }}>
                {(m.weeks || []).map((w, i) => {
                  const isCurrent = i + 1 === currentWeek && isActive;
                  const isPast = i + 1 < currentWeek;
                  const isDeload = w.phase === 'deload';
                  const color = isDeload ? '#3b82f6' : w.intensityPct >= 85 ? '#ef4444' : w.intensityPct >= 75 ? '#f97316' : w.intensityPct >= 65 ? '#eab308' : '#22c55e';
                  const opacity = isPast ? '0.4' : '1';
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity }} title={`Sem ${w.week}: ${w.label || w.phase} | Vol ${w.volumePct}% | Int ${w.intensityPct}% | Reps ${w.repsRange || '-'}`}>
                      <div style={{ width: 24, height: Math.max(12, (w.volumePct || 0) * 0.38), background: `${color}${isCurrent ? '' : '22'}`, border: `1px solid ${color}`, borderRadius: 3, boxShadow: isCurrent ? `0 0 0 2px ${color},0 0 8px ${color}44` : 'none' }}></div>
                      <div style={{ fontSize: '0.48rem', color, fontWeight: isCurrent ? 700 : 400 }}>{isCurrent ? '▼' : ''}S{w.week}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-md mt-xs" style={{ flexWrap: 'wrap' }}>
              <span className="text-xs" style={{ color: '#22c55e' }}>— Leve</span><span className="text-xs" style={{ color: '#eab308' }}>— Moderada</span><span className="text-xs" style={{ color: '#f97316' }}>— Alta</span><span className="text-xs" style={{ color: '#ef4444' }}>— Muito Alta</span><span className="text-xs" style={{ color: '#3b82f6' }}>— Deload</span>
              {m.generatedWorkouts > 0 && <span className="text-xs" style={{ color: 'var(--success)', marginLeft: 'auto' }}>{m.generatedWorkouts} treinos gerados</span>}
            </div>

            <details style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg> Plano semanal detalhado
              </summary>
              {m.weekDetails ? (
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table className="data-table" style={{ fontSize: '0.76rem' }}>
                    <thead><tr><th>Sem</th><th>Fase</th><th>Séries</th><th>Reps</th><th>%1RM</th><th>RPE</th><th>Exercícios A</th><th>Exercícios B</th></tr></thead>
                    <tbody>
                      {m.weekDetails.map(wd => {
                        const isCur = wd.week === currentWeek && isActive;
                        const c = wd.phase === 'Deload' ? '#3b82f6' : (wd.intensity||0) >= 85 ? '#ef4444' : (wd.intensity||0) >= 75 ? '#f97316' : (wd.intensity||0) >= 65 ? '#eab308' : '#22c55e';
                        return (
                          <tr key={wd.week} style={{ background: isCur ? `${c}11` : '', fontWeight: isCur ? 600 : 400 }}>
                            <td><strong style={{ color: c }}>S{wd.week}{isCur ? ' ←' : ''}</strong></td><td style={{ color: c }}>{wd.phase}</td><td>{wd.sets}</td><td>{wd.reps}</td><td style={{ color: c, fontWeight: 700 }}>{wd.intensity}%</td><td>{wd.rpe}</td><td className="text-xs" style={{ maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wd.trainA || '-'}</td><td className="text-xs" style={{ maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{wd.trainB || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-xs text-muted mt-sm">Detalhamento não disponível</p>}
            </details>

            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, height: 120 }}>
              {m.weeks && <Line data={{
                labels: m.weeks.map(w => `S${w.week}`),
                datasets: [
                  { label: 'Volume %', data: m.weeks.map(w => w.volumePct), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.07)', tension: 0.3, fill: true, pointRadius: 2, borderWidth: 1.5 },
                  { label: 'Intensidade %', data: m.weeks.map(w => w.intensityPct), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.07)', tension: 0.3, fill: true, pointRadius: 2, borderWidth: 1.5 }
                ]
              }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 } } }, scales: { y: { min: 0, max: 110, ticks: { color: '#64748b', callback: v => v+'%', font: { size: 10 } }, grid: { color: 'rgba(148,163,184,0.07)' } }, x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } } } }} />}
            </div>
          </div>
        );
      }) : (
        <div className="empty-state"><div className="empty-icon">—</div><h3>Nenhum macrociclo criado</h3><p>Crie um planejamento de periodização para seus alunos</p><button className="btn btn-primary mt-sm" onClick={() => { setForm({ studentId: '', name: 'Macrociclo 1', type: 'linear', totalWeeks: 12, deloadEvery: 4, startDate: new Date().toISOString().slice(0, 10), trainingDays: [1, 3, 5], trainingTime: '07:00', sessionDuration: 60 }); setSelectedTpl(null); setIsModalOpen(true); }}>+ Criar Primeiro Macrociclo</button></div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Macrociclo" size="xl">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span style={{ display: 'inline-block', width: 3, height: 16, background: 'var(--primary)', borderRadius: 2 }}></span><span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Modelo de Treino</span></div>
            <p className="text-xs text-muted mb-sm">Templates padrão do sistema</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
              {BUILT_IN_WORKOUT_TEMPLATES.map(t => (
                <div key={t.id} onClick={() => setSelectedTpl(t.id)} style={{ padding: '10px 14px', border: `1px solid ${selectedTpl === t.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: selectedTpl === t.id ? 'var(--primary-glow)' : 'var(--bg-card)', transition: 'all 0.2s' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>{t.desc}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8 }}><span style={{ color: 'var(--accent)' }}>{t.sessions.length} sessões</span><span>·</span><span>{t.sessions.reduce((a, s) => a + s.exercises.length, 0)} exercícios</span></div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
              <p className="text-xs text-muted mb-sm">Seus modelos <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>(Exercícios → Meus Modelos)</span></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {customCycles.length ? customCycles.map(c => (
                  <div key={c.id} onClick={() => setSelectedTpl(`cycle_${c.id}`)} style={{ padding: '10px 14px', border: `1px solid ${selectedTpl === `cycle_${c.id}` ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', background: selectedTpl === `cycle_${c.id}` ? 'var(--primary-glow)' : 'var(--bg-card)', transition: 'all 0.2s' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 8 }}><span style={{ color: 'var(--primary)' }}>{c.goal || 'Geral'}</span><span>·</span><span>{(c.workouts||[]).length} treinos</span><span>·</span><span>{(c.workouts||[]).reduce((a,w)=>a+(w.exercises||[]).length,0)} exercícios</span></div>
                    {c.description && <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3 }}>{c.description}</div>}
                  </div>
                )) : <div style={{ padding: 12, border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}><p className="text-xs text-muted" style={{ margin: 0 }}>Nenhum modelo criado ainda.</p></div>}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span style={{ display: 'inline-block', width: 3, height: 16, background: 'var(--primary)', borderRadius: 2 }}></span><span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Configuração</span></div>
            <div className="form-group"><label className="form-label">Aluno *</label><select className="form-select" value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Selecione o aluno</option>{activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Nome do macrociclo</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Macrociclo 1 — Hipertrofia" /></div>
            <div className="form-group"><label className="form-label">Modelo de periodização *</label>
              <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <optgroup label="── Musculação ──"><option value="linear">Linear — Volume↓ Intensidade↑</option><option value="reverse_linear">Linear Reversa — RML / Resistência</option><option value="undulating">Ondulatória (DUP) — Oscilações diárias</option><option value="block">Em Blocos — Acumulação → Intensificação → Realização</option><option value="conjugate">Conjugada — Esforço Máximo + Dinâmico</option><option value="concurrent">Concorrente — Força + Metabólico</option></optgroup>
                <optgroup label="── Cardio / Endurance ──"><option value="polarized">Polarizado — 80% Z1/Z2 + 20% Z4/Z5</option><option value="hiit">HIIT — Intervalado de Alta Intensidade</option><option value="lsd">LSD — Longa Duração e Baixa Intensidade</option><option value="threshold">Limiar Anaeróbio</option><option value="fartlek">Fartlek — Variações de ritmo livres</option></optgroup>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Duração (semanas)</label><input className="form-input" type="number" min="4" max="52" value={form.totalWeeks} onChange={e => setForm({ ...form, totalWeeks: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Deload a cada (sem)</label><input className="form-input" type="number" min="0" max="8" value={form.deloadEvery} onChange={e => setForm({ ...form, deloadEvery: e.target.value })} /><div className="form-hint">0 = sem deload</div></div>
            </div>
            <div className="form-group"><label className="form-label">Data de início</label><input className="form-input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Dias de treino</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TRAINING_DAYS.map(d => (
                  <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', background: form.trainingDays.includes(d.id) ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
                    <input type="checkbox" checked={form.trainingDays.includes(d.id)} onChange={e => setForm({ ...form, trainingDays: e.target.checked ? [...form.trainingDays, d.id] : form.trainingDays.filter(x => x !== d.id) })} />{d.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Horário</label><select className="form-select" value={form.trainingTime} onChange={e => setForm({ ...form, trainingTime: e.target.value })}>{HOURS.map(h => <option key={h} value={h}>{h}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Duração da sessão</label><select className="form-select" value={form.sessionDuration} onChange={e => setForm({ ...form, sessionDuration: e.target.value })}><option value="45">45 min</option><option value="60">60 min</option><option value="75">75 min</option><option value="90">90 min</option></select></div>
            </div>

            {templateExercises.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ display: 'inline-block', width: 3, height: 16, background: 'var(--accent)', borderRadius: 2 }}></span><span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>1RM Estimado por exercício</span></div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>Informe o 1RM (ou estimativa). O sistema calculará as cargas semana a semana.</p>
                <div>
                  {templateExercises.map((ex, idx) => {
                    const nameLower = ex.name.toLowerCase();
                    const isTimed = ex.loadType === 'time' || TIMED_PATTERN.test(String(ex.reps || ''));
                    const isBodyweight = ex.loadType === 'bodyweight' || BODYWEIGHT_KEYWORDS.some(k => nameLower.includes(k));
                    
                    if (isTimed) {
                      const defaultSec = parseInt(String(ex.reps).replace('s','')) || 30;
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ flex: 1 }}><div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ex.name}</div><div style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: 1 }}>Isométrico · {ex.sets} séries × {ex.reps}</div></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}><input className="form-input" data-ex-key={ex.name} data-type="time" type="number" min="5" step="5" value={exerciseLoads[ex.name] !== undefined ? exerciseLoads[ex.name] : defaultSec} onChange={e => setExerciseLoads({ ...exerciseLoads, [ex.name]: e.target.value })} style={{ width: 68, textAlign: 'center', padding: '4px 8px', fontSize: '0.82rem' }} /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 22 }}>seg</span></div>
                        </div>
                      );
                    }
                    if (isBodyweight) {
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ flex: 1 }}><div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ex.name}</div><div style={{ fontSize: '0.68rem', color: 'var(--success)', marginTop: 1 }}>Peso corporal · {ex.sets} séries × {ex.reps} reps</div></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}><input className="form-input" data-ex-key={ex.name} data-type="bodyweight" type="number" min="0" step="0.5" value={exerciseLoads[ex.name] !== undefined ? exerciseLoads[ex.name] : 0} onChange={e => setExerciseLoads({ ...exerciseLoads, [ex.name]: e.target.value })} style={{ width: 68, textAlign: 'center', padding: '4px 8px', fontSize: '0.82rem' }} /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 24 }}>+kg</span></div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ flex: 1 }}><div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ex.name}</div><div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{ex.sets} séries × {ex.reps} · {ex.rest}s descanso</div></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>1RM</span><input className="form-input" data-ex-key={ex.name} data-type="weight" type="number" min="0" step="2.5" value={exerciseLoads[ex.name] !== undefined ? exerciseLoads[ex.name] : 60} onChange={e => setExerciseLoads({ ...exerciseLoads, [ex.name]: e.target.value })} style={{ width: 68, textAlign: 'center', padding: '4px 8px', fontSize: '0.82rem' }} /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>kg</span></div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--primary)' }}>Semana 1: ~{Math.round((exerciseLoads[ex.name]||60)*0.65*2)/2}kg (65% 1RM)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer" style={{ marginTop: 24 }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGenerate}>Gerar Macrociclo</button>
        </div>
      </Modal>
    </div>
  );
}
