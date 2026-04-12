import React from 'react';
import { UserProfile } from '../types';
import { Home, MessageSquare, Folder, LogOut, Moon, User as UserIcon, Target, Archive } from 'lucide-react';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  onSignOut: () => void;
  currentPage: string;
  setCurrentPage: (page: any) => void;
}

export function Layout({ children, profile, onSignOut, currentPage, setCurrentPage }: LayoutProps) {
  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 font-sans overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-stone-200 flex flex-col shadow-sm z-20">
        <div className="p-6 flex items-center gap-3 border-b border-stone-100">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
            <Moon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold font-serif text-emerald-900">نبض رمضان</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem 
            icon={<Home className="w-5 h-5" />} 
            label="الرئيسية" 
            active={currentPage === 'home'} 
            onClick={() => setCurrentPage('home')} 
          />
          <NavItem 
            icon={<MessageSquare className="w-5 h-5" />} 
            label="الدردشة" 
            active={currentPage === 'chat'} 
            onClick={() => setCurrentPage('chat')} 
          />
          <NavItem 
            icon={<Archive className="w-5 h-5" />} 
            label="الأرشيف Pro Max" 
            active={currentPage === 'archive'} 
            onClick={() => setCurrentPage('archive')} 
          />
          <NavItem 
            icon={<Folder className="w-5 h-5" />} 
            label="الملف" 
            active={currentPage === 'files'} 
            onClick={() => setCurrentPage('files')} 
          />
          <NavItem 
            icon={<Target className="w-5 h-5" />} 
            label="غرفة الأهداف" 
            active={currentPage === 'goals'} 
            onClick={() => setCurrentPage('goals')} 
          />
        </nav>

        <div className="p-4 border-t border-stone-100">
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl mb-4">
            <img 
              src={profile?.photoURL || 'https://picsum.photos/seed/user/100/100'} 
              alt={profile?.displayName} 
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile?.displayName}</p>
              <p className="text-xs text-stone-500">مستوى {profile?.level}</p>
            </div>
          </div>
          <button 
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-stone-200 px-8 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-stone-700">
            {currentPage === 'home' && 'لوحة التحكم'}
            {currentPage === 'chat' && 'الدردشة'}
            {currentPage === 'archive' && 'الأرشيف Pro Max'}
            {currentPage === 'files' && 'الملف'}
            {currentPage === 'goals' && 'غرفة الأهداف'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
              <span className="text-xs opacity-70">نقاطي:</span>
              {profile?.points}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
        active 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
          : 'text-stone-500 hover:bg-stone-100 hover:text-emerald-700'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-stone-400 group-hover:text-emerald-600'} transition-colors`}>
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeNav"
          className="mr-auto w-1.5 h-1.5 bg-white rounded-full"
        />
      )}
    </button>
  );
}
