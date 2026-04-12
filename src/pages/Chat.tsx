import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage, File as AppFile, Goal } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, limit, doc, getDoc, updateDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { generateRamadanManResponse } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Loader2, Info, Target, CheckCircle2, Crown, Eye, EyeOff } from 'lucide-react';
import { triggerAdministrativeReview } from '../services/adminService';
import FloatingInsights from '../components/FloatingInsights';

interface ChatProps {
  profile: UserProfile | null;
}

export default function Chat({ profile }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<AppFile[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      // Messages - Global Awareness (Throne Mode)
      const q = query(
        collection(db, `chats/${profile.uid}/messages`),
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `chats/${profile.uid}/messages`);
      });

      // Files
      const filesQ = query(collection(db, 'files'), where('uid', '==', profile.uid));
      const unsubscribeFiles = onSnapshot(filesQ, (snapshot) => {
        setFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppFile)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'files');
      });

      // Goals
      const goalsQ = query(collection(db, 'goals'), where('uid', '==', profile.uid));
      const unsubscribeGoals = onSnapshot(goalsQ, (snapshot) => {
        setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'goals');
      });

      return () => {
        unsubscribeMessages();
        unsubscribeFiles();
        unsubscribeGoals();
      };
    }
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !profile || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    try {
      // 1. Save user message to Firestore
      const path = `chats/${profile.uid}/messages`;
      try {
        await addDoc(collection(db, path), {
          uid: profile.uid,
          role: 'user',
          content: userMessage,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }

      // 2. Trigger Administrative Review (this handles tools and posts AI response)
      await triggerAdministrativeReview(profile, userMessage);
      
    } catch (error) {
      console.error("Error in chat:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden">
      {/* Chat Header */}
      <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 relative">
            <Bot className="w-7 h-7 text-white" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              المرشد Ramadan Man
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </h3>
            <p className="text-xs text-stone-400 font-medium">علبة الإدارة • المساءلة والارتقاء</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
            <Crown className="w-3.5 h-3.5" />
            عرش الإدارة مفعل
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-stone-100 text-stone-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <Target className="w-3 h-3" />
            تحقيق الأهداف
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
      >
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-sm mx-auto">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold text-stone-800 font-serif">مرحباً بك في علبة الإدارة</h4>
              <p className="text-stone-500 text-sm leading-relaxed">
                هذه هي علبة الإدارة، قناتك الإدارية مع Ramadan Man. 
                هنا نؤكد الأنجازات، نؤرشف الأيام، ونحقق في الأهداف. 
                كن مقتضباً، فالوقت من ذهب.
              </p>
            </div>
            <button 
              onClick={() => setInput('أريد تأكيد إنجاز أهدافي اليومية وأرشفة هذا اليوم.')}
              className="px-6 py-3 bg-stone-800 text-white rounded-2xl text-xs font-bold hover:bg-stone-900 transition-all"
            >
              بدء الجلسة الإدارية
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const relatedFile = msg.fileId ? files.find(f => f.id === msg.fileId) : null;
            return (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.role === 'user' ? 'bg-stone-200 text-stone-600' : 'bg-emerald-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className="space-y-1">
                    {msg.fileId && (
                      <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400 uppercase tracking-tighter px-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        سياق الملف: {relatedFile?.title || msg.fileId}
                      </div>
                    )}
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-stone-100 text-stone-800 rounded-tr-none' 
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-tl-none flex gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-stone-100 bg-stone-50/50">
        <form onSubmit={handleSend} className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 bg-white border border-stone-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none active:scale-95"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
        <p className="text-[10px] text-stone-400 mt-3 text-center font-medium">
          Ramadan Man قد يخطئ أحياناً، يرجى مراجعة المعلومات الهامة.
        </p>
      </div>
      {profile && <FloatingInsights uid={profile.uid} location="chat" />}
    </div>
  );
}

function MessageSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
