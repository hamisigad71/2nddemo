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
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to normal auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Handle the redirect post-login hook
      if (event === 'SIGNED_IN' && session?.user) {
        const storedRole = localStorage.getItem('pendingAuthRole');
        if (storedRole) {
          try {
            await createUserProfile(session.user.id, {
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
              email: session.user.email,
              avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
              role: storedRole
            });
          } catch (err) {
            console.error('Error creating profile after OAuth sign-in:', err);
          }
          localStorage.removeItem('pendingAuthRole');
        }
      }
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
      
      if (data.user) {
        await createUserProfile(data.user.id, {
          name,
          email,
          phone,
          role
        });
      }
      return data.user;
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
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithFacebook, signUpWithEmail, signInWithEmail, resetPassword, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
