import React, { useCallback } from 'react';
import {
  Timer,
  PlusCircle,
  BookOpen,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { StudyProgress } from './StudyProgress';
import { CalendarPlanner } from './CalendarPlanner';
import { StudyBook, TaskItem } from '../types';

interface SidebarProps {
  books: StudyBook[];
  tasks: TaskItem[];
  onBooksChange: (books: StudyBook[]) => void;
  onTasksChange: (tasks: TaskItem[]) => void;
  onOpenPdf: (book: StudyBook) => void;
  onOpenAnalytics: () => void;
  onOpenTimer: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  books,
  tasks,
  onBooksChange,
  onTasksChange,
  onOpenPdf,
  onOpenAnalytics,
  onOpenTimer,
}) => {
  const [studySummary, setStudySummary] = React.useState({ overdue: 0, open: 0, closed: 0 });

  // MEMOIZED CALLBACK: Prevents infinite loop
  const handleUpdateSummary = useCallback((overdue: number, open: number, closed: number) => {
    setStudySummary({ overdue, open, closed });
  }, []);

  const handleTriggerAddBook = () => {
    document.getElementById('trigger-add-study-book')?.click();
  };

  const handleTriggerAddTask = () => {
    document.getElementById('trigger-add-task')?.click();
  };

  return (
    <aside className="w-full lg:w-[340px] h-full bg-slate-50 border-r border-slate-200 p-5 flex flex-col space-y-4 overflow-y-auto shrink-0 select-none">
      {/* App Branding */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <div className="w-4 h-4 bg-white rounded-xs" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
            Big on Productivity
          </h1>
          <p className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase">
            DISCIPLINE ENGINE
          </p>
        </div>
      </div>

      {/* Top Utility Buttons */}
      <div className="border-y border-slate-200 py-3 text-xs">
        <button
          onClick={onOpenTimer}
          className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 py-2 px-3 rounded-lg font-semibold shadow-xs transition-colors cursor-pointer question-timer-button"
        >
          <Timer className="w-4 h-4 text-emerald-600" />
          <span>Question Timer</span>
        </button>
      </div>

      {/* SECTION 1: STUDY PROGRESS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="sidebar-study">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>STUDY PROGRESS</span>
            </div>
          </div>
          <button
            onClick={handleTriggerAddBook}
            className="p-1 text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
            title="Add Study Material"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-slate-500 italic">
          PDF study material tracking with progress monitoring
        </p>

        {/* Summary Badges */}
        <div className="flex items-center gap-3 text-[10px] bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs text-center">
          <div className="flex-1">
            <span className="text-rose-600 font-bold">Overdue: </span>
            <span className="text-rose-600 font-bold">{studySummary.overdue}</span>
          </div>
          <div className="flex-1 border-x border-slate-200">
            <span className="text-slate-700 font-bold">Open: </span>
            <span className="text-slate-800 font-bold">{studySummary.open}</span>
          </div>
          <div className="flex-1">
            <span className="text-emerald-600 font-bold">Closed: </span>
            <span className="text-emerald-600 font-bold">{studySummary.closed}</span>
          </div>
        </div>

        <StudyProgress
          books={books}
          onBooksChange={onBooksChange}
          onOpenPdf={onOpenPdf}
          onUpdateSummary={handleUpdateSummary} // <--- USES STABLE FUNCTION
        />
      </div>

      {/* SECTION 2: CALENDAR MANAGER */}
      <div className="space-y-2 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <div className="sidebar-calendar">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <span>CALENDAR MANAGER</span>
            </div>
          </div>
          <button
            onClick={handleTriggerAddTask}
            className="p-1 text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
            title="Add Task"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-slate-500 italic">
          Task management with Google Calendar integration
        </p>

        <CalendarPlanner tasks={tasks} onTasksChange={onTasksChange} />
      </div>
    </aside>
  );
};