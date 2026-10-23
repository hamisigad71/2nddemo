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
  signUpWithEmail: (email: string, password: string, name: string, phone: string, role: string, extraData?: Record<string, any>) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User | null>;
  verifyOtp: (email: string, token: string) => Promise<User | null>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// System-wide auth epoch version. Bumping this value automatically logs out every user and creator across all browsers
const GLOBAL_AUTH_EPOCH = '2026-10-23_mandatory_kyc_epoch_v1';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const verifyUserStatus = async (uid: string) => {
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('status, role')
        .eq('uid', uid)
        .maybeSingle();

      const isSuspended = dbUser && (
        dbUser.status === 'banned' || 
        dbUser.status === 'suspended' || 
        dbUser.role === 'suspended_creator'
      );

      if (isSuspended) {
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

  // Real-time eviction listener: immediately signs out and redirects if account is suspended
  useEffect(() => {
    if (!user?.id) return;

    const statusChannel = supabase
      .channel(`user_account_status_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `uid=eq.${user.id}`,
        },
        async (payload: any) => {
          const newStatus = payload.new?.status;
          const newRole = payload.new?.role;
          if (newStatus === 'banned' || newStatus === 'suspended' || newRole === 'suspended_creator') {
            await supabase.auth.signOut();
            setUser(null);
            if (typeof window !== 'undefined') {
              window.location.href = '/login?error=account_suspended';
            }
          }
        }
      )
      .subscribe();

    const handleStatusEviction = (e: any) => {
      const targetUid = e.detail?.userId || e.detail?.uid;
      const status = e.detail?.status;
      if (targetUid === user.id && (status === 'suspended' || status === 'banned')) {
        supabase.auth.signOut().then(() => {
          setUser(null);
          if (typeof window !== 'undefined') {
            window.location.href = '/login?error=account_suspended';
          }
        });
      }
    };

    window.addEventListener('account_status_changed', handleStatusEviction);

    return () => {
      supabase.removeChannel(statusChannel);
      window.removeEventListener('account_status_changed', handleStatusEviction);
    };
  }, [user?.id]);

  useEffect(() => {
    let isCancelled = false;

    const enforceGlobalLogout = async (): Promise<boolean> => {
      try {
        const storedEpoch = localStorage.getItem('tgd_auth_epoch');
        if (storedEpoch !== GLOBAL_AUTH_EPOCH) {
          localStorage.setItem('tgd_auth_epoch', GLOBAL_AUTH_EPOCH);
          // Invalidate existing sessions across all browsers
          await supabase.auth.signOut();
          localStorage.removeItem('pendingAuthRole');
          localStorage.removeItem('tgd_session_user');
          if (!isCancelled) {
            setUser(null);
            setLoading(false);
          }
          return false;
        }
      } catch (err) {
        console.warn('Notice enforcing global logout:', err);
      }
      return true;
    };

    enforceGlobalLogout().then(async (canProceed) => {
      if (!canProceed || isCancelled) return;

      // Check initial session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (isCancelled) return;
        if (session?.user) {
          const isOk = await verifyUserStatus(session.user.id);
          if (isOk && !isCancelled) setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    });

    // Listen to normal auth state changes.
    // NOTE: Supabase recommends not awaiting other Supabase calls directly inside
    // this callback (it runs while the auth lock is held), so DB work is deferred.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(async () => {
        if (isCancelled) return;
        if (session?.user) {
          const isOk = await verifyUserStatus(session.user.id);
          if (isOk && !isCancelled) setUser(session.user);
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

            if (avatar && typeof window !== 'undefined') {
              try {
                localStorage.setItem(`tgd_user_avatar_${session.user.id}`, avatar);
                if (role === 'creator') {
                  const currentLocal = JSON.parse(localStorage.getItem(`tgd_creator_profile_${session.user.id}`) || '{}');
                  localStorage.setItem(`tgd_creator_profile_${session.user.id}`, JSON.stringify({
                    ...currentLocal,
                    avatar,
                    avatar_url: avatar,
                    name
                  }));
                }
                window.dispatchEvent(new CustomEvent('profile_updated', { detail: { avatar, name } }));
              } catch {}
            }
          } catch (err) {
            console.error('Error ensuring profile after sign-in:', err);
          }
          if (storedRole) localStorage.removeItem('pendingAuthRole');
        }
      }, 0);
    });

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (role?: string) => {
    try {
      if (role) {
        localStorage.setItem('pendingAuthRole', role);
      }
      const targetPath = role === 'creator' ? '/dashboard' : '/user';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${targetPath}`
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
      if (role) {
        localStorage.setItem('pendingAuthRole', role);
      }
      const targetPath = role === 'creator' ? '/dashboard' : '/user';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}${targetPath}`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Facebook", error);
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    role: string,
    extraData?: Record<string, any>
  ) => {
    try {
      // Sanitize extraData so no large base64 strings or payloads > 1KB reach Supabase Auth API
      // Supabase GoTrue Auth API has a strict 1MB (1,048,576 bytes) request body limit.
      const safeData: Record<string, any> = {
        name,
        phone,
        role
      };

      if (extraData) {
        Object.entries(extraData).forEach(([key, val]) => {
          if (typeof val === 'string') {
            // Never send large base64 data URLs or huge strings in Auth user_metadata
            if (val.startsWith('data:') || val.length > 1024) {
              return;
            }
          }
          safeData[key] = val;
        });
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: safeData
        }
      });
      if (error) throw error;
      
      const isExistingUser = !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);
      const hasSession = !!data.session;

      if (data.user && !isExistingUser) {
        const userAvatar = extraData?.avatar || extraData?.avatar_url || extraData?.picture || null;
        await createUserProfile(data.user.id, {
          name,
          email,
          phone,
          role,
          avatar: userAvatar,
          ...(extraData || {})
        });

        if (userAvatar && typeof window !== 'undefined') {
          try {
            localStorage.setItem(`tgd_user_avatar_${data.user.id}`, userAvatar);
            if (role === 'creator') {
              const currentLocal = JSON.parse(localStorage.getItem(`tgd_creator_profile_${data.user.id}`) || '{}');
              localStorage.setItem(`tgd_creator_profile_${data.user.id}`, JSON.stringify({
                ...currentLocal,
                avatar: userAvatar,
                avatar_url: userAvatar,
                name
              }));
            }
            window.dispatchEvent(new CustomEvent('profile_updated', { detail: { avatar: userAvatar, name } }));
          } catch {}
        }
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
      if (data.user) {
        const isOk = await verifyUserStatus(data.user.id);
        if (!isOk) {
          throw new Error('This account has been suspended by the platform administrator.');
        }
      }
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
