import React from 'react';
import { motion } from 'motion/react';
import { Star, FileText, Activity, User } from 'lucide-react';
import { FileObject } from '../types';
import { PulseCircle } from './PulseCircle';

interface FileCardProps {
  file: FileObject;
  onClick: () => void;
}

export const FileCard: React.FC<FileCardProps> = ({ file, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 cursor-pointer flex flex-col gap-4 relative overflow-hidden group"
    >
      {/* Background Accent */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 transition-transform group-hover:scale-150"
        style={{ backgroundColor: file.color }}
      />

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: file.color }} />
            <h3 className="text-xl font-bold text-gray-900">{file.name}</h3>
          </div>
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{file.description}</p>
        </div>
        <PulseCircle status={file.pulseStatus} size={60} color={file.color} label="النبض" />
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
          <Star size={14} className="text-amber-500 fill-amber-500" />
          <span className="text-sm font-bold text-amber-700">{file.stars} <span className="text-[10px] font-normal">نجوم</span></span>
        </div>
        <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <Activity size={14} className="text-emerald-500" />
          <span className="text-sm font-bold text-emerald-700">{file.points} <span className="text-[10px] font-normal">نقاط</span></span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-50">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
          <User size={16} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">العون المسؤول</span>
          <span className="text-sm font-medium text-gray-700">{file.aideName}</span>
        </div>
      </div>
    </motion.div>
  );
};
