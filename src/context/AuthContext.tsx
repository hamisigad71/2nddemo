import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { createUserProfile } from '../lib/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: (role?: string) => Promise<User>;
  signInWithFacebook: (role?: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string, name: string, phone: string, role: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check if user is returning from a popup-blocked redirect flow
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const storedRole = localStorage.getItem('pendingAuthRole');
          if (storedRole) {
            await createUserProfile(result.user.uid, {
              name: result.user.displayName,
              email: result.user.email,
              avatar: result.user.photoURL,
              role: storedRole
            });
            localStorage.removeItem('pendingAuthRole');
          }
          // Redirect handling can be done by components listening to `user` state, or we just rely on them being logged in.
        }
      } catch (err) {
        console.error("Redirect auth failed:", err);
      }
    };
    
    handleRedirectResult();

    // 2. Listen to normal auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async (role?: string) => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (role) {
         await createUserProfile(result.user.uid, {
           name: result.user.displayName,
           email: result.user.email,
           avatar: result.user.photoURL,
           role: role
         });
      }
      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        console.warn('Popup blocked, falling back to redirect...');
        if (role) localStorage.setItem('pendingAuthRole', role);
        await signInWithRedirect(auth, googleProvider);
        return auth.currentUser as User;
      }
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signInWithFacebook = async (role?: string) => {
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      if (role) {
         await createUserProfile(result.user.uid, {
           name: result.user.displayName,
           email: result.user.email,
           avatar: result.user.photoURL,
           role: role
         });
      }
      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        console.warn('Popup blocked, falling back to redirect...');
        if (role) localStorage.setItem('pendingAuthRole', role);
        await signInWithRedirect(auth, facebookProvider);
        return auth.currentUser as User;
      }
      console.error("Error signing in with Facebook", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, phone: string, role: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(result.user.uid, {
        name,
        email,
        phone,
        role: role
      });
      return result.user;
    } catch (error) {
      console.error("Error signing up with email", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (error) {
      console.error("Error signing in with email", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithFacebook, signUpWithEmail, signInWithEmail, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
