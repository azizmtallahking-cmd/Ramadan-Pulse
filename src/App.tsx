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
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleLogin = async () => {
    setIsPending(true);
    try {
      await onLogin();
    } catch (error) {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf9f6] p-6 text-center relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-stone-100 rounded-full blur-3xl opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white relative z-10"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-200 rotate-3 hover:rotate-0 transition-transform duration-500">
          <Moon className="w-12 h-12 text-white" />
        </div>

        <div className="space-y-2 mb-10">
          <h1 className="text-4xl font-bold text-stone-900 font-serif tracking-tight">نبض رمضان</h1>
          <p className="text-stone-500 text-lg">بوابتك الرقمية للارتقاء الوجودي</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-stone-100 rounded-2xl mb-8">
          <button 
            onClick={() => setMode('signin')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'signin' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            تسجيل الدخول
          </button>
          <button 
            onClick={() => setMode('signup')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'signup' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            إنشاء حساب
          </button>
        </div>

        <div className="space-y-6">
          <div className="text-right px-2">
            <h3 className="font-bold text-stone-800 text-lg mb-1">
              {mode === 'signin' ? 'مرحباً بعودتك' : 'ابدأ رحلة البناء'}
            </h3>
            <p className="text-stone-500 text-sm">
              {mode === 'signin' 
                ? 'سجل دخولك لاستكمال مسار نبضك الوجودي' 
                : 'انضم لأهل الديار وصمم نظامك الرمضاني الخاص'}
            </p>
          </div>

          <button
            onClick={handleLogin}
            disabled={isPending}
            className="w-full group relative flex items-center justify-center gap-4 bg-stone-900 text-white px-6 py-5 rounded-[1.5rem] font-bold hover:bg-stone-800 transition-all active:scale-[0.98] disabled:opacity-70 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {isPending ? (
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            ) : (
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <LogIn className="w-5 h-5" />
              </div>
            )}
            
            <span className="text-lg">
              {isPending ? 'جاري التحقق...' : 'المتابعة باستخدام جوجل'}
            </span>
          </button>

          <div className="pt-4">
            <p className="text-xs text-stone-400 leading-relaxed">
              بالاستمرار، أنت توافق على ميثاق البناء وشروط الاستخدام الخاصة بنبض رمضان.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 text-stone-400 font-medium flex items-center gap-2"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        نظام سيادي مدعوم بالذكاء الاصطناعي
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
