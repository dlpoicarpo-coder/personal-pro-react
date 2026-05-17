import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import db from '../../lib/db';

export default function AnamneseForm() {
  const [params] = useSearchParams();
  const trainerId = params.get('trainer') || '';
  const [form, setForm] = useState({ name:'', email:'', phone:'', age:'', gender:'', goal:'', activityLevel:'', healthNotes:'', medications:'', surgeries:'', allergies:'', smoker:'Não', daysPerWeek:'3' });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSaving(true);
    await db.put('anamnesis', { ...form, trainerId, createdAt: new Date().toISOString() });
    setSaving(false);
    setSubmitted(true);
  }

  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));

  if (submitted) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)' }}>
      <div style={{ textAlign:'center', padding:'2rem' }}>
        <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>✅</div>
        <h2 style={{ color:'var(--text-primary)' }}>Formulário enviado!</h2>
        <p style={{ color:'var(--text-secondary)' }}>Seu personal trainer receberá suas informações em breve.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', padding:'2rem 1rem' }}>
      <div style={{ maxWidth:600, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>⚡</div>
          <h1 style={{ color:'var(--text-primary)', fontSize:'1.5rem', fontWeight:700 }}>Ficha de Anamnese</h1>
          <p style={{ color:'var(--text-secondary)' }}>Preencha com atenção para melhor atendimento</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ fontWeight:700, color:'var(--accent)', borderBottom:'1px solid var(--border)', paddingBottom:'0.5rem' }}>Dados Pessoais</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Nome Completo *</label><input className="form-input" value={form.name} onChange={e => field('name',e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">E-mail *</label><input type="email" className="form-input" value={form.email} onChange={e => field('email',e.target.value)} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.phone} onChange={e => field('phone',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Idade</label><input type="number" className="form-input" value={form.age} onChange={e => field('age',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Gênero</label>
                <select className="form-select" value={form.gender} onChange={e => field('gender',e.target.value)}>
                  <option value="">Selecione</option>
                  <option>Masculino</option><option>Feminino</option><option>Outro</option>
                </select>
              </div>
            </div>
            <div style={{ fontWeight:700, color:'var(--accent)', borderBottom:'1px solid var(--border)', paddingBottom:'0.5rem', marginTop:'0.5rem' }}>Objetivos e Rotina</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Principal Objetivo</label>
                <select className="form-select" value={form.goal} onChange={e => field('goal',e.target.value)}>
                  <option value="">Selecione</option>
                  <option>Emagrecimento</option><option>Hipertrofia</option><option>Condicionamento</option><option>Saúde</option><option>Performance</option><option>Reabilitação</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Nível de Atividade</label>
                <select className="form-select" value={form.activityLevel} onChange={e => field('activityLevel',e.target.value)}>
                  <option value="">Selecione</option>
                  <option>Sedentário</option><option>Levemente ativo</option><option>Moderadamente ativo</option><option>Muito ativo</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Dias disponíveis por semana</label>
                <select className="form-select" value={form.daysPerWeek} onChange={e => field('daysPerWeek',e.target.value)}>
                  {['1','2','3','4','5','6'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Fumante?</label>
                <select className="form-select" value={form.smoker} onChange={e => field('smoker',e.target.value)}>
                  <option>Não</option><option>Sim</option><option>Ex-fumante</option>
                </select>
              </div>
            </div>
            <div style={{ fontWeight:700, color:'var(--accent)', borderBottom:'1px solid var(--border)', paddingBottom:'0.5rem', marginTop:'0.5rem' }}>Histórico de Saúde</div>
            <div className="form-group"><label className="form-label">Problemas de saúde / Lesões</label><textarea className="form-textarea" rows={3} value={form.healthNotes} onChange={e => field('healthNotes',e.target.value)} placeholder="Doenças crônicas, lesões atuais, limitações físicas..." /></div>
            <div className="form-group"><label className="form-label">Medicamentos em uso</label><input className="form-input" value={form.medications} onChange={e => field('medications',e.target.value)} placeholder="Nome dos medicamentos ou 'Nenhum'" /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Cirurgias anteriores</label><input className="form-input" value={form.surgeries} onChange={e => field('surgeries',e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Alergias</label><input className="form-input" value={form.allergies} onChange={e => field('allergies',e.target.value)} /></div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ marginTop:'0.5rem' }}>{saving ? 'Enviando...' : 'Enviar Anamnese'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
