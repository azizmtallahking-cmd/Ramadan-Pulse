import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, File, Goal } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { TrendingUp, Folder, MessageSquare, Target, ChevronRight, Sparkles, ShieldCheck, Zap, Layout, AppWindow, Cpu, CheckCircle2, Circle } from 'lucide-react';
import FloatingInsights from '../components/FloatingInsights';

interface HomeProps {
  profile: UserProfile | null;
  onNavigate: (page: string) => void;
}

export default function Home({ profile, onNavigate }: HomeProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
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

      return () => {
        unsubscribeFiles();
        unsubscribeGoals();
      };
    }
  }, [profile?.uid]);

  // Logic for "Officialness/Completeness" of the system
  const systemCompleteness = useMemo(() => {
    if (files.length === 0) return 0;
    
    const fileScores = files.map(f => {
      let score = 0;
      if (f.title) score += 20;
      if (f.description || f.content) score += 30;
      if (f.assistantName) score += 20;
      if (f.stars && f.stars > 0) score += 10;
      if (f.generalGoals && f.generalGoals.length > 0) score += 20;
      return score;
    });

    const avgFileScore = fileScores.reduce((a, b) => a + b, 0) / files.length;
    const goalScore = Math.min(100, goals.length * 10);
    
    return Math.round((avgFileScore * 0.7) + (goalScore * 0.3));
  }, [files, goals]);

  const isResident = profile?.isResident;

  const handlePulseNavigation = async () => {
    if (!profile) return;

    // If first time navigating to Pulse, mark as resident
    if (!isResident) {
      try {
        await updateDoc(doc(db, 'users', profile.uid), {
          isResident: true
        });
      } catch (e) {
        console.error("Error updating resident status:", e);
      }
    }

    if (systemCompleteness < 80) {
      if (window.confirm('جاهزية الهيكل لم تكتمل بعد (أقل من 80%). هل أنت متأكد من رغبتك في الانتقال لركن النبض الآن؟')) {
        onNavigate('pulse');
      }
    } else {
      onNavigate('pulse');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* User State Welcome Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[3.5rem] p-1 shadow-2xl"
      >
        <div className={`absolute inset-0 opacity-20 animate-pulse ${isResident ? 'bg-stone-500' : 'bg-emerald-500'}`}></div>
        <div className="relative bg-white/90 backdrop-blur-2xl p-10 md:p-14 rounded-[3.4rem] border border-white/50 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-right">
            {isResident ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-stone-100 text-stone-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" />
                  من أهل الديار
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-stone-900 font-serif leading-tight">
                  أهلاً بك من جديد في ركن البناء
                </h1>
                <p className="text-stone-500 text-lg font-medium max-w-xl">
                  لقد عدت لمرحلة الإعدادات والتعديل. هنا تراجع هيكلك الوجودي وتضبط مساراتك قبل الانطلاق.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  <Sparkles className="w-3 h-3" />
                  زائر جديد
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-emerald-900 font-serif leading-tight">
                  مرحباً بك في رحابك الجديدة
                </h1>
                <p className="text-emerald-700 text-lg font-medium max-w-xl">
                  أنت الآن في طور التصميم، تبني روتينك وتصنع نظامك لأول مرة. استمتع بمرحلة التأسيس.
                </p>
              </div>
            )}

            <div className="mt-10 relative z-20">
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePulseNavigation}
                className={`flex items-center gap-4 px-10 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl transition-all border-b-8 active:border-b-0 active:translate-y-2 ${
                  isResident 
                    ? 'bg-stone-800 text-white border-stone-950 shadow-stone-200' 
                    : 'bg-emerald-600 text-white border-emerald-800 shadow-emerald-200'
                }`}
              >
                <Zap className={`w-7 h-7 ${isResident ? 'text-emerald-400' : 'text-white'} fill-current`} />
                <span>{isResident ? 'العودة لركن النبض' : 'انتقل لركن النبض'}</span>
                <ChevronRight className="w-6 h-6 mr-2" />
              </motion.button>
            </div>
          </div>

          <div className="relative group">
            <div className={`w-48 h-48 md:w-64 md:h-64 rounded-[3rem] flex items-center justify-center shadow-2xl border-8 border-white overflow-hidden ${isResident ? 'bg-stone-100' : 'bg-emerald-50'}`}>
              <img 
                src={profile?.photoURL || 'https://picsum.photos/seed/spirit/400/400'} 
                alt="User" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-stone-50">
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-400 uppercase">المستوى</p>
                <p className="text-2xl font-black text-stone-900">{profile?.level || 1}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Engineering Header: The Blueprint Compass (Simplified) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-stone-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20">
            <Layout className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-serif mb-2">غرفة هندسة النظام - الكواليس</h2>
            <p className="text-stone-400 font-medium max-w-2xl">
              هذه الشاشة مخصصة لترتيب الملفات، هندسة الأهداف، وتصميم مسارات الارتقاء. لا يوجد تكليف هنا، بل "صناعة التكليف".
            </p>
          </div>
        </div>
      </motion.div>
      {/* Programming & Completion Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] shadow-2xl border border-stone-100 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-stone-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                <Cpu className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-stone-900 font-serif">مراقب البرمجة والإتمام</h3>
                <p className="text-stone-500 font-medium">متابعة رسمية الملفات وعمق المكونات</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-5xl font-black text-stone-900">{systemCompleteness}%</span>
              <p className="text-xs font-black text-stone-400 uppercase tracking-widest mt-1">جاهزية الهيكل</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative h-4 bg-stone-100 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${systemCompleteness}%` }}
                className="absolute inset-y-0 left-0 bg-stone-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatusItem label="اكتمال هيكل الخزائن (المكونات)" completed={files.every(f => f.description && f.content)} />
              <StatusItem label="رسمية الأهداف (النقاط والتوقيت)" completed={goals.every(g => g.points && g.time)} />
              <StatusItem label="تفعيل أعوان البناء (الذكاء)" completed={files.some(f => f.assistantName)} />
              <StatusItem label="جاهزية المخطط الكلي" completed={systemCompleteness > 80} />
            </div>
          </div>
        </motion.div>

        {/* Sub-Apps Ecosystem */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 bg-stone-50 p-10 rounded-[3.5rem] shadow-xl border border-stone-200 relative overflow-hidden"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100">
              <AppWindow className="w-6 h-6 text-stone-600" />
            </div>
            <h3 className="text-xl font-black text-stone-900 font-serif">تطبيقاتنا</h3>
          </div>
          
          <div className="space-y-4">
            <SubAppItem name="تطبيق الانضباط" status="قيد التطوير" icon={<Layout className="w-4 h-4" />} />
            <SubAppItem name="خزانة الأسرار" status="مخطط له" icon={<Folder className="w-4 h-4" />} />
            <SubAppItem name="ميدان التحدي" status="مخطط له" icon={<Target className="w-4 h-4" />} />
          </div>
        </motion.div>
      </div>

      {/* System Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => onNavigate('files')}
          className="bg-white p-8 rounded-[3rem] shadow-xl border border-stone-100 cursor-pointer group"
        >
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
            <Folder className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-black text-stone-900 font-serif mb-2">هيكلة الخزائن</h3>
          <p className="text-stone-500 text-sm">إدارة الملفات الكبرى، توزيع المشاريع، وتحديد فلسفة كل خزانة.</p>
          <div className="mt-6 flex items-center gap-2 text-emerald-600 font-bold text-xs">
            {files.length} ملفات نشطة <ChevronRight className="w-4 h-4" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => onNavigate('goals')}
          className="bg-white p-8 rounded-[3rem] shadow-xl border border-stone-100 cursor-pointer group"
        >
          <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-amber-100">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-black text-stone-900 font-serif mb-2">هندسة الأهداف</h3>
          <p className="text-stone-500 text-sm">تصميم الأهداف اليومية والعامة، تحديد النقاط، وربطها بالهياكل.</p>
          <div className="mt-6 flex items-center gap-2 text-amber-600 font-bold text-xs">
            {goals.length} أهداف في المخطط <ChevronRight className="w-4 h-4" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => onNavigate('chat')}
          className="bg-stone-900 p-8 rounded-[3rem] shadow-xl border border-stone-800 cursor-pointer group text-white"
        >
          <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <MessageSquare className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-black font-serif mb-2">عون البناء</h3>
          <p className="text-stone-400 text-sm">ناقش العون في قراراتك، اطلب منه مراجعة النظام، أو بناء مسارات جديدة.</p>
          <div className="mt-6 flex items-center gap-2 text-emerald-400 font-bold text-xs">
            استشارة العون <ChevronRight className="w-4 h-4" />
          </div>
        </motion.div>
      </div>

      {/* System Health / Stats (Blueprint Mode) */}
      <div className="bg-stone-50 p-10 rounded-[3.5rem] border border-stone-200">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-stone-200 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-stone-600" />
          </div>
          <h3 className="text-2xl font-black text-stone-900 font-serif">إحصائيات المخطط</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">إجمالي الملفات</p>
            <p className="text-3xl font-black text-stone-900">{files.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">إجمالي الأهداف</p>
            <p className="text-3xl font-black text-stone-900">{goals.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">مستوى التعقيد</p>
            <p className="text-3xl font-black text-emerald-600">{files.length * 2 + goals.length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">جاهزية النظام</p>
            <p className="text-3xl font-black text-amber-600">{systemCompleteness}%</p>
          </div>
        </div>
      </div>

      {profile && <FloatingInsights uid={profile.uid} location="home" />}
    </div>
  );
}

function StatusItem({ label, completed }: { label: string, completed: boolean }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      ) : (
        <Circle className="w-5 h-5 text-stone-300" />
      )}
      <span className={`text-sm font-bold ${completed ? 'text-stone-900' : 'text-stone-400'}`}>{label}</span>
    </div>
  );
}

function SubAppItem({ name, status, icon }: { name: string, status: string, icon: React.ReactNode }) {
  return (
    <div className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 hover:border-stone-300 transition-all cursor-not-allowed opacity-70">
      <div className="flex items-center gap-3">
        <div className="text-stone-400 group-hover:text-stone-600 transition-colors">
          {icon}
        </div>
        <span className="text-sm font-black text-stone-800">{name}</span>
      </div>
      <span className="text-[9px] font-black px-2 py-1 bg-stone-100 text-stone-500 rounded-lg uppercase tracking-tighter">
        {status}
      </span>
    </div>
  );
}
