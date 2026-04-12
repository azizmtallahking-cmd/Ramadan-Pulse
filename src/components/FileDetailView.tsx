import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MessageCircle, Send, Info, Star, Activity, User, BookOpen, Layers, CheckCircle2, MessageSquare } from 'lucide-react';
import { FileObject, VaultItem, Goal, Thought } from '../types';
import { Vault } from './Vault';
import { Goals } from './Goals';
import { Projects } from './Projects';
import { PulseCircle } from './PulseCircle';

interface FileDetailViewProps {
  file: FileObject;
  onBack: () => void;
  onAddGoal: (text: string, type: 'daily' | 'weekly' | 'general') => void;
  onToggleGoal: (id: string) => void;
  onAddVaultItem: (item: Omit<VaultItem, 'id' | 'addedAt'>) => void;
  onAddThought: (text: string, mood?: string) => void;
}

export const FileDetailView: React.FC<FileDetailViewProps> = ({ 
  file, 
  onBack, 
  onAddGoal, 
  onToggleGoal, 
  onAddVaultItem, 
  onAddThought 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'projects' | 'goals' | 'thoughts'>('overview');
  const [thoughtText, setThoughtText] = useState('');

  const handleAddThought = () => {
    if (!thoughtText.trim()) return;
    onAddThought(thoughtText);
    setThoughtText('');
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{file.name}</h2>
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-bold text-amber-700">{file.stars}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 font-medium">{file.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">النبض الحالي</span>
              <span className="text-sm font-bold" style={{ color: file.color }}>{file.pulseStatus}%</span>
            </div>
            <PulseCircle status={file.pulseStatus} size={50} color={file.color} />
          </div>
          <div className="flex items-center gap-3 pl-8 border-l border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <User size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">العون المسؤول</span>
              <span className="text-sm font-bold text-gray-700">{file.aideName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-20 bg-gray-50 border-r border-gray-100 flex flex-col items-center py-8 gap-8">
          <NavButton active={activeTab === 'overview'} icon={<Info size={20} />} label="نظرة" onClick={() => setActiveTab('overview')} color={file.color} />
          <NavButton active={activeTab === 'vault'} icon={<BookOpen size={20} />} label="خزانة" onClick={() => setActiveTab('vault')} color={file.color} />
          <NavButton active={activeTab === 'projects'} icon={<Layers size={20} />} label="مشاريع" onClick={() => setActiveTab('projects')} color={file.color} />
          <NavButton active={activeTab === 'goals'} icon={<CheckCircle2 size={20} />} label="أهداف" onClick={() => setActiveTab('goals')} color={file.color} />
          <NavButton active={activeTab === 'thoughts'} icon={<MessageSquare size={20} />} label="خواطر" onClick={() => setActiveTab('thoughts')} color={file.color} />
        </nav>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col gap-10 max-w-4xl"
                >
                  <div className="flex flex-col gap-4">
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">تعريف بالملف</h3>
                    <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 leading-relaxed text-gray-600 font-medium">
                      {file.description}
                      <br /><br />
                      هذا الملف هو كائن معرفي ينمو بنموك، كلما أضفت موارد في الخزانة أو حققت أهدافاً في الساحة، كلما زاد نبض الاستقامة لديك.
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Activity size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">إحصائيات الملف</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">النقاط المجمعة</span>
                        <span className="text-2xl font-black text-gray-900">{file.points}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">النجوم الذهبية</span>
                        <span className="text-2xl font-black text-amber-500">{file.stars}</span>
                      </div>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Layers size={20} />
                        <span className="text-sm font-bold uppercase tracking-widest">حالة المشاريع</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">المشاريع النشطة</span>
                        <span className="text-2xl font-black text-gray-900">{file.projects.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">الأهداف المتبقية</span>
                        <span className="text-2xl font-black text-gray-900">{file.goals.filter(g => !g.completed).length}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'vault' && (
                <motion.div
                  key="vault"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <Vault items={file.vault} onAddItem={onAddVaultItem} color={file.color} />
                </motion.div>
              )}

              {activeTab === 'projects' && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <Projects projects={file.projects} color={file.color} />
                </motion.div>
              )}

              {activeTab === 'goals' && (
                <motion.div
                  key="goals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full"
                >
                  <Goals goals={file.goals} onToggleGoal={onToggleGoal} onAddGoal={onAddGoal} color={file.color} />
                </motion.div>
              )}

              {activeTab === 'thoughts' && (
                <motion.div
                  key="thoughts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-8 h-full"
                >
                  <div className="flex flex-col gap-4">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">خواطر في الطريق</h3>
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        value={thoughtText}
                        onChange={(e) => setThoughtText(e.target.value)}
                        placeholder="اكتب خاطرة أو شعوراً يراودك الآن..."
                        className="flex-1 p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-offset-2 transition-all text-gray-700 font-medium"
                        style={{ '--tw-ring-color': file.color } as any}
                      />
                      <button 
                        onClick={handleAddThought}
                        className="p-4 rounded-2xl text-white shadow-md transition-all hover:scale-105 active:scale-95"
                        style={{ backgroundColor: file.color }}
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {file.thoughts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center gap-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <MessageSquare size={32} className="text-gray-300" />
                        <p className="text-sm text-gray-400 font-medium">لا توجد خواطر مسجلة بعد</p>
                      </div>
                    ) : (
                      file.thoughts.map((thought) => (
                        <div key={thought.id} className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2">
                          <p className="text-gray-700 font-medium leading-relaxed">{thought.text}</p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {new Date(thought.timestamp).toLocaleString('ar-EG')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - AI Aide Chat */}
          <aside className="w-80 bg-gray-50 border-l border-gray-100 flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <MessageCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest">عون الملف</span>
                  <span className="text-sm font-bold text-gray-900">{file.aideName}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
              <div className="p-4 bg-white rounded-2xl border border-gray-100 text-sm text-gray-600 leading-relaxed shadow-sm">
                مرحباً بك يا صاحبي. أنا هنا لأوجهك في مسار {file.name}. كيف يمكنني مساعدتك اليوم؟
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm text-emerald-800 leading-relaxed font-medium">
                نصيحة اليوم: "الاستقامة هي روح العمل، والنبض يعكس صدق التوجه."
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="اسأل العون..."
                  className="flex-1 p-3 rounded-xl bg-gray-50 border-none text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                />
                <button className="p-3 rounded-xl bg-emerald-500 text-white shadow-sm">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, icon, label, onClick, color }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-white shadow-md' : 'bg-transparent'}`} style={active ? { color } : {}}>
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);
