// Plain TypeScript types replacing Mongoose models

export interface ITeacher {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'teacher';
  isActive: boolean;
  plan: 'test' | 'pro';
  createdAt: string;
  updatedAt: string;
}

export interface IStudent {
  id: string;
  name: string;
  grade: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IClassGroup {
  id: string;
  name: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface IGameSession {
  id: string;
  studentId?: string;
  studentName?: string;
  teacherId: string;
  gameName: string;
  score: number;
  totalQuestions: number;
  date: string;
  createdAt: string;
}

export interface IGameSettings {
  id: string;
  successSoundUrl: string;
  errorSoundUrl: string;
  backgroundMusicUrl: string;
  backgroundMusicVolume: number;
  difficulty: 'easy' | 'medium' | 'hard';
  whatsappNumber: string;
  updatedAt: string;
}

export interface ITeacherSettings {
  id: string;
  teacherId: string;
  successSoundUrl?: string;
  errorSoundUrl?: string;
  updatedAt: string;
}

export interface IGameMeta {
  id: string;
  gameId: string;
  imageUrl: string;
  updatedAt: string;
}
