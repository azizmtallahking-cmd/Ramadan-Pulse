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
import FileCard from '../components/FileCard';
import FileDetailPage from '../components/FileDetailPage';
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
                <h1 className="text-3xl font-black text-stone-900 font-serif">خزائن الهياكل</h1>
                <p className="text-stone-500 mt-1">هندسة المشاريع الكبرى وتوزيع فلسفة الوجود في الكواليس.</p>
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
                <FileCard 
                  key={file.id} 
                  file={file} 
                  onClick={() => setSelectedFile(file)} 
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <FileDetailPage 
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
                      <label className="text-xs font-black text-stone-400 uppercase tracking-widest">تاريخ البداية</label>
                      <input 
                        type="date" 
                        value={newFile.startDate}
                        onChange={(e) => setNewFile({ ...newFile, startDate: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-400 uppercase tracking-widest">تاريخ النهاية (الموعد النهائي)</label>
                      <input 
                        type="date" 
                        value={newFile.endDate}
                        onChange={(e) => setNewFile({ ...newFile, endDate: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
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
