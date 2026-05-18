// ==========================================
// PERSONAL PRO — Database Layer (React)
// Supabase + LocalStorage offline-first
// Scoped per trainer_id (multi-tenant)
// ==========================================

import { supabase } from './supabase';

class Database {
  constructor() {
    this._currentUser = null;
  }

  setUser(user) {
    this._currentUser = user;
  }

  async _getTrainerId() {
    if (this._currentUser?.id) return this._currentUser.id;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) this._currentUser = user;
    return user?.id || null;
  }

  _localKey(storeName, trainerId) {
    return trainerId ? `pp_${trainerId}_${storeName}` : `pp_${storeName}`;
  }

  _getLocal(storeName, trainerId) {
    try {
      const key = this._localKey(storeName, trainerId);
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      }
      const old = localStorage.getItem(`pp_${storeName}`);
      if (old) {
        const parsed = JSON.parse(old);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch { return []; }
  }

  _saveLocal(storeName, items, trainerId) {
    try {
      localStorage.setItem(this._localKey(storeName, trainerId), JSON.stringify(items));
    } catch (e) { console.error('LocalStorage error:', e); }
  }

  async get(storeName, id) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal(storeName, trainerId).find(i => i.id === id) || null;
    try {
      let q = supabase.from(storeName).select('data').eq('id', id);
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { data, error } = await q.single();
      if (error && error.code !== 'PGRST116') return local;
      return data ? data.data : local;
    } catch { return local; }
  }

  async getAll(storeName) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal(storeName, trainerId);
    try {
      let q = supabase.from(storeName).select('data');
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { data, error } = await q;
      if (error) return local;
      const remote = data ? data.map(r => r.data) : [];
      
      // Robust offline-first merge to prevent RLS wiping local data
      const mergedMap = new Map();
      local.forEach(item => mergedMap.set(item.id, item));
      remote.forEach(item => {
        const existing = mergedMap.get(item.id);
        if (!existing || new Date(item.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
          mergedMap.set(item.id, item);
        }
      });
      const merged = Array.from(mergedMap.values());
      
      this._saveLocal(storeName, merged, trainerId);
      return merged;
    } catch { return local; }
  }

  async getByIndex(storeName, indexName, value) {
    const all = await this.getAll(storeName);
    return all.filter(item => item && item[indexName] === value);
  }

  async put(storeName, item) {
    const trainerId = await this._getTrainerId();
    // Normalize id
    if (!item.id && item.key) item.id = item.key;
    if (!item.id) {
      item.id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }
    item.updatedAt = new Date().toISOString();
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    if (trainerId) item.trainer_id = trainerId;

    const all = this._getLocal(storeName, trainerId);
    const idx = all.findIndex(i => i.id === item.id);
    if (idx >= 0) all[idx] = item; else all.push(item);
    this._saveLocal(storeName, all, trainerId);

    try {
      const payload = { id: item.id, trainer_id: trainerId || null, data: item };
      const { error } = await supabase.from(storeName).upsert(payload);
      if (error) console.warn(`Supabase put error (${storeName}):`, error.message);
    } catch (err) { console.warn('Supabase put exception:', err.message); }

    return item;
  }

  async add(storeName, item) {
    return this.put(storeName, item);
  }

  async delete(storeName, id) {
    const trainerId = await this._getTrainerId();
    const all = this._getLocal(storeName, trainerId).filter(i => i.id !== id);
    this._saveLocal(storeName, all, trainerId);
    try {
      let q = supabase.from(storeName).delete().eq('id', id);
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { error } = await q;
      if (error) console.warn(`Supabase delete error (${storeName}):`, error.message);
    } catch {}
  }

  async clear(storeName) {
    const trainerId = await this._getTrainerId();
    localStorage.removeItem(this._localKey(storeName, trainerId));
    try {
      let q = supabase.from(storeName).delete().not('id', 'is', null);
      if (trainerId) q = q.eq('trainer_id', trainerId);
      await q;
    } catch {}
  }

  async count(storeName) {
    const trainerId = await this._getTrainerId();
    const local = this._getLocal(storeName, trainerId);
    try {
      let q = supabase.from(storeName).select('id', { count: 'exact', head: true });
      if (trainerId) q = q.eq('trainer_id', trainerId);
      const { count, error } = await q;
      if (error) return local.length;
      return count || 0;
    } catch { return local.length; }
  }

  async seedTemplates() {
    await this.seedMethods();
    const exercisesCount = await this.count('exercises');
    if (exercisesCount < 80) {
      const exercises = [
        // PEITO
        { name: 'Supino Reto com Barra', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Exercício base para desenvolvimento do peitoral maior.' },
        { name: 'Supino Inclinado com Halteres', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Foco na porção clavicular do peitoral.' },
        { name: 'Supino Declinado com Barra', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Ênfase na porção inferior do peitoral.' },
        { name: 'Crucifixo Reto', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Isolamento do peitoral com amplitude máxima.' },
        { name: 'Peck Deck (Voador)', muscleGroup: 'Peito', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Isolamento do peitoral na máquina.' },
        { name: 'Flexão de Braços', muscleGroup: 'Peito', category: 'Funcional', equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Exercício funcional básico para peitoral.' },
        // COSTAS
        { name: 'Puxada Frontal', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Cabo', loadType: 'weight', description: 'Desenvolvimento dos dorsais.' },
        { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Exercício composto para espessura das costas.' },
        { name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Trabalho unilateral para corrigir assimetrias.' },
        { name: 'Barra Fixa (Pull-up)', muscleGroup: 'Costas', category: 'Funcional', equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Exercício avançado de peso corporal.' },
        { name: 'Levantamento Terra', muscleGroup: 'Costas', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Exercício composto para toda a cadeia posterior.' },
        // OMBROS
        { name: 'Desenvolvimento com Halteres', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Exercício base para deltoides.' },
        { name: 'Elevação Lateral', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Isolamento do deltoide lateral.' },
        { name: 'Face Pull', muscleGroup: 'Ombros', category: 'Musculação', equipment: 'Cabo', loadType: 'weight', description: 'Saúde do ombro e deltoide posterior.' },
        // BÍCEPS
        { name: 'Rosca Direta com Barra', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Exercício base para bíceps.' },
        { name: 'Rosca Alternada com Halteres', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Permite foco unilateral e maior amplitude.' },
        { name: 'Rosca Martelo', muscleGroup: 'Bíceps', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Pegada neutra que enfatiza o braquiorradial.' },
        // TRÍCEPS
        { name: 'Tríceps Pulley', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Cabo', loadType: 'weight', description: 'Exercício padrão para tríceps.' },
        { name: 'Tríceps Testa', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Foco na cabeça longa do tríceps.' },
        { name: 'Tríceps Corda', muscleGroup: 'Tríceps', category: 'Musculação', equipment: 'Cabo', loadType: 'weight', description: 'Variação com corda para maior ativação.' },
        // QUADRÍCEPS
        { name: 'Agachamento Livre com Barra', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Rei dos exercícios de perna.' },
        { name: 'Leg Press 45°', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Alta carga com menor demanda de estabilização.' },
        { name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Isolamento do quadríceps.' },
        { name: 'Passada (Avanço)', muscleGroup: 'Quadríceps', category: 'Musculação', equipment: 'Halteres', loadType: 'weight', description: 'Trabalha quadríceps e glúteos.' },
        // POSTERIOR
        { name: 'Mesa Flexora', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Isolamento dos isquiotibiais deitado.' },
        { name: 'Stiff com Barra', muscleGroup: 'Posterior', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Alongamento ativo dos isquiotibiais.' },
        // GLÚTEOS
        { name: 'Hip Thrust', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Barra', loadType: 'weight', description: 'Melhor exercício para glúteos.' },
        { name: 'Abdução na Máquina', muscleGroup: 'Glúteos', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Isolamento do glúteo médio.' },
        // PANTURRILHA
        { name: 'Panturrilha em Pé', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Foco no gastrocnêmio.' },
        { name: 'Panturrilha Sentado', muscleGroup: 'Panturrilha', category: 'Musculação', equipment: 'Máquina', loadType: 'weight', description: 'Foco no sóleo.' },
        // CORE
        { name: 'Abdominal Crunch', muscleGroup: 'Abdômen', category: 'Funcional', equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Flexão do tronco para reto abdominal.' },
        { name: 'Prancha Frontal', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal', loadType: 'time', defaultReps: '30s', description: 'Exercício isométrico para estabilização do core.' },
        { name: 'Russian Twist', muscleGroup: 'Core', category: 'Funcional', equipment: 'Peso corporal', loadType: 'bodyweight', description: 'Rotação do tronco para oblíquos.' },
        { name: 'Burpee', muscleGroup: 'Corpo Inteiro', category: 'Funcional', equipment: 'Peso corporal', loadType: 'bodyweight', defaultReps: '10', description: 'Exercício metabólico completo.' },
        // CARDIO
        { name: 'Esteira - Corrida', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Esteira', loadType: 'time', defaultReps: '20min', description: 'Corrida aeróbica contínua.' },
        { name: 'HIIT Tabata', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Variado', loadType: 'time', defaultReps: '20s', description: '20s max / 10s repouso × 8 rounds = 4min.' },
        { name: 'Bicicleta Ergométrica', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Bicicleta', loadType: 'time', defaultReps: '20min', description: 'Pedalada indoor.' },
        { name: 'Pular Corda', muscleGroup: 'Cardio', category: 'Cardio', equipment: 'Corda', loadType: 'time', defaultReps: '2min', description: 'Aeróbico de alta intensidade.' },
      ];

      const existing = await this.getAll('exercises');
      const existingNames = new Set(existing.map(e => e.name.toLowerCase()));
      for (const ex of exercises) {
        if (!existingNames.has(ex.name.toLowerCase())) {
          await this.add('exercises', ex);
        }
      }
    }
  }

  async seedMethods() {
    const methods = [
      { name: 'Drop-set', category: 'Hipertrofia', description: 'Executar até a falha, reduzir carga ~20% e continuar sem descanso.', sets: '3+drops', repsHint: '8-12 + drops', restHint: '120-180s entre drop-sets completos' },
      { name: 'Pirâmide Crescente', category: 'Força', description: 'Aumentar carga a cada série, reduzir reps: 12→10→8→6.', sets: '4', repsHint: '12→10→8→6', restHint: '90-120s' },
      { name: 'Super-série Antagonista', category: 'Hipertrofia', description: 'Dois exercícios de grupos opostos sem descanso.', sets: '3', repsHint: '10-12 cada', restHint: '60s após o par' },
      { name: 'Tabata', category: 'Cardio', description: '20s máximo / 10s repouso × 8 rounds = 4min.', sets: '1-3 blocos', repsHint: '20s esforço / 10s repouso', restHint: '60-90s entre blocos' },
      { name: 'HIIT 1:2', category: 'Cardio', description: 'Ratio 1:2 trabalho:descanso. 30s esforço / 60s recuperação.', sets: '8-12', repsHint: '30s esforço', restHint: '60s recuperação ativa' },
      { name: 'Zona 2 (Z2)', category: 'Cardio', description: '65-75% FC Máx. Base aeróbica. Longo e lento.', sets: '1', repsHint: '30-90min contínuo', restHint: 'Sem descanso' },
    ];
    const existing = await this.getAll('methods');
    const existingNames = new Set(existing.map(m => m.name));
    for (const m of methods) {
      if (!existingNames.has(m.name)) {
        await this.add('methods', m);
      }
    }
  }
}

const db = new Database();
export default db;
