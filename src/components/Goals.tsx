import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Plus, X, MessageCircle, Info } from 'lucide-react';
import { Goal } from '../types';

interface GoalsProps {
  goals: Goal[];
  onToggleGoal: (id: string) => void;
  onAddGoal: (text: string, type: 'daily' | 'weekly' | 'general') => void;
  color: string;
}

export const Goals: React.FC<GoalsProps> = ({ goals, onToggleGoal, onAddGoal, color }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);

  const handleAddClick = () => {
    if (!newGoalText.trim()) return;
    
    // Simulate AI questioning
    const questions = [
      "لماذا أضفت هذا الهدف الآن؟",
      "ما الغاية المرجوة من هذا العمل؟",
      "هل هذا الهدف يخدم مسار الملف الحالي؟",
      "ألا ترى أن هذا الهدف قد يشتت تركيزك عن المشروع الرئيسي؟"
    ];
    
    setAiQuestion(questions[Math.floor(Math.random() * questions.length)]);
  };

  const confirmAdd = () => {
    onAddGoal(newGoalText, 'daily');
    setNewGoalText('');
    setIsAdding(false);
    setAiQuestion(null);
  };

  return (
    <div className="flex flex-col gap-6 h-full relative">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <div className="w-2 h-6 rounded-full" style={{ backgroundColor: color }} />
          غرفة الأهداف
        </h3>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">
          <span>{goals.filter(g => g.completed).length} / {goals.length} مكتمل</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {goals.map((goal) => (
          <motion.div
            key={goal.id}
            layout
            onClick={() => onToggleGoal(goal.id)}
            className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
              goal.completed 
                ? 'bg-gray-50 border-gray-100 opacity-60' 
                : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
            }`}
          >
            {goal.completed ? (
              <CheckCircle2 size={22} className="text-emerald-500" />
            ) : (
              <Circle size={22} className="text-gray-300" />
            )}
            <div className="flex flex-col flex-1">
              <span className={`text-sm font-bold ${goal.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {goal.text}
              </span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{goal.type} • {goal.points} نقطة</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAdding(true)}
        className="absolute bottom-4 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: color }}
      >
        <Plus size={24} />
      </button>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h4 className="text-xl font-bold text-gray-900">إضافة هدف جديد</h4>
                <button onClick={() => { setIsAdding(false); setAiQuestion(null); }} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
                  <X size={20} />
                </button>
              </div>

              {!aiQuestion ? (
                <div className="flex flex-col gap-4">
                  <textarea
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="ما هو هدفك القادم؟"
                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-offset-2 transition-all text-gray-700 font-medium resize-none h-32"
                    style={{ '--tw-ring-color': color } as any}
                  />
                  <button
                    onClick={handleAddClick}
                    disabled={!newGoalText.trim()}
                    className="w-full py-4 rounded-2xl font-bold text-white shadow-md transition-all disabled:opacity-50"
                    style={{ backgroundColor: color }}
                  >
                    متابعة
                  </button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-6"
                >
                  <div className="flex gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                      <MessageCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-amber-600 uppercase font-bold tracking-widest">سؤال من سيد رمضان</span>
                      <p className="text-sm font-bold text-amber-900 leading-relaxed">{aiQuestion}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={confirmAdd}
                      className="w-full py-4 rounded-2xl font-bold text-white shadow-md transition-all"
                      style={{ backgroundColor: color }}
                    >
                      أنا متأكد، أضف الهدف
                    </button>
                    <button
                      onClick={() => setAiQuestion(null)}
                      className="w-full py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                    >
                      سأعيد التفكير
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
