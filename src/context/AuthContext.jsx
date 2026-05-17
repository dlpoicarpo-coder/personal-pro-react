import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import db from '../lib/db';
import { seedExercises } from '../lib/exercises-db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainerSettings, setTrainerSettings] = useState({});

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        db.setUser(user);
        loadTrainerSettings(user);
        db.seedTemplates().catch(console.error);
        seedExercises(db).catch(console.error);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        db.setUser(currentUser);
        loadTrainerSettings(currentUser);
        if (event === 'SIGNED_IN') {
          db.seedTemplates().catch(console.error);
          seedExercises(db).catch(console.error);
        }
      } else {
        db.setUser(null);
        setTrainerSettings({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadTrainerSettings(user) {
    try {
      const settings = await db.get('settings', 'trainer') || {};
      setTrainerSettings(settings);
      // Apply saved theme
      const theme = settings.theme || localStorage.getItem('pp_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('pp_theme', theme);
    } catch {}
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    return { user: data.user };
  }

  async function signUp(email, password, trainerName, cref) {
    const redirectTo = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { trainer_name: trainerName, cref: cref || '' }
      }
    });
    if (error) return { error: error.message };
    const needsConfirmation = data.user && !data.session;
    return { user: data.user, needsConfirmation };
  }

  async function signOut() {
    await supabase.auth.signOut();
    db.setUser(null);
    localStorage.removeItem('pp_session');
  }

  const trainerName = trainerSettings.trainerName || user?.user_metadata?.trainer_name || user?.email || '';
  const trainerCref = trainerSettings.cref || user?.user_metadata?.cref || '';
  const initials = trainerName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'PT';

  return (
    <AuthContext.Provider value={{
      user, loading, trainerSettings, trainerName, trainerCref, initials,
      signIn, signUp, signOut,
      refreshSettings: () => user && loadTrainerSettings(user)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
