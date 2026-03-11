-- Cloudflare D1 Schema for Mathearo App
-- Run: wrangler d1 execute mathearo-db --file=schema.sql

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  isActive INTEGER NOT NULL DEFAULT 1,
  plan TEXT NOT NULL DEFAULT 'test',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacherId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (teacherId) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS class_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacherId TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (teacherId) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  studentId TEXT,
  studentName TEXT,
  teacherId TEXT NOT NULL,
  gameName TEXT NOT NULL,
  score INTEGER NOT NULL,
  totalQuestions INTEGER NOT NULL,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (teacherId) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS game_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  successSoundUrl TEXT NOT NULL DEFAULT '',
  errorSoundUrl TEXT NOT NULL DEFAULT '',
  backgroundMusicUrl TEXT NOT NULL DEFAULT '',
  backgroundMusicVolume INTEGER NOT NULL DEFAULT 50,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  whatsappNumber TEXT NOT NULL DEFAULT '96871776166',
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_settings (
  id TEXT PRIMARY KEY,
  teacherId TEXT NOT NULL UNIQUE,
  successSoundUrl TEXT DEFAULT '',
  errorSoundUrl TEXT DEFAULT '',
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (teacherId) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS game_meta (
  id TEXT PRIMARY KEY,
  gameId TEXT NOT NULL UNIQUE,
  imageUrl TEXT NOT NULL DEFAULT '',
  updatedAt TEXT NOT NULL
);

-- Seed the global game_settings row if it doesn't exist
INSERT OR IGNORE INTO game_settings (id, updatedAt) VALUES ('global', datetime('now'));
