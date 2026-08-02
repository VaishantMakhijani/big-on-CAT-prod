import React, { useState, useEffect } from 'react';
import { Key } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { NewsReader } from './components/NewsReader';
import { SettingsModal } from './components/SettingsModal';
import { PortableInfoModal } from './components/PortableInfoModal';
import { QuizModal } from './components/QuizModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { QuestionTimerModal } from './components/QuestionTimerModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import {
  UserSettings,
  StudyBook,
  TaskItem,
  Question,
  ReadingSession,
  QuestionAttempt,
} from './types';
import {
  getSettings,
  getBooks,
  getTasks,
  getSessions,
  getAttempts,
  addSession,
  addQuestionAttempts,
} from './utils/storage';

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => getSettings());
  const [books, setBooks] = useState<StudyBook[]>(() => getBooks());
  const [tasks, setTasks] = useState<TaskItem[]>(() => getTasks());
  const [sessions, setSessions] = useState<ReadingSession[]>(() => getSessions());
  const [attempts, setAttempts] = useState<QuestionAttempt[]>(() => getAttempts());

  // Modal triggers
  const [showSettings, setShowSettings] = useState(false);
  const [showApiKeyNotice, setShowApiKeyNotice] = useState(false);
  const [showPortableInfo, setShowPortableInfo] = useState(() => settings.showPortableInfo);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [viewingPdfBook, setViewingPdfBook] = useState<StudyBook | null>(null);

  // Quiz Modal State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizArticleMeta, setQuizArticleMeta] = useState<{
    title: string;
    url: string;
    isPriority: boolean;
    readingTimeSec: number;
  }>({
    title: '',
    url: '',
    isPriority: false,
    readingTimeSec: 0,
  });

  // Reviewing a past session from Analytics
  const [reviewSession, setReviewSession] = useState<{
    attempts: QuestionAttempt[];
    readingTimeSec?: number;
  } | null>(null);

  // Start Quiz flow
  const handleStartQuiz = async (
    title: string,
    url: string,
    isPriority: boolean,
    readingTimeSec: number
  ) => {
    // Check if Gemini Key exists
    if (!settings.geminiApiKey) {
      setShowApiKeyNotice(true);
      return;
    }

    setQuizArticleMeta({ title, url, isPriority, readingTimeSec });
    setReviewSession(null);
    setQuizQuestions([]);
    setQuizLoading(true);
    setShowQuizModal(true);

    try {
      // 1. Scrape article text
      const scrapeRes = await fetch('/api/scrape-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const scrapeData = await scrapeRes.json();

      let articleContent = scrapeData.text;
      if (!articleContent || articleContent.length < 50) {
        articleContent = `${title}. This article discusses contemporary developments in economics, technology, and society.`;
      }

      // 2. Generate questions via Gemini
      const genRes = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': settings.geminiApiKey,
        },
        body: JSON.stringify({
          articleText: articleContent,
          userApiKey: settings.geminiApiKey,
        }),
      });

      const genData = await genRes.json();

      if (genData.success && genData.questions) {
        setQuizQuestions(genData.questions);
      } else {
        alert(`Error generating quiz: ${genData.error || 'Unknown error'}`);
        setShowQuizModal(false);
      }
    } catch (err: any) {
      alert(`Network error during AI question generation: ${err.message}`);
      setShowQuizModal(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizComplete = (
    newAttempts: Omit<QuestionAttempt, 'id'>[],
    sessionData: Omit<ReadingSession, 'id'>
  ) => {
    // 1. Save reading session
    const savedSession = addSession(
      sessionData.url,
      sessionData.title,
      sessionData.wordCount,
      sessionData.isPriority,
      sessionData.readingTimeSec
    );

    // 2. Save attempts linked to session ID
    const attemptsWithSessionId = newAttempts.map((a) => ({
      ...a,
      sessionId: savedSession.id,
    }));
    addQuestionAttempts(attemptsWithSessionId);

    // Update state
    setSessions(getSessions());
    setAttempts(getAttempts());
  };

  const handleReviewSessionFromAnalytics = (session: ReadingSession) => {
    const sessionAttempts = attempts.filter((a) => a.sessionId === session.id);
    if (sessionAttempts.length === 0) {
      alert('No recorded attempts found for this session.');
      return;
    }

    setQuizArticleMeta({
      title: session.title,
      url: session.url,
      isPriority: session.isPriority,
      readingTimeSec: session.readingTimeSec,
    });
    setReviewSession({
      attempts: sessionAttempts,
      readingTimeSec: session.readingTimeSec,
    });
    setShowAnalytics(false);
    setShowQuizModal(true);
  };

  const [mobileTab, setMobileTab] = useState<'news' | 'study'>('news');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col lg:flex-row h-screen overflow-hidden">
      {/* Mobile Top Header with View Toggle */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between shrink-0 shadow-2xs z-10 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold text-[10px] shadow-xs">
            BP
          </div>
          <span className="font-bold text-xs text-slate-900 tracking-tight hidden sm:inline">
            Big on Productivity
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setMobileTab('news')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                mobileTab === 'news'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📰 News Feed
            </button>
            <button
              onClick={() => setMobileTab('study')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px] ${
                mobileTab === 'study'
                  ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📚 Study & Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Left Navigation Sidebar */}
      <div className={`flex-1 lg:flex-none ${mobileTab === 'study' ? 'block' : 'hidden'} lg:block h-full overflow-hidden`}>
        <Sidebar
          books={books}
          tasks={tasks}
          onBooksChange={setBooks}
          onTasksChange={setTasks}
          onOpenPdf={setViewingPdfBook}
          onOpenAnalytics={() => setShowAnalytics(true)}
          onOpenTimer={() => setShowTimer(true)}
        />
      </div>

      {/* Main Content Area (News Reader & Reading Timer) */}
      <main className={`flex-1 p-3 sm:p-4 lg:p-6 overflow-hidden flex flex-col h-full ${mobileTab === 'news' ? 'flex' : 'hidden'} lg:flex`}>
        <NewsReader
          settings={settings}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAnalytics={() => setShowAnalytics(true)}
          onStartQuiz={handleStartQuiz}
        />
      </main>

      {/* Modals */}
      {showApiKeyNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Gemini API Key Required
                </h3>
                <p className="text-xs text-slate-500">
                  AI Reading Comprehension Quizzes
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To generate AI-generated CAT Reading Comprehension quizzes tailored to your active reading session, a user <strong className="text-indigo-600">Gemini API Key</strong> is required.
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
              🔒 Your key is stored securely in your browser's local storage and is never sent to external servers or recorded remotely.
            </p>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                onClick={() => setShowApiKeyNotice(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowApiKeyNotice(false);
                  setShowSettings(true);
                }}
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Open System Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(updated) => setSettings(updated)}
        />
      )}

      {showPortableInfo && (
        <PortableInfoModal onClose={() => setShowPortableInfo(false)} />
      )}

      {showQuizModal && (
        <QuizModal
          loading={quizLoading}
          questions={quizQuestions}
          readingTimeSec={quizArticleMeta.readingTimeSec}
          articleTitle={quizArticleMeta.title}
          articleUrl={quizArticleMeta.url}
          isPriority={quizArticleMeta.isPriority}
          onClose={() => {
            setShowQuizModal(false);
            setReviewSession(null);
          }}
          onQuizComplete={handleQuizComplete}
          reviewSession={reviewSession || undefined}
        />
      )}

      {showAnalytics && (
        <AnalyticsModal
          sessions={sessions}
          attempts={attempts}
          onClose={() => setShowAnalytics(false)}
          onReviewSession={handleReviewSessionFromAnalytics}
        />
      )}

      {showTimer && <QuestionTimerModal onClose={() => setShowTimer(false)} />}

      {viewingPdfBook && (
        <PdfViewerModal
          book={viewingPdfBook}
          onClose={() => setViewingPdfBook(null)}
        />
      )}
    </div>
  );
}
