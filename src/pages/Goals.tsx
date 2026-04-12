import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Goal, Synergy } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, CheckCircle2, Circle, Trash2, Calendar, Target, ListChecks, Sparkles, X, Clock, ChevronDown, ChevronRight, Layers, Zap } from 'lucide-react';
import { triggerAdministrativeReview } from '../services/adminService';
import FloatingInsights from '../components/FloatingInsights';

import { addPointsToFile, addUserPoints } from '../services/pointService';
import { logActivity } from '../services/archiveService';

interface GoalsProps {
  profile: UserProfile | null;
}

export default function Goals({ profile }: GoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [synergies, setSynergies] = useState<Synergy[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalTime, setNewGoalTime] = useState('');
  const [newGoalType, setNewGoalType] = useState<'daily' | 'weekly' | 'general'>('daily');
  const [newGoalParentId, setNewGoalParentId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [temporalWarning, setTemporalWarning] = useState<string | null>(null);

  const validateGoalTiming = (goal: Goal): string | null => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // Check specific keywords
    if (goal.text.includes('أذكار الصباح')) {
      if (hour < 3 || hour > 12) {
        return "أيها المريد، أذكار الصباح تُؤدى في وقتها (بين الفجر والضحى). لا تقبل الخوارزمية تزييف الزمن.";
      }
    }
    
    if (goal.text.includes('أذكار المساء')) {
      if (hour < 15) {
        return "أيها المريد، الشمس لم تمل للغروب بعد. أذكار المساء لها ميقاتها، والذكاء يراقب ميزان الوقت.";
      }
    }

    // Check specific time property (e.g., "16:00")
    if (goal.time && goal.time.includes(':')) {
      const [targetHour, targetMinute] = goal.time.split(':').map(Number);
      if (hour < targetHour || (hour === targetHour && minute < targetMinute)) {
        return `أيها المريد، ميزان الوقت دقيق. هذا العمل موعده الساعة ${goal.time}، وأنت تحاول استباق الزمن في الساعة ${hour}:${minute.toString().padStart(2, '0')}. لا تعجل بالثمر قبل أوانه.`;
      }
    }
    
    return null;
  };

  useEffect(() => {
    if (profile) {
      const q = query(
        collection(db, 'goals'),
        where('uid', '==', profile.uid),
        orderBy('createdAt', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'goals');
      });

      // Fetch synergies
      const sq = query(collection(db, 'synergies'), where('uid', '==', profile.uid));
      const unsubscribeSynergies = onSnapshot(sq, (snapshot) => {
        setSynergies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Synergy)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'synergies');
      });

      return () => {
        unsubscribe();
        unsubscribeSynergies();
      };
    }
  }, [profile]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newGoalText.trim()) return;

    try {
      await addDoc(collection(db, 'goals'), {
        uid: profile.uid,
        text: newGoalText.trim(),
        description: newGoalDescription.trim(),
        time: newGoalTime || null,
        parentId: newGoalParentId || null,
        status: 'pending',
        type: newGoalType,
        createdAt: serverTimestamp(),
        points: newGoalType === 'daily' ? 10 : newGoalType === 'weekly' ? 50 : 100
      });
      setNewGoalText('');
      setNewGoalDescription('');
      setNewGoalTime('');
      setNewGoalParentId('');
      setIsAdding(false);

      // Log activity
      await logActivity(profile.uid, { 
        type: 'goal_added', 
        content: `أضفت هدفاً جديداً: "${newGoalText.trim()}"` 
      }, profile.coordinates);

      // Trigger Administrative Review
      triggerAdministrativeReview(profile, `لقد أضفت هدفاً جديداً: "${newGoalText.trim()}" من نوع ${newGoalType}${newGoalTime ? ` في وقت ${newGoalTime}` : ''}. قم بتحليله وإدارته.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'goals');
    }
  };

  const toggleGoal = async (goal: Goal) => {
    try {
      const newStatus = goal.status === 'completed' ? 'pending' : 'completed';
      
      // Temporal Integrity Check
      if (newStatus === 'completed') {
        const violation = validateGoalTiming(goal);
        if (violation) {
          setTemporalWarning(violation);
          setTimeout(() => setTemporalWarning(null), 5000);
          return;
        }
      }

      await updateDoc(doc(db, 'goals', goal.id), {
        status: newStatus,
        completedAt: newStatus === 'completed' ? serverTimestamp() : null
      });

      // If completed, add points
      if (newStatus === 'completed' && profile) {
        let earnedPoints = goal.points || 10;

        // Check for synergy multiplier
        if (goal.fileId) {
          const hasSynergy = synergies.some(s => (s.fileAId === goal.fileId || s.fileBId === goal.fileId) && s.status === 'active');
          if (hasSynergy) {
            earnedPoints = Math.floor(earnedPoints * 1.5);
          }
          await addPointsToFile(profile.uid, goal.fileId, earnedPoints, profile);
        } else {
          await addUserPoints(profile.uid, earnedPoints, profile);
        }

        // Log activity
        await logActivity(profile.uid, { 
          type: 'goal', 
          content: `أنجزت الهدف: "${goal.text}"`,
          points: earnedPoints
        }, profile.coordinates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${goal.id}`);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const goalToDelete = goals.find(g => g.id === id);
      await deleteDoc(doc(db, 'goals', id));
      
      if (goalToDelete && profile) {
        await logActivity(profile.uid, {
          type: 'intention',
          content: `تراجعت عن الهدف أو غيرت نيتك تجاه: "${goalToDelete.text}"`
        }, profile.coordinates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Organize goals into a hierarchy
  const organizedGoals = useMemo(() => {
    const rootGoals = goals.filter(g => !g.parentId);
    const subGoalsMap: Record<string, Goal[]> = {};
    
    goals.forEach(g => {
      if (g.parentId) {
        if (!subGoalsMap[g.parentId]) subGoalsMap[g.parentId] = [];
        subGoalsMap[g.parentId].push(g);
      }
    });

    // Sort root goals: by time (if exists), then by type
    return rootGoals.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.type.localeCompare(b.type);
    }).map(parent => ({
      ...parent,
      children: subGoalsMap[parent.id] || []
    }));
  }, [goals]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-stone-900 font-serif">غرفة الأهداف</h1>
          <p className="text-stone-500 mt-1">هنا تزرع عاداتك اليومية وتراقب نمو همتك.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold">
            <Layers className="w-4 h-4" />
            {goals.length} هدف إجمالي
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-8 border-b border-stone-50 bg-stone-50/30">
          {!isAdding ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 font-bold hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              أضف هدفاً جديداً للمساءلة
            </button>
          ) : (
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div className="flex gap-3">
                <input 
                  autoFocus
                  type="text" 
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="اكتب عنوان الهدف هنا..."
                  className="flex-1 bg-white border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                />
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white px-8 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  حفظ
                </button>
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="p-4 bg-stone-100 text-stone-500 rounded-2xl hover:bg-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input 
                    type="time"
                    value={newGoalTime}
                    onChange={(e) => setNewGoalTime(e.target.value)}
                    className="w-full bg-white border border-stone-200 rounded-2xl pr-12 pl-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                
                <select 
                  value={newGoalType}
                  onChange={(e) => setNewGoalType(e.target.value as any)}
                  className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="general">عام</option>
                </select>

                <select 
                  value={newGoalParentId}
                  onChange={(e) => setNewGoalParentId(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none"
                >
                  <option value="">لا يوجد هدف أب</option>
                  {goals.filter(g => !g.parentId).map(g => (
                    <option key={g.id} value={g.id}>{g.text}</option>
                  ))}
                </select>
              </div>

              <textarea 
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="تعريف الهدف (مضمونه وغايته)..."
                className="w-full bg-white border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[80px]"
              />
            </form>
          )}
        </div>

        <div className="p-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {organizedGoals.map((goal) => (
              <div key={goal.id}>
                <GoalItem 
                  goal={goal} 
                  onToggle={toggleGoal} 
                  onDelete={deleteGoal} 
                  onExpand={toggleExpand} 
                  expandedParents={expandedParents} 
                  synergies={synergies}
                />
              </div>
            ))}
          </AnimatePresence>

          {goals.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-stone-200" />
              </div>
              <p className="text-stone-400 font-medium">لا توجد أهداف للمساءلة حالياً.</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">إجمالي النقاط</span>
          </div>
          <div className="text-3xl font-black">{profile?.points || 0}</div>
        </div>
        <div className="bg-stone-800 p-6 rounded-[2rem] text-white shadow-xl shadow-stone-100">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-5 h-5 opacity-80" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">أهداف منجزة</span>
          </div>
          <div className="text-3xl font-black">{goals.filter(g => g.status === 'completed').length}</div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">المستوى الحالي</span>
          </div>
          <div className="text-3xl font-black text-stone-800">Lvl {profile?.level || 1}</div>
        </div>
      </div>
      {profile && <FloatingInsights uid={profile.uid} location="goals" />}
      
      {/* Temporal Warning Modal */}
      <AnimatePresence>
        {temporalWarning && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6"
          >
            <div className="bg-stone-900 text-white p-6 rounded-[2rem] shadow-2xl border-2 border-rose-500/50 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="w-12 h-12" />
              </div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-black text-rose-500 uppercase tracking-widest text-xs">خرق ميزان الوقت</h4>
                  <p className="text-sm font-serif leading-relaxed italic">
                    {temporalWarning}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setTemporalWarning(null)}
                className="absolute top-4 left-4 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GoalItemProps {
  goal: Goal & { children?: Goal[] };
  isSubGoal?: boolean;
  onToggle: (goal: Goal) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onExpand: (id: string) => void;
  expandedParents: Record<string, boolean>;
  synergies: Synergy[];
}

const GoalItem = ({ goal, isSubGoal = false, onToggle, onDelete, onExpand, expandedParents, synergies }: GoalItemProps) => {
  const hasSynergy = goal.fileId && synergies.some(s => s.fileAId === goal.fileId || s.fileBId === goal.fileId);

  return (
    <div className="space-y-2">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`group flex items-center gap-4 p-5 rounded-2xl transition-all ${
          goal.status === 'completed' 
            ? 'bg-emerald-50/30 opacity-60' 
            : 'bg-white hover:bg-stone-50'
        } ${isSubGoal ? 'mr-12 border-r-2 border-stone-100' : 'border border-stone-100 shadow-sm'}`}
      >
        <button 
          onClick={() => onToggle(goal)}
          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
            goal.status === 'completed' 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : 'border-stone-200 hover:border-emerald-500'
          }`}
        >
          {goal.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-transparent" />}
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-bold ${goal.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
              {goal.text}
            </p>
            {goal.time && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {goal.time}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              goal.type === 'daily' ? 'bg-blue-50 text-blue-600' : 
              goal.type === 'weekly' ? 'bg-purple-50 text-purple-600' : 
              'bg-amber-50 text-amber-600'
            }`}>
              {goal.type === 'daily' ? 'يومي' : goal.type === 'weekly' ? 'أسبوعي' : 'عام'}
            </span>
            {hasSynergy && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" />
                تآزر (x1.5)
              </span>
            )}
          </div>
          {goal.description && (
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              {goal.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {goal.children && goal.children.length > 0 && (
            <button 
              onClick={() => onExpand(goal.id)}
              className="p-2 text-stone-400 hover:text-stone-600"
            >
              {expandedParents[goal.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            +{hasSynergy ? Math.floor((goal.points || 10) * 1.5) : (goal.points || 10)} نقطة
          </span>
          <button 
            onClick={() => onDelete(goal.id)}
            className="p-2 text-stone-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {goal.children && goal.children.length > 0 && expandedParents[goal.id] && (
        <div className="space-y-2">
          {goal.children.map(child => (
            <div key={child.id}>
              <GoalItem 
                goal={child} 
                isSubGoal 
                onToggle={onToggle} 
                onDelete={onDelete} 
                onExpand={onExpand} 
                expandedParents={expandedParents} 
                synergies={synergies}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
