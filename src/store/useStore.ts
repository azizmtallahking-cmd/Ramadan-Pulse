import { useState, useEffect } from 'react';
import { AppState, FileObject, ArchivedDay, Goal, Project, VaultItem, Thought } from '../types';

const INITIAL_STATE: AppState = {
  userLevel: 1,
  totalPoints: 0,
  files: [
    {
      id: 'quran',
      name: 'حفظ القرآن',
      description: 'مشروع عظيم يتفرع لأقسام كبيرة، من البقرة إلى جزء عم، مع التفسير والتدبر.',
      stars: 2,
      points: 450,
      pulseStatus: 85,
      vault: [
        { id: 'v1', name: 'تفسير السعدي', type: 'pdf', content: 'https://example.com/saadi.pdf', addedAt: new Date().toISOString() },
        { id: 'v2', name: 'جدول الحفظ الأسبوعي', type: 'table', content: 'سورة البقرة - 5 صفحات يومياً', addedAt: new Date().toISOString() }
      ],
      projects: [
        { id: 'p1', title: 'حفظ سورة البقرة', description: 'البداية من الآية 1 إلى 100', progress: 45, startDate: '2026-03-01', endDate: '2026-04-01', type: 'extended', subGoals: [] }
      ],
      goals: [
        { id: 'g1', text: 'ورد الفجر', completed: true, type: 'daily', points: 20 },
        { id: 'g2', text: 'مراجعة الجزء الأول', completed: false, type: 'daily', points: 30 }
      ],
      thoughts: [
        { id: 't1', text: 'شعرت اليوم بخشوع عظيم عند آية الكرسي', timestamp: new Date().toISOString(), mood: 'خاشع' }
      ],
      aideName: 'الحافظ',
      color: '#10b981' // emerald
    },
    {
      id: 'dawah',
      name: 'ملف الدعوة',
      description: 'ملف الدعوة طول حياة المسلم، يشمل التوعية والمنصات والتعريف بالإسلام.',
      stars: 1,
      points: 210,
      pulseStatus: 60,
      vault: [],
      projects: [
        { id: 'p2', title: 'التوعية بالقدس', description: 'بناء منصة توعوية وجمع مصادر تاريخية', progress: 15, startDate: '2026-03-15', endDate: null, type: 'extended', subGoals: [] }
      ],
      goals: [
        { id: 'g3', text: 'نشر مقطع دعوي', completed: false, type: 'daily', points: 15 }
      ],
      thoughts: [],
      aideName: 'الداعي',
      color: '#3b82f6' // blue
    }
  ],
  archivedDays: [
    { date: '2026-03-30', isCorrupt: true, points: 50, repaired: false },
    { date: '2026-03-29', isCorrupt: false, points: 600, repaired: false }
  ],
  currentFileId: null
};

export function useStore() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('nabdh_ramadan_state');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  useEffect(() => {
    localStorage.setItem('nabdh_ramadan_state', JSON.stringify(state));
  }, [state]);

  const addPoints = (points: number, fileId?: string) => {
    setState(prev => {
      let newTotalPoints = prev.totalPoints + points;
      let newLevel = Math.floor(newTotalPoints / 500) + 1;
      
      const newFiles = prev.files.map(f => {
        if (f.id === fileId) {
          const newFilePoints = f.points + points;
          const newStars = Math.floor(newFilePoints / 200);
          return { ...f, points: newFilePoints, stars: newStars, pulseStatus: Math.min(100, f.pulseStatus + 5) };
        }
        return f;
      });

      return { ...prev, totalPoints: newTotalPoints, userLevel: newLevel, files: newFiles };
    });
  };

  const addGoal = (fileId: string, goal: Omit<Goal, 'id' | 'completed' | 'points'>) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            goals: [...f.goals, { ...goal, id: Math.random().toString(36).substr(2, 9), completed: false, points: 15 }]
          };
        }
        return f;
      })
    }));
  };

  const toggleGoal = (fileId: string, goalId: string) => {
    setState(prev => {
      let pointsToAdd = 0;
      const newFiles = prev.files.map(f => {
        if (f.id === fileId) {
          const newGoals = f.goals.map(g => {
            if (g.id === goalId) {
              pointsToAdd = g.completed ? -g.points : g.points;
              return { ...g, completed: !g.completed };
            }
            return g;
          });
          return { ...f, goals: newGoals };
        }
        return f;
      });
      
      // We'll call addPoints separately or handle it here
      const newState = { ...prev, files: newFiles };
      if (pointsToAdd !== 0) {
        const newTotalPoints = prev.totalPoints + pointsToAdd;
        const newLevel = Math.floor(newTotalPoints / 500) + 1;
        newState.totalPoints = newTotalPoints;
        newState.userLevel = newLevel;
        // Update file points too
        newState.files = newState.files.map(f => f.id === fileId ? { ...f, points: f.points + pointsToAdd, stars: Math.floor((f.points + pointsToAdd) / 200) } : f);
      }
      return newState;
    });
  };

  const addVaultItem = (fileId: string, item: Omit<VaultItem, 'id' | 'addedAt'>) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            vault: [...f.vault, { ...item, id: Math.random().toString(36).substr(2, 9), addedAt: new Date().toISOString() }]
          };
        }
        return f;
      })
    }));
  };

  const addThought = (fileId: string, text: string, mood?: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            thoughts: [...f.thoughts, { id: Math.random().toString(36).substr(2, 9), text, timestamp: new Date().toISOString(), mood }]
          };
        }
        return f;
      })
    }));
  };

  const repairDay = (date: string) => {
    setState(prev => ({
      ...prev,
      archivedDays: prev.archivedDays.map(d => d.date === date ? { ...d, repaired: true, isCorrupt: false } : d),
      totalPoints: prev.totalPoints + 50 // Reward for Istighfar
    }));
  };

  const setCurrentFile = (id: string | null) => {
    setState(prev => ({ ...prev, currentFileId: id }));
  };

  return {
    state,
    addPoints,
    addGoal,
    toggleGoal,
    addVaultItem,
    addThought,
    repairDay,
    setCurrentFile
  };
}
