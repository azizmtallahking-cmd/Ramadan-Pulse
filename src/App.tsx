import React, { useState, useEffect } from 'react';
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Files from './pages/Files';
import Goals from './pages/Goals';
import Archive from './pages/Archive';
import PulseCorner from './pages/PulseCorner';
import Onboarding from './pages/Onboarding';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Moon, Loader2 } from 'lucide-react';
import { seedUserRoutine } from './services/seedService';
import { checkAndTriggerSeasonalReview } from './services/adminService';

// Memoized Login View to prevent App re-renders from blocking the button interaction
const LoginView = React.memo(({ onLogin }: { onLogin: () => Promise<void> }) => {
  const [isPending, setIsPending] = useState(false);

  const handleLogin = async () => {
    setIsPending(true);
    try {
      await onLogin();
    } catch (error) {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Moon className="w-10 h-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-stone-900 mb-2 font-serif">نبض رمضان</h1>
        <p className="text-stone-600 mb-8">استعد لرمضان وحافظ على أهدافك الإيمانية مع المرشد الذكي Ramadan Man.</p>
        <button
          onClick={handleLogin}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {isPending ? 'جاري التحميل...' : 'تسجيل الدخول باستخدام جوجل'}
        </button>
      </motion.div>
    </div>
  );
});

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'chat' | 'files' | 'goals' | 'archive' | 'pulse'>('home');

  // Effect to handle initial page redirection based on resident status
  useEffect(() => {
    if (profile?.isResident && profile?.onboardingCompleted && currentPage === 'home') {
      setCurrentPage('pulse');
    }
  }, [profile?.isResident, profile?.onboardingCompleted]);

  useEffect(() => {
    if (profile) {
      checkAndTriggerSeasonalReview(profile);
    }
  }, [profile?.uid, profile?.lastSeasonalReviewAt]);

  useEffect(() => {
    if (user && !profile?.coordinates) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const docRef = doc(db, 'users', user.uid);
          updateDoc(docRef, {
            coordinates: { latitude, longitude }
          }).catch(err => console.error("Error updating coordinates:", err));
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, [user, profile?.uid]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        // Use onSnapshot for real-time profile updates (Pulse, Points, etc.)
        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Initialize new profile
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'مستخدم جديد',
              photoURL: user.photoURL || '',
              onboardingCompleted: false,
              points: 0,
              level: 1,
              pulse: 50,
              lastActive: serverTimestamp(),
              createdAt: serverTimestamp(),
            };
            setDoc(docRef, newProfile).catch(err => 
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`)
            );
            setProfile(newProfile);
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        });

        // Seed standard routine if missing (one-time check)
        getDoc(docRef).then(snap => {
          if (snap.exists()) seedUserRoutine(snap.data() as UserProfile);
        });

      } else {
        setProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Moon className="w-12 h-12 text-emerald-600" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={signInWithGoogle} />;
  }

  // Onboarding Flow for new users
  if (profile && profile.onboardingCompleted === false) {
    return <Onboarding profile={profile} />;
  }

  // Calculate Visual Restriction based on Pulse
  const pulse = profile?.pulse ?? 100;
  const isWithered = pulse < 40;
  const restrictionStyle = {
    filter: isWithered ? `grayscale(${(40 - pulse) * 2}%) brightness(${0.8 + (pulse / 200)})` : 'none',
    transform: isWithered ? `scale(${0.98 + (pulse / 2000)})` : 'none',
    opacity: pulse < 20 ? 0.8 : 1,
    transition: 'all 2s ease-in-out'
  };

  return (
    <ErrorBoundary>
      {currentPage === 'pulse' ? (
        <PulseCorner profile={profile} onNavigate={setCurrentPage} />
      ) : (
        <Layout 
          profile={profile} 
          onSignOut={() => signOut(auth)} 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              style={restrictionStyle}
              className="h-full relative"
            >
              {/* Existential Vignette for low pulse */}
              {pulse < 40 && (
                <div 
                  className="fixed inset-0 pointer-events-none z-[60] transition-opacity duration-1000"
                  style={{ 
                    background: `radial-gradient(circle, transparent 60%, rgba(0,0,0,${(40 - pulse) / 100}) 100%)`,
                    opacity: (40 - pulse) / 40
                  }}
                />
              )}
              {currentPage === 'home' && <Home profile={profile} onNavigate={setCurrentPage} />}
              {currentPage === 'chat' && <Chat profile={profile} />}
              {currentPage === 'files' && <Files profile={profile} />}
              {currentPage === 'goals' && <Goals profile={profile} />}
              {currentPage === 'archive' && <Archive profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </Layout>
      )}
    </ErrorBoundary>
  );
}
