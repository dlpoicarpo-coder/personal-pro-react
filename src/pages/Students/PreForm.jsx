import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import db from '../../lib/db';

export default function PreForm() {
  const { studentId } = useParams();
  const [params] = useSearchParams();
  const sid = studentId || params.get('student');

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({ pse: 5, sleep: 7, energy: 7, pain: 'Não', painLocation: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sid) { setNotFound(true); return; }
    db.get('students', sid).then(s => s ? setStudent(s) : setNotFound(true));
  }, [sid]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await db.put('pre_forms', { ...form, studentId: sid, createdAt: new Date().toISOString() });
    setSaving(false);
    setSubmitted(true);
  }

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const pageStyle = { minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Inter, sans-serif' };
  const cardStyle = { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480 };

  if (notFound) return (
    <div style={pageStyle}><div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>❌</div><h2 style={{ color: 'var(--text-primary)', marginTop: '1rem' }}>Aluno não encontrado</h2><p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Verifique o link com seu personal trainer.</p></div></div>
  );

  if (submitted) return (
    <div style={pageStyle}><div style={{ ...cardStyle, textAlign: 'center' }}><div style={{ fontSize: '3rem' }}>✅</div><h2 style={{ color: 'var(--text-primary)', marginTop: '1rem' }}>Enviado!</h2><p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Seu personal já recebeu. Bom treino! 💪</p></div></div>
  );

  if (!student) return <div style={pageStyle}><div className="spinner" /></div>;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏋️</div>
          <div style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-primary)' }}>PersonalPRO</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Check-in Pré-Treino</div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem', fontWeight: 700, color: '#10b981' }}>
          👋 Olá, {student.name}!
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              ⚡ Nível de energia hoje: <strong style={{ color: '#10b981' }}>{form.energy}/10</strong>
            </label>
            <input type="range" min={1} max={10} value={form.energy} onChange={e => field('energy', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              😴 Horas de sono última noite: <strong style={{ color: '#10b981' }}>{form.sleep}h</strong>
            </label>
            <input type="range" min={3} max={12} value={form.sleep} onChange={e => field('sleep', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              🎯 PSE esperada do treino de hoje: <strong style={{ color: '#10b981' }}>{form.pse}/10</strong>
            </label>
            <input type="range" min={1} max={10} value={form.pse} onChange={e => field('pse', Number(e.target.value))} style={{ width: '100%', accentColor: '#10b981' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Sente alguma dor ou desconforto?</label>
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
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Onde sente dor?</label>
              <input type="text" value={form.painLocation} onChange={e => field('painLocation', e.target.value)} placeholder="Ex: joelho direito, lombar..." style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Alguma observação?</label>
            <textarea value={form.notes} onChange={e => field('notes', e.target.value)} rows={2} placeholder="Opcional..." style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', resize: 'vertical' }} />
          </div>
          <button type="submit" disabled={saving} style={{ padding: '0.75rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {saving ? 'Enviando...' : '✓ Confirmar Check-in'}
          </button>
        </form>
      </div>
    </div>
  );
}
