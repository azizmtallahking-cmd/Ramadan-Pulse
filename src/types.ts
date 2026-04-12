export interface AppState {
  userLevel: number;
  totalPoints: number;
  files: FileObject[];
  archivedDays: any[];
  currentFileId: string | null;
}

export interface FileObject {
  id: string;
  name: string;
  description: string;
  stars: number;
  points: number;
  pulseStatus: number;
  vault: any[];
  projects: any[];
  goals: any[];
  thoughts: any[];
  aideName: string;
  color: string;
}

export type VaultItemType = 'pdf' | 'image' | 'table' | 'text' | 'report';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  points: number;
  level: number;
  pulse: number; // النبض العام (0-100)
  lastActive: any;
  createdAt: any;
  lastSeasonalReviewAt?: any;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface FloatingInsight {
  id?: string;
  uid: string;
  content: string;
  type: 'success' | 'warning' | 'info';
  location: 'home' | 'files' | 'goals' | 'archive' | 'chat' | 'all';
  timestamp: any;
  isRead: boolean;
}

export interface File {
  id?: string;
  uid: string;
  title: string;
  description?: string; // تعريف بالملف
  importance?: string; // أهمية الملف
  role?: string; // دور الملف
  generalGoals?: string[]; // الأهداف العامة
  stars: number; // نجوم الملف (نجمة لكل 200 نقطة)
  pulse: number; // حالة النبض (0-100)
  points: number; // نقاط الملف التراكمية
  status: 'active' | 'completed' | 'archived';
  createdAt: any;
  assistantName?: string; // اسم عون السيد رمضان الموكل بالملف
  chatHistory?: ChatMessage[]; // History of chat with assistant
  progress?: number; // Cumulative progress
  lastActive?: any;
  dimension?: number; // بعد الارتقاء (Dim 0, 1, 2...)
}

export interface Project {
  id?: string;
  fileId: string;
  uid: string;
  title: string;
  content: string; // مضمون المشروع
  fruits: string; // ثمرات المشروع
  duration: string; // طول المشروع (مقدر أو ممتد)
  type: 'daily' | 'weekly' | 'monthly' | 'flexible';
  trackingType: 'percentage' | 'points';
  progress: number;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed';
}

export interface VaultItem {
  id?: string;
  fileId: string;
  uid: string;
  type: 'pdf' | 'image' | 'table' | 'text' | 'report';
  title: string;
  content: string; // Content or URL
  createdAt: any;
}

export interface Thought {
  id?: string;
  fileId: string;
  uid: string;
  content: string;
  timestamp: any;
}

export interface ArchivedDay {
  id?: string;
  uid: string;
  date: string;
  status: 'corrupted' | 'repaired';
  repairAction?: string; // Action taken to repair (e.g., Istighfar)
}

export interface Goal {
  id?: string;
  uid: string;
  fileId?: string; // Optional: can belong to a file
  projectId?: string; // Optional: can belong to a project
  text: string;
  description?: string; // Added for compatibility
  status: 'pending' | 'completed';
  type: 'daily' | 'weekly' | 'general';
  targetDate?: string;
  time?: string; // Added for compatibility
  completedAt?: any;
  points?: number;
  createdAt: any;
}

export interface ChatMessage {
  id?: string;
  uid: string;
  role: 'user' | 'model';
  content: string;
  timestamp: any;
  fileId?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: string;
}

export interface ArchiveEntry {
  id?: string;
  uid: string;
  date?: string;
  type: 'day' | 'week' | 'month' | 'year' | 'transition' | 'milestone';
  dayTitle?: string; // AI generated title for the day
  activities?: {
    id: string;
    time: string;
    type: string;
    content: string;
    points?: number;
  }[];
  stats?: {
    goalsCompleted: number;
    thoughtsAdded: number;
    filesCreated: number;
    pointsEarned: number;
  };
  goals?: any[];
  files?: any[];
  achievements?: any[];
  thoughts?: string[];
  aiSummary?: string;
  dailyReport?: string;
  points?: number;
  timestamp: any;
  metadata?: {
    fileId?: string;
    fileName?: string;
    oldDimension?: number;
    newDimension?: number;
    totalPoints?: number;
    event?: string;
  };
}

export interface Synergy {
  id?: string;
  uid: string;
  fileAId: string;
  fileBId: string;
  reason: string;
  percentage: number; // 0-100
  sharedGoals: string[];
  lastUpdated: any;
  status: 'potential' | 'collaborative' | 'active' | 'decoupled';
  activatedAt?: any;
  proofText?: string;
  philosophy?: string;
  maturityDays: number; // 0-7
  lastActivityA: any;
  lastActivityB: any;
}

export interface QuasiFile extends Partial<File> {
  isQuasi: true;
  sourceFiles: string[]; // IDs of the real files it connects
}
