import React, { useState } from 'react';
import { X, Check, AlertCircle, HelpCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Question, QuestionAttempt, ReadingSession } from '../types';

interface QuizModalProps {
  loading: boolean;
  questions: Question[];
  readingTimeSec: number;
  articleTitle: string;
  articleUrl: string;
  isPriority: boolean;
  onClose: () => void;
  onQuizComplete: (attempts: Omit<QuestionAttempt, 'id'>[], sessionData: Omit<ReadingSession, 'id'>) => void;
  // Optional pre-existing review session
  reviewSession?: {
    attempts: QuestionAttempt[];
    readingTimeSec?: number;
  };
}

export const QuizModal: React.FC<QuizModalProps> = ({
  loading,
  questions,
  readingTimeSec,
  articleTitle,
  articleUrl,
  isPriority,
  onClose,
  onQuizComplete,
  reviewSession,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [userAnswers, setUserAnswers] = useState<Array<'A' | 'B' | 'C' | 'D'>>([]);
  const [quizStartTime] = useState<number>(Date.now());
  const [quizEndTime, setQuizEndTime] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!reviewSession);

  // If loading questions
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-8 text-slate-800 shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <h3 className="font-bold text-lg text-indigo-600">
            Generating AI-powered quiz questions...
          </h3>
          <p className="text-xs text-slate-500 italic">
            Analyzing article structure, logic, and CAT Verbal Ability reasoning benchmarks.
            This may take a few seconds.
          </p>
          <button
            onClick={() => setShowConfirmClose(true)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-700 pt-4 cursor-pointer"
          >
            Cancel Generation
          </button>
        </div>
      </div>
    );
  }

  // Handle Close Confirmation
  const handleAttemptClose = () => {
    if (isCompleted || reviewSession) {
      onClose();
    } else {
      setShowConfirmClose(true);
    }
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const newAnswers = [...userAnswers, selectedAnswer];
    setUserAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const endTime = Date.now();
      setQuizEndTime(endTime);
      setIsCompleted(true);

      // Save to storage
      const attemptsToSave: Omit<QuestionAttempt, 'id'>[] = questions.map((q, idx) => {
        const uAns = newAnswers[idx];
        return {
          sessionId: '', // filled when saving session
          questionText: q.question,
          options: q.options,
          correctAnswer: q.answer,
          userAnswer: uAns,
          isCorrect: uAns === q.answer,
          questionType: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
          reference: q.reference,
        };
      });

      const sessionData: Omit<ReadingSession, 'id'> = {
        url: articleUrl,
        title: articleTitle,
        wordCount: 0,
        isPriority,
        readingTimeSec,
        dateRead: new Date().toISOString(),
      };

      onQuizComplete(attemptsToSave, sessionData);
    }
  };

  // Render Review Mode
  if (isCompleted || reviewSession) {
    const activeQuestions = reviewSession
      ? reviewSession.attempts.map((a) => ({
          type: a.questionType,
          difficulty: a.difficulty as any,
          question: a.questionText,
          options: a.options,
          answer: a.correctAnswer as any,
          explanation: a.explanation,
          reference: a.reference,
        }))
      : questions;

    const activeUserAnswers = reviewSession
      ? reviewSession.attempts.map((a) => a.userAnswer as 'A' | 'B' | 'C' | 'D')
      : userAnswers;

    const correctCount = activeQuestions.reduce((acc, q, idx) => {
      return acc + (activeUserAnswers[idx] === q.answer ? 1 : 0);
    }, 0);

    const accuracyPct = Math.round((correctCount / activeQuestions.length) * 100) || 0;
    const readMins = Math.round(readingTimeSec / 60);
    const quizSecs = quizEndTime ? Math.round((quizEndTime - quizStartTime) / 1000) : 0;
    const quizMins = Math.round(quizSecs / 60);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
            <h2 className="text-xl font-bold text-slate-900">
              Quiz Review & Analytics
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable area */}
          <div className="overflow-y-auto space-y-6 pr-2">
            {/* KPI Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center shadow-2xs">
              <div>
                <p className="text-xs font-semibold text-slate-500">Score</p>
                <p className="text-xl font-extrabold text-slate-900">
                  {correctCount} / {activeQuestions.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Accuracy</p>
                <p
                  className={`text-xl font-extrabold ${
                    accuracyPct >= 70 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {accuracyPct}%
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Reading Time</p>
                <p className="text-xl font-extrabold text-slate-900">{readMins} min</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Quiz Time</p>
                <p className="text-xl font-extrabold text-slate-900">{quizMins} min</p>
              </div>
            </div>

            {/* Individual Question Cards */}
            <div className="space-y-4">
              {activeQuestions.map((q, idx) => {
                const uAns = activeUserAnswers[idx];
                const isCorrect = uAns === q.answer;

                return (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          Question {idx + 1}
                        </span>
                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-medium">
                          {q.difficulty}
                        </span>
                        <span className="text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-medium">
                          {q.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-bold">
                        {isCorrect ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Correct
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" /> Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      {q.question}
                    </p>

                    {/* Choices */}
                    <div className="space-y-1.5 pt-1">
                      {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                        const optText = q.options[optIdx];
                        const isSelected = uAns === letter;
                        const isRightOption = q.answer === letter;

                        let style = 'text-slate-600';
                        let prefix = '';

                        if (isRightOption) {
                          style = 'text-emerald-800 font-bold';
                          prefix = '✓ ';
                        } else if (isSelected && !isRightOption) {
                          style = 'text-rose-800 font-bold';
                          prefix = '✗ ';
                        }

                        return (
                          <div
                            key={letter}
                            className={`text-xs p-2 rounded-md border ${
                              isRightOption
                                ? 'bg-emerald-50 border-emerald-300'
                                : isSelected
                                ? 'bg-rose-50 border-rose-300'
                                : 'bg-white border-slate-200'
                            } ${style}`}
                          >
                            <span>
                              {prefix}
                              <strong>{letter}.</strong> {optText}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                      <p className="font-bold text-indigo-600">
                        Detailed Reasoning:
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>

                    {/* Reference */}
                    {q.reference && (
                      <div className="bg-white p-2.5 rounded border border-slate-200 text-[11px] italic text-slate-500">
                        <strong className="not-italic text-amber-700 font-bold">
                          Supporting Passage Quote:{' '}
                        </strong>
                        "{q.reference}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer action */}
          <div className="border-t border-slate-200 pt-3 shrink-0 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Close Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Quiz Step
  const currentQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Reading Quiz ({currentIndex + 1} of {questions.length})
            </h2>
          </div>

          <button
            onClick={handleAttemptClose}
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Header Metadata */}
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded border border-indigo-200">
            {currentQuestion.type}
          </span>
          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded border border-slate-200">
            Difficulty: {currentQuestion.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <div className="text-base font-semibold text-slate-900 leading-relaxed">
          {currentQuestion.question}
        </div>

        {/* Choices */}
        <div className="space-y-2.5">
          {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
            const optText = currentQuestion.options[optIdx];
            const isSelected = selectedAnswer === letter;

            return (
              <label
                key={letter}
                onClick={() => setSelectedAnswer(letter as any)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-600 text-slate-900 font-medium'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="quiz-opt"
                  checked={isSelected}
                  onChange={() => setSelectedAnswer(letter as any)}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 text-slate-500'
                  }`}
                >
                  {letter}
                </div>
                <span className="text-xs leading-relaxed">{optText}</span>
              </label>
            );
          })}
        </div>

        {/* Next / Submit Button */}
        <div className="flex justify-end border-t border-slate-200 pt-4">
          <button
            disabled={!selectedAnswer}
            onClick={handleSubmitAnswer}
            className={`px-6 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors ${
              selectedAnswer
                ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {currentIndex + 1 === questions.length ? 'Submit Quiz' : 'Next Question'}
          </button>
        </div>
      </div>

      {/* Confirmation modal before closing */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 text-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Exit Quiz?
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you do not want to take this quiz? Your reading attempt will not be scored.
            </p>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                No, Stay
              </button>
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  onClose();
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
