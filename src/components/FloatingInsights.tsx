import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { FloatingInsight, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertTriangle, Info, User } from 'lucide-react';
import { getMasterMood } from '../services/adminService';

interface FloatingInsightsProps {
  uid: string;
  location: 'home' | 'files' | 'goals' | 'archive' | 'chat' | 'all';
}

export default function FloatingInsights({ uid, location }: FloatingInsightsProps) {
  const [insights, setInsights] = useState<FloatingInsight[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!uid) return;

    // Fetch profile for mood calculation
    const unsubscribeProfile = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserProfile);
    });

    const q = query(
      collection(db, 'insights'),
      where('uid', '==', uid),
      where('isRead', '==', false),
      orderBy('timestamp', 'desc'),
      limit(3)
    );

    const unsubscribeInsights = onSnapshot(q, (snapshot) => {
      const newInsights = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as FloatingInsight))
        .filter(insight => insight.location === location || insight.location === 'all');
      setInsights(newInsights);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'insights');
    });

    return () => {
      unsubscribeProfile();
      unsubscribeInsights();
    };
  }, [uid, location]);

  const dismissInsight = async (id: string) => {
    try {
      await updateDoc(doc(db, 'insights', id), { isRead: true });
    } catch (error) {
      console.error("Error dismissing insight:", error);
    }
  };

  if (insights.length === 0) return null;

  const mood = profile ? getMasterMood(profile) : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {insights.map((insight) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={`pointer-events-auto p-5 rounded-[2rem] shadow-2xl border backdrop-blur-xl flex gap-4 items-start relative group ${
              insight.type === 'success' 
                ? 'bg-emerald-50/95 border-emerald-100 text-emerald-900' 
                : insight.type === 'warning'
                ? 'bg-rose-50/95 border-rose-100 text-rose-900'
                : 'bg-stone-900/95 border-stone-800 text-white'
            }`}
          >
            <div className={`p-3 rounded-2xl shrink-0 ${
              insight.type === 'success' ? 'bg-emerald-100' : insight.type === 'warning' ? 'bg-rose-100' : 'bg-stone-800'
            }`}>
              {insight.type === 'success' && <Sparkles className="w-5 h-5 text-emerald-600" />}
              {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {insight.type === 'info' && <User className="w-5 h-5 text-stone-400" />}
            </div>
            
            <div className="flex-1 pr-6 space-y-2">
              {mood && (
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    mood.tone === 'strict' ? 'bg-rose-500 text-white' : 
                    mood.tone === 'encouraging' ? 'bg-emerald-500 text-white' : 
                    'bg-stone-700 text-stone-300'
                  }`}>
                    {mood.name}
                  </span>
                </div>
              )}
              <p className="text-sm font-serif leading-relaxed italic">
                "{insight.content}"
              </p>
            </div>

            <button
              onClick={() => insight.id && dismissInsight(insight.id)}
              className="absolute top-4 right-4 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
