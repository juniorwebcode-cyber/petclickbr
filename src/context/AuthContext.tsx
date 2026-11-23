import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types/petclick';

interface ServerAdminSession {
  token: string;
  email: string;
  role: 'admin';
  mustChangePassword: boolean;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  serverAdmin: ServerAdminSession | null;
  loginWithGoogle: () => Promise<void>;
  loginCustomerEmail: (email: string, password: string) => Promise<void>;
  registerCustomerEmail: (name: string, email: string, password: string) => Promise<void>;
  sendResetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setServerAdminSession: (session: ServerAdminSession | null) => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [role, setRole] = useState<UserRole>('customer');
  // Admin session with session persistence for seamless navigation
  const [serverAdmin, setServerAdminState] = useState<ServerAdminSession | null>(() => {
    try {
      const stored = sessionStorage.getItem('petclick_admin_session');
      if (stored) return JSON.parse(stored) as ServerAdminSession;
    } catch {
      // ignore
    }
    return null;
  });

  const setServerAdmin = (session: ServerAdminSession | null) => {
    setServerAdminState(session);
    try {
      if (session) {
        sessionStorage.setItem('petclick_admin_session', JSON.stringify(session));
      } else {
        sessionStorage.removeItem('petclick_admin_session');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setRole('customer');
        setAuthReady(true);
        return;
      }

      try {
        const emailLower = (user.email || '').toLowerCase();
        const isBootstrapOwner =
          emailLower === 'juniorwebcode@gmail.com' ||
          emailLower === 'admin@x.com';

        let resolvedRole: UserRole = isBootstrapOwner ? 'admin' : 'customer';

        if (!isBootstrapOwner) {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', user.uid));
            if (adminSnap.exists() && adminSnap.data().active === true) {
              resolvedRole = (adminSnap.data().role as UserRole) || 'admin';
            }
          } catch {
            // Non-staff users cannot list admins; ignore get miss
          }
        }

        const userRef = doc(db, 'users', user.uid);
        let userProfile: UserProfile | null = null;
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userProfile = userSnap.data() as UserProfile;
          } else {
            const newProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
              uid: user.uid,
              name: user.displayName || emailLower.split('@')[0] || 'Cliente PetClick',
              email: user.email || '',
              role: 'customer',
              active: true,
            };
            await setDoc(userRef, {
              ...newProfile,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            userProfile = newProfile;
          }
        } catch (err) {
          console.warn('User profile sync notice:', err);
        }

        setRole(resolvedRole);
        setProfile(
          userProfile
            ? { ...userProfile, role: resolvedRole }
            : {
                uid: user.uid,
                name: user.displayName || 'Usuário',
                email: user.email || '',
                role: resolvedRole,
                active: true,
              }
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  const loginCustomerEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const registerCustomerEmail = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: name.trim().slice(0, 140),
        email: email.trim().toLowerCase(),
        role: 'customer',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
    }
  };

  const sendResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    setServerAdmin(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  };

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (serverAdmin?.token) {
      return { Authorization: `Bearer ${serverAdmin.token}` };
    }
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  const isAdmin = role === 'admin' || Boolean(serverAdmin);
  const isStaff = isAdmin || ['manager', 'cashier', 'stockist'].includes(role);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        role,
        isAdmin,
        isStaff,
        serverAdmin,
        loginWithGoogle,
        loginCustomerEmail,
        registerCustomerEmail,
        sendResetPassword,
        logout,
        setServerAdminSession: setServerAdmin,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
