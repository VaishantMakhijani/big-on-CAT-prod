import React, { useState } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ReadingSession, QuestionAttempt } from '../types';

interface AnalyticsModalProps {
  sessions: ReadingSession[];
  attempts: QuestionAttempt[];
  onClose: () => void;
  onReviewSession: (session: ReadingSession) => void;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#0284C7', '#8B5CF6'];

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  sessions,
  attempts,
  onClose,
  onReviewSession,
}) => {
  // KPIs
  const totalArticles = sessions.length;
  const totalReadingSec = sessions.reduce((acc, s) => acc + (s.readingTimeSec || 0), 0);
  const totalReadingMins = (totalReadingSec / 60).toFixed(1);

  const totalQuestions = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const overallAccuracy = totalQuestions > 0 ? Math.round((correctAttempts / totalQuestions) * 100) : 0;

  // 1. Accuracy Trend Over Time
  const accuracyTrendData = React.useMemo(() => {
    const dailyMap: Record<string, { total: number; correct: number }> = {};
    attempts.forEach((a) => {
      const session = sessions.find((s) => s.id === a.sessionId);
      const dateStr = session ? session.dateRead.split('T')[0] : 'Unknown';
      if (!dailyMap[dateStr]) dailyMap[dateStr] = { total: 0, correct: 0 };
      dailyMap[dateStr].total++;
      if (a.isCorrect) dailyMap[dateStr].correct++;
    });

    return Object.entries(dailyMap)
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .map(([date, val]) => ({
        date: date.slice(5), // MM-DD
        accuracy: Math.round((val.correct / val.total) * 100),
      }));
  }, [attempts, sessions]);

  // 2. Accuracy by Difficulty
  const difficultyData = React.useMemo(() => {
    const diffs: Record<string, { total: number; correct: number }> = {
      Easy: { total: 0, correct: 0 },
      Medium: { total: 0, correct: 0 },
      Hard: { total: 0, correct: 0 },
    };

    attempts.forEach((a) => {
      const diff = a.difficulty || 'Medium';
      if (!diffs[diff]) diffs[diff] = { total: 0, correct: 0 };
      diffs[diff].total++;
      if (a.isCorrect) diffs[diff].correct++;
    });

    return Object.entries(diffs).map(([diff, val]) => ({
      difficulty: diff,
      accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      total: val.total,
    }));
  }, [attempts]);

  // 3. Question Type Performance
  const typePerformanceData = React.useMemo(() => {
    const types: Record<string, { total: number; correct: number }> = {};
    attempts.forEach((a) => {
      const type = a.questionType || 'Inference';
      if (!types[type]) types[type] = { total: 0, correct: 0 };
      types[type].total++;
      if (a.isCorrect) types[type].correct++;
    });

    return Object.entries(types).map(([type, val]) => ({
      type,
      accuracy: val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0,
      count: val.total,
    }));
  }, [attempts]);

  // 4. Priority vs Non-Priority Accuracy
  const priorityComparisonData = React.useMemo(() => {
    let prioTotal = 0;
    let prioCorrect = 0;
    let nonPrioTotal = 0;
    let nonPrioCorrect = 0;

    attempts.forEach((a) => {
      const session = sessions.find((s) => s.id === a.sessionId);
      if (session?.isPriority) {
        prioTotal++;
        if (a.isCorrect) prioCorrect++;
      } else {
        nonPrioTotal++;
        if (a.isCorrect) nonPrioCorrect++;
      }
    });

    return [
      {
        category: 'Standard',
        accuracy: nonPrioTotal > 0 ? Math.round((nonPrioCorrect / nonPrioTotal) * 100) : 0,
      },
      {
        category: '⭐ Priority',
        accuracy: prioTotal > 0 ? Math.round((prioCorrect / prioTotal) * 100) : 0,
      },
    ];
  }, [attempts, sessions]);

  // Strengths & Weaknesses
  const sortedTypes = [...typePerformanceData].sort((a, b) => b.accuracy - a.accuracy);
  const strengths = sortedTypes.slice(0, 2);
  const weaknesses = sortedTypes.filter((t) => t.accuracy < 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
        {/* Title Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Quiz Analytics & Performance Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto space-y-6 pr-2">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Articles Read</span>
              <p className="text-2xl font-extrabold text-slate-900">{totalArticles}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Overall Accuracy</span>
              <p
                className={`text-2xl font-extrabold ${
                  overallAccuracy >= 70 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {overallAccuracy}%
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500">Total Reading Time</span>
              <p className="text-2xl font-extrabold text-slate-900">
                {totalReadingMins} min
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Accuracy Trend Over Time */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Accuracy Trend Over Time
              </h4>
              <div className="h-48 w-full">
                {accuracyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '12px',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#4F46E5"
                        strokeWidth={2.5}
                        dot={{ fill: '#4F46E5', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center pt-16">
                    Complete reading quizzes to view performance trend graphs.
                  </p>
                )}
              </div>
            </div>

            {/* Chart 2: Accuracy by Difficulty */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4" /> Accuracy by Question Difficulty
              </h4>
              <div className="h-48 w-full">
                {attempts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={difficultyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="difficulty" stroke="#64748B" fontSize={10} />
                      <YAxis domain={[0, 100]} stroke="#64748B" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '12px',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Bar dataKey="accuracy" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center pt-16">
                    No data available.
                  </p>
                )}
              </div>
            </div>

            {/* Chart 3: Question Type Performance */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Question Type Accuracy (%)
              </h4>
              <div className="h-48 w-full">
                {typePerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typePerformanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={10} />
                      <YAxis dataKey="type" type="category" stroke="#64748B" fontSize={10} width={90} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '12px',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Bar dataKey="accuracy" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center pt-16">
                    No data available.
                  </p>
                )}
              </div>
            </div>

            {/* Chart 4: Question Type Distribution */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4" /> Question Type Distribution
              </h4>
              <div className="h-48 w-full">
                {typePerformanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typePerformanceData}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        innerRadius={30}
                        label={({ name }) => name}
                      >
                        {typePerformanceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '8px',
                          color: '#0F172A',
                          fontSize: '12px',
                          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center pt-16">
                    No data available.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Diagnostic Insights & Recommendations
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Demonstrated Strengths
                </span>
                {strengths.length > 0 ? (
                  strengths.map((s) => (
                    <p key={s.type} className="text-slate-700">
                      • <strong>{s.type}</strong> ({s.accuracy}% accuracy)
                    </p>
                  ))
                ) : (
                  <p className="text-slate-400 italic">Keep practicing to identify core strengths.</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-rose-700 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Focus Improvement Areas
                </span>
                {weaknesses.length > 0 ? (
                  weaknesses.map((w) => (
                    <p key={w.type} className="text-slate-700">
                      • <strong>{w.type}</strong> ({w.accuracy}% accuracy) - Review logical traps.
                    </p>
                  ))
                ) : (
                  <p className="text-emerald-700 italic">Solid performance across question types!</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Sessions Table */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Recent Reading & Quiz Sessions
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Title</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Read Time</th>
                    <th className="p-2">Priority</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        No reading sessions logged yet.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-100/80 transition-colors">
                        <td className="p-2 font-semibold text-slate-800 max-w-xs truncate">{s.title}</td>
                        <td className="p-2 text-slate-500">
                          {new Date(s.dateRead).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-slate-500">
                          {Math.round(s.readingTimeSec / 60)}m
                        </td>
                        <td className="p-2">
                          {s.isPriority ? (
                            <span className="text-amber-600 font-bold">⭐ Priority</span>
                          ) : (
                            <span className="text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => onReviewSession(s)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            Review Quiz
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
