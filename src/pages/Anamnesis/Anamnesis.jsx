import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';

export default function Anamnesis() {
  const { user } = useAuth();
  const notify = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      const url = `${window.location.origin}/form/anamnese?trainer=${user.id}`;
      setLink(url);
    }
    db.getAll('anamnesis').then(setSubmissions);
  }, [user]);

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    notify('Link copiado!', 'success');
    setTimeout(() => setCopied(false), 2500);
  }

  async function convertToStudent(sub) {
    const student = { name: sub.name, email: sub.email, phone: sub.phone, goal: sub.goal, notes: `Anamnese: ${sub.healthNotes || ''}`, status: 'Ativo' };
    await db.put('students', student);
    notify(`${sub.name} adicionado como aluno!`, 'success');
    await db.delete('anamnesis', sub.id);
    db.getAll('anamnesis').then(setSubmissions);
  }

  async function handleDelete(id) {
    await db.delete('anamnesis', id);
    db.getAll('anamnesis').then(setSubmissions);
    notify('Removido', 'warning');
  }

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Anamnese</h1><p className="page-subtitle">Envie o formulário para potenciais alunos</p></div></div>

      <div className="card" style={{ maxWidth:600, marginBottom:'2rem' }}>
        <div className="card-header"><span className="card-title">🔗 Link do Formulário</span></div>
        <div style={{ padding:'1.5rem' }}>
          <p style={{ color:'var(--text-secondary)', marginBottom:'1rem', fontSize:'0.9rem' }}>Compartilhe este link com potenciais alunos. Eles preencherão o formulário e os dados aparecerão aqui.</p>
          <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
            <input className="form-input" readOnly value={link} style={{ flex:1, fontSize:'0.82rem' }} />
            <button className="btn btn-primary" onClick={copyLink}>{copied ? '✓ Copiado' : 'Copiar'}</button>
          </div>
          {link && <div style={{ marginTop:'0.75rem' }}><a href={link} target="_blank" rel="noreferrer" className="text-accent" style={{ fontSize:'0.85rem' }}>Visualizar formulário →</a></div>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">📋 Respostas Recebidas</span><span className="badge badge-info">{submissions.length}</span></div>
        {submissions.length === 0 ? (
          <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)' }}>Nenhuma resposta ainda. Compartilhe o link acima!</div>
        ) : (
          <div style={{ padding:'0.5rem' }}>
            {submissions.map(sub => (
              <div key={sub.id} style={{ borderBottom:'1px solid var(--border)', padding:'1rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'0.75rem' }}>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text-primary)' }}>{sub.name}</div>
                    <div style={{ fontSize:'0.85rem', color:'var(--text-muted)', marginTop:2 }}>
                      {sub.email} · {sub.phone}
                      {sub.goal && <span style={{ marginLeft:'0.5rem' }}>· Objetivo: {sub.goal}</span>}
                    </div>
                    {sub.healthNotes && <div style={{ marginTop:'0.5rem', fontSize:'0.83rem', color:'var(--text-secondary)' }}>Notas: {sub.healthNotes}</div>}
                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:4 }}>
                      Recebido: {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => convertToStudent(sub)}>+ Converter em Aluno</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(sub.id)}>Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
