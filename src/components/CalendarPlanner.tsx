import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Undo,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  ExternalLink,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { TaskItem } from '../types';
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  isTaskOverdue,
  getSettings,
  saveSettings,
} from '../utils/storage';
import {
  googleSignIn,
  googleSignOut,
  initAuth,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from '../utils/googleCalendar';
import { User } from 'firebase/auth';

export const normalizeTimeInput = (val: string): string => {
  if (!val) return '';
  const clean = val.trim().replace(/[^0-9:]/g, '');
  if (!clean) return '';

  if (clean.includes(':')) {
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h)) h = 9;
    if (isNaN(m)) m = 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  if (clean.length === 4) {
    let h = parseInt(clean.slice(0, 2), 10);
    let m = parseInt(clean.slice(2, 4), 10);
    if (isNaN(h)) h = 9;
    if (isNaN(m)) m = 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  } else if (clean.length === 3) {
    let h = parseInt(clean.slice(0, 1), 10);
    let m = parseInt(clean.slice(1, 3), 10);
    if (isNaN(h)) h = 9;
    if (isNaN(m)) m = 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  } else if (clean.length === 1 || clean.length === 2) {
    let h = parseInt(clean, 10);
    if (isNaN(h)) h = 9;
    h = Math.min(23, Math.max(0, h));
    return `${h.toString().padStart(2, '0')}:00`;
  }

  return clean;
};

export const createGoogleCalendarUrl = (task: {
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
}) => {
  const title = encodeURIComponent(task.title || 'Task');
  const details = encodeURIComponent(
    (task.description || '') + '\n\nCreated via Big on Productivity'
  );

  let dateStr = task.date || new Date().toISOString().split('T')[0];
  const dateClean = dateStr.replace(/-/g, '');

  const startT = (normalizeTimeInput(task.startTime) || '09:00').replace(':', '') + '00';
  const endT = (normalizeTimeInput(task.endTime) || '10:00').replace(':', '') + '00';

  const dates = `${dateClean}T${startT}/${dateClean}T${endT}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
};

interface CalendarPlannerProps {
  tasks: TaskItem[];
  onTasksChange: (tasks: TaskItem[]) => void;
}

export const CalendarPlanner: React.FC<CalendarPlannerProps> = ({
  tasks,
  onTasksChange,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

  // Storage / Calendar mode setting
  const [calendarSyncMode, setCalendarSyncMode] = useState<'google' | 'local'>(
    () => getSettings().calendarSyncMode || 'google'
  );

  // Google Calendar API state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setCalendarToken(token);
      },
      () => {
        setGoogleUser(null);
        setCalendarToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningInGoogle(true);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setCalendarToken(res.accessToken);
        setSyncNotice('Google Calendar connected! Edits and deletes will auto-sync live.');
        setTimeout(() => setSyncNotice(null), 5000);
      }
    } catch (err: any) {
      console.error('Sign-in error', err);
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setCalendarToken(null);
  };

  // Add Task Form state
  const [taskTitle, setTaskName] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('10:00');
  const [priorityVal, setPriorityVal] = useState<'1' | '2' | '3'>('2');
  const [syncGoogleCal, setSyncGoogleCal] = useState(
    calendarSyncMode === 'google'
  );
  const [formError, setFormError] = useState('');

  const toggleSyncMode = () => {
    const nextMode = calendarSyncMode === 'google' ? 'local' : 'google';
    setCalendarSyncMode(nextMode);
    saveSettings({ calendarSyncMode: nextMode });
  };

  const dateIso = currentDate.toISOString().split('T')[0];

  // Filter tasks for current date
  const dayTasks = tasks.filter((t) => t.date === dateIso);
  const completedCount = dayTasks.filter((t) => t.status === 'Completed').length;
  const totalCount = dayTasks.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Navigation handlers
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formattedDateString = currentDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const openAddModal = () => {
    const todayFormatted = currentDate.toISOString().split('T')[0];
    setStartDateStr(todayFormatted);
    setEndDateStr(todayFormatted);
    setTaskName('');
    setTaskDesc('');
    setStartTimeStr('09:00');
    setEndTimeStr('10:00');
    setPriorityVal('2');
    setSyncGoogleCal(calendarSyncMode === 'google');
    setFormError('');
    setShowAddModal(true);
  };

  const calculateDurationMins = () => {
    if (!startTimeStr || !endTimeStr) return null;
    try {
      const [sh, sm] = startTimeStr.split(':').map(Number);
      const [eh, em] = endTimeStr.split(':').map(Number);
      if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
      let startMinutes = sh * 60 + sm;
      let endMinutes = eh * 60 + em;
      if (endMinutes < startMinutes && endMinutes + 720 > startMinutes) {
        endMinutes += 720;
      }
      const diff = endMinutes - startMinutes;
      return diff >= 0 ? diff : null;
    } catch (e) {
      return null;
    }
  };

  const duration = calculateDurationMins();

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!taskTitle.trim()) {
      setFormError('Task title is required');
      return;
    }

    if (!startDateStr.trim()) {
      setFormError('Start date is required');
      return;
    }

    let isoDate = startDateStr.trim();
    if (isoDate.includes('-')) {
      const parts = isoDate.split('-');
      if (parts[0].length === 2 && parts[2].length === 4) {
        isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    let finalStart = startTimeStr || '09:00';
    let finalEnd = endTimeStr || '10:00';

    try {
      const [sh, sm] = finalStart.split(':').map(Number);
      const [eh, em] = finalEnd.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;

        if (endMins < startMins && endMins + 720 > startMins) {
          endMins += 720;
          const adjustedHour = Math.floor(endMins / 60) % 24;
          const adjustedMin = endMins % 60;
          finalEnd = `${adjustedHour.toString().padStart(2, '0')}:${adjustedMin.toString().padStart(2, '0')}`;
        }
      }
    } catch (e) {
      // ignore
    }

    const priorityNum = Number(priorityVal) as 1 | 2 | 3;

    // Ensure we have active token if syncGoogleCal is requested
    let activeToken = calendarToken || sessionStorage.getItem('gcal_token');
    if (syncGoogleCal && !activeToken) {
      try {
        const res = await googleSignIn();
        if (res) {
          activeToken = res.accessToken;
          setGoogleUser(res.user);
          setCalendarToken(res.accessToken);
        }
      } catch (err) {
        console.warn('Could not sign in for token, falling back to URL launch', err);
      }
    }

    if (editingTask) {
      let googleEventId = editingTask.eventId;

      if (syncGoogleCal) {
        if (!activeToken) {
          try {
            const res = await googleSignIn();
            if (res) {
              activeToken = res.accessToken;
              setGoogleUser(res.user);
              setCalendarToken(res.accessToken);
            }
          } catch (e) {
            console.warn('Google sign-in skipped/cancelled');
          }
        }

        if (activeToken) {
          if (googleEventId) {
            // Direct API update on Google Calendar
            let success = await updateGoogleCalendarEvent(
              googleEventId,
              {
                title: taskTitle.trim(),
                description: taskDesc.trim(),
                date: isoDate,
                startTime: finalStart,
                endTime: finalEnd,
              },
              activeToken
            );

            // If update failed (e.g. event deleted on GCal or token expired), attempt creating it
            if (!success) {
              const res = await createGoogleCalendarEvent(
                {
                  title: taskTitle.trim(),
                  description: taskDesc.trim(),
                  date: isoDate,
                  startTime: finalStart,
                  endTime: finalEnd,
                },
                activeToken
              );
              if (res) {
                googleEventId = res.eventId;
                success = true;
              }
            }

            if (success) {
              setSyncNotice(`Updated "${taskTitle.trim()}" in Google Calendar!`);
              setTimeout(() => setSyncNotice(null), 4000);
            } else {
              setSyncNotice('Could not update in Google Calendar. Please re-connect.');
              setTimeout(() => setSyncNotice(null), 4000);
            }
          } else {
            const res = await createGoogleCalendarEvent(
              {
                title: taskTitle.trim(),
                description: taskDesc.trim(),
                date: isoDate,
                startTime: finalStart,
                endTime: finalEnd,
              },
              activeToken
            );
            if (res) {
              googleEventId = res.eventId;
              setSyncNotice(`Added "${taskTitle.trim()}" to Google Calendar!`);
              setTimeout(() => setSyncNotice(null), 4000);
            } else {
              setSyncNotice('Failed to sync to Google Calendar. Check connection.');
              setTimeout(() => setSyncNotice(null), 4000);
            }
          }
        }
      }

      const updated = updateTask(editingTask.id, {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        date: isoDate,
        startTime: finalStart,
        endTime: finalEnd,
        priority: priorityNum,
        eventId: googleEventId,
      });
      onTasksChange(updated);
      setEditingTask(null);

      if (syncGoogleCal && !activeToken) {
        const calUrl = createGoogleCalendarUrl({
          title: taskTitle.trim(),
          description: taskDesc.trim(),
          date: isoDate,
          startTime: finalStart,
          endTime: finalEnd,
        });
        window.open(calUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      let googleEventId: string | undefined = undefined;

      if (syncGoogleCal) {
        if (!activeToken) {
          try {
            const res = await googleSignIn();
            if (res) {
              activeToken = res.accessToken;
              setGoogleUser(res.user);
              setCalendarToken(res.accessToken);
            }
          } catch (e) {
            console.warn('Google sign in popup dismissed');
          }
        }

        if (activeToken) {
          const res = await createGoogleCalendarEvent(
            {
              title: taskTitle.trim(),
              description: taskDesc.trim(),
              date: isoDate,
              startTime: finalStart,
              endTime: finalEnd,
            },
            activeToken
          );
          if (res) {
            googleEventId = res.eventId;
            setSyncNotice(`Created "${taskTitle.trim()}" in Google Calendar!`);
            setTimeout(() => setSyncNotice(null), 4000);
          } else {
            setSyncNotice('Google Calendar sync failed. Retrying sign-in may help.');
            setTimeout(() => setSyncNotice(null), 4000);
          }
        }
      }

      const newTask = addTask(
        taskTitle.trim(),
        taskDesc.trim(),
        isoDate,
        finalStart,
        finalEnd,
        priorityNum,
        googleEventId
      );

      onTasksChange(getTasks());
      setShowAddModal(false);

      if (syncGoogleCal && !activeToken) {
        const calUrl = createGoogleCalendarUrl(newTask);
        window.open(calUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleToggleStatus = (task: TaskItem) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updated = updateTask(task.id, { status: newStatus });
    onTasksChange(updated);
  };

  const handleDeleteConfirmed = async () => {
    if (!taskToDelete) return;

    const activeToken = calendarToken || sessionStorage.getItem('gcal_token');
    if (taskToDelete.eventId && activeToken) {
      await deleteGoogleCalendarEvent(taskToDelete.eventId, activeToken);
    }

    const updated = deleteTask(taskToDelete.id);
    onTasksChange(updated);
    setTaskToDelete(null);
  };

  const startEdit = (task: TaskItem) => {
    setEditingTask(task);
    setTaskName(task.title);
    setTaskDesc(task.description || '');
    setStartDateStr(task.date || currentDate.toISOString().split('T')[0]);
    setStartTimeStr(task.startTime || '09:00');
    setEndTimeStr(task.endTime || '10:00');
    setPriorityVal(String(task.priority) as '1' | '2' | '3');
    setSyncGoogleCal(calendarSyncMode === 'google' || !!task.eventId);
    setFormError('');
  };

  return (
    <div className="space-y-3">
      {/* Mode Indicator & Google Calendar Auth bar */}
      <div className="space-y-1.5">
        <div className="bg-[#1A1A1A] p-2.5 rounded-lg border border-[#2A2520] space-y-2 text-xs">
          {/* Top row: Mode Title & Toggle Button */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#8A8580] font-semibold text-[10px] uppercase tracking-wider">
              Task Mode
            </span>
            <button
              onClick={toggleSyncMode}
              className="text-[#D97757] hover:text-[#e88869] text-[11px] font-medium underline underline-offset-2 transition-colors cursor-pointer shrink-0"
            >
              {calendarSyncMode === 'google' ? 'Switch to Local' : 'Switch to Google Cal'}
            </button>
          </div>

          {/* Status Badge & User Connection */}
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-[#2A2520] text-[#E8E6E3] px-2.5 py-1 rounded text-[11px] font-semibold border border-[#3A3530]">
              <CalendarIcon className="w-3.5 h-3.5 text-[#D97757] shrink-0" />
              <span className="truncate">
                {calendarSyncMode === 'google' ? 'Google Calendar Sync' : 'Local Storage Only'}
              </span>
            </div>

            {calendarSyncMode === 'google' && (
              googleUser ? (
                <div className="flex items-center justify-between bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 px-2.5 py-1 rounded text-[11px] font-medium">
                  <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{googleUser.email || 'Connected'}</span>
                  </div>
                  <button
                    onClick={handleGoogleSignOut}
                    className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                    title="Disconnect Google Calendar"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningInGoogle}
                  className="w-full bg-[#D97757] hover:bg-[#c26547] text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>{isSigningInGoogle ? 'Connecting...' : 'Sign in for Auto-Sync'}</span>
                </button>
              )
            )}
          </div>
        </div>

        {syncNotice && (
          <div className="text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-3 py-1 rounded-md flex items-center justify-between">
            <span>{syncNotice}</span>
            <button onClick={() => setSyncNotice(null)} className="text-emerald-400 hover:text-emerald-200 ml-2">✕</button>
          </div>
        )}
      </div>

      {/* Date controls header */}
      <div className="flex items-center justify-between bg-[#141414] p-2 rounded-lg border border-[#2A2520] text-xs">
        <button
          onClick={handlePrevDay}
          className="p-1 text-[#8A8580] hover:text-[#E8E6E3] hover:bg-[#1E1E1E] rounded transition-colors"
          title="Previous Day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-medium text-[#E8E6E3]">{formattedDateString}</span>
          <button
            onClick={handleToday}
            className="text-[10px] bg-[#2A2520] hover:bg-[#3A3530] text-[#D97757] px-2 py-0.5 rounded font-medium transition-colors"
          >
            Today
          </button>
        </div>

        <button
          onClick={handleNextDay}
          className="p-1 text-[#8A8580] hover:text-[#E8E6E3] hover:bg-[#1E1E1E] rounded transition-colors"
          title="Next Day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="w-full bg-[#2A2A2A] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#D97757] h-full transition-all duration-300"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#8A8580]">
          <span>
            {totalCount > 0
              ? `${completedCount} / ${totalCount} completed`
              : 'No tasks scheduled'}
          </span>
          {totalCount > 0 && <span>{completionPct}%</span>}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
        {dayTasks.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#8A8580] italic">
            No tasks scheduled for this day.
          </div>
        ) : (
          dayTasks.map((task) => {
            const overdue = isTaskOverdue(task);
            const isCompleted = task.status === 'Completed';

            let statusColor = 'text-[#8A8580]';
            let statusLabel = 'Pending';
            let cardBg = 'bg-[#1E1E1E]';

            if (isCompleted) {
              statusColor = 'text-[#5C8A6A]';
              statusLabel = 'Completed';
              cardBg = 'bg-[#141A14]';
            } else if (overdue) {
              statusColor = 'text-[#B85C4A]';
              statusLabel = 'Overdue';
              cardBg = 'bg-[#1A1414]';
            }

            const priorityBadge =
              task.priority === 3
                ? { label: 'High', color: 'text-[#D97757]' }
                : task.priority === 2
                ? { label: 'Medium', color: 'text-[#C49A5A]' }
                : { label: 'Low', color: 'text-[#8A8580]' };

            return (
              <div
                key={task.id}
                className={`${cardBg} border border-[#2A2520] rounded-lg p-2.5 text-[#E8E6E3] space-y-1.5 transition-colors`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#8A8580] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.startTime && task.endTime
                      ? `${task.startTime} – ${task.endTime}`
                      : task.startTime || 'All Day'}
                  </span>
                  <span className={`font-medium ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-medium text-[#E8E6E3]">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-[11px] text-[#8A8580] line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#2A2520] pt-1.5 mt-1 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${priorityBadge.color}`}>
                      Priority: {priorityBadge.label}
                    </span>
                    <a
                      href={createGoogleCalendarUrl(task)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] bg-[#2A2520] hover:bg-[#3A3530] text-[#D97757] hover:text-[#e88869] px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors"
                      title="Add or open event in Google Calendar"
                    >
                      <CalendarIcon className="w-3 h-3" />
                      <span>{task.eventId ? 'View in Cal' : '+ Google Cal'}</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="p-1 hover:bg-[#2A2520] rounded text-[#5C8A6A] transition-colors"
                      title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                    >
                      {isCompleted ? (
                        <Undo className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(task)}
                      className="p-1 hover:bg-[#2A2520] rounded text-[#D97757] transition-colors"
                      title="Edit Task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setTaskToDelete(task)}
                      className="p-1 hover:bg-[#2A2520] rounded text-[#B85C4A] transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Add / Edit Task */}
      {(showAddModal || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveTask}
            className="w-full max-w-md bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-5 text-[#E8E6E3] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#2A2520] pb-2">
              <h3 className="font-semibold text-sm text-[#E8E6E3]">
                {editingTask ? 'Edit Task' : 'Add Task'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTask(null);
                }}
                className="text-[#8A8580] hover:text-[#E8E6E3]"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="text-xs bg-[#2A1A1A] text-[#B85C4A] p-2 rounded border border-[#B85C4A]/40 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#8A8580] block mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. Read Economist Editorial"
                  className="w-full bg-[#141414] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#E8E6E3] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="text-xs text-[#8A8580] block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Notes or details..."
                  className="w-full bg-[#141414] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#E8E6E3] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#8A8580] block mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDateStr}
                    onChange={(e) => setStartDateStr(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#E8E6E3] focus:outline-none focus:border-[#D97757] [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#8A8580] block mb-1">
                    Priority
                  </label>
                  <select
                    value={priorityVal}
                    onChange={(e) =>
                      setPriorityVal(e.target.value as '1' | '2' | '3')
                    }
                    className="w-full bg-[#141414] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#E8E6E3] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#8A8580] block mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#E8E6E3] focus:outline-none focus:border-[#D97757] [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#8A8580] block mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#E8E6E3] focus:outline-none focus:border-[#D97757] [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#8A8580] block mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    disabled
                    value={duration !== null ? `${duration} min` : '—'}
                    className="w-full bg-[#2A2A2A] border border-[#2A2520] rounded px-3 py-1.5 text-xs text-[#8A8580]"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#E8E6E3]">
                  <input
                    type="checkbox"
                    checked={syncGoogleCal}
                    onChange={(e) => setSyncGoogleCal(e.target.checked)}
                    className="accent-[#D97757] rounded cursor-pointer"
                  />
                  <span>
                    {googleUser
                      ? 'Auto-sync live changes directly with Google Calendar'
                      : 'Attach & open event in Google Calendar on save'}
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#2A2520] pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTask(null);
                }}
                className="px-3 py-1.5 text-xs text-[#8A8580] hover:text-[#E8E6E3]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-[#D97757] hover:bg-[#c26547] text-white rounded transition-colors"
              >
                {editingTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-5 text-[#E8E6E3] shadow-2xl space-y-4">
            <h3 className="font-semibold text-sm text-[#E8E6E3]">Delete Task?</h3>
            <p className="text-xs text-[#8A8580]">
              Are you sure you want to permanently remove "{taskToDelete.title}"?
              {taskToDelete.eventId && googleUser && ' This will also delete the event from Google Calendar.'}
            </p>
            <div className="flex justify-end gap-2 border-t border-[#2A2520] pt-3">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-xs text-[#8A8580] hover:text-[#E8E6E3]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-1.5 text-xs font-semibold bg-[#B85C4A] hover:bg-[#a34f3e] text-white rounded transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden trigger for Add Task button from parent */}
      <button
        id="trigger-add-task"
        onClick={openAddModal}
        className="hidden"
      />
    </div>
  );
};
