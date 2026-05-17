import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import db from '../../lib/db';

export default function PostForm() {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const sid = sessionId || params.get('session');

  const [session, setSession] = useState(null);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({ pse: 7, fatigue: 5, satisfaction: 8, pain: 'Não', painLocation: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sid) { setNotFound(true); return; }
    db.get('sessions', sid).then(async s => {
      if (!s) { setNotFound(true); return; }
      setSession(s);
      if (s.studentId) {
        const st = await db.get('students', s.studentId);
        setStudent(st);
      }
    });
  }, [sid]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await db.put('post_forms', { ...form, sessionId: sid, studentId: session?.studentId, createdAt: new Date().toISOString() });
    setSaving(false);
    setSubmitted(true);
  }

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pageStyle = { minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' };
  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480 };

  if (notFound) return (
    <div style={pageStyle}><div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>❌</div><h2 style={{ color: 'var(--text-primary)', marginTop: '1rem' }}>Sessão não encontrada</h2><p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Verifique o link com seu personal trainer.</p></div></div>
  );

  if (submitted) return (
    <div style={pageStyle}><div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>🎉</div><h2 style={{ color: 'var(--text-primary)', marginTop: '1rem' }}>Registrado!</h2><p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Parabéns pelo treino! Continue evoluindo. 📊💪</p></div></div>
  );

  if (!session) return <div style={pageStyle}><div className="spinner" /></div>;

  const studentName = student?.name || 'Aluno';

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)' }}>PersonalPRO</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Check-in Pós-Treino</div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontWeight: 700, color: '#10b981' }}>
          🎉 Parabéns pelo treino, {studentName}!
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              💪 PSE — Percepção de esforço: <strong style={{ color: '#10b981' }}>{form.pse}/10</strong>
            </label>
            <input type="range" min={1} max={10} value={form.pse} onChange={e => field('pse', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <span>Muito leve</span><span>Moderado</span><span>Máximo</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              😴 Nível de fadiga: <strong style={{ color: '#10b981' }}>{form.fatigue}/10</strong>
            </label>
            <input type="range" min={1} max={10} value={form.fatigue} onChange={e => field('fatigue', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              😊 Satisfação com o treino: <strong style={{ color: '#10b981' }}>{form.satisfaction}/10</strong>
            </label>
            <input type="range" min={1} max={10} value={form.satisfaction} onChange={e => field('satisfaction', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Sentiu alguma dor durante o treino?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Não', 'Leve', 'Moderada', 'Intensa'].map(v => (
                <button key={v} type="button" onClick={() => field('pain', v)}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: '1px solid', borderColor: form.pain === v ? '#10b981' : 'var(--border)', background: form.pain === v ? 'rgba(16,185,129,0.15)' : 'transparent', color: form.pain === v ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {form.pain !== 'Não' && (
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Onde sentiu dor?</label>
              <input type="text" value={form.painLocation} onChange={e => field('painLocation', e.target.value)} placeholder="Ex: joelho direito, lombar..." style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Comentários sobre o treino</label>
            <textarea value={form.notes} onChange={e => field('notes', e.target.value)} rows={2} placeholder="O que foi difícil? O que você gostou?" style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', resize: 'vertical' }} />
          </div>
          <button type="submit" disabled={saving} style={{ padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {saving ? 'Enviando...' : '✓ Enviar Avaliação'}
          </button>
        </form>
      </div>
    </div>
  );
}
