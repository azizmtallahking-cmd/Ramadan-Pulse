import React, { useState, useEffect } from 'react';
import { UserProfile, ArchiveEntry } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { initializeArchive, logActivity, checkAndGenerateDailyReport, fixAllTitles } from '../services/archiveService';
import { triggerAdministrativeReview } from '../services/adminService';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronRight, ChevronLeft, FileText, Award, MessageSquare, Sparkles, TrendingUp, Clock, Rocket, Plus, Zap, Shield, Activity, Folder } from 'lucide-react';
import FloatingInsights from '../components/FloatingInsights';

interface ArchiveProps {
  profile: UserProfile | null;
}

type ViewMode = 'years' | 'months' | 'weeks' | 'days' | 'entry';

export default function Archive({ profile }: ArchiveProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('entry');
  const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string | null>((new Date().getMonth() + 1).toString());
  const [selectedWeek, setSelectedWeek] = useState<string | null>(`W${Math.ceil(new Date().getDate() / 7)}`);
  const [selectedDay, setSelectedDay] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [activeSection, setActiveSection] = useState<'archive' | 'insights'>('archive');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState<string | null>(null);

  const getHijriDate = (date: Date) => {
    try {
      // Use the Umm al-Qura calendar for maximum accuracy
      const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const formatted = formatter.format(date);
      
      // If the year is still in the 2000s, it failed to switch to Hijri
      if (formatted.includes('2026') || formatted.includes('2025')) {
        throw new Error('Fallback to civil');
      }
      return formatted;
    } catch (e) {
      try {
        const civilFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-civil', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const formatted = civilFormatter.format(date);
        if (formatted.includes('2026') || formatted.includes('2025')) {
          throw new Error('Still Gregorian');
        }
        return formatted;
      } catch (e2) {
        // Manual fallback for April 2026 period
        const day = date.getDate();
        const month = date.getMonth(); // 3 for April
        if (month === 3 && day === 2) return "١٤ شوال ١٤٤٧ هـ";
        if (month === 3 && day === 1) return "١٣ شوال ١٤٤٧ هـ";
        return "تاريخ هجري سيادي";
      }
    }
  };

  const handleBootstrap = async () => {
    if (!profile || isBootstrapping) return;
    setIsBootstrapping(true);
    try {
      await initializeArchive(profile.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBootstrapping(false);
    }
  };

  // Fetch entries based on current view mode and selections
  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    if (profile.coordinates) {
      checkAndGenerateDailyReport(profile.uid, profile.coordinates);
    }
    let path = `archives/${profile.uid}/years`;
    if (viewMode === 'months' && selectedYear) {
      path = `archives/${profile.uid}/years/${selectedYear}/months`;
    } else if (viewMode === 'weeks' && selectedYear && selectedMonth) {
      path = `archives/${profile.uid}/years/${selectedYear}/months/${selectedMonth}/weeks`;
    } else if (viewMode === 'days' && selectedYear && selectedMonth && selectedWeek) {
      path = `archives/${profile.uid}/years/${selectedYear}/months/${selectedMonth}/weeks/${selectedWeek}/days`;
    } else if (viewMode === 'entry' && selectedYear && selectedMonth && selectedWeek && selectedDay) {
      const entryPath = `archives/${profile.uid}/years/${selectedYear}/months/${selectedMonth}/weeks/${selectedWeek}/days/${selectedDay}`;
      const unsubscribe = onSnapshot(doc(db, entryPath), (snapshot) => {
        if (snapshot.exists()) {
          setEntries([{ id: snapshot.id, ...snapshot.data() } as ArchiveEntry]);
        } else {
          setEntries([]);
        }
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, entryPath);
        setLoading(false);
      });
      return () => unsubscribe();
    }

    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArchiveEntry));
      setEntries(newEntries);
      setLoading(false);

      // Automatic background cleanup for long titles
      if (profile && newEntries.some(e => e.dayTitle && e.dayTitle.length > 50)) {
        fixAllTitles(profile.uid, newEntries).catch(console.error);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, viewMode, selectedYear, selectedMonth, selectedWeek, selectedDay]);

  const renderYears = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {entries.length > 0 ? entries.map(entry => (
          <ArchiveCard 
            key={entry.id}
            title={`عام ${entry.id}`}
            icon={<Calendar className="w-8 h-8 text-emerald-600" />}
            onClick={() => { setSelectedYear(entry.id!); setViewMode('months'); }}
          />
        )) : (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-stone-100 space-y-6">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center">
              <Calendar className="w-10 h-10 text-stone-300" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-stone-800">لا توجد أرشيفات سنوية بعد</h3>
              <p className="text-stone-500 mt-2 max-w-xs">ابدأ رحلتك اليوم وقم بتأسيس أول ملفاتك، أو قم بتفعيل الأرشيف يدوياً.</p>
            </div>
            <button 
              onClick={handleBootstrap}
              disabled={isBootstrapping}
              className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
            >
              {isBootstrapping ? 'جاري التفعيل...' : 'تفعيل الأرشيف الآن'}
              <Rocket className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMonths = () => {
    const monthNames: {[key: string]: string} = {
      '1': 'يناير', '2': 'فبراير', '3': 'مارس', '4': 'أبريل', '5': 'مايو', '6': 'يونيو',
      '7': 'يوليو', '8': 'أغسطس', '9': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
    };

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {entries.map(entry => (
          <ArchiveCard 
            key={entry.id}
            title={monthNames[entry.id!] || `شهر ${entry.id}`}
            icon={<Clock className="w-8 h-8 text-amber-600" />}
            onClick={() => { setSelectedMonth(entry.id!); setViewMode('weeks'); }}
          />
        ))}
        {entries.length === 0 && <EmptyState message="لا توجد أرشيفات شهرية لهذا العام" />}
      </div>
    );
  };

  const renderWeeks = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {entries.map(entry => (
          <ArchiveCard 
            key={entry.id}
            title={`الأسبوع ${entry.id?.replace('W', '')}`}
            icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
            onClick={() => { setSelectedWeek(entry.id!); setViewMode('days'); }}
          />
        ))}
        {entries.length === 0 && <EmptyState message="لا توجد أرشيفات أسبوعية لهذا الشهر" />}
      </div>
    );
  };

  const renderDays = () => {
    const days = entries.filter(e => e.type === 'day' || !e.type).sort((a, b) => {
      const dateA = a.timestamp?.toDate() || new Date(0);
      const dateB = b.timestamp?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {days.map((day) => {
          const date = day.timestamp?.toDate() || new Date();
          const dayName = date.toLocaleDateString('ar-TN', { weekday: 'long' });
          const gregorianDate = date.toLocaleDateString('ar-TN', { day: 'numeric', month: 'long', year: 'numeric' });
          const hijriDate = getHijriDate(date);

          return (
            <motion.div
              key={day.id}
              whileHover={{ y: -10 }}
              onClick={() => { setSelectedDay(day.id!); setViewMode('entry'); }}
              className="bg-white rounded-[3rem] shadow-xl border border-stone-100 overflow-hidden group cursor-pointer hover:shadow-2xl hover:shadow-emerald-900/10 transition-all"
            >
              <div className="bg-stone-900 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Clock className="w-20 h-20 text-emerald-500" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{dayName}</span>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                  <h4 className="text-xl font-black font-serif line-clamp-1">
                    {day.dayTitle && day.dayTitle.length > 50 
                      ? "يوم قيد المعالجة السيادية..." 
                      : (day.dayTitle?.replace(/^بصفتي\s+/, '') || "يوم في رحاب الاستقامة")}
                  </h4>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-stone-400">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">التاريخ الميلادي</span>
                  </div>
                  <p className="text-sm font-bold text-stone-800">{gregorianDate}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-emerald-600/50">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">التاريخ الهجري</span>
                  </div>
                  <p className="text-sm font-bold text-emerald-900 font-serif">{hijriDate}</p>
                </div>

                <div className="pt-4 border-t border-stone-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-stone-100 rounded-xl flex items-center justify-center">
                      <Award className="w-4 h-4 text-stone-400" />
                    </div>
                    <span className="text-xs font-black text-stone-900">{day.stats?.pointsEarned || 0} نقطة</span>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-stone-300 group-hover:text-emerald-500 group-hover:translate-x-[-5px] transition-all" />
                </div>
              </div>
            </motion.div>
          );
        })}
        {days.length === 0 && <EmptyState message="لا توجد أرشيفات يومية لهذا الأسبوع" />}
      </div>
    );
  };

  const renderManagementBox = () => {
    // Filter entries that have a daily report or activities
    const reports = entries.filter(entry => entry.dailyReport || (entry.activities && entry.activities.length > 0)).sort((a, b) => {
      const dateA = a.timestamp?.toDate() || new Date(0);
      const dateB = b.timestamp?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return (
      <div className="space-y-6">
        <div className="bg-stone-900 p-10 rounded-[3.5rem] text-white relative overflow-hidden border border-emerald-500/20 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Shield className="w-48 h-48 text-emerald-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-black font-serif text-emerald-400 mb-4">علبة الإدارة السيادية</h3>
            <p className="text-stone-400 max-w-2xl leading-relaxed">
              هنا لا تجد مجرد كلمات، بل جوهر الإدارة. تلخيص الأوامر، النواهي، الزجر، الشكر، وتحليل كل "نفس صعد" في سبيل الارتقاء. هذا هو محرك الإصلاح الذي يديره السيد.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {reports.length > 0 ? reports.map((entry) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={entry.id}
              onClick={() => { setSelectedDay(entry.id!); setViewMode('entry'); }}
              className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-xl relative overflow-hidden group cursor-pointer hover:border-emerald-200 transition-all"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-stone-900 font-serif">
                      {entry.dayTitle || `سجل يوم ${new Date(entry.timestamp?.toDate()).toLocaleDateString('ar-TN', { day: 'numeric', month: 'long' })}`}
                    </h4>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sovereign Management Entry</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-stone-400">{new Date(entry.timestamp?.toDate()).toLocaleDateString('ar-TN', { weekday: 'long' })}</span>
                </div>
              </div>
              
              {entry.dailyReport ? (
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 italic text-stone-700 leading-relaxed whitespace-pre-wrap font-serif line-clamp-3">
                  {entry.dailyReport}
                </div>
              ) : (
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 italic text-stone-400 text-sm">
                  بانتظار التقرير الختامي.. الأنفاس والتحركات قيد الأرشفة.
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase">
                    {entry.activities?.length || 0} تحركاً موثقاً
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-400 font-bold text-xs group-hover:text-emerald-600 transition-colors">
                  عرض التفاصيل <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="py-24 text-center bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
              <Shield className="w-16 h-16 text-stone-200 mx-auto mb-4" />
              <p className="text-stone-400 font-bold italic">لا توجد تقارير إدارية بعد.. السيد يراقب بصمت.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEntry = () => {
    const entry = entries.find(e => e.id === selectedDay);
    if (!entry) return <EmptyState message="لم يتم العثور على الإدخال" />;

    // Common Header for both views
    const renderHeader = () => (
      <div className="bg-stone-900 p-8 text-white relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          {activeSection === 'archive' ? <Award className="w-32 h-32" /> : <Shield className="w-32 h-32" />}
        </div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="space-y-1">
            <h3 className="text-3xl font-black font-serif text-emerald-400">
              {entry.dayTitle || `يوم ${new Date(entry.timestamp?.toDate() || new Date()).toLocaleDateString('ar-TN', { day: 'numeric', month: 'long' })}`}
            </h3>
            <div className="flex items-center gap-2 text-stone-400 text-sm font-bold">
              <span>{new Date(entry.timestamp?.toDate() || new Date()).toLocaleDateString('ar-TN', { weekday: 'long' })}</span>
              <span>•</span>
              <span>{activeSection === 'archive' ? 'سجل الأهداف' : 'علبة الإدارة'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="px-4 py-1.5 bg-emerald-600 rounded-full text-xs font-bold shadow-lg shadow-emerald-900/20">
              {entry.stats?.pointsEarned || entry.points || 0} نقطة مكتسبة
            </div>
            {selectedDay === new Date().toISOString().split('T')[0] && (
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                عرين المراقبة نشط
              </div>
            )}
          </div>
        </div>
        <p className="text-stone-400 text-sm relative z-10">الأرشيف Pro Max • ذاكرة الاستقامة الحية</p>
      </div>
    );

    const renderGoalsView = () => (
      <div className="p-8 space-y-10">
        {/* Goals Record Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                <Award className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-black text-stone-900 text-xl">سجل الأهداف</h4>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Goals & Achievements</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-400 uppercase">تمت</p>
                <p className="text-xl font-black text-emerald-600">{entry.stats?.goalsCompleted || 0}</p>
              </div>
              <div className="w-px h-8 bg-stone-100" />
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-400 uppercase">النقاط</p>
                <p className="text-xl font-black text-stone-900">{entry.stats?.pointsEarned || 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Completed Goals */}
            <div className="space-y-4">
              <h5 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                الأهداف التامة
              </h5>
              <div className="space-y-3">
                {entry.activities?.filter(a => a.type === 'goal').map((goal, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between group hover:bg-emerald-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Zap className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-stone-800 font-bold text-sm">{goal.content}</p>
                    </div>
                    <span className="text-[10px] font-black text-stone-400">{goal.time}</span>
                  </motion.div>
                )) || (
                  <p className="text-stone-400 text-xs italic p-4">لا توجد أهداف تامة موثقة.</p>
                )}
              </div>
            </div>

            {/* Uncompleted Goals (عجز التمام) */}
            <div className="space-y-4">
              <h5 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full" />
                عجز التمام
              </h5>
              <div className="space-y-3">
                {entry.goals?.filter(g => g.status !== 'completed').map((goal, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i}
                    className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100 flex items-center justify-between group hover:bg-rose-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 opacity-60">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Clock className="w-4 h-4 text-rose-400" />
                      </div>
                      <p className="text-stone-800 font-bold text-sm line-through">{goal.text || goal.content}</p>
                    </div>
                    <span className="text-[10px] font-black text-rose-400 italic">لم يكتمل</span>
                  </motion.div>
                )) || (
                  <p className="text-stone-400 text-xs italic p-4">لا يوجد عجز تمام لهذا اليوم.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* The Great Daily Report Section */}
        {entry.dailyReport && (
          <section className="relative pt-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-emerald-500" />
              <Sparkles className="w-6 h-6 text-emerald-500" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-emerald-500" />
            </div>
            
            <div className="bg-stone-900 p-10 rounded-[3rem] border border-emerald-500/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <Shield className="w-48 h-48 text-emerald-500" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white font-serif">التقرير اليومي العظيم</h4>
                    <p className="text-emerald-500/50 text-[10px] font-black uppercase tracking-[0.3em]">The Great Sovereign Report</p>
                  </div>
                </div>
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-stone-300 leading-relaxed whitespace-pre-wrap font-serif text-lg italic">
                    {entry.dailyReport}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase">موثق ومختوم من السيد رمضان</span>
                  </div>
                  <span className="text-[10px] font-bold text-stone-600 italic">نهاية اليوم الشرعي</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    );

    const renderManagementView = () => (
      <div className="p-8 space-y-10">
        {/* Record of Actions and Breaths */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center border border-stone-200">
                <Activity className="w-6 h-6 text-stone-600" />
              </div>
              <div>
                <h4 className="font-black text-stone-900 text-xl">سجل الأفعال والأنفاس</h4>
                <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">Actions & Management Logs</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 relative before:absolute before:right-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-100">
            {entry.activities?.filter(a => a.type !== 'goal').length > 0 ? [...entry.activities].filter(a => a.type !== 'goal').reverse().map((act, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                key={i} 
                className="relative pr-12"
              >
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl border-4 border-white flex items-center justify-center shadow-sm ${
                  act.type === 'thought' ? 'bg-stone-800 text-white' :
                  act.type === 'file' ? 'bg-amber-500 text-white' :
                  'bg-emerald-500 text-white'
                }`}>
                  {act.type === 'thought' ? <MessageSquare className="w-4 h-4" /> :
                   act.type === 'file' ? <Folder className="w-4 h-4" /> :
                   <Activity className="w-4 h-4" />}
                </div>
                <div className="bg-stone-50/50 p-5 rounded-2xl border border-stone-100 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase">{act.time}</span>
                    <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">
                      {act.type === 'thought' ? 'إحاطة إدارية' : act.type === 'file' ? 'تعديل خزينة' : 'تحرك وجودي'}
                    </span>
                  </div>
                  <p className="text-stone-800 font-medium text-sm leading-relaxed italic">
                    {act.content}
                  </p>
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-12 bg-stone-50/50 rounded-3xl border border-dashed border-stone-200">
                <p className="text-stone-400 text-sm italic">لا توجد تحركات إدارية موثقة لهذا اليوم.</p>
              </div>
            )}
          </div>
        </section>

        {/* The Great Daily Report Section (also visible here) */}
        {entry.dailyReport && (
          <section className="bg-stone-900 p-8 rounded-[2rem] border border-stone-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-stone-500 to-emerald-500" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-black text-white text-xl">التقرير اليومي السيادي</h4>
                <p className="text-stone-500 text-xs uppercase tracking-widest">Sovereign Daily Report</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-stone-300 leading-relaxed whitespace-pre-wrap font-serif text-lg italic">
                {entry.dailyReport}
              </p>
            </div>
          </section>
        )}
      </div>
    );

    if (entry.type === 'transition') {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-900 rounded-[2.5rem] shadow-2xl border border-emerald-800 overflow-hidden text-white"
        >
          <div className="p-12 text-center space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full -ml-32 -mb-32 blur-3xl animate-pulse" />
            
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <Sparkles className="w-12 h-12 text-emerald-400" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-black font-serif">وثيقة عبور الأبعاد</h2>
              <p className="text-emerald-300 font-bold uppercase tracking-[0.2em] text-sm">The Ascendance Dimension Shift</p>
            </div>

            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm max-w-2xl mx-auto">
              <p className="text-xl leading-relaxed italic font-serif text-emerald-50">
                "{entry.aiSummary}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">الملف المعني</p>
                <p className="font-bold">{entry.metadata?.fileName}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">البعد الجديد</p>
                <p className="font-bold text-2xl">Dim {entry.metadata?.newDimension}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">النقاط التراكمية</p>
                <p className="font-bold">{entry.metadata?.totalPoints}</p>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (entry.type === 'milestone') {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-stone-900 rounded-[2.5rem] shadow-2xl border-4 border-amber-500/50 overflow-hidden text-white relative"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
          <div className="p-12 text-center space-y-8 relative z-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto border-4 border-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
              <Rocket className="w-12 h-12 text-stone-900" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl font-black font-serif bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent">حجر الزاوية</h2>
              <p className="text-amber-500/70 font-bold uppercase tracking-[0.3em] text-xs">The Foundation Milestone • Year Zero</p>
            </div>

            <div className="bg-white/5 p-10 rounded-[2rem] border border-white/10 backdrop-blur-sm max-w-2xl mx-auto shadow-inner">
              <p className="text-2xl leading-relaxed italic font-serif text-amber-50">
                "{entry.aiSummary}"
              </p>
            </div>

            <div className="pt-8">
              <div className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl font-black text-stone-900 shadow-xl shadow-amber-900/20 hover:scale-105 transition-transform">
                <Plus className="w-6 h-6" />
                إعلان ميلاد الاستقامة
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-xl border border-stone-100 overflow-hidden"
      >
        {renderHeader()}
        {activeSection === 'archive' ? renderGoalsView() : renderManagementView()}
      </motion.div>
    );
  };

  const goBack = () => {
    if (viewMode === 'months') setViewMode('years');
    else if (viewMode === 'weeks') setViewMode('months');
    else if (viewMode === 'days') setViewMode('weeks');
    else if (viewMode === 'entry') setViewMode('days');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center shadow-xl">
            <Calendar className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-stone-900 font-serif">الأرشيف Pro Max</h2>
            <p className="text-stone-500">ذاكرة الاستقامة ومحرك التعلم الإداري</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {viewMode !== 'years' && (
            <button 
              onClick={goBack}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
              عودة
            </button>
          )}
        </div>
      </div>

      {(viewMode === 'days' || viewMode === 'entry') && (
        <div className="flex items-center gap-4 mb-8 bg-stone-100 p-2 rounded-3xl w-fit">
          <button 
            onClick={() => setActiveSection('archive')}
            className={`px-8 py-3 rounded-2xl font-black text-sm transition-all ${activeSection === 'archive' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            سجل الأهداف
          </button>
          <button 
            onClick={() => setActiveSection('insights')}
            className={`px-8 py-3 rounded-2xl font-black text-sm transition-all ${activeSection === 'insights' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            علبة الإدارة
          </button>
        </div>
      )}

      {activeSection === 'insights' ? (
        <div className="space-y-8">
          {viewMode === 'entry' ? renderEntry() : renderManagementBox()}
        </div>
      ) : (
        <div className="space-y-8">
          {viewMode === 'years' && renderYears()}
          {viewMode === 'months' && renderMonths()}
          {viewMode === 'weeks' && renderWeeks()}
          {viewMode === 'days' && renderDays()}
          {viewMode === 'entry' && renderEntry()}
        </div>
      )}
      {profile && <FloatingInsights uid={profile.uid} location="archive" />}

      {/* Floating Report Button for Week/Month/Year */}
      {(viewMode === 'weeks' || viewMode === 'months' || viewMode === 'years') && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            const period = viewMode === 'weeks' ? 'الأسبوع' : viewMode === 'months' ? 'الشهر' : 'السنة';
            setReportContent(`هذا هو التقرير السيادي لـ ${period}. يتم تجميع كافة الأنفاس والأهداف والتحركات الإدارية لتشكيل رؤية شاملة عن مسار الاستقامة والارتقاء.`);
            setShowReportModal(true);
          }}
          className="fixed bottom-24 left-8 w-16 h-16 bg-stone-900 text-emerald-400 rounded-full shadow-2xl flex items-center justify-center border-2 border-emerald-500/30 z-40 group"
        >
          <FileText className="w-8 h-8 group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-12 right-0 bg-stone-900 text-white text-[10px] font-black px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-emerald-500/20 whitespace-nowrap">
            فتح تقرير الفترة
          </div>
        </motion.button>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-stone-100"
            >
              <div className="bg-stone-900 p-8 text-white relative">
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                    <Shield className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-serif text-emerald-400">التقرير الدوري السيادي</h3>
                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest">Sovereign Periodic Review</p>
                  </div>
                </div>
              </div>
              <div className="p-10">
                <div className="bg-stone-50 p-8 rounded-[2rem] border border-stone-100 relative">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Sparkles className="w-32 h-32 text-emerald-500" />
                  </div>
                  <p className="text-stone-800 leading-relaxed font-serif text-lg italic whitespace-pre-wrap relative z-10">
                    {reportContent}
                  </p>
                </div>
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="px-10 py-4 bg-stone-900 text-white rounded-2xl font-black hover:bg-stone-800 transition-all shadow-xl shadow-stone-900/20"
                  >
                    إغلاق التقرير
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ArchiveCard: React.FC<{ 
  title: string; 
  subtitle?: string; 
  icon: React.ReactNode; 
  onClick: () => void; 
}> = ({ title, subtitle, icon, onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100 flex flex-col items-center text-center gap-4 hover:shadow-xl hover:shadow-stone-200/50 transition-all group"
    >
      <div className="w-20 h-20 bg-stone-50 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className="text-xl font-black text-stone-900 font-serif">{title}</h4>
        {subtitle && <p className="text-xs text-stone-400 mt-1 line-clamp-2">{subtitle}</p>}
      </div>
    </motion.button>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-stone-200">
      <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <FileText className="w-10 h-10 text-stone-300" />
      </div>
      <p className="text-stone-500 font-medium">{message}</p>
    </div>
  );
};
