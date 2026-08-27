export interface Article {
  id: string;
  title: string;
  link: string;
  source: string;
  snippet?: string;
  category: string;
  isPriority: boolean;
  score: number;
}

export interface ReadingSession {
  id: string;
  url: string;
  title: string;
  wordCount: number;
  isPriority: boolean;
  readingTimeSec: number;
  dateRead: string;
}

export interface Question {
  type: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  options: string[];
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  reference: string;
}

export interface QuestionAttempt {
  id: string;
  sessionId: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  questionType: string;
  difficulty: string;
  explanation: string;
  reference: string;
}

export interface StudyBook {
  id: string;
  title: string;
  pdfName?: string;
  pdfDataUri?: string;
  totalPages: number;
  currentPage: number;
  deadline: string; // YYYY-MM-DD
  dailyGoal: number;
  dateAdded: string; // YYYY-MM-DD
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  priority: 1 | 2 | 3; // 1: Low, 2: Medium, 3: High
  status: 'Pending' | 'Completed' | 'Skipped';
  createdAt: string;
  eventId?: string;
}

export interface UserSettings {
  focusKeywords: string;
  geminiApiKey: string;
  showPortableInfo: boolean;
  calendarSyncMode?: 'google' | 'local';
  userEmail?: string;
}

export interface QuestionTimerLap {
  id: string;
  setNumber: number;
  questionNum: number;
  durationSec: number;
  timestamp: string;
}

export interface WordPowerWord {
  word: string;
  definition: string;
  example: string;
}

export interface WordPowerPuzzle {
  date: string;
  letters: string[];
  allWords?: WordPowerWord[];      // optional – we'll use wordDetails
  wordDetails?: WordPowerWord[];   // new field
  validWords: string[];
  targetCount: number;
}

export interface WordPowerProgress {
  puzzleDate: string;           // date of the puzzle
  foundWords: string[];         // list of found words
  startTime: number;            // timestamp when started
  elapsedSeconds: number;       // current elapsed time
  score: number;
  completed: boolean;           // true if all found or revealed
}