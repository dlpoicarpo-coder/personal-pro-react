import React, { useState, useEffect } from 'react';
import db from '../../lib/db';
import { useToast } from '../../components/Toast/Toast';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { trainerName, trainerCref, refreshSettings, signOut } = useAuth();
  const notify = useToast();
  const [form, setForm] = useState({ trainerName:'', cref:'', email:'', theme:'dark' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.get('settings','trainer').then(s => {
      if (s) setForm(f => ({ ...f, ...s }));
    });
    const theme = localStorage.getItem('pp_theme') || 'dark';
    setForm(f => ({ ...f, theme }));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await db.put('settings', { ...form, id:'trainer' });
    document.documentElement.setAttribute('data-theme', form.theme);
    localStorage.setItem('pp_theme', form.theme);
    await refreshSettings();
    notify('Configurações salvas!', 'success');
    setSaving(false);
  }

  async function handleExport() {
    const stores = ['students','workouts','sessions','assessments','biofeedback','financial','calendar_events','macrocycles','exercises'];
    const backup = {};
    for (const s of stores) backup[s] = await db.getAll(s);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `personal-pro-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    notify('Backup exportado!', 'success');
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      for (const [store, items] of Object.entries(data)) {
        for (const item of (items||[])) await db.put(store, item);
      }
      notify('Backup importado com sucesso!', 'success');
    } catch { notify('Erro ao importar backup', 'error'); }
    e.target.value = '';
  }

  async function handleClearData() {
    if (!window.confirm('⚠️ Isso apagará TODOS os dados locais. Os dados no Supabase são mantidos. Continuar?')) return;
    const stores = ['students','workouts','sessions','assessments','biofeedback','financial','calendar_events','macrocycles'];
    for (const s of stores) {
      const keys = Object.keys(localStorage).filter(k => k.includes(s));
      keys.forEach(k => localStorage.removeItem(k));
    }
    notify('Cache local limpo', 'warning');
  }

  async function handleLogout() {
    if (!window.confirm('Tem certeza que deseja sair?')) return;
    await signOut();
    window.location.href = '/login';
  }

  const field = (k,v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Configurações</h1><p className="page-subtitle">Perfil e preferências</p></div></div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', maxWidth:900 }}>
        {/* Profile */}
        <div className="card">
          <div className="card-header"><span className="card-title">👤 Perfil do Personal Trainer</span></div>
          <form onSubmit={handleSave} style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div className="form-group"><label className="form-label">Nome Completo</label><input className="form-input" value={form.trainerName} onChange={e => field('trainerName',e.target.value)} placeholder="Seu nome" /></div>
            <div className="form-group"><label className="form-label">CREF</label><input className="form-input" value={form.cref} onChange={e => field('cref',e.target.value)} placeholder="000000-X/XX" /></div>
            <div className="form-group"><label className="form-label">Tema</label>
              <select className="form-select" value={form.theme} onChange={e => field('theme',e.target.value)}>
                <option value="dark">🌙 Escuro</option>
                <option value="light">☀️ Claro</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configurações'}</button>
          </form>
        </div>

        {/* Data */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">💾 Backup de Dados</span></div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <button className="btn btn-outline" onClick={handleExport}>⬇ Exportar Backup (JSON)</button>
              <label className="btn btn-outline" style={{ cursor:'pointer', textAlign:'center' }}>
                ⬆ Importar Backup
                <input type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">⚙️ Manutenção</span></div>
            <div style={{ padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem' }}>
              <button className="btn btn-outline" style={{ borderColor:'#f59e0b', color:'#f59e0b' }} onClick={handleClearData}>🗑 Limpar Cache Local</button>
              <button className="btn btn-danger" onClick={handleLogout}>🚪 Sair da Conta</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
