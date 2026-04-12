import React, { useState, useEffect } from 'react';
import { UserProfile, File, ArchivedDay, Goal } from '../types';
import { getHijriDate, getGregorianDate, getTunisianTime, getRamadanCountdown } from '../utils/dateUtils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, TrendingUp, Award, CheckCircle2, ListTodo, Star, Folder, Moon, Activity, AlertCircle, Heart, Zap, MessageSquare, Target, ChevronRight, Sparkles, ShieldCheck, ZapOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import FloatingInsights from '../components/FloatingInsights';
import { generateCommandMessage } from '../services/geminiService';

interface HomeProps {
  profile: UserProfile | null;
  onNavigate: (page: string) => void;
}

const pulseData = [
  { name: 'السبت', pulse: 40 },
  { name: 'الأحد', pulse: 30 },
  { name: 'الاثنين', pulse: 65 },
  { name: 'الثلاثاء', pulse: 45 },
  { name: 'الأربعاء', pulse: 80 },
  { name: 'الخميس', pulse: 70 },
  { name: 'الجمعة', pulse: 90 },
];

export default function Home({ profile, onNavigate }: HomeProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [archivedDays, setArchivedDays] = useState<ArchivedDay[]>([]);
  const [countdown, setCountdown] = useState(getRamadanCountdown());
  const [currentTime, setCurrentTime] = useState(getTunisianTime());
  const [commandMessage, setCommandMessage] = useState<string>("جاري استحضار الإحاطة السيادية...");
  const [isCommandLoading, setIsCommandLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getRamadanCountdown());
      setCurrentTime(getTunisianTime());
    }, 1000);

    if (profile) {
      // Fetch active files
      const filesQuery = query(
        collection(db, 'files'),
        where('uid', '==', profile.uid),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
        const fetchedFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as File));
        setFiles(fetchedFiles);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'files');
      });

      // Fetch active goals
      const goalsQuery = query(
        collection(db, 'goals'),
        where('uid', '==', profile.uid),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
        const fetchedGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
        setGoals(fetchedGoals);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'goals');
      });

      // Fetch corrupted days (archived)
      const archivedQuery = query(
        collection(db, 'archived_days'),
        where('uid', '==', profile.uid),
        where('status', '==', 'corrupted'),
        limit(3)
      );
      const unsubscribeArchived = onSnapshot(archivedQuery, (snapshot) => {
        setArchivedDays(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchivedDay)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'archived_days');
      });

      // Generate Command Message
      const fetchCommand = async () => {
        setIsCommandLoading(true);
        try {
          const msg = await generateCommandMessage(profile, goals, files);
          setCommandMessage(msg);
        } catch (e) {
          console.error("Error generating command message:", e);
          setCommandMessage("أنا أراقب تحركاتك.. استمر في المجاهدة.");
        } finally {
          setIsCommandLoading(false);
        }
      };

      fetchCommand();

      return () => {
        clearInterval(timer);
        unsubscribeFiles();
        unsubscribeGoals();
        unsubscribeArchived();
      };
    }
    return () => clearInterval(timer);
  }, [profile?.uid, profile?.points, profile?.pulse]);

  const handleToggleGoal = async (goal: Goal) => {
    if (!profile || !goal.id) return;
    try {
      const goalRef = doc(db, 'goals', goal.id);
      const newStatus = goal.status === 'completed' ? 'pending' : 'completed';
      await updateDoc(goalRef, { 
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : null
      });

      if (newStatus === 'completed') {
        const profileRef = doc(db, 'users', profile.uid);
        await updateDoc(profileRef, {
          points: (profile.points || 0) + (goal.points || 10),
          pulse: Math.min(100, (profile.pulse || 50) + 2)
        });
      }
    } catch (e) {
      console.error("Error toggling goal:", e);
    }
  };

  const totalPoints = profile?.points || 0;
  const level = profile?.level || 1;
  const progressToNextLevel = (totalPoints % 500) / 500 * 100;
  const pulse = profile?.pulse || 50;

  // Sovereign Ordering: Sort goals by time, then type, then creation
  const sortedTasks = [...goals].sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Command Header: The Sovereign Compass */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group overflow-hidden rounded-[3rem] p-1 shadow-2xl"
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${pulse > 70 ? 'from-emerald-500 via-teal-400 to-emerald-600' : pulse > 40 ? 'from-amber-500 via-orange-400 to-amber-600' : 'from-rose-600 via-red-500 to-rose-700'} animate-pulse opacity-30`}></div>
        <div className="relative bg-white/90 backdrop-blur-2xl p-8 md:p-12 rounded-[2.9rem] border border-white/50">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="relative">
              <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl border-4 border-white ${pulse > 70 ? 'bg-emerald-600 shadow-emerald-200' : pulse > 40 ? 'bg-amber-600 shadow-amber-200' : 'bg-rose-600 shadow-rose-200'}`}>
                <ShieldCheck className="w-14 h-14 text-white" />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles className={`w-6 h-6 ${pulse > 70 ? 'text-emerald-600' : pulse > 40 ? 'text-amber-600' : 'text-rose-600'}`} />
              </motion.div>
            </div>

            <div className="flex-1 text-center md:text-right">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] ${pulse > 70 ? 'bg-emerald-100 text-emerald-700' : pulse > 40 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  إحاطة رمضان مان السيادية
                </span>
                <div className="flex gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                </div>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-stone-900 font-serif leading-tight mb-4">
                {isCommandLoading ? (
                  <span className="animate-pulse opacity-50">جاري استحضار الإحاطة...</span>
                ) : commandMessage}
              </h2>
              <div className="flex items-center justify-center md:justify-start gap-6 text-stone-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">{currentTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-bold">{getHijriDate()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sovereign Progress & Pulse (The Dashboard of Ease) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Total Progress (The Scale) */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] shadow-2xl border border-stone-100 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Award className="w-64 h-64 text-emerald-600" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-emerald-200">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-stone-900 font-serif">ميدان الارتقاء</h3>
                  <p className="text-stone-500 font-medium">تقدمك الكلي نحو البعد التالي</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-5xl font-black text-emerald-600">{Math.round(progressToNextLevel)}%</span>
                <p className="text-xs font-black text-stone-400 uppercase tracking-widest mt-1">اكتمال المستوى {level}</p>
              </div>
            </div>

            <div className="relative h-8 bg-stone-100 rounded-3xl overflow-hidden mb-10 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressToNextLevel}%` }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-lg"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
              </motion.div>
            </div>

            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">النقاط الكلية</p>
                <p className="text-3xl font-black text-stone-900">{totalPoints}</p>
              </div>
              <div className="text-center border-x border-stone-100">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">المستوى الحالي</p>
                <p className="text-3xl font-black text-stone-900">{level}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">المتبقي للارتقاء</p>
                <p className="text-3xl font-black text-amber-600">{500 - (totalPoints % 500)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sovereign Pulse (The Heartbeat) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 bg-stone-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden group"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${pulse > 70 ? 'from-emerald-900 to-stone-900' : pulse > 40 ? 'from-amber-900 to-stone-900' : 'from-rose-950 to-stone-900'} opacity-50`} />
          
          <div className="relative z-10 h-full flex flex-col items-center justify-between">
            <div className="w-full flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20">
                  <Activity className={`w-6 h-6 ${pulse > 70 ? 'text-emerald-400' : pulse > 40 ? 'text-amber-400' : 'text-rose-400'}`} />
                </div>
                <h3 className="text-lg font-bold font-serif">النبض الوجودي</h3>
              </div>
              <div className={`px-4 py-1 rounded-full border ${pulse > 70 ? 'bg-emerald-400/20 border-emerald-400/30 text-emerald-400' : pulse > 40 ? 'bg-amber-400/20 border-amber-400/30 text-amber-400' : 'bg-rose-400/20 border-rose-400/30 text-rose-400'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">مباشر</span>
              </div>
            </div>

            <div className="relative py-10">
              <motion.div
                animate={{ 
                  scale: pulse > 70 ? [1, 1.15, 1] : pulse > 40 ? [1, 1.08, 1] : [1, 1.05, 1],
                  opacity: pulse > 70 ? [0.8, 1, 0.8] : [1, 1, 1]
                }}
                transition={{ duration: pulse > 70 ? 0.6 : pulse > 40 ? 1.2 : 2, repeat: Infinity }}
                className="relative"
              >
                <Heart className={`w-32 h-32 ${pulse > 70 ? 'text-emerald-500 fill-emerald-500/20' : pulse > 40 ? 'text-amber-500 fill-amber-500/20' : 'text-rose-600 fill-rose-600/20'}`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black tracking-tighter">{pulse}</span>
                </div>
              </motion.div>
            </div>

            <div className="w-full text-center">
              <p className={`text-lg font-black mb-2 ${pulse > 70 ? 'text-emerald-400' : pulse > 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                {pulse > 70 ? 'نبض سيادي متدفق' : pulse > 40 ? 'نبض مستقر' : 'نبض حرج.. استدرك'}
              </p>
              <p className="text-xs text-stone-400 font-medium">
                جودة أعمالك هي وقود هذا القلب
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Sovereign Task List (ميدان التسهيل) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Unified Task List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] shadow-xl border border-stone-100"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                <ListTodo className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-stone-900 font-serif">ميدان العمل اليومي</h3>
                <p className="text-stone-500 font-medium">المهام المرتبة سيادياً حسب الأولوية</p>
              </div>
            </div>
            <button onClick={() => onNavigate('goals')} className="group flex items-center gap-2 text-stone-400 hover:text-emerald-600 font-bold text-sm transition-colors">
              إدارة الأهداف <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-4">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <motion.div 
                  key={task.id} 
                  layout
                  className="group bg-stone-50 hover:bg-white p-6 rounded-[2rem] border border-stone-100 hover:border-emerald-200 flex items-center justify-between transition-all hover:shadow-xl hover:shadow-emerald-50/50"
                >
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => handleToggleGoal(task)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-stone-300 border-2 border-stone-100 group-hover:border-emerald-200 group-hover:text-emerald-400'}`}
                    >
                      <CheckCircle2 className={`w-7 h-7 ${task.status === 'completed' ? 'scale-110' : 'scale-100'}`} />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {task.fileId && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[8px] font-black uppercase tracking-tighter">
                            <Folder className="w-2 h-2" />
                            <span>هدف ملفي</span>
                          </div>
                        )}
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          {task.type === 'daily' ? 'يومي' : task.type === 'weekly' ? 'أسبوعي' : 'عام'}
                        </span>
                        {task.time && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <Clock className="w-3 h-3" />
                            <span>{task.time}</span>
                          </div>
                        )}
                      </div>
                      <h4 className={`text-lg font-bold transition-all ${task.status === 'completed' ? 'text-stone-300 line-through' : 'text-stone-800'}`}>
                        {task.text}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600 font-black">
                      <Zap className="w-4 h-4" />
                      <span>+{task.points || 10}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-stone-50/50 rounded-[2.5rem] border-2 border-dashed border-stone-100">
                <ZapOff className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-400 font-bold">لا توجد مهام نشطة في الميدان حالياً.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Admin & Logistics Shortcuts */}
        <div className="space-y-8">
          {/* Box of Thoughts Shortcut */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => onNavigate('chat')}
            className="bg-stone-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden cursor-pointer group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-500">
              <MessageSquare className="w-32 h-32 text-emerald-500" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-600 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-xl">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black font-serif mb-3">الدردشة</h3>
              <p className="text-stone-400 text-sm leading-relaxed mb-8">
                تواصل مع السيد، سجل أنفاسك، وحلل مساراتك الوجودية في الرواق الخاص.
              </p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                دخول الرواق <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>

          {/* Archive Pro Max Shortcut */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => onNavigate('archive')}
            className="bg-amber-50 p-10 rounded-[3.5rem] shadow-xl border border-amber-100 cursor-pointer group"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-black text-amber-900 font-serif">الأرشيف Pro Max</h3>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed mb-8">
              ذاكرة الاستقامة الشاملة. راجع تقاريرك السيادية وتاريخ ارتقائك.
            </p>
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              تصفح السجلات <ChevronRight className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Active Files (The Projects) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-stone-100"
      >
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] flex items-center justify-center">
              <Folder className="w-8 h-8 text-stone-600" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-stone-900 font-serif">خزائن الملفات</h3>
              <p className="text-stone-500 font-medium">المشاريع الكبرى التي تشكل كيانك</p>
            </div>
          </div>
          <button onClick={() => onNavigate('files')} className="text-emerald-600 font-bold text-sm hover:underline">عرض الخزائن</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {files.map((file) => (
            <motion.div 
              key={file.id} 
              whileHover={{ scale: 1.02 }}
              className="bg-stone-50 p-8 rounded-[2.5rem] border border-stone-100 group hover:border-emerald-200 transition-all hover:shadow-2xl hover:shadow-emerald-50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                <div className="flex gap-1">
                  {[...Array(file.stars || 0)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100 group-hover:scale-110 transition-transform">
                  <Activity className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-stone-900">{file.title}</h4>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${file.pulse > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">نبض الملف: {file.pulse}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between text-xs font-bold text-stone-500">
                  <span>الارتقاء التراكمي</span>
                  <span>{file.points} نقطة</span>
                </div>
                <div className="h-3 bg-white rounded-full overflow-hidden border border-stone-100 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (file.points / 200) * 100)}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      {profile && <FloatingInsights uid={profile.uid} location="home" />}
    </div>
  );
}
