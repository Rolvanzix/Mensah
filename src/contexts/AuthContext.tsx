import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider, testFirestoreConnection } from '../services/firebase';
import { UserProfile } from '../types/practiceTrading';

const INITIAL_VIRTUAL_BALANCE = 10000.0;
const GUEST_STORAGE_KEY = 'mensah_guest_virtual_profile_v1';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateVirtualBalance: (newBalance: number) => Promise<void>;
  clearError: () => void;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const profileSubRef = React.useRef<(() => void) | null>(null);

  // Load guest profile from local storage if unauthenticated
  const getOrCreateGuestProfile = (): UserProfile => {
    try {
      const saved = localStorage.getItem(GUEST_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse error
    }
    const guest: UserProfile = {
      uid: 'guest_local_user',
      email: null,
      displayName: 'Practice Trader',
      photoURL: null,
      virtualBalance: INITIAL_VIRTUAL_BALANCE,
      hasReceivedInitialBonus: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
    } catch {
      // Ignore storage error
    }
    return guest;
  };

  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clean up any existing user profile listener immediately
      if (profileSubRef.current) {
        profileSubRef.current();
        profileSubRef.current = null;
      }

      setLoading(true);
      setError(null);

      if (user) {
        // Prevent showing stale data from previous user during fetch
        setUserProfile(null);
        setFirebaseUser(user);
        setIsGuest(false);

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          let activeProfile: UserProfile;

          if (!docSnap.exists()) {
            // New User: grant the one-time $10,000 virtual balance
            activeProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Trader',
              photoURL: user.photoURL || null,
              virtualBalance: INITIAL_VIRTUAL_BALANCE,
              hasReceivedInitialBonus: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, activeProfile);
          } else {
            // Existing User: retrieve existing balance, NEVER re-grant or overwrite!
            activeProfile = docSnap.data() as UserProfile;
          }

          setUserProfile(activeProfile);

          // Subscribe to real-time updates on this user's profile and store in ref
          profileSubRef.current = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                setUserProfile(snap.data() as UserProfile);
              }
            },
            (snapErr) => {
              console.warn('[Mensah Auth] Profile snapshot sync note:', snapErr?.message || snapErr);
            }
          );

          window.dispatchEvent(
            new CustomEvent('mensah_user_switched', {
              detail: { userId: user.uid, isGuest: false },
            })
          );

          setLoading(false);
        } catch (err: any) {
          const errMsg = err?.message || '';
          console.warn('[Mensah Auth] Notice fetching remote user profile, activating authenticated fallback:', errMsg);
          
          // Provide an authenticated profile matching the signed-in user with their $10,000 practice balance
          const localAuthProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Practice Trader',
            photoURL: user.photoURL || null,
            virtualBalance: INITIAL_VIRTUAL_BALANCE,
            hasReceivedInitialBonus: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUserProfile(localAuthProfile);

          window.dispatchEvent(
            new CustomEvent('mensah_user_switched', {
              detail: { userId: user.uid, isGuest: false },
            })
          );

          // If it's an offline mode or token service wait, do not alarm the user with error banners
          if (errMsg.includes('offline') || errMsg.includes('token-service') || errMsg.includes('auth token failed')) {
            setError(null);
          } else {
            setError('Running in local practice mode. Profile changes will sync once connection is restored.');
          }
          setLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setIsGuest(true);
        setUserProfile(getOrCreateGuestProfile());
        window.dispatchEvent(
          new CustomEvent('mensah_user_switched', {
            detail: { userId: 'guest_local_user', isGuest: true },
          })
        );
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileSubRef.current) {
        profileSubRef.current();
        profileSubRef.current = null;
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('[Mensah Auth] Google sign-in failed:', err);
      // Don't show error if user simply closed the popup window
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err?.message || 'Google sign-in encountered an error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      // Immediately cancel background snapshot listener of signed-out user
      if (profileSubRef.current) {
        profileSubRef.current();
        profileSubRef.current = null;
      }

      await signOut(auth);
      setFirebaseUser(null);
      setIsGuest(true);
      setUserProfile(getOrCreateGuestProfile());

      window.dispatchEvent(
        new CustomEvent('mensah_user_switched', {
          detail: { userId: 'guest_local_user', isGuest: true },
        })
      );
    } catch (err: any) {
      console.error('[Mensah Auth] Sign-out failed:', err);
      setError('Failed to sign out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateVirtualBalance = async (newBalance: number) => {
    if (firebaseUser && userProfile) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(
          userDocRef,
          {
            virtualBalance: Math.max(0, newBalance),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('[Mensah Auth] Failed to update virtual balance in Firestore:', err);
      }
    } else {
      // Guest mode update
      const updated: UserProfile = {
        ...(userProfile || getOrCreateGuestProfile()),
        virtualBalance: Math.max(0, newBalance),
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(updated);
      try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        error,
        signInWithGoogle,
        signOutUser,
        updateVirtualBalance,
        clearError,
        isGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
