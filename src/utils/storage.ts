import {
  UserSettings,
  StudyBook,
  TaskItem,
  ReadingSession,
  QuestionAttempt,
  QuestionTimerLap,
  WordPowerProgress,
} from '../types';
import { storePdfData, removePdfData } from './pdfStorage';

const KEYS = {
  SETTINGS: 'aether_focus_settings',
  BOOKS: 'aether_focus_books',
  TASKS: 'aether_focus_tasks',
  SESSIONS: 'aether_focus_sessions',
  ATTEMPTS: 'aether_focus_attempts',
  TIMER_LOGS: 'aether_focus_timer_logs',
};

// --- Settings ---
export const getSettings = (): UserSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (data) {
      const parsed = JSON.parse(data);
      if (!parsed.calendarSyncMode) {
        parsed.calendarSyncMode = 'google';
      }
      return parsed;
    }
  } catch (e) {
    console.error('Error reading settings', e);
  }
  return {
    focusKeywords: 'AI, Tech, Markets',
    geminiApiKey: '',
    showPortableInfo: true,
    calendarSyncMode: 'google',
  };
};

export const saveSettings = (settings: Partial<UserSettings>): UserSettings => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
};

// --- Study Books ---
export const getBooks = (): StudyBook[] => {
  try {
    const data = localStorage.getItem(KEYS.BOOKS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading books', e);
  }
  return [];
};

export const saveBooks = (books: StudyBook[]): void => {
  try {
    // Strip heavy pdfDataUri from localStorage array to avoid QuotaExceededError
    const sanitized = books.map((b) => {
      const { pdfDataUri, ...rest } = b;
      return rest;
    });
    localStorage.setItem(KEYS.BOOKS, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Error saving books to localStorage', e);
  }
};

export const addBook = (
  title: string,
  totalPages: number,
  deadline: string,
  pdfName?: string,
  pdfDataUri?: string
): StudyBook => {
  const books = getBooks();
  const today = new Date().toISOString().split('T')[0];
  const dailyGoal = calculateDailyGoal(totalPages, 1, deadline);
  const bookId = 'book_' + Date.now();

  if (pdfDataUri) {
    storePdfData(bookId, pdfDataUri);
  }

  const newBook: StudyBook = {
    id: bookId,
    title,
    totalPages,
    currentPage: 1,
    deadline,
    dailyGoal,
    dateAdded: today,
    completed: false,
    pdfName,
    pdfDataUri,
  };

  books.unshift(newBook);
  saveBooks(books);
  return newBook;
};

export const updateBookProgress = (bookId: string, currentPage: number): StudyBook[] => {
  const books = getBooks();
  const index = books.findIndex((b) => b.id === bookId);
  if (index !== -1) {
    books[index].currentPage = Math.min(currentPage, books[index].totalPages);
    if (books[index].currentPage >= books[index].totalPages) {
      books[index].completed = true;
    } else {
      books[index].completed = false;
    }
    saveBooks(books);
  }
  return books;
};

export const updateBookPdf = (bookId: string, pdfName: string, pdfDataUri: string): StudyBook[] => {
  const books = getBooks();
  const index = books.findIndex((b) => b.id === bookId);
  if (index !== -1) {
    books[index].pdfName = pdfName;
    books[index].pdfDataUri = pdfDataUri;
    storePdfData(bookId, pdfDataUri);
    saveBooks(books);
  }
  return books;
};

export const deleteBook = (bookId: string): StudyBook[] => {
  removePdfData(bookId);
  const books = getBooks().filter((b) => b.id !== bookId);
  saveBooks(books);
  return books;
};

export const calculateDailyGoal = (
  totalPages: number,
  currentPage: number,
  deadlineStr: string
): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Parse YYYY-MM-DD or DD-MM-YYYY
  let deadlineDate: Date;
  if (deadlineStr.includes('-')) {
    const parts = deadlineStr.split('-');
    if (parts[0].length === 4) {
      deadlineDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      deadlineDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  } else {
    deadlineDate = new Date(deadlineStr);
  }

  const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  const pagesRemaining = totalPages - currentPage;

  if (daysRemaining <= 0) return Math.max(1, pagesRemaining);
  if (pagesRemaining <= 0) return 1;

  const goal = Math.ceil(pagesRemaining / daysRemaining);
  return Math.max(1, Math.min(goal, 100));
};

export const getBookStatistics = (book: StudyBook) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let deadlineDate: Date;
  if (book.deadline.includes('-')) {
    const parts = book.deadline.split('-');
    if (parts[0].length === 4) {
      deadlineDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      deadlineDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
  } else {
    deadlineDate = new Date(book.deadline);
  }

  const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));
  const pagesLeft = Math.max(0, book.totalPages - book.currentPage);
  const progress = Math.min(1.0, book.currentPage / book.totalPages);
  const pct = Math.round(progress * 100);

  let backlog = 0;
  if (book.dateAdded) {
    const addedDate = new Date(book.dateAdded);
    addedDate.setHours(0, 0, 0, 0);
    const elapsedDays = Math.max(1, Math.floor((today.getTime() - addedDate.getTime()) / (1000 * 3600 * 24)) + 1);
    const expected = elapsedDays * book.dailyGoal;
    backlog = Math.max(0, expected - book.currentPage);
  }

  if (daysLeft <= 0) {
    backlog = Math.min(backlog, pagesLeft);
  }

  return {
    pagesLeft,
    daysLeft,
    backlog,
    progress,
    pct,
  };
};

// --- Tasks ---
export const getTasks = (): TaskItem[] => {
  try {
    const data = localStorage.getItem(KEYS.TASKS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading tasks', e);
  }
  return [];
};

export const saveTasks = (tasks: TaskItem[]): void => {
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
};

export const addTask = (
  title: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string,
  priority: 1 | 2 | 3,
  eventId?: string
): TaskItem => {
  const tasks = getTasks();
  const newTask: TaskItem = {
    id: 'task_' + Date.now(),
    title,
    description,
    date,
    startTime,
    endTime,
    priority,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    eventId,
  };

  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
};

export const updateTask = (
  id: string,
  updates: Partial<TaskItem>
): TaskItem[] => {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    saveTasks(tasks);
  }
  return tasks;
};

export const deleteTask = (id: string): TaskItem[] => {
  const tasks = getTasks().filter((t) => t.id !== id);
  saveTasks(tasks);
  return tasks;
};

export const isTaskOverdue = (task: TaskItem): boolean => {
  if (task.status !== 'Pending') return false;
  const todayStr = new Date().toISOString().split('T')[0];

  if (task.date < todayStr) return true;
  if (task.date > todayStr) return false;

  // Same day check
  if (task.endTime) {
    const now = new Date();
    const [hours, mins] = task.endTime.split(':').map(Number);
    const end = new Date();
    end.setHours(hours, mins, 0, 0);
    return now > end;
  }
  return false;
};

// --- Sessions & Attempts ---
export const getSessions = (): ReadingSession[] => {
  try {
    const data = localStorage.getItem(KEYS.SESSIONS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading sessions', e);
  }
  return [];
};

export const addSession = (
  url: string,
  title: string,
  wordCount: number,
  isPriority: boolean,
  readingTimeSec: number
): ReadingSession => {
  const sessions = getSessions();
  const newSession: ReadingSession = {
    id: 'session_' + Date.now(),
    url,
    title,
    wordCount,
    isPriority,
    readingTimeSec,
    dateRead: new Date().toISOString(),
  };
  sessions.unshift(newSession);
  localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
  return newSession;
};

export const getAttempts = (): QuestionAttempt[] => {
  try {
    const data = localStorage.getItem(KEYS.ATTEMPTS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading attempts', e);
  }
  return [];
};

export const addQuestionAttempts = (attempts: Omit<QuestionAttempt, 'id'>[]): void => {
  const current = getAttempts();
  const newAttempts: QuestionAttempt[] = attempts.map((a, i) => ({
    ...a,
    id: 'attempt_' + Date.now() + '_' + i,
  }));
  const updated = [...current, ...newAttempts];
  localStorage.setItem(KEYS.ATTEMPTS, JSON.stringify(updated));
};

// --- Timer Laps ---
export const getTimerLaps = (): QuestionTimerLap[] => {
  try {
    const data = localStorage.getItem(KEYS.TIMER_LOGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading timer logs', e);
  }
  return [];
};

export const addTimerLap = (setNumber: number, questionNum: number, durationSec: number): QuestionTimerLap[] => {
  const laps = getTimerLaps();
  const newLap: QuestionTimerLap = {
    id: 'lap_' + Date.now(),
    setNumber,
    questionNum,
    durationSec,
    timestamp: new Date().toISOString(),
  };
  laps.unshift(newLap);
  localStorage.setItem(KEYS.TIMER_LOGS, JSON.stringify(laps));
  return laps;
};

export const clearTimerLaps = (): void => {
  localStorage.removeItem(KEYS.TIMER_LOGS);
};

// --- Word Power ---
const WP_PROGRESS_KEY = 'wordpower_progress';

export const getWordPowerProgress = (): WordPowerProgress | null => {
  try {
    const data = localStorage.getItem(WP_PROGRESS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) { /* ignore */ }
  return null;
};

export const saveWordPowerProgress = (progress: WordPowerProgress): void => {
  localStorage.setItem(WP_PROGRESS_KEY, JSON.stringify(progress));
};

export const clearWordPowerProgress = (): void => {
  localStorage.removeItem(WP_PROGRESS_KEY);
};