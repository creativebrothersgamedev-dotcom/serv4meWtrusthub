import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, Role } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUpConsumer: (email: string, password: string, name: string) => Promise<void>;
  signUpProvider: (email: string, password: string, companyName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('fetch profile failed', error);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function createRoleRow(userId: string, email: string, role: Role, displayName: string) {
    const { error: profileError } = await supabase.from('profiles').insert({ id: userId, role, email });
    if (profileError) throw profileError;

    if (role === 'consumer') {
      const { error } = await supabase.from('consumer_profiles').insert({ user_id: userId, name: displayName });
      if (error) throw error;
    } else if (role === 'provider') {
      const { error } = await supabase.from('provider_profiles').insert({ user_id: userId, company_name: displayName });
      if (error) throw error;
    }
  }

  async function signUpConsumer(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');
    await createRoleRow(data.user.id, email, 'consumer', name);
    const p = await fetchProfile(data.user.id);
    setProfile(p);
  }

  async function signUpProvider(email: string, password: string, companyName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Sign up failed');
    await createRoleRow(data.user.id, email, 'provider', companyName);
    const p = await fetchProfile(data.user.id);
    setProfile(p);
  }

  async function signIn(email: string, password: string): Promise<Profile> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const p = await fetchProfile(data.user.id);
    setProfile(p);
    return p;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshProfile() {
    if (session?.user) {
      const p = await fetchProfile(session.user.id);
      setProfile(p);
    }
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, signUpConsumer, signUpProvider, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
