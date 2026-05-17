// ========================================
// PERSONAL PRO — Backup & Restore (React)
// ========================================

import db from './db';

const STORES = [
  'students', 'workouts', 'sessions', 'assessments',
  'biofeedback', 'cardio_sessions', 'financial', 'calendar_events',
  'macrocycles', 'exercises', 'anamnesis', 'pre_forms',
  'post_forms', 'settings'
];

/** Exporta todos os dados como arquivo JSON */
export async function exportBackup(notify) {
  try {
    const data = { _version: 2, _date: new Date().toISOString() };
    for (const store of STORES) {
      data[store] = await db.getAll(store);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PersonalPRO_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify?.('Backup exportado com sucesso!', 'success');
  } catch (e) {
    notify?.('Erro ao exportar: ' + e.message, 'error');
  }
}

/** Importa dados de um arquivo JSON de backup */
export async function importBackup(file, notify) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data._version) throw new Error('Arquivo inválido — falta _version');
        for (const store of STORES) {
          const items = data[store];
          if (Array.isArray(items)) {
            for (const item of items) await db.put(store, item);
          }
        }
        notify?.('Backup importado com sucesso!', 'success');
        resolve();
      } catch (err) {
        notify?.('Erro ao importar: ' + err.message, 'error');
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

/** Exporta uma store específica como CSV (UTF-8 com BOM) */
export async function exportCSV(storeName, notify) {
  try {
    const data = await db.getAll(storeName);
    if (!data.length) { notify?.('Sem dados para exportar', 'warning'); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PersonalPRO_${storeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify?.(`CSV de ${storeName} exportado!`, 'success');
  } catch (e) {
    notify?.('Erro: ' + e.message, 'error');
  }
}
