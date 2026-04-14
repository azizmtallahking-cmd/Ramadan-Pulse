import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Trash2, Activity, Star, Box, Info, Shield, Flag, Target, 
  Edit3, Bot, Sparkles, Zap, Send, Plus, CheckCircle2, X, FileText, 
  ImageIcon, Table as TableIcon, ClipboardList, File as FileIcon, 
  TrendingUp, AlertCircle
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, deleteDoc, orderBy, limit, getDocs, getDoc 
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { triggerAdministrativeReview } from '../services/adminService';
import { activateSynergy, scanForSynergy } from '../services/synergyService';
import { logActivity } from '../services/archiveService';
import { UserProfile, File, Project, Goal, VaultItem, Thought, ChatMessage, Synergy, QuasiFile } from '../types';

interface FileDetailPageProps {
  file: File | QuasiFile;
  onBack: () => void;
  profile: UserProfile | null;
  files: File[];
}

export default function FileDetailPage({ file, onBack, profile, files }: FileDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'projects' | 'goals' | 'thoughts' | 'fruits'>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [synergy, setSynergy] = useState<Synergy | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [selectedVaultItem, setSelectedVaultItem] = useState<VaultItem | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showAddContentModal, setShowAddContentModal] = useState(false);

  // Form States
  const [newProject, setNewProject] = useState<Partial<Project>>({ title: '', duration: '', type: 'spiritual', trackingType: 'points', progress: 0 });
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ text: '', type: 'daily', status: 'pending', points: 10 });
  const [newVaultItem, setNewVaultItem] = useState<Partial<VaultItem>>({ title: '', type: 'text', content: '' });
  const [proofText, setProofText] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const isQuasi = (file as QuasiFile).isQuasi;

  // Law of Fullness Check
  useEffect(() => {
    const checkFullnessLaw = async () => {
      if (!profile || isQuasi || (file as File).content) return;

      const createdAt = (file as File).createdAt;
      if (!createdAt) return;

      const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      const diffDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays > 3) {
        // Trigger Veto and Insight
        const triggerMsg = `[قانون الامتلاء] الملف "${file.title}" فارغ منذ أكثر من 3 أيام. هذا إهمال وجودي. طبق العقوبة المناسبة.`;
        await triggerAdministrativeReview(profile, triggerMsg, file.id);
      }
    };

    checkFullnessLaw();
  }, [file.id, profile, isQuasi]);

  useEffect(() => {
    if (file.id && profile?.uid) {
      if (!isQuasi) {
        const qProjects = query(collection(db, 'projects'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('startDate', 'desc'));
        const qGoals = query(collection(db, 'goals'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('createdAt', 'desc'));
        const qVault = query(collection(db, 'vault'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('createdAt', 'desc'));
        const qThoughts = query(collection(db, 'thoughts'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('timestamp', 'desc'));
        const qSynergy = query(collection(db, 'synergies'), where('uid', '==', profile?.uid), where('fileAId', '==', file.id));
        const qSynergyB = query(collection(db, 'synergies'), where('uid', '==', profile?.uid), where('fileBId', '==', file.id));

        const unsubProjects = onSnapshot(qProjects, (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))));
        const unsubGoals = onSnapshot(qGoals, (s) => setGoals(s.docs.map(d => ({ id: d.id, ...d.data() } as Goal))));
        const unsubVault = onSnapshot(qVault, (s) => setVaultItems(s.docs.map(d => ({ id: d.id, ...d.data() } as VaultItem))));
        const unsubThoughts = onSnapshot(qThoughts, (s) => setThoughts(s.docs.map(d => ({ id: d.id, ...d.data() } as Thought))));
        
        const unsubSynergy = onSnapshot(qSynergy, (s) => {
          if (!s.empty) setSynergy({ id: s.docs[0].id, ...s.docs[0].data() } as Synergy);
        });
        const unsubSynergyB = onSnapshot(qSynergyB, (s) => {
          if (!s.empty) setSynergy({ id: s.docs[0].id, ...s.docs[0].data() } as Synergy);
        });

        return () => {
          unsubProjects();
          unsubGoals();
          unsubVault();
          unsubThoughts();
          unsubSynergy();
          unsubSynergyB();
        };
      }

      const qChat = query(
        collection(db, `chats/${profile?.uid}/messages`), 
        where('fileId', '==', file.id), 
        orderBy('timestamp', 'asc'), 
        limit(50)
      );
      const unsubChat = onSnapshot(qChat, (s) => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))));
      
      return () => unsubChat();
    }
  }, [file.id, profile?.uid, isQuasi]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending || !profile) return;
    setIsSending(true);
    const text = chatInput;
    setChatInput('');

    try {
      const path = `chats/${profile.uid}/messages`;
      await addDoc(collection(db, path), {
        uid: profile.uid,
        fileId: file.id,
        role: 'user',
        content: text,
        timestamp: serverTimestamp()
      });

      setIsTyping(true);
      // Enhanced prompt for Assistant
      const contextPrompt = `
أنت الآن تتحدث بصفتك "${file.assistantName}"، العون المخصص لهذا الملف.
بيانات الملف الحالية:
- العنوان: ${file.title}
- المحتوى: ${(file as File).content || 'فارغ'}
- الثمرات: ${(file as File).fruits || 'غير محددة'}
- تاريخ التأسيس: ${(file as File).createdAt?.toDate?.()?.toLocaleDateString('ar-TN') || 'غير معروف'}

رسالة المستخدم: ${text}
`;
      await triggerAdministrativeReview(profile, contextPrompt, file.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentInput.trim() || !profile || isQuasi) return;

    try {
      const fileRef = doc(db, 'files', file.id);
      await updateDoc(fileRef, {
        content: contentInput,
        lastUpdated: serverTimestamp()
      });

      // Also save to vault as requested
      await addDoc(collection(db, 'vault'), {
        uid: profile.uid,
        fileId: file.id,
        title: 'تحديث محتوى الملف',
        type: 'text',
        content: contentInput,
        createdAt: serverTimestamp()
      });

      await logActivity(profile.uid, { 
        type: 'file', 
        content: `أضفت محتوى جديداً لملف "${file.title}"` 
      }, profile.coordinates);

      // Trigger Ramadan Man
      await triggerAdministrativeReview(profile, `[تحديث محتوى] لقد أضفت محتوى جديداً لملف "${file.title}": ${contentInput}`, file.id);

      setShowAddContentModal(false);
      setContentInput('');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `files/${file.id}`);
    }
  };

  const handleUpdateFruits = async () => {
    if (!profile || isQuasi) return;
    
    const triggerMsg = `[مراجعة الثمرات] أطلب منك مراجعة التقدم في ثمرات ملف "${file.title}". الثمرات الحالية: ${(file as File).fruits}. التقدم الحالي: ${file.pulse}%. هل استحق زيادة في النقاط أو النبض؟`;
    await triggerAdministrativeReview(profile, triggerMsg, file.id);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !file.id || !profile) return;
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        fileId: file.id,
        uid: profile.uid,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setShowProjectModal(false);
      setNewProject({ title: '', duration: '', type: 'flexible', trackingType: 'points', progress: 0, startDate: '', endDate: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'projects');
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.text || !file.id || !profile) return;
    try {
      await addDoc(collection(db, 'goals'), {
        ...newGoal,
        fileId: file.id,
        uid: profile.uid,
        createdAt: serverTimestamp()
      });
      setShowGoalModal(false);
      setNewGoal({ text: '', type: 'daily', status: 'pending', points: 10 });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'goals');
    }
  };

  const toggleGoalStatus = async (goalId: string, currentStatus: string) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      await updateDoc(goalRef, { status: currentStatus === 'completed' ? 'pending' : 'completed' });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `goals/${goalId}`);
    }
  };

  const analyzeVaultItem = async (item: Partial<VaultItem>) => {
    if (!profile) return null;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      let prompt = '';
      
      if (item.type === 'image') {
        prompt = `أنت "عون البناء". قم بتحليل هذه الصورة المرفقة (بصيغة base64). استخرج منها البيانات الهندسية، الملاحظات، أو الجماليات التي تفيد في بناء النظام.
العنوان: ${item.title}
المهمة: قدم تحليلاً عميقاً ومختصراً باللغة العربية.`;
      } else if (item.type === 'pdf' || item.type === 'table') {
        prompt = `أنت "عون البناء". قم بتحليل هذا الملف (${item.type}). استخرج منه النقاط الجوهرية، الأرقام الهامة، أو التوصيات.
العنوان: ${item.title}
المحتوى (قد يكون base64 أو نص مستخرج): ${item.content?.substring(0, 5000)}
المهمة: قدم تحليلاً فنياً وهندسياً باللغة العربية.`;
      } else {
        prompt = `أنت "عون البناء". قم بتحليل هذا التقرير أو النص.
العنوان: ${item.title}
المحتوى: ${item.content}
المهمة: قدم ملخصاً تحليلياً يوضح القيمة المضافة لهذا النص في النظام.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      return response.text;
    } catch (e) {
      console.error("AI Analysis Error:", e);
      return "تعذر التحليل التلقائي حالياً. سيقوم السيد بمراجعته يدوياً.";
    }
  };

  const handleAddVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultItem.title || !file.id || !profile) return;
    try {
      const analysis = await analyzeVaultItem(newVaultItem);
      
      await addDoc(collection(db, 'vault'), {
        ...newVaultItem,
        uid: profile.uid,
        fileId: file.id,
        analysis: analysis || null,
        createdAt: serverTimestamp()
      });
      setShowVaultModal(false);
      setNewVaultItem({ title: '', type: 'text', content: '' });
      
      // Log activity
      await logActivity(profile.uid, {
        type: 'vault_added',
        content: `أضفت مادة جديدة للخزانة: "${newVaultItem.title}" وتم تحليلها بواسطة الذكاء الاصطناعي.`
      }, profile.coordinates);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'vault');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-stone-500 hover:text-emerald-600 font-bold transition-colors">
          <ArrowRight className="w-5 h-5" />
          العودة للملفات
        </button>
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              if (window.confirm('هل أنت متأكد من حذف هذا الملف؟')) {
                await deleteDoc(doc(db, 'files', file.id));
                onBack();
              }
            }}
            className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-700">نبض الملف: {file.pulse}%</span>
          </div>
          <div className="flex gap-1">
            {!(file as QuasiFile).isQuasi && (file.points || 0) >= 1000 && (
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-xl border border-amber-100">
                <Box className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black text-amber-700">البعد {Math.floor((file.points || 0) / 1000)}</span>
              </div>
            )}
            {[...Array(Math.floor(((file.points || 0) % 1000) / 200))].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 space-y-2">
            <NavButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Info className="w-5 h-5" />} label="تعريف الملف" />
            <NavButton active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} icon={<Shield className="w-5 h-5" />} label="خزانة الملف" />
            <NavButton active={activeTab === 'fruits'} onClick={() => setActiveTab('fruits')} icon={<TrendingUp className="w-5 h-5" />} label="الثمرات" />
            <NavButton active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} icon={<Flag className="w-5 h-5" />} label="المشاريع" />
            <NavButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target className="w-5 h-5" />} label="الأهداف" />
            <NavButton active={activeTab === 'thoughts'} onClick={() => setActiveTab('thoughts')} icon={<Edit3 className="w-5 h-5" />} label="خواطر في الطريق" />
          </div>

          {/* Assistant Preview */}
          <div className="bg-stone-900 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <div>
                <h4 className="font-black font-serif">{file.assistantName}</h4>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">عون الملف المخلص</p>
              </div>
              <button 
                onClick={() => setActiveTab('overview')}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold transition-all border border-white/10"
              >
                محادثة العون
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Content Pane */}
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100">
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-4xl font-black text-stone-900 font-serif">{file.title}</h1>
                    {!isQuasi && (
                      <button 
                        onClick={() => setShowAddContentModal(true)}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all"
                      >
                        <Plus className="w-4 h-4" /> إضافة محتوى للملف
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <SectionHeader icon={<Info className="w-4 h-4" />} title="تعريف الملف" />
                      <p className="text-stone-600 leading-relaxed">{file.description}</p>
                      
                      <SectionHeader icon={<FileText className="w-4 h-4" />} title="محتوى الملف" />
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                        <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
                          {(file as File).content || 'لا يوجد محتوى مضاف حالياً. ابدأ بتدوين جوهر هذا الملف.'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <SectionHeader icon={<Shield className="w-4 h-4" />} title="دور الملف" />
                      <p className="text-stone-600 leading-relaxed">{file.role || 'لم يتم تحديد الدور بعد.'}</p>

                      <SectionHeader icon={<Target className="w-4 h-4" />} title="الأهداف العامة" />
                      <ul className="space-y-2">
                        {file.generalGoals?.map((g, i) => (
                          <li key={i} className="flex items-center gap-2 text-stone-600 text-sm">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            {g}
                          </li>
                        )) || <p className="text-stone-400 text-sm">لا توجد أهداف عامة محددة.</p>}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Assistant Chat in Overview */}
                <div className="bg-white rounded-[3rem] shadow-sm border border-stone-100 overflow-hidden flex flex-col h-[500px]">
                  <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-stone-800">دردشة مع {file.assistantName}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">نشط الآن</span>
                    </div>
                  </div>
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50/20">
                    {chatMessages.map((msg, i) => (
                      <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-white text-stone-800 border border-stone-100 rounded-tl-none' 
                            : 'bg-emerald-600 text-white rounded-tr-none'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-end">
                        <div className="flex gap-2 p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-tr-none">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-white border-t border-stone-100 flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      disabled={isSending}
                      placeholder="تحدث مع عون الملف..."
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-2xl px-6 py-3 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                    <button onClick={handleSendMessage} disabled={isSending} className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'fruits' && (
              <motion.div key="fruits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-stone-800 font-serif">الثمرات (The Fruits)</h2>
                    <button 
                      onClick={handleUpdateFruits}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
                    >
                      <Sparkles className="w-5 h-5" /> تحديث التقدم
                    </button>
                  </div>

                  <div className="p-8 bg-stone-50 rounded-[2.5rem] border border-stone-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-stone-400 uppercase tracking-widest">نسبة نضج الثمار</span>
                      <span className="text-2xl font-black text-emerald-600">{file.pulse}%</span>
                    </div>
                    <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${file.pulse}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <SectionHeader icon={<Star className="w-4 h-4" />} title="الثمرات المرجوة" />
                      <div className="p-6 bg-white border border-stone-100 rounded-3xl shadow-sm">
                        <p className="text-stone-700 leading-relaxed italic">
                          {(file as File).fruits || 'لم يتم تحديد الثمرات لهذا الملف بعد.'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <SectionHeader icon={<TrendingUp className="w-4 h-4" />} title="تحليل رمضان مان" />
                      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                        <p className="text-emerald-900 text-sm leading-relaxed">
                          {file.pulse > 70 
                            ? "الثمار بدأت تنضج فعلياً. استمر في السقاية بالعمل الجاد." 
                            : file.pulse > 30 
                            ? "هناك بوادر نمو، لكن الجفاف يهدد المسار. زد من وتيرة الإنجاز."
                            : "الأرض قاحلة.. الثمار تحتاج لبرهان عملي لتظهر."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'vault' && (
              <motion.div key="vault" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-800 font-serif">خزانة الملف (The Vault)</h2>
                  <button onClick={() => setShowVaultModal(true)} className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-900 transition-all">
                    <Plus className="w-4 h-4" /> إضافة مادة
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {vaultItems.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedVaultItem(item)}
                      className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-md transition-all text-center space-y-4 group cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto text-stone-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
                        {item.type === 'pdf' && <FileIcon className="w-8 h-8" />}
                        {item.type === 'image' && <ImageIcon className="w-8 h-8" />}
                        {item.type === 'table' && <TableIcon className="w-8 h-8" />}
                        {item.type === 'report' && <ClipboardList className="w-8 h-8" />}
                        {item.type === 'text' && <FileText className="w-8 h-8" />}
                      </div>
                      <h4 className="font-bold text-stone-800 text-sm truncate">{item.title}</h4>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.type}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'projects' && (
              <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-800 font-serif">المشاريع المتفرعة</h2>
                  <button onClick={() => setShowProjectModal(true)} className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-900 transition-all">
                    <Plus className="w-4 h-4" /> مشروع جديد
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-all space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xl font-bold text-stone-800">{project.title}</h4>
                          <p className="text-xs text-stone-400 mt-1">{project.duration}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 font-black text-sm">
                          {project.progress}%
                        </div>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'goals' && (
              <motion.div key="goals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-800 font-serif">أهداف الملف</h2>
                  <button onClick={() => setShowGoalModal(true)} className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-900 transition-all">
                    <Plus className="w-4 h-4" /> هدف جديد
                  </button>
                </div>
                <div className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="bg-white p-6 rounded-[1.5rem] border border-stone-100 shadow-sm flex items-center gap-4 group">
                      <button 
                        onClick={() => toggleGoalStatus(goal.id, goal.status)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${goal.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 group-hover:border-emerald-500'}`}
                      >
                        {goal.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <div className="flex-1">
                        <p className={`font-bold ${goal.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{goal.text}</p>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{goal.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'thoughts' && (
              <motion.div key="thoughts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-black text-stone-800 font-serif">خواطر في الطريق</h2>
                <div className="space-y-6">
                  {thoughts.map((thought) => (
                    <div key={thought.id} className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/20" />
                      <p className="text-stone-700 leading-relaxed italic">"{thought.content}"</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddContentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddContentModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-stone-800 font-serif">إضافة محتوى للملف</h2>
                <button onClick={() => setShowAddContentModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
              <form onSubmit={handleAddContent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">المحتوى الوجودي</label>
                  <textarea 
                    required 
                    value={contentInput} 
                    onChange={(e) => setContentInput(e.target.value)} 
                    rows={8}
                    placeholder="اكتب هنا جوهر الملف، خططك، أو رؤيتك العميقة..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 resize-none" 
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">حفظ وتفعيل المراجعة</button>
              </form>
            </motion.div>
          </div>
        )}

        {showProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-stone-800 font-serif">تأسيس مشروع فرعي</h2>
                <button onClick={() => setShowProjectModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
              <form onSubmit={handleAddProject} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">عنوان المشروع</label>
                  <input required type="text" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">تاريخ البداية</label>
                    <input type="date" value={newProject.startDate} onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">تاريخ النهاية</label>
                    <input type="date" value={newProject.endDate} onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">نوع المشروع</label>
                  <select value={newProject.type} onChange={(e) => setNewProject({ ...newProject, type: e.target.value as any })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500">
                    <option value="flexible">مرن (مفتوح)</option>
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">تأسيس المشروع</button>
              </form>
            </motion.div>
          </div>
        )}

        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGoalModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-stone-800 font-serif">إضافة هدف جديد</h2>
                <button onClick={() => setShowGoalModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
              <form onSubmit={handleAddGoal} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">نص الهدف</label>
                  <input required type="text" value={newGoal.text} onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">التكرار (التردد)</label>
                  <select 
                    value={newGoal.type} 
                    onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="general">هدف عام</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">إضافة الهدف</button>
              </form>
            </motion.div>
          </div>
        )}

        {showVaultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVaultModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-stone-800 font-serif">إضافة مادة للخزانة</h2>
                <button onClick={() => setShowVaultModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>
              <form onSubmit={handleAddVaultItem} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">عنوان المادة</label>
                  <input required type="text" value={newVaultItem.title} onChange={(e) => setNewVaultItem({ ...newVaultItem, title: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">نوع المادة</label>
                  <select value={newVaultItem.type} onChange={(e) => setNewVaultItem({ ...newVaultItem, type: e.target.value as any })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500">
                    <option value="pdf">PDF</option>
                    <option value="image">صورة</option>
                    <option value="table">جدول</option>
                    <option value="report">تقرير</option>
                    <option value="text">نص</option>
                  </select>
                </div>

                {['pdf', 'image', 'table'].includes(newVaultItem.type || '') ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">رفع الملف</label>
                    <input 
                      type="file" 
                      accept={newVaultItem.type === 'image' ? 'image/*' : newVaultItem.type === 'pdf' ? '.pdf' : '.csv,.xlsx,.xls'}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setNewVaultItem({ ...newVaultItem, content: event.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" 
                    />
                    <p className="text-[10px] text-stone-400 font-bold">سيقوم الذكاء الاصطناعي بتحليل الملف تلقائياً.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">المحتوى / النص</label>
                    <textarea 
                      required 
                      value={newVaultItem.content} 
                      onChange={(e) => setNewVaultItem({ ...newVaultItem, content: e.target.value })} 
                      rows={4}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500 resize-none" 
                    />
                  </div>
                )}

                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">حفظ وتحليل المادة</button>
              </form>
            </motion.div>
          </div>
        )}

        {selectedVaultItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedVaultItem(null)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl p-10 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center text-stone-600">
                    {selectedVaultItem.type === 'pdf' && <FileIcon className="w-6 h-6" />}
                    {selectedVaultItem.type === 'image' && <ImageIcon className="w-6 h-6" />}
                    {selectedVaultItem.type === 'table' && <TableIcon className="w-6 h-6" />}
                    {selectedVaultItem.type === 'report' && <ClipboardList className="w-6 h-6" />}
                    {selectedVaultItem.type === 'text' && <FileText className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-stone-800 font-serif">{selectedVaultItem.title}</h2>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{selectedVaultItem.type}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVaultItem(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              <div className="space-y-8">
                {selectedVaultItem.type === 'image' && selectedVaultItem.content && (
                  <div className="rounded-2xl overflow-hidden border border-stone-100">
                    <img src={selectedVaultItem.content} alt={selectedVaultItem.title} className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4" /> المحتوى
                  </h3>
                  <div className="p-6 bg-stone-50 rounded-2xl text-stone-700 leading-relaxed whitespace-pre-wrap text-sm border border-stone-100">
                    {selectedVaultItem.type === 'image' || selectedVaultItem.type === 'pdf' || selectedVaultItem.type === 'table' 
                      ? "ملف مرفوع (تمت معالجته بواسطة الذكاء الاصطناعي)" 
                      : selectedVaultItem.content}
                  </div>
                </div>

                {selectedVaultItem.analysis && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <Bot className="w-4 h-4" /> تحليل عون البناء
                    </h3>
                    <div className="p-6 bg-emerald-50 rounded-2xl text-emerald-900 leading-relaxed text-sm border border-emerald-100 shadow-inner">
                      {selectedVaultItem.analysis}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={async () => {
                      if (window.confirm('هل أنت متأكد من حذف هذه المادة من الخزانة؟')) {
                        try {
                          await deleteDoc(doc(db, 'vault', selectedVaultItem.id!));
                          setSelectedVaultItem(null);
                        } catch (e) {
                          handleFirestoreError(e, OperationType.DELETE, `vault/${selectedVaultItem.id}`);
                        }
                      }
                    }}
                    className="flex items-center gap-2 text-red-500 hover:text-red-700 font-bold text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> حذف المادة
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${
        active 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
          : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-2 text-emerald-600 mb-2">
      {icon}
      <h4 className="text-xs font-black uppercase tracking-widest">{title}</h4>
    </div>
  );
}
