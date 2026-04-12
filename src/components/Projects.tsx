import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Layers, ChevronRight, Activity, Clock } from 'lucide-react';
import { Project } from '../types';

interface ProjectsProps {
  projects: Project[];
  color: string;
}

export const Projects: React.FC<ProjectsProps> = ({ projects, color }) => {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
          ساحة المشاريع
        </h3>
        <button className="text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-gray-600 transition-colors">
          إضافة مشروع +
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <Layers size={32} className="text-gray-300" />
            <p className="text-sm text-gray-400 font-medium">لا توجد مشاريع نشطة حالياً</p>
          </div>
        ) : (
          projects.map((project) => (
            <motion.div
              key={project.id}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all flex flex-col gap-4 group"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <h4 className="text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{project.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-1">{project.description}</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{project.type}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  <span>نسبة الإنجاز</span>
                  <span style={{ color }}>{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                    <Calendar size={12} />
                    <span>{new Date(project.startDate).toLocaleDateString('ar-EG')}</span>
                  </div>
                  {project.endDate && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                      <ChevronRight size={10} />
                      <span>{new Date(project.endDate).toLocaleDateString('ar-EG')}</span>
                    </div>
                  )}
                </div>
                <button className="p-2 rounded-full hover:bg-gray-50 text-gray-400 group-hover:text-gray-900 transition-colors">
                  <Activity size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-auto p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
          <Layers size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-emerald-600 uppercase font-bold tracking-widest">نصيحة من سيد رمضان</span>
          <p className="text-xs font-bold text-emerald-900 leading-relaxed">"المشاريع هي فروع عن أصل، وكل مشروع يحتاج لثبات ومجالس استغراق."</p>
        </div>
      </div>
    </div>
  );
};
