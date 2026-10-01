import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { 
  signInWithPopup, 
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // We removed the empty createUserProfile call here!
        // It was causing a race condition where it fired and created the user 
        // as a 'subscriber' before signInWithPopup had a chance to pass the role.
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
    } catch (error) {
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
    } catch (error) {
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
