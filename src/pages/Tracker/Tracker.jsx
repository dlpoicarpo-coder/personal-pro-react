import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../../lib/db';
import { Calc } from '../../lib/calculations';
import Modal from '../../components/Modal/Modal';
import { useToast } from '../../components/Toast/Toast';

const ICON_PLAY = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const ICON_PAUSE = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const ICON_EYE = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const ICON_DEL = <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>;

function formatTime(sec) {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeHMS(sec) {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

export default function Tracker() {
  const notify = useToast();
  const navigate = useNavigate();

  // Data state
  const [students, setStudents] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [allBiofeedback, setAllBiofeedback] = useState([]);

  // Session start forms
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [preBF, setPreBF] = useState({ sleep: 5, mood: 5, energy: 5, stress: 5, pain: 5 });

  // Live session state
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0); // total session seconds
  const [workSec, setWorkSec] = useState(0); // working seconds
  const [isResting, setIsResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restDuration, setRestDuration] = useState(60);

  // Ex/Set navigation
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const [setLog, setSetLog] = useState([]);
  const [setNotes, setSetNotes] = useState('');

  // Post Session form
  const [showPostModal, setShowPostModal] = useState(false);
  const [postBF, setPostBF] = useState({ pse: 7, satisfaction: 8, notes: '' });

  // Modals
  const [viewSession, setViewSession] = useState(null);

  // Timers
  const timerRef = useRef(null);

  useEffect(() => {
    loadData();
    const auto = sessionStorage.getItem('pp_autostart');
    if (auto) {
      sessionStorage.removeItem('pp_autostart');
      try {
        const { studentId, workoutId } = JSON.parse(auto);
        if (studentId) setSelectedStudent(studentId);
        if (workoutId) setTimeout(() => setSelectedWorkout(workoutId), 300);
      } catch {}
    }
  }, []);

  async function loadData() {
    const s = await db.getAll('students');
    const w = await db.getAll('workouts');
    const sess = await db.getAll('sessions');
    const bf = await db.getAll('biofeedback');
    setStudents(s);
    setWorkouts(w);
    setAllBiofeedback(bf);

    const running = sess.find(x => x.status === 'running');
    if (running) {
      setSession(running);
      setSetLog(running.setLog || []);
      setExIdx(running.currentExIdx || 0);
      setWorkSec(running.workSec || 0);
      setElapsed(Math.floor((Date.now() - running.startTime) / 1000));
    }

    setCompletedSessions(sess.filter(x => x.status === 'completed').sort((a,b) => new Date(b.date) - new Date(a.date)));
  }

  // Effect for timer ticking
  useEffect(() => {
    if (session) {
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1);
        setWorkSec(w => isResting ? w : w + 1);
        if (isResting) {
          setRestRemaining(r => {
            if (r <= 1) {
              setIsResting(false);
              if (soundEnabled) playBeep();
              return 0;
            }
            return r - 1;
          });
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [session, isResting, soundEnabled]);

  // Handle student change
  useEffect(() => {
    if (selectedStudent) {
      const todayPre = allBiofeedback.find(f => f.studentId === selectedStudent && f.formType === 'pre' && new Date(f.date).toDateString() === new Date().toDateString());
      if (todayPre) {
        setPreBF({ sleep: todayPre.sleep, mood: todayPre.mood, energy: todayPre.energy, stress: todayPre.stress, pain: todayPre.pain });
        notify('Dados pré-treino carregados do aluno!', 'info');
      } else {
        setPreBF({ sleep: 5, mood: 5, energy: 5, stress: 5, pain: 5 });
      }
    }
  }, [selectedStudent]);

  // Derived state
  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo').sort((a,b) => a.name?.localeCompare(b.name)), [students]);
  const studentWorkouts = useMemo(() => workouts.filter(w => w.studentId === selectedStudent).sort((a,b) => new Date(b.date) - new Date(a.date)), [workouts, selectedStudent]);
  const totalVolume = useMemo(() => setLog.reduce((t, s) => t + ((s.reps || 0) * (s.load || 0)), 0), [setLog]);

  const startSession = async () => {
    if (!selectedStudent || !selectedWorkout) return;
    const wk = workouts.find(w => w.id === selectedWorkout);
    if (!wk) return;

    const newSession = {
      studentId: wk.studentId, workoutId: wk.id, workoutName: wk.name,
      exercises: JSON.parse(JSON.stringify(wk.exercises || [])),
      date: new Date().toISOString(), startTime: Date.now(), status: 'running',
      soundEnabled, preBiofeedback: preBF, setLog: []
    };

    const saved = await db.add('sessions', newSession);
    setSession({ ...newSession, id: saved.id });
    setExIdx(0); setSetIdx(0); setSetLog([]); setWorkSec(0); setElapsed(0); setIsResting(false);
    notify('Sessão iniciada!', 'success');
  };

  const completeSet = async (i, reps, load, pse) => {
    const newLog = { exIdx, setIdx: i, reps, load, pse, notes: setNotes, time: Date.now() };
    const newSetLog = [...setLog, newLog];
    setSetLog(newSetLog);
    setSetNotes('');

    const exs = session.exercises || [];
    const curEx = exs[exIdx] || {};
    const exSets = parseInt(curEx.sets) || 3;

    if (i + 1 < exSets) {
      setSetIdx(i + 1);
    }

    const updatedSession = { ...session, setLog: newSetLog, currentExIdx: exIdx, workSec };
    await db.put('sessions', updatedSession);
    setSession(updatedSession);

    // Auto rest
    const rest = parseInt(curEx.rest) || 60;
    setRestDuration(rest);
    setRestRemaining(rest);
    setIsResting(true);
  };

  const handleEndBtn = () => {
    setShowPostModal(true);
  };

  const doSaveSession = async () => {
    const s = session;
    const dur = elapsed;
    const vol = totalVolume;
    const dens = dur > 0 ? workSec / dur : 0;

    const sessionData = {
      ...s, status: 'completed', endTime: Date.now(),
      totalDuration: dur, totalVolume: vol, density: dens,
      workSeconds: workSec, restSeconds: Math.max(0, dur - workSec),
      setLog, totalSets: setLog.length,
      postBiofeedback: { ...postBF, submittedAt: new Date().toISOString() },
    };

    await db.put('sessions', sessionData);
    await db.add('biofeedback', {
      studentId: s.studentId, date: s.date,
      ...s.preBiofeedback,
      pse: postBF.pse,
      duration: Math.round(dur/60),
      trainingLoad: Calc.cargaTreino(postBF.pse, Math.round(dur/60)),
      notes: postBF.notes, sessionId: s.id, formType: 'complete',
    });

    setSession(null);
    setShowPostModal(false);
    loadData();
    notify('Sessão salva com sucesso!', 'success');

    // Show summary automatically
    const studentObj = students.find(x => x.id === s.studentId);
    setViewSession({ session: sessionData, student: studentObj });
  };

  const generatePDF = (sess, st) => {
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) { notify('jsPDF não está disponível.', 'error'); return; }
      
      const doc = new jsPDF({ unit:'mm', format:'a4' });
      const g=[16,185,129], dk=[15,23,42], mu=[100,116,139], li=[241,245,249];
      const durMin=Math.round((sess.totalDuration||0)/60);
      const exs=sess.exercises||[], sl=sess.setLog||[];
      const date=new Date(sess.date).toLocaleDateString('pt-BR');

      doc.setFillColor(...g); doc.rect(0,0,210,26,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
      doc.text('Personal PRO',14,11);
      doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.text('Relatório de Sessão',14,19);
      doc.text(date,196,11,{align:'right'});

      doc.setTextColor(...dk); doc.setFontSize(13); doc.setFont('helvetica','bold');
      doc.text(st?.name||'Aluno',14,36);
      doc.setFontSize(9); doc.setFont('helvetica','normal');
      doc.setTextColor(...mu);
      doc.text(sess.workoutName||'Treino',14,42);

      let bx=14;
      [[`Duração`,durMin+' min'],[`Volume`,(sess.totalVolume||0)+' kg'],[`Séries`,String(sess.totalSets||0)],[`PSE`,String(sess.postBiofeedback?.pse||'-')],[`Densidade`,(sess.density||0).toFixed(2)]].forEach(([l,v])=>{
        doc.setFillColor(...li); doc.roundedRect(bx,48,36,16,2,2,'F');
        doc.setTextColor(...mu); doc.setFontSize(6.5); doc.text(l.toUpperCase(),bx+18,53,{align:'center'});
        doc.setTextColor(...g); doc.setFontSize(11); doc.setFont('helvetica','bold');
        doc.text(v,bx+18,60,{align:'center'}); doc.setFont('helvetica','normal'); bx+=39;
      });

      let y=74;
      doc.setTextColor(...dk); doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.text('Exercícios Realizados',14,y); y+=5;
      doc.setFillColor(...g); doc.rect(14,y,182,6.5,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(7.5);
      [['Exercício',14],['Séries',94],['Reps',114],['Carga máx',134],['Volume',162]].forEach(([h,x])=>doc.text(h,x+1,y+4.5));
      y+=6.5;

      exs.forEach((ex,i)=>{
        const sets=sl.filter(l=>l.exIdx===i);
        if(!sets.length) return;
        const maxLoad=Math.max(...sets.map(s=>s.load||0));
        const totalReps=sets.reduce((t,s)=>t+(s.reps||0),0);
        const vol=sets.reduce((t,s)=>t+((s.reps||0)*(s.load||0)),0);
        doc.setFillColor(i%2===0?248:255,i%2===0?250:255,i%2===0?252:255);
        doc.rect(14,y,182,6.5,'F');
        doc.setTextColor(...dk); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
        doc.text(ex.name||'-',15,y+4.5);
        doc.text(String(sets.length),95,y+4.5);
        doc.text(String(totalReps),115,y+4.5);
        doc.text(maxLoad+'kg',135,y+4.5);
        doc.text(vol+'kg',163,y+4.5);
        y+=6.5; if(y>272){doc.addPage();y=20;}
      });

      doc.setFillColor(...dk); doc.rect(0,287,210,10,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(7);
      doc.text('Personal PRO — Sistema Profissional de Personal Trainer',105,293,{align:'center'});
      doc.save(`sessao_${(st?.name||'aluno').replace(/\s/g,'_')}_${date.replace(/\//g,'-')}.pdf`);
      notify('PDF gerado!', 'success');
    } catch(err) {
      notify('Erro ao gerar PDF.', 'error');
    }
  };

  // Render view
  if (session) {
    const st = students.find(x => x.id === session.studentId);
    const exs = session.exercises || [];
    const ex = exs[exIdx] || {};
    const totalSets = exs.reduce((sum, e) => sum + (parseInt(e.sets) || 3), 0);
    const doneSets = setLog.length;
    const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
    const exSets = parseInt(ex.sets) || 3;

    return (
      <div className="page" style={{ padding: '20px' }}>
        <div className="tracker-live">
          <div className="tracker-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="flex items-center gap-md">
              <div className="avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {st ? st.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase() : '?'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{st?.name || 'Aluno'}</div>
                <div className="text-muted text-sm">{session.workoutName || 'Treino'}</div>
              </div>
            </div>
            <div className="flex items-center gap-md">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--danger)', fontSize: '0.85rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite' }} /> AO VIVO
              </div>
              <button className="btn btn-danger btn-sm" onClick={handleEndBtn}>Finalizar</button>
            </div>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 12 }}>
            <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">DURAÇÃO</div><div className="stat-value text-gradient" style={{ fontSize: '1.3rem' }}>{formatTime(elapsed)}</div></div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">TRABALHO</div><div className="stat-value" style={{ fontSize: '1.3rem', color: isResting ? 'var(--text-muted)' : 'var(--success)' }}>{formatTime(workSec)}</div></div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">DESCANSO</div><div className="stat-value" style={{ fontSize: '1.3rem', color: isResting ? 'var(--warning)' : 'var(--text-muted)' }}>{formatTime(Math.max(0, elapsed - workSec))}</div></div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">DENSIDADE</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>{elapsed > 0 ? (workSec / elapsed).toFixed(2) : '0.00'}</div></div>
            <div className="stat-card" style={{ textAlign: 'center', padding: 12 }}><div className="stat-label">VOLUME</div><div className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{totalVolume} kg</div></div>
          </div>

          <div className="progress-bar mb-xs" style={{ height: 6, borderRadius: 3, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
            <div className="progress-fill" style={{ width: `${pct}%`, borderRadius: 3, background: 'var(--primary)', height: '100%', transition: 'width 0.3s' }}></div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 20 }}>{doneSets}/{totalSets} séries · {pct}% concluído</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 'var(--space-md)' }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Exercício {exIdx + 1} / {exs.length}</span>
                <div className="flex gap-xs">
                  <button className="btn btn-ghost btn-sm" disabled={exIdx === 0} onClick={() => { setExIdx(exIdx - 1); setSetIdx(0); }}>←</button>
                  <button className="btn btn-ghost btn-sm" disabled={exIdx >= exs.length - 1} onClick={() => { setExIdx(exIdx + 1); setSetIdx(0); }}>→</button>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>{ex.name || '—'}</div>
                <div className="flex gap-md text-sm text-muted" style={{ flexWrap: 'wrap' }}>
                  <span>{exSets} séries</span>
                  <span>{ex.reps || '12'} reps</span>
                  {ex.load && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{ex.load}kg</span>}
                  {ex.oneRM && <span style={{ fontSize: '0.75rem' }}>1RM: {ex.oneRM}kg</span>}
                  <span>{ex.rest || 60}s desc.</span>
                  {ex.method && <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{ex.method}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: exSets }).map((_, i) => {
                  const done = setLog.find(l => l.exIdx === exIdx && l.setIdx === i);
                  const isActive = !done && i === setIdx;
                  
                  return <SetRow 
                    key={`${exIdx}-${i}`} 
                    i={i} ex={ex} done={done} isActive={isActive} 
                    onComplete={(reps, load, pse) => completeSet(i, reps, load, pse)} 
                  />;
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 10 }}>
                <div className="text-xs text-muted mb-xs" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Todos os exercícios</div>
                {exs.map((e, i) => {
                  const done = setLog.filter(l => l.exIdx === i).length >= (parseInt(e.sets) || 3);
                  const isCur = i === exIdx;
                  return (
                    <div key={i} onClick={() => { setExIdx(i); setSetIdx(0); }} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 6, cursor: 'pointer',
                      background: isCur ? 'rgba(16,185,129,0.08)' : 'transparent',
                      color: done ? 'var(--success)' : isCur ? 'var(--primary)' : 'var(--text-secondary)'
                    }}>
                      <span style={{ fontSize: '0.7rem', minWidth: 12 }}>{done ? '✓' : isCur ? '●' : '○'}</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: isCur ? 600 : 400 }}>{e.name}</span>
                      {e.load && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{e.load}kg</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Descanso</span>
                <div className="flex items-center gap-sm">
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isResting ? 'var(--warning)' : 'var(--success)' }}>
                    {isResting ? '⏸ DESCANSANDO' : '▶ TRABALHANDO'}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} /> Som
                  </label>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'monospace', color: isResting ? (restRemaining <= 5 ? 'var(--danger)' : 'var(--warning)') : 'var(--primary)', transition: 'color 0.3s' }}>
                  {formatTime(isResting ? restRemaining : restDuration)}
                </div>
                <div style={{ fontSize: '0.85rem', color: isResting ? 'var(--text-secondary)' : 'var(--primary)', marginTop: 4 }}>
                  {isResting ? 'Descansando...' : 'HORA DE TREINAR!'}
                </div>
              </div>

              <div className="flex gap-sm" style={{ justifyContent: 'center', marginBottom: 12 }}>
                <button className="btn btn-primary" style={{ minWidth: 140 }} onClick={() => {
                  if (isResting) { setIsResting(false); } 
                  else { setRestDuration(restDuration); setRestRemaining(restDuration); setIsResting(true); }
                }}>
                  {isResting ? '⏸ Pausar Descanso' : '▶ Iniciar Descanso'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setIsResting(false); }}>↺ Reset</button>
              </div>

              <div className="flex gap-xs" style={{ justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                {[30, 45, 60, 90, 120, 180].map(t => (
                  <button key={t} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => {
                    setRestDuration(t); setRestRemaining(t); setIsResting(true);
                  }}>
                    {t >= 60 ? (t/60) + 'min' : t + 's'}
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div className="text-xs text-muted mb-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anotações</div>
                <textarea className="form-textarea" rows="2" placeholder="Observações técnicas..." style={{ fontSize: '0.82rem' }} value={setNotes} onChange={e => setSetNotes(e.target.value)}></textarea>
              </div>

              {session.preBiofeedback && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
                  <div className="text-xs text-muted mb-xs" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pré-treino do aluno</div>
                  <div className="flex gap-md text-xs" style={{ flexWrap: 'wrap' }}>
                    <span>Sono <strong style={{ color: session.preBiofeedback.sleep < 5 ? 'var(--danger)' : 'var(--success)' }}>{session.preBiofeedback.sleep}</strong></span>
                    <span>Disp <strong>{session.preBiofeedback.mood}</strong></span>
                    <span>Energ <strong>{session.preBiofeedback.energy}</strong></span>
                    <span>Estresse <strong style={{ color: session.preBiofeedback.stress >= 7 ? 'var(--warning)' : 'inherit' }}>{session.preBiofeedback.stress}</strong></span>
                    {session.preBiofeedback.pain >= 3 && <span>Dor <strong style={{ color: 'var(--warning)' }}>{session.preBiofeedback.pain}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Post Workout Modal */}
        <Modal isOpen={showPostModal} onClose={() => setShowPostModal(false)} title="Finalizar Sessão" size="md">
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
            {[['Duração', Math.round(elapsed / 60) + 'min'], ['Volume', totalVolume + 'kg'], ['Séries', setLog.length]].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div className="text-xs text-muted">{l}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="form-group">
            <div className="flex items-center justify-between mb-xs">
              <label className="form-label" style={{ margin: 0 }}>PSE — O quanto o treino foi puxado?</label>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{postBF.pse}</span>
            </div>
            <input type="range" min="1" max="10" value={postBF.pse} onChange={e => setPostBF({ ...postBF, pse: parseInt(e.target.value) })} style={{ width: '100%', accentColor: 'var(--primary)' }} />
            <div className="flex justify-between text-xs text-muted"><span>1 — Muito leve</span><span>10 — Máximo</span></div>
          </div>
          <div className="form-group">
            <div className="flex items-center justify-between mb-xs">
              <label className="form-label" style={{ margin: 0 }}>Como o aluno ficou após o treino?</label>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{postBF.satisfaction}</span>
            </div>
            <input type="range" min="1" max="10" value={postBF.satisfaction} onChange={e => setPostBF({ ...postBF, satisfaction: parseInt(e.target.value) })} style={{ width: '100%', accentColor: 'var(--primary)' }} />
            <div className="flex justify-between text-xs text-muted"><span>1 — Péssimo</span><span>10 — Excelente</span></div>
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" rows="2" placeholder="Como foi o treino?" value={postBF.notes} onChange={e => setPostBF({ ...postBF, notes: e.target.value })}></textarea>
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowPostModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={doSaveSession}>Salvar e Finalizar</button>
          </div>
        </Modal>
      </div>
    );
  }

  // Initial View (Not active)
  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Treino ao Vivo</h1><p className="page-subtitle">Timers conectados, check-in e relatórios</p></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Iniciar Sessão</span></div>
          <div className="form-group">
            <label className="form-label">Aluno *</label>
            <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Selecione o aluno</option>
              {activeStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Treino *</label>
            <select className="form-select" disabled={!selectedStudent} value={selectedWorkout} onChange={e => setSelectedWorkout(e.target.value)}>
              <option value="">{selectedStudent ? 'Selecione o treino' : 'Selecione o aluno primeiro'}</option>
              {studentWorkouts.map(w => <option key={w.id} value={w.id}>{w.name}{w.phase ? ' — ' + w.phase : ''} ({Calc.formatDate(w.date)})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} /> Bipe ao fim do descanso
            </label>
          </div>
          <button className="btn btn-primary" disabled={!selectedStudent || !selectedWorkout} onClick={startSession} style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 8 }}>
            {ICON_PLAY} Iniciar Treino ao Vivo
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Check-in Pré-Treino</span>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              if (!selectedStudent) { notify('Selecione um aluno primeiro', 'warning'); return; }
              const url = `${window.location.origin}${window.location.pathname}#/form/pre/${selectedStudent}`;
              navigator.clipboard?.writeText(url);
              notify('Link pré-treino copiado!', 'success');
            }}>Link para aluno</button>
          </div>
          <p className="text-xs text-muted mb-sm">Preencha ou gere link para o aluno responder</p>
          {[
            { k: 'sleep', l: 'Sono', desc: 'Como dormiu?' },
            { k: 'mood', l: 'Disposição', desc: 'Como está hoje?' },
            { k: 'energy', l: 'Energia', desc: 'Nível de energia' },
            { k: 'stress', l: 'Estresse', desc: 'Nível de estresse' },
            { k: 'pain', l: 'Dor', desc: 'Sente alguma dor?' }
          ].map(f => (
            <div key={f.k} className="form-group" style={{ marginBottom: 10 }}>
              <div className="flex items-center justify-between">
                <label className="form-label" style={{ margin: 0 }} title={f.desc}>{f.l}</label>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', minWidth: 20, textAlign: 'right' }}>{preBF[f.k]}</span>
              </div>
              <input type="range" min="1" max="10" value={preBF[f.k]} onChange={e => setPreBF({ ...preBF, [f.k]: parseInt(e.target.value) })} style={{ width: '100%', accentColor: 'var(--primary)' }} />
              <div className="flex justify-between text-xs text-muted" style={{ marginTop: 2 }}><span>1</span><span>10</span></div>
            </div>
          ))}
        </div>
      </div>

      {completedSessions.length > 0 && (
        <div className="card mt-lg">
          <div className="card-header"><span className="card-title">Sessões Recentes</span></div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Aluno</th><th>Treino</th><th>Data</th><th>Duração</th><th>Volume</th><th>Séries</th><th>PSE</th><th></th></tr></thead>
              <tbody>{completedSessions.map(s => {
                const st = students.find(x => x.id === s.studentId);
                const pse = s.postBiofeedback?.pse || 0;
                return (
                  <tr key={s.id}>
                    <td>{st?.name || '?'}</td>
                    <td>{s.workoutName || '-'}</td>
                    <td>{Calc.formatDate(s.date)}</td>
                    <td>{formatTimeHMS(s.totalDuration || 0)}</td>
                    <td>{s.totalVolume ? Math.round(s.totalVolume) : '-'} kg</td>
                    <td>{s.totalSets || '-'}</td>
                    <td style={{ color: pse > 8 ? 'var(--danger)' : pse > 6 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{pse || '-'}</td>
                    <td>
                      <div className="flex gap-xs">
                        <button className="btn btn-ghost btn-sm" title="Ver" onClick={() => setViewSession({ session: s, student: st })} style={{ padding: '4px 6px', color: 'var(--accent)' }}>{ICON_EYE}</button>
                        <button className="btn btn-ghost btn-sm" title="Excluir" onClick={async () => {
                          if (window.confirm('Excluir esta sessão?')) {
                            await db.delete('sessions', s.id);
                            notify('Sessão excluída.', 'success');
                            loadData();
                          }
                        }} style={{ padding: '4px 6px', color: 'var(--danger)' }}>{ICON_DEL}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewSession && (
        <Modal isOpen={true} onClose={() => setViewSession(null)} title="Resumo da Sessão" size="lg">
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div className="flex items-center gap-md mb-md">
              <div className="avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{viewSession.student?.name?.[0] || '?'}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{viewSession.student?.name || 'Aluno'}</div>
                <div className="text-muted text-sm">{viewSession.session.workoutName || 'Treino'} · {new Date(viewSession.session.date).toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                ['Duração', Math.round((viewSession.session.totalDuration||0)/60) + 'min', 'var(--primary)'],
                ['Volume', (viewSession.session.totalVolume||0) + 'kg', 'var(--primary)'],
                ['Séries', String(viewSession.session.totalSets||0), 'var(--primary)'],
                ['PSE', String(viewSession.session.postBiofeedback?.pse||'-'), (viewSession.session.postBiofeedback?.pse||7) > 8 ? 'var(--danger)' : 'var(--success)']
              ].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: 'center', padding: 10, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{l}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <table className="data-table" style={{ fontSize: '0.82rem' }}>
            <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga máx</th><th>Volume</th></tr></thead>
            <tbody>
              {(viewSession.session.exercises || []).map((ex, i) => {
                const sets = (viewSession.session.setLog || []).filter(l => l.exIdx === i);
                if (!sets.length) return <tr key={i} style={{ opacity: 0.5 }}><td>{ex.name}</td><td colSpan="4">Não realizado</td></tr>;
                const maxLoad = Math.max(...sets.map(s => s.load || 0));
                const totalReps = sets.reduce((t, s) => t + (s.reps || 0), 0);
                const vol = sets.reduce((t, s) => t + ((s.reps || 0) * (s.load || 0)), 0);
                return (
                  <tr key={i}>
                    <td><strong>{ex.name}</strong></td>
                    <td>{sets.length}</td>
                    <td>{totalReps}</td>
                    <td>{maxLoad}kg</td>
                    <td>{vol}kg</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {viewSession.session.postBiofeedback?.notes && <p className="text-sm text-muted mt-md">Obs: {viewSession.session.postBiofeedback.notes}</p>}
          <div className="modal-footer" style={{ marginTop: 20 }}>
            <button className="btn btn-outline" onClick={() => generatePDF(viewSession.session, viewSession.student)}>Exportar PDF</button>
            <button className="btn btn-primary" onClick={() => setViewSession(null)}>Fechar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Subcomponent for handling set inputs inside the Live view
function SetRow({ i, ex, done, isActive, onComplete }) {
  const [reps, setReps] = useState(done ? done.reps : (String(ex.reps || '')).replace(/[^0-9]/g, '') || 12);
  const [load, setLoad] = useState(done ? done.load : ex.load || '');
  const [pse, setPse] = useState(done ? done.pse : '');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8,
      background: isActive ? 'rgba(16,185,129,0.08)' : done ? 'rgba(16,185,129,0.04)' : 'var(--bg-secondary)'
    }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 20, color: done ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-muted)' }}>{i + 1}</span>
      <input className="form-input" style={{ width: 62, textAlign: 'center', padding: '4px 6px' }} type="number" placeholder="Reps" value={reps} onChange={e => setReps(e.target.value)} disabled={!!done} />
      <input className="form-input" style={{ width: 70, textAlign: 'center', padding: '4px 6px' }} type="number" step="0.5" placeholder="kg" value={load} onChange={e => setLoad(e.target.value)} disabled={!!done} />
      <input className="form-input" style={{ width: 52, textAlign: 'center', padding: '4px 6px' }} type="number" min="1" max="10" placeholder="PSE" value={pse} onChange={e => setPse(e.target.value)} disabled={!!done} />
      {done ? (
        <span className="badge badge-success" style={{ minWidth: 32, textAlign: 'center', marginLeft: 'auto' }}>✓</span>
      ) : (
        <button className="btn btn-primary btn-sm" style={{ minWidth: 36, marginLeft: 'auto' }} onClick={() => onComplete(parseInt(reps)||0, parseFloat(load)||0, parseInt(pse)||0)}>✓</button>
      )}
    </div>
  );
}
