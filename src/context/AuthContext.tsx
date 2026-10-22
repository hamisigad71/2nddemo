import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { createUserProfile } from '../lib/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (role?: string) => Promise<void>;
  signInWithFacebook: (role?: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, phone: string, role: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  verifyOtp: (email: string, token: string) => Promise<User | null>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const verifyUserStatus = async (uid: string) => {
    try {
      const { data: dbUser } = await supabase.from('users').select('status').eq('uid', uid).maybeSingle();
      if (dbUser && (dbUser.status === 'banned' || dbUser.status === 'suspended')) {
        await supabase.auth.signOut();
        setUser(null);
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?error=account_suspended';
        }
        return false;
      }
    } catch {}
    return true;
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const isOk = await verifyUserStatus(session.user.id);
        if (isOk) setUser(session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen to normal auth state changes.
    // NOTE: Supabase recommends not awaiting other Supabase calls directly inside
    // this callback (it runs while the auth lock is held), so DB work is deferred.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (session?.user) {
          const isOk = await verifyUserStatus(session.user.id);
          if (isOk) setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);

        // Ensure user profile exists in public.users on sign-in
        if (event === 'SIGNED_IN' && session?.user) {
          const storedRole = localStorage.getItem('pendingAuthRole');
          const metadata = session.user.user_metadata || {};
          const role = storedRole || metadata.role || 'subscriber';
          const name = metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'User';
          const phone = metadata.phone || '';
          const avatar = metadata.avatar_url || metadata.picture || null;

          try {
            await createUserProfile(session.user.id, {
              name,
              email: session.user.email,
              avatar,
              phone,
              role
            });
          } catch (err) {
            console.error('Error ensuring profile after sign-in:', err);
          }
          if (storedRole) localStorage.removeItem('pendingAuthRole');
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (role?: string) => {
    try {
      if (role) localStorage.setItem('pendingAuthRole', role);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signInWithFacebook = async (role?: string) => {
    try {
      if (role) localStorage.setItem('pendingAuthRole', role);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Facebook", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, phone: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            role
          }
        }
      });
      if (error) throw error;
      
      const isExistingUser = !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
      const hasSession = !!data.session;

      if (data.user && !isExistingUser) {
        await createUserProfile(data.user.id, {
          name,
          email,
          phone,
          role
        });
      }
      return {
        ...data.user,
        isExistingUser,
        hasSession,
        session: data.session
      } as any;
    } catch (error) {
      console.error("Error signing up with email", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      return data.user;
    } catch (error) {
      console.error("Error signing in with email", error);
      throw error;
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    const cleanToken = token.replace(/\s+/g, '').trim();
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type: 'signup'
      });
      if (error) {
        // Fallback attempt with type: 'email'
        const { data: fbData, error: fbError } = await supabase.auth.verifyOtp({
          email,
          token: cleanToken,
          type: 'email'
        });
        if (fbError) throw error;
        return fbData.user;
      }
      return data.user;
    } catch (error) {
      console.error("Error verifying OTP", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithFacebook, signUpWithEmail, signInWithEmail, verifyOtp, resetPassword, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
