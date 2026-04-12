import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, File, Project, Goal, VaultItem, Thought, ChatMessage, Synergy, QuasiFile } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, orderBy, limit, getDocs } from 'firebase/firestore';
import { scanForSynergy, activateSynergy, checkAndDecoupleSynergies } from '../services/synergyService';
import { initializeArchive, logActivity } from '../services/archiveService';
import { triggerAdministrativeReview } from '../services/adminService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Target, Calendar, Trash2, CheckCircle2, Clock, ChevronLeft, X, 
  Folder, FileText, ArrowRight, Edit3, Sparkles, BookOpen, 
  Link2, MessageSquare, Bot, Send, User, Image as ImageIcon, 
  File as FileIcon, Table as TableIcon, ClipboardList, Star, Activity, 
  Heart, Zap, Info, Shield, Flag, Box
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import FloatingInsights from '../components/FloatingInsights';

interface FilesProps {
  profile: UserProfile | null;
}

export default function Files({ profile }: FilesProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [synergies, setSynergies] = useState<Synergy[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | QuasiFile | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofText, setProofText] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'projects' | 'goals' | 'thoughts'>('overview');
  
  // Form States
  const [newFile, setNewFile] = useState<Partial<File>>({
    title: '',
    description: '',
    importance: '',
    role: '',
    generalGoals: [],
    stars: 0,
    pulse: 100,
    points: 0,
    status: 'active',
    assistantName: 'عون العظمة'
  });

  useEffect(() => {
    if (profile) {
      checkAndDecoupleSynergies(profile.uid);
      const qFiles = query(
        collection(db, 'files'),
        where('uid', '==', profile.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubFiles = onSnapshot(qFiles, (snapshot) => {
        const fetchedFiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as File));
        setFiles(fetchedFiles);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'files');
      });

      const qSynergies = query(
        collection(db, 'synergies'),
        where('uid', '==', profile.uid)
      );
      const unsubSynergies = onSnapshot(qSynergies, (snapshot) => {
        setSynergies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Synergy)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'synergies');
      });

      return () => {
        unsubFiles();
        unsubSynergies();
      };
    }
  }, [profile]);

  // Merge files and quasi-files
  const displayFiles = [
    ...files,
    ...synergies.filter(s => s.status === 'active').map(s => {
      const fileA = files.find(f => f.id === s.fileAId);
      const fileB = files.find(f => f.id === s.fileBId);
      return {
        id: `quasi-${s.id}`,
        uid: profile?.uid,
        title: `تشابك: ${fileA?.title} & ${fileB?.title}`,
        description: `شبه ملف ناتج عن تشابك استراتيجي بين ${fileA?.title} و ${fileB?.title}.`,
        isQuasi: true,
        sourceFiles: [s.fileAId, s.fileBId],
        pulse: Math.floor(((fileA?.pulse || 0) + (fileB?.pulse || 0)) / 2),
        points: (fileA?.points || 0) + (fileB?.points || 0),
        status: 'active',
        assistantName: 'رمضان مان (المدير)'
      } as QuasiFile;
    })
  ];

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newFile.title) return;

    try {
      if (files.length === 0) {
        await initializeArchive(profile.uid);
      }
      await addDoc(collection(db, 'files'), {
        ...newFile,
        uid: profile.uid,
        createdAt: serverTimestamp(),
      });
      
      await logActivity(profile.uid, { 
        type: 'file', 
        content: `أسست ملفاً جديداً بعنوان: "${newFile.title}"` 
      }, profile.coordinates);

      setShowAddModal(false);
      setNewFile({
        title: '',
        description: '',
        importance: '',
        role: '',
        generalGoals: [],
        stars: 0,
        pulse: 100,
        points: 0,
        status: 'active',
        assistantName: 'عون العظمة'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'files');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8 max-w-6xl mx-auto pb-20">
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-stone-900 font-serif">الملفات</h1>
                <p className="text-stone-500 mt-1">إدارة الوجود الإيماني من خلال الملفات الكبرى والمشاريع.</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                تأسيس ملف جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayFiles.map((file) => (
                <motion.div
                  key={file.id}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedFile(file)}
                  className={`bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 cursor-pointer group hover:shadow-xl hover:shadow-stone-200/50 transition-all relative overflow-hidden ${(file as QuasiFile).isQuasi ? 'border-dashed border-emerald-400 bg-emerald-50/20 shadow-lg shadow-emerald-100/50' : ''}`}
                >
                  <div className={`absolute top-0 right-0 w-2 h-full ${(file as QuasiFile).isQuasi ? 'bg-emerald-500/40' : 'bg-emerald-600/10 group-hover:bg-emerald-600/20'} transition-colors`} />
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-colors shadow-inner ${(file as QuasiFile).isQuasi ? 'bg-emerald-200/50' : 'bg-stone-50'}`}>
                      {(file as QuasiFile).isQuasi ? <Sparkles className="w-8 h-8 animate-pulse" /> : <Folder className="w-8 h-8" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {!(file as QuasiFile).isQuasi && (
                        <>
                          {(file.points || 0) >= 1000 && (
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                              <Box className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-black text-amber-700 uppercase">Dim {Math.floor((file.points || 0) / 1000)}</span>
                            </div>
                          )}
                          <div className="flex gap-0.5">
                            {[...Array(Math.floor(((file.points || 0) % 1000) / 200))].map((_, i) => (
                              <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                            ))}
                          </div>
                        </>
                      )}
                      {(file as QuasiFile).isQuasi && <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-stone-800 mb-2 truncate">{file.title}</h3>
                  <p className="text-sm text-stone-500 mb-6 line-clamp-2">{file.description}</p>

                  <div className="mt-auto pt-6 border-t border-stone-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-stone-400">النبض: {file.pulse}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                      <span>{file.points} نقطة</span>
                      <ChevronLeft className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <FileDetailView 
            file={selectedFile} 
            onBack={() => setSelectedFile(null)} 
            profile={profile}
            files={files}
          />
        )}
      </AnimatePresence>

      {/* Add File Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-black text-stone-800 font-serif">تأسيس ملف عظمة جديد</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              <form onSubmit={handleAddFile} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">عنوان الملف</label>
                    <input 
                      required
                      type="text" 
                      value={newFile.title}
                      onChange={(e) => setNewFile({ ...newFile, title: e.target.value })}
                      placeholder="مثال: ملف حفظ القرآن الكريم"
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">تعريف بالملف</label>
                    <textarea 
                      required
                      value={newFile.description}
                      onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
                      placeholder="ما هو مضمون هذا المسار؟"
                      rows={3}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-400 uppercase tracking-widest">دور الملف</label>
                      <input 
                        type="text" 
                        value={newFile.role}
                        onChange={(e) => setNewFile({ ...newFile, role: e.target.value })}
                        placeholder="مثال: أداة للدعوة، تطوير ذاتي..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-400 uppercase tracking-widest">اسم العون</label>
                      <input 
                        type="text" 
                        value={newFile.assistantName}
                        onChange={(e) => setNewFile({ ...newFile, assistantName: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                >
                  تأسيس الملف
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {profile && <FloatingInsights uid={profile.uid} location="files" />}
    </div>
  );
}

function FileDetailView({ file, onBack, profile, files }: { file: File | QuasiFile, onBack: () => void, profile: UserProfile | null, files: File[] }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'projects' | 'goals' | 'thoughts'>('overview');
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

  const isQuasi = (file as QuasiFile).isQuasi;

  useEffect(() => {
    if (file.id && profile?.uid) {
      if (!isQuasi) {
        const qProjects = query(collection(db, 'projects'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('startDate', 'desc'));
        const qGoals = query(collection(db, 'goals'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('createdAt', 'desc'));
        const qVault = query(collection(db, 'vault'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('createdAt', 'desc'));
        const qThoughts = query(collection(db, 'thoughts'), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('timestamp', 'desc'));
        const qSynergy = query(collection(db, 'synergies'), where('uid', '==', profile?.uid), where('fileAId', '==', file.id));
        const qSynergyB = query(collection(db, 'synergies'), where('uid', '==', profile?.uid), where('fileBId', '==', file.id));

        const unsubProjects = onSnapshot(qProjects, (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() } as Project))), (err) => {
          handleFirestoreError(err, OperationType.LIST, 'projects');
        });
        const unsubGoals = onSnapshot(qGoals, (s) => setGoals(s.docs.map(d => ({ id: d.id, ...d.data() } as Goal))), (err) => {
          handleFirestoreError(err, OperationType.LIST, 'goals');
        });
        const unsubVault = onSnapshot(qVault, (s) => setVaultItems(s.docs.map(d => ({ id: d.id, ...d.data() } as VaultItem))), (err) => {
          handleFirestoreError(err, OperationType.LIST, 'vault');
        });
        const unsubThoughts = onSnapshot(qThoughts, (s) => setThoughts(s.docs.map(d => ({ id: d.id, ...d.data() } as Thought))), (err) => {
          handleFirestoreError(err, OperationType.LIST, 'thoughts');
        });
        const unsubSynergy = onSnapshot(qSynergy, (s) => {
          if (!s.empty) setSynergy(s.docs[0].data() as Synergy);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'synergies');
        });
        const unsubSynergyB = onSnapshot(qSynergyB, (s) => {
          if (!s.empty) setSynergy(s.docs[0].data() as Synergy);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, 'synergies');
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

      const qChat = query(collection(db, `chats/${profile?.uid}/messages`), where('uid', '==', profile?.uid), where('fileId', '==', file.id), orderBy('timestamp', 'asc'), limit(50));
      const unsubChat = onSnapshot(qChat, (s) => setChatMessages(s.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))), (err) => {
        handleFirestoreError(err, OperationType.LIST, `chats/${profile?.uid}/messages`);
      });
      
      return () => {
        unsubChat();
      };
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
      // Add user message
      const path = `chats/${profile.uid}/messages`;
      try {
        await addDoc(collection(db, path), {
          uid: profile.uid,
          fileId: file.id,
          role: 'user',
          content: text,
          timestamp: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }

      // Trigger Administrative Review (handles AI response and tools)
      setIsTyping(true);
      await triggerAdministrativeReview(profile, text, file.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
      setIsTyping(false);
    }
  };

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({ title: '', duration: '', type: 'spiritual', trackingType: 'points', progress: 0 });
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({ text: '', type: 'daily', status: 'pending', points: 10 });

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !file.id || !profile) return;
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        fileId: file.id,
        uid: profile.uid,
        startDate: serverTimestamp(),
        status: 'active'
      });

      await logActivity(profile.uid, { 
        type: 'file', 
        content: `أطلقت مشروعاً جديداً بعنوان "${newProject.title}" ضمن ملف "${file.title}"` 
      }, profile.coordinates);

      setShowProjectModal(false);
      setNewProject({ title: '', duration: '', type: 'spiritual', trackingType: 'points', progress: 0 });
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

      await logActivity(profile.uid, { 
        type: 'goal', 
        content: `حددت هدفاً جديداً: "${newGoal.text}" في ملف "${file.title}"` 
      }, profile.coordinates);

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

  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [newVaultItem, setNewVaultItem] = useState<Partial<VaultItem>>({ title: '', type: 'text', content: '' });
  const [proofText, setProofText] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  const handleActivateSynergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!synergy?.id || !proofText.trim() || !profile) return;
    setIsActivating(true);
    try {
      await activateSynergy(profile.uid, synergy.id, proofText, profile.coordinates);
      // Also add this to Hall of Thoughts
      await addDoc(collection(db, 'thoughts'), {
        content: `[برهان اقتران] ${proofText}`,
        uid: profile.uid,
        fileId: file.id,
        timestamp: serverTimestamp(),
        tags: ['synergy-proof']
      });
      setShowProofModal(false);
      setProofText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsActivating(false);
    }
  };

  const handleAddVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultItem.title || !file.id || !profile) return;
    try {
      await addDoc(collection(db, 'vault'), {
        ...newVaultItem,
        uid: profile.uid,
        fileId: file.id,
        createdAt: serverTimestamp()
      });

      await logActivity(profile.uid, { 
        type: 'file', 
        content: `أضفت عنصراً جديداً لخزانة ملف "${file.title}": "${newVaultItem.title}"` 
      }, profile.coordinates);

      setShowVaultModal(false);
      setNewVaultItem({ title: '', type: 'text', content: '' });
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
              if (window.confirm('هل أنت متأكد من حذف هذا الملف؟ سيتم حذف جميع المشاريع والأهداف المرتبطة به.')) {
                try {
                  await deleteDoc(doc(db, 'files', file.id));
                  onBack();
                } catch (err) {
                  handleFirestoreError(err, OperationType.DELETE, `files/${file.id}`);
                }
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
                تحدث مع العون
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Content Pane */}
        <div className="lg:col-span-3 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                {isQuasi ? (
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 text-center space-y-8">
                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-12 h-12 text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black text-stone-900 font-serif mb-4">{file.title}</h1>
                      <p className="text-stone-500 max-w-2xl mx-auto leading-relaxed">
                        هذا الكيان هو "شبه ملف" (Quasi-File) ناتج عن التداخل العميق بين مسارين إيمانيين. 
                        العمل هنا يوزع الثمار على الملفات الأصلية بفعالية مضاعفة.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(file as QuasiFile).sourceFiles.map((sourceId, idx) => (
                        <div key={idx} className="p-6 bg-stone-50 rounded-3xl border border-stone-100 flex items-center justify-between group hover:bg-emerald-50 transition-all cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                              <Folder className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-stone-700">ملف المصدر {idx + 1}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-emerald-600 transition-colors" />
                        </div>
                      ))}
                    </div>

                    <div className="p-8 bg-emerald-900 text-white rounded-[2.5rem] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <div className="relative z-10 flex flex-col items-center space-y-4">
                        <Zap className="w-8 h-8 text-emerald-400" />
                        <h3 className="text-lg font-bold">مضاعف الجهد الاستراتيجي</h3>
                        <p className="text-emerald-100 text-sm">أي إنجاز يتم تسجيله في هذا السياق يمنحك 1.5x من النقاط المعتادة.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100">
                  <h1 className="text-4xl font-black text-stone-900 font-serif mb-6">{file.title}</h1>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <SectionHeader icon={<Info className="w-4 h-4" />} title="تعريف الملف" />
                      <p className="text-stone-600 leading-relaxed">{file.description}</p>
                      
                      <SectionHeader icon={<Zap className="w-4 h-4" />} title="أهمية الملف" />
                      <p className="text-stone-600 leading-relaxed">{file.importance || 'لم يتم تحديد الأهمية بعد.'}</p>
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

                  {/* Synergy Portal */}
                  {synergy && !isQuasi && (vaultItems.length > 0 && projects.length > 0) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`mt-10 p-8 rounded-[2.5rem] border relative overflow-hidden ${
                        synergy.status === 'active' ? 'bg-emerald-50 border-emerald-100' : 
                        synergy.status === 'decoupled' ? 'bg-rose-50 border-rose-100' : 
                        'bg-stone-50 border-stone-100'
                      }`}
                    >
                      <div className="absolute top-0 right-0 p-4">
                        <Sparkles className={`w-6 h-6 ${synergy.status === 'active' ? 'text-emerald-600 animate-pulse' : 'text-stone-400'}`} />
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-xl font-black font-serif ${synergy.status === 'active' ? 'text-emerald-900' : 'text-stone-800'}`}>
                          بوابة التشابك (Synergy Portal)
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          synergy.status === 'active' ? 'bg-emerald-600 text-white' : 
                          synergy.status === 'collaborative' ? 'bg-blue-600 text-white' :
                          synergy.status === 'decoupled' ? 'bg-rose-600 text-white' : 
                          'bg-stone-200 text-stone-600'
                        }`}>
                          {synergy.status === 'active' ? 'نشط (Synergy Phase)' : 
                           synergy.status === 'collaborative' ? 'تآزر وتعاون (Pre-Synergy)' :
                           synergy.status === 'decoupled' ? 'منقطع' : 'قيد الرصد (Probation)'}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <p className="text-stone-600 text-sm leading-relaxed">
                          {synergy.status === 'active' 
                            ? `هذا الملف مقترن بـ ${files.find(f => f.id === (synergy.fileAId === file.id ? synergy.fileBId : synergy.fileAId))?.title}. تم تفعيل مضاعف الجهد 1.5x.`
                            : synergy.status === 'collaborative'
                            ? `لقد أتممت أسبوع الرصد. الملفان في مرحلة "التآزر والتعاون" (Pre-Synergy). لا يوجد مضاعف جهد حالياً، لكن يمكنك البدء ببناء "فلسفة التقارن".`
                            : synergy.status === 'decoupled'
                            ? 'تم قطع الاقتران بسبب خمول النشاط لأكثر من 48 ساعة. عد للعمل لاستعادة حق الاقتران.'
                            : `تم رصد إمكانية اقتران بنسبة ${synergy.percentage}% مع ملف آخر. أنت الآن في مرحلة "الرصد الجاد" (Probation).`}
                        </p>
                        
                        <div className="bg-white/50 p-4 rounded-2xl border border-stone-200">
                          <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">توجيه رمضان مان:</p>
                          <p className="text-stone-800 text-sm italic">"{synergy.reason}"</p>
                        </div>

                        {synergy.philosophy && (
                          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">فلسفة التقارن:</p>
                            <p className="text-stone-700 text-sm leading-relaxed">{synergy.philosophy}</p>
                          </div>
                        )}

                        {synergy.status === 'potential' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              <span>نضج الاقتران</span>
                              <span>{synergy.maturityDays}/7 أيام</span>
                            </div>
                            <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(synergy.maturityDays / 7) * 100}%` }} />
                            </div>
                            {synergy.maturityDays >= 7 && (
                              <button 
                                onClick={() => setShowProofModal(true)}
                                className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all"
                              >
                                تقديم برهان الاقتران (قاعة الخواطر)
                              </button>
                            )}
                          </div>
                        )}

                        {synergy.status === 'active' && (
                          <div className="pt-4 flex items-center gap-4">
                            <div className="flex-1 h-2 bg-emerald-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600" style={{ width: `${synergy.percentage}%` }} />
                            </div>
                            <span className="text-xs font-black text-emerald-700">عامل التشابك: 1.5x</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                  {/* Manual Synergy Scan Button */}
                  {!synergy && !isQuasi && (
                    <div className="mt-10 flex justify-center">
                      <button 
                        onClick={async () => {
                          if (vaultItems.length === 0 || projects.length === 0) {
                            // Show floating message from Ramadan Man
                            try {
                              await addDoc(collection(db, 'insights'), {
                                uid: profile?.uid,
                                content: "املأ الخزائن أولاً بالعمل، ثم سنتحدث عن التقارن. العظمة لا تُبنى على العناوين الفارغة.",
                                type: 'warning',
                                location: 'files',
                                timestamp: serverTimestamp(),
                                isRead: false
                              });
                            } catch (err) {
                              console.error("Error adding insight:", err);
                            }
                          } else {
                            // Trigger scan
                            if (profile) scanForSynergy(profile.uid, files);
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl text-xs font-black transition-all border border-stone-200 uppercase tracking-widest"
                      >
                        <Sparkles className="w-4 h-4" />
                        ابحث عن تقارن (Synergy Scan)
                      </button>
                    </div>
                  )}
                </div>
                )}

                {/* Assistant Chat in Overview */}
                <div className="bg-white rounded-[3rem] shadow-sm border border-stone-100 overflow-hidden flex flex-col h-[400px]">
                  <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-stone-800">دردشة مع {file.assistantName}</h3>
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

            {activeTab === 'vault' && (
              <motion.div key="vault" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-800 font-serif">خزانة الملف (The Vault)</h2>
                  <button 
                    onClick={() => setShowVaultModal(true)}
                    className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-900 transition-all"
                  >
                    <Plus className="w-4 h-4" /> إضافة مادة
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {vaultItems.map((item) => (
                    <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm hover:shadow-md transition-all text-center space-y-4 group">
                      <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto text-stone-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
                        {item.type === 'pdf' && <FileIcon className="w-8 h-8" />}
                        {item.type === 'image' && <ImageIcon className="w-8 h-8" />}
                        {item.type === 'table' && <TableIcon className="w-8 h-8" />}
                        {item.type === 'report' && <ClipboardList className="w-8 h-8" />}
                        {item.type === 'text' && <FileText className="w-8 h-8" />}
                      </div>
                      <h4 className="font-bold text-stone-800 text-sm truncate">{item.title}</h4>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.type}</p>
                    </div>
                  ))}
                  {vaultItems.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                      <p className="text-stone-400">الخزانة فارغة. أضف مراجعك وموادك هنا.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'projects' && (
              <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-800 font-serif">المشاريع المتفرعة</h2>
                  <button 
                    onClick={() => setShowProjectModal(true)}
                    className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-900 transition-all"
                  >
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
                      <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{project.type}</span>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={async () => {
                              if (window.confirm('حذف المشروع؟')) {
                                try {
                                  await deleteDoc(doc(db, 'projects', project.id));
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.DELETE, `projects/${project.id}`);
                                }
                              }
                            }}
                            className="text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="text-emerald-600 font-bold text-xs hover:underline">التفاصيل</button>
                        </div>
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
                  <button 
                    onClick={() => setShowGoalModal(true)}
                    className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-900 transition-all"
                  >
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
                      <button 
                        onClick={async () => {
                          if (window.confirm('حذف الهدف؟')) {
                            try {
                              await deleteDoc(doc(db, 'goals', goal.id));
                            } catch (err) {
                              handleFirestoreError(err, OperationType.DELETE, `goals/${goal.id}`);
                            }
                          }
                        }}
                        className="p-2 text-stone-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'thoughts' && (
              <motion.div key="thoughts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-stone-800 font-serif">خواطر في الطريق</h2>
                </div>
                <div className="space-y-6">
                  {thoughts.map((thought) => (
                    <div key={thought.id} className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500/20" />
                      <p className="text-stone-700 leading-relaxed italic">"{thought.content}"</p>
                      <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        <span>{new Date(thought.timestamp?.toDate()).toLocaleDateString('ar-TN')}</span>
                        <span className="text-emerald-600">خاطرة وجدانية</span>
                      </div>
                    </div>
                  ))}
                  {thoughts.length === 0 && (
                    <div className="py-20 text-center bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                      <p className="text-stone-400">لا توجد خواطر بعد. دون مشاعرك وتجربتك مع هذا الملف.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Project Modal */}
      <AnimatePresence>
        {showProjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10">
              <h2 className="text-2xl font-black text-stone-800 font-serif mb-6">تأسيس مشروع فرعي</h2>
              <form onSubmit={handleAddProject} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">عنوان المشروع</label>
                  <input required type="text" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">المدة المقدرة</label>
                  <input type="text" value={newProject.duration} onChange={(e) => setNewProject({ ...newProject, duration: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" placeholder="مثال: 3 أشهر" />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">تأسيس المشروع</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGoalModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10">
              <h2 className="text-2xl font-black text-stone-800 font-serif mb-6">إضافة هدف جديد</h2>
              <form onSubmit={handleAddGoal} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">نص الهدف</label>
                  <input required type="text" value={newGoal.text} onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">نوع الهدف</label>
                  <select value={newGoal.type} onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value as any })} className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-emerald-500">
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="one-time">مرة واحدة</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">إضافة الهدف</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vault Modal */}
      <AnimatePresence>
        {showVaultModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVaultModal(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl p-10">
              <h2 className="text-2xl font-black text-stone-800 font-serif mb-6">إضافة مادة للخزانة</h2>
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
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all">حفظ في الخزانة</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proof Modal */}
      <AnimatePresence>
        {showProofModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProofModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-emerald-50/50">
                <h2 className="text-xl font-black text-emerald-900 font-serif">تقديم برهان الاقتران</h2>
                <button onClick={() => setShowProofModal(false)} className="p-2 hover:bg-emerald-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-emerald-400" />
                </button>
              </div>

              <form onSubmit={handleActivateSynergy} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">البرهان المنطقي (قاعة الخواطر)</label>
                  <textarea 
                    required
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    placeholder="اشرح كيف يتلاحم هذان الملفان عملياً في مشروعك الحالي..."
                    rows={4}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none text-sm"
                  />
                  <p className="text-[10px] text-stone-400 italic">سيقوم Ramadan Man بمراجعة هذا البرهان للموافقة النهائية.</p>
                </div>

                <button 
                  type="submit"
                  disabled={isActivating}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
                >
                  {isActivating ? 'جاري تفعيل البوابة...' : 'تفعيل الاقتران العظيم'}
                </button>
              </form>
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
