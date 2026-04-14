import React from 'react';
import { motion } from 'motion/react';
import { Folder, Sparkles, Star, Box, Activity, ChevronLeft, Zap } from 'lucide-react';
import { File, QuasiFile } from '../types';

interface FileCardProps {
  file: File | QuasiFile;
  onClick: () => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick }) => {
  const isQuasi = (file as QuasiFile).isQuasi;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`bg-white p-6 rounded-[2.5rem] shadow-sm border border-stone-100 cursor-pointer group hover:shadow-xl hover:shadow-stone-200/50 transition-all relative overflow-hidden ${isQuasi ? 'border-dashed border-emerald-400 bg-emerald-50/20 shadow-lg shadow-emerald-100/50' : ''}`}
    >
      <div className={`absolute top-0 right-0 w-2 h-full ${isQuasi ? 'bg-emerald-500/40' : 'bg-emerald-600/10 group-hover:bg-emerald-600/20'} transition-colors`} />
      
      <div className="flex items-start justify-between mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-50 transition-colors shadow-inner ${isQuasi ? 'bg-emerald-200/50' : 'bg-stone-50'}`}>
          {isQuasi ? <Sparkles className="w-8 h-8 animate-pulse" /> : <Folder className="w-8 h-8" />}
        </div>
        <div className="flex items-center gap-2">
          {!isQuasi && (
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
          {isQuasi && <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />}
        </div>
      </div>

      <h3 className="text-xl font-bold text-stone-800 mb-2 truncate">{file.title}</h3>
      <p className="text-sm text-stone-500 mb-6 line-clamp-2">{file.description}</p>

      <div className="mt-auto pt-6 border-t border-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-stone-400">النبض: {file.pulse || 0}%</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
          <span>{file.points || 0} نقطة</span>
          <ChevronLeft className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};

export default FileCard;
