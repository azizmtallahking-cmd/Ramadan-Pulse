import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Send, Bot, User, ArrowRight, Settings, 
  Clock, Activity, Sparkles, ChevronLeft, Heart
} from 'lucide-react';
import { UserProfile, ChatMessage } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp, updateDoc, doc } from 'firebase/firestore';

interface PulseCornerProps {
  profile: UserProfile | null;
  onNavigate: (page: string) => void;
}

export default function PulseCorner({ profile, onNavigate }: PulseCornerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      // Fallback: ensure resident status is updated
      if (!profile.isResident) {
        updateDoc(doc(db, 'users', profile.uid), { isResident: true });
      }

      const q = query(
        collection(db, `chats/${profile.uid}/messages`),
        where('location', '==', 'pulse'),
        orderBy('timestamp', 'asc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      });

      // Initial AI message if empty
      if (messages.length === 0) {
        startPulseInteraction();
      }

      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const callAIProxy = async (payload: any) => {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'AI Proxy request failed');
    }
    return response.json();
  };

  const startPulseInteraction = async () => {
    if (!profile) return;
    setIsTyping(true);
    try {
      const prompt = `أنت الآن في "ركن النبض"، المكان المخصص للتفاعل اليومي السريع مع السيد.
المستخدم: ${profile.displayName}
الحالة: ${profile.isResident ? 'من أهل الديار' : 'زائر جديد'}
المهمة: ابدأ بالترحيب به واطرح عليه سؤالاً عميقاً حول روتينه اليومي أو أسباب اختياره لهذا المسار الوجودي. اجعل السؤال يثير التفكير ويساعده على تصميم "نبضه" اليومي.
اللغة: عربية فصحى بلمسة فلسفية وهندسية.`;

      const response = await callAIProxy({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      await addDoc(collection(db, `chats/${profile.uid}/messages`), {
        uid: profile.uid,
        role: 'model',
        content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
        location: 'pulse',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !profile) return;
    const text = input;
    setInput('');

    try {
      await addDoc(collection(db, `chats/${profile.uid}/messages`), {
        uid: profile.uid,
        role: 'user',
        content: text,
        location: 'pulse',
        timestamp: serverTimestamp()
      });

      setIsTyping(true);
      const response = await callAIProxy({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `المستخدم في ركن النبض. رد عليه بأسلوب "عون البناء" المحفز والعميق.
رسالة المستخدم: ${text}` }] }]
      });

      await addDoc(collection(db, `chats/${profile.uid}/messages`), {
        uid: profile.uid,
        role: 'model',
        content: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
        location: 'pulse',
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-50 z-[100] flex flex-col font-sans">
      {/* Mobile Header */}
      <div className="bg-white border-b border-stone-100 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-600 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-emerald-100">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center border-2 border-white"
            >
              <Heart className="w-2 h-2 text-white fill-white" />
            </motion.div>
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-900 font-serif">ركن النبض</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">مزامنة الوجود...</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 hover:bg-stone-100 rounded-2xl transition-all text-stone-400 flex items-center gap-2 border border-stone-50"
        >
          <span className="text-[10px] font-black uppercase tracking-widest">غرفة البناء</span>
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 bg-stone-50/30"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <motion.div 
              key={msg.id || i}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`relative max-w-[88%] p-6 rounded-[2.5rem] text-sm leading-relaxed shadow-sm border ${
                msg.role === 'user' 
                  ? 'bg-white text-stone-800 border-stone-100 rounded-tl-none' 
                  : 'bg-stone-900 text-white border-stone-800 rounded-tr-none'
              }`}>
                {msg.role === 'model' && (
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="font-medium">
                  {msg.content}
                </div>
                <div className={`text-[9px] mt-3 font-bold uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-stone-400' : 'text-stone-300'}`}>
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                </div>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-end"
            >
              <div className="flex gap-2 p-4 rounded-[1.5rem] bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-tr-none">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-stone-100 pb-8">
        <div className="max-w-xl mx-auto flex gap-3">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب نبضك هنا..."
            className="flex-1 bg-stone-50 border border-stone-200 rounded-[2rem] px-6 py-4 text-sm focus:outline-none focus:border-emerald-500 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-14 h-14 bg-emerald-600 text-white rounded-[1.5rem] flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 active:scale-95"
          >
            <Send className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-stone-900 text-white px-6 py-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-emerald-500" />
          <span>النبض: {profile?.pulse || 0}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>النقاط: {profile?.points || 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-blue-500" />
          <span>{new Date().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
