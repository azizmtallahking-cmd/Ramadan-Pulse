import React from 'react';
import { motion } from 'motion/react';
import { Star, Activity, User, AlertCircle, RefreshCw, MessageCircle, Send, Plus, ChevronRight } from 'lucide-react';
import { AppState, FileObject, ArchivedDay } from '../types';
import { FileCard } from './FileCard';
import { PulseCircle } from './PulseCircle';

interface PulseDashboardProps {
  state: AppState;
  onFileClick: (id: string) => void;
  onRepairDay: (date: string) => void;
}

export const PulseDashboard: React.FC<PulseDashboardProps> = ({ state, onFileClick, onRepairDay }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-10 py-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">نبض رمضان</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">نظام تشغيل الحياة الروحية</p>
          </div>
          
          <div className="flex items-center gap-6 pl-10 border-l border-gray-100">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">المستوى</span>
              <span className="text-3xl font-black text-emerald-600">{state.userLevel}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">النقاط الكلية</span>
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                <span className="text-xl font-black text-gray-900">{state.totalPoints}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">النبض العام</span>
            <span className="text-sm font-black text-emerald-600">مستقر</span>
          </div>
          <PulseCircle status={85} size={60} color="#10b981" />
          <div className="flex items-center gap-3 pl-10 border-l border-gray-100">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <User size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">المدير المسؤول</span>
              <span className="text-base font-black text-gray-900">سيد رمضان</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Archived Days (Corrupt Files) */}
        <aside className="w-80 bg-white border-r border-gray-100 flex flex-col p-8 gap-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              الأرشيف التالف
            </h3>
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-bold uppercase tracking-widest">
              {state.archivedDays.filter(d => d.isCorrupt).length} ملفات
            </span>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {state.archivedDays.map((day) => (
              <div 
                key={day.date}
                className={`p-5 rounded-3xl border flex flex-col gap-3 transition-all ${
                  day.isCorrupt 
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-emerald-50 border-emerald-100 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{day.date}</span>
                  {day.isCorrupt ? (
                    <span className="text-[10px] text-red-600 font-bold uppercase tracking-widest">ملف تالف</span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">تم الإصلاح</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  {day.isCorrupt 
                    ? "هذا اليوم فات دون طاعة كافية، يحتاج لعملية إصلاح (استغفار) ليعود للعمل."
                    : "تم إصلاح هذا اليوم بنجاح، النبض عاد للتدفق."}
                </p>
                {day.isCorrupt && (
                  <button 
                    onClick={() => onRepairDay(day.date)}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-red-200 text-red-600 text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all"
                  >
                    <RefreshCw size={14} />
                    إصلاح (استغفار)
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Center - Files Grid */}
        <section className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">خزانة الملفات</h2>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">إدارة الوجود الإيماني</p>
            </div>
            <button className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:scale-105 transition-all">
              <Plus size={18} />
              إنشاء ملف جديد
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {state.files.map((file) => (
              <FileCard 
                key={file.id} 
                file={file} 
                onClick={() => onFileClick(file.id)} 
              />
            ))}
          </div>
        </section>

        {/* Right Sidebar - Ramadan Man Chat */}
        <aside className="w-96 bg-white border-l border-gray-100 flex flex-col">
          <div className="p-8 border-b border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-inner">
              <MessageCircle size={28} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">المدير المسؤول</span>
              <span className="text-xl font-black text-gray-900">سيد رمضان</span>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6 custom-scrollbar">
            <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 text-sm text-gray-600 leading-relaxed font-medium shadow-sm">
              أهلاً بك يا صاحبي في نظام تشغيل حياتك الروحية. أنا أراقب النبض في كل ملفاتك.
            </div>
            <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-100 text-sm text-emerald-800 leading-relaxed font-black shadow-sm">
              تقرير سيد رمضان: "ملف القرآن يحقق نجاحاً باهراً بـ 2 نجوم، لكن ملف الدعوة يحتاج لمزيد من التدفق."
            </div>
            
            <div className="mt-auto flex flex-col gap-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-500" />
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-widest">تنبيه: هناك ملف تالف في الأرشيف!</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <div className="flex gap-3">
              <input 
                type="text" 
                placeholder="تحدث مع سيد رمضان..."
                className="flex-1 p-4 rounded-2xl bg-white border-none text-sm font-bold focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
              <button className="p-4 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                <Send size={20} />
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};
