import React, { useState, useEffect, useRef } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';

export default function Tracker() {
  const notify = useToast();
  const [students, setStudents] = useState([]);
  const [studentWorkouts, setStudentWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [session, setSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    db.getAll('students').then(s => setStudents(s.filter(x => x.status === 'Ativo').sort((a,b) => a.name?.localeCompare(b.name))));
    db.getAll('exercises').then(setExercises);
    const auto = sessionStorage.getItem('pp_tracker_autostart');
    if (auto) { sessionStorage.removeItem('pp_tracker_autostart'); try { const d = JSON.parse(auto); if (d.studentId) setSelectedStudent(d.studentId); } catch {} }
  }, []);

  useEffect(() => {
    if (!selectedStudent) { setStudentWorkouts([]); setSelectedWorkout(''); return; }
    db.getAll('workouts').then(all => {
      const sw = all.filter(w => w.studentId === selectedStudent);
      setStudentWorkouts(sw);
      if (sw.length === 1) setSelectedWorkout(sw[0].id);
    });
  }, [selectedStudent]);

  useEffect(() => {
    if (session) { timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [session]);

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  async function startSession() {
    if (!selectedStudent || !selectedWorkout) { notify('Selecione aluno e treino', 'error'); return; }
    const workout = studentWorkouts.find(w => w.id === selectedWorkout);
    const logs = (workout?.exercises || []).map(ex => ({
      exerciseId: ex.exerciseId,
      logs: Array.from({ length: Number(ex.sets) || 3 }, () => ({ reps: ex.reps || '', weight: ex.weight || '', done: false }))
    }));
    setSession({ studentId: selectedStudent, workoutId: selectedWorkout, date: new Date().toISOString(), status: 'active', startTime: Date.now() });
    setElapsed(0); setExerciseLogs(logs);
    notify('Sessão iniciada! 💪', 'success');
  }

  function updateLog(exIdx, setIdx, key, val) {
    setExerciseLogs(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, logs: ex.logs.map((l, j) => j !== setIdx ? l : { ...l, [key]: val }) }));
  }
  function toggleSet(exIdx, setIdx) {
    setExerciseLogs(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, logs: ex.logs.map((l, j) => j !== setIdx ? l : { ...l, done: !l.done }) }));
  }

  async function finishSession() {
    if (!window.confirm('Finalizar sessão?')) return;
    await db.put('sessions', { ...session, status: 'completed', duration: elapsed, exerciseLogs, endTime: Date.now() });
    setSession(null); setElapsed(0); setExerciseLogs([]); setSelectedWorkout('');
    notify('Sessão salva com sucesso! ✅', 'success');
  }

  const getExerciseName = id => exercises.find(e => e.id === id)?.name || 'Exercício';
  const workout = studentWorkouts.find(w => w.id === selectedWorkout);
  const totalSets = exerciseLogs.reduce((a, ex) => a + ex.logs.length, 0);
  const doneSets = exerciseLogs.reduce((a, ex) => a + ex.logs.filter(l => l.done).length, 0);
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Treino ao Vivo</h1><p className="page-subtitle">Acompanhamento em tempo real</p></div>
      </div>

      {!session ? (
        <div className="card" style={{ maxWidth: 480, margin: '2rem auto' }}>
          <div className="card-header"><span className="card-title">▶ Iniciar Sessão</span></div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Aluno</label>
              <select className="form-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
                <option value="">Selecione o aluno</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Treino</label>
              <select className="form-select" value={selectedWorkout} onChange={e => setSelectedWorkout(e.target.value)} disabled={!selectedStudent}>
                <option value="">Selecione o treino</option>
                {studentWorkouts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={startSession} disabled={!selectedStudent || !selectedWorkout}>▶ Iniciar Treino</button>
          </div>
        </div>
      ) : (
        <div className="tracker-container">
          <div className="tracker-header-bar">
            <div className="tracker-timer">{fmt(elapsed)}</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>{students.find(s => s.id === selectedStudent)?.name}</div>
              <div className="text-muted" style={{ fontSize: '0.85rem' }}>{workout?.name}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{doneSets}/{totalSets} séries · {progress}%</div>
            </div>
            <button className="btn btn-danger" onClick={finishSession}>⏹ Finalizar</button>
          </div>
          <div className="exercises-log">
            {exerciseLogs.map((ex, exIdx) => (
              <div key={exIdx} className="exercise-log-card">
                <div className="exercise-log-name">{getExerciseName(ex.exerciseId)}</div>
                <div className="sets-grid">
                  <div className="set-header"><span>#</span><span>Reps</span><span>Carga</span><span>✓</span></div>
                  {ex.logs.map((log, setIdx) => (
                    <div key={setIdx} className={`set-row${log.done ? ' done' : ''}`}>
                      <span className="set-number">{setIdx + 1}</span>
                      <input className="form-input set-input" value={log.reps} onChange={e => updateLog(exIdx, setIdx, 'reps', e.target.value)} placeholder="—" />
                      <input className="form-input set-input" value={log.weight} onChange={e => updateLog(exIdx, setIdx, 'weight', e.target.value)} placeholder="—" />
                      <button className={`btn btn-sm ${log.done ? 'btn-success' : 'btn-outline'}`} onClick={() => toggleSet(exIdx, setIdx)}>{log.done ? '✓' : '○'}</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
