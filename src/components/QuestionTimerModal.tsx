import React, { useState, useEffect } from 'react';
import { X, Play, Square, RotateCcw, PlusCircle, Timer, FileBarChart2 } from 'lucide-react';
import { QuestionTimerLap } from '../types';
import { getTimerLaps, addTimerLap, clearTimerLaps } from '../utils/storage';

interface QuestionTimerModalProps {
  onClose: () => void;
}

export const QuestionTimerModal: React.FC<QuestionTimerModalProps> = ({ onClose }) => {
  const [laps, setLaps] = useState<QuestionTimerLap[]>(() => getTimerLaps());
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [questionNum, setQuestionNum] = useState(1);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartStop = () => {
    if (isRunning) {
      // Record Lap
      if (elapsedSec > 0) {
        const updated = addTimerLap(currentSet, questionNum, elapsedSec);
        setLaps(updated);
        setQuestionNum((prev) => prev + 1);
      }
      setIsRunning(false);
      setElapsedSec(0);
    } else {
      setIsRunning(true);
    }
  };

  const handleNewSet = () => {
    setIsRunning(false);
    setElapsedSec(0);
    setCurrentSet((prev) => prev + 1);
    setQuestionNum(1);
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  const performResetAll = () => {
    clearTimerLaps();
    setLaps([]);
    setIsRunning(false);
    setElapsedSec(0);
    setCurrentSet(1);
    setQuestionNum(1);
    setShowResetConfirm(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Stats calculation
  const totalQuestionsLogged = laps.length;
  const totalTimeSec = laps.reduce((acc, l) => acc + l.durationSec, 0);
  const avgTimePerQuestion = totalQuestionsLogged > 0 ? Math.round(totalTimeSec / totalQuestionsLogged) : 0;

  // Per-set comparison breakdown
  interface SetStat {
    setNumber: number;
    totalSecs: number;
    count: number;
  }

  const setStatsMap = laps.reduce<Record<number, SetStat>>((acc, lap) => {
    if (!acc[lap.setNumber]) {
      acc[lap.setNumber] = { setNumber: lap.setNumber, totalSecs: 0, count: 0 };
    }
    acc[lap.setNumber].totalSecs += lap.durationSec;
    acc[lap.setNumber].count += 1;
    return acc;
  }, {});

  const setStatsList: SetStat[] = (Object.values(setStatsMap) as SetStat[]).sort((a, b) => a.setNumber - b.setNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl text-slate-800 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Question Attempt Timer
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Current Timer & Large Control */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-4 shadow-2xs">
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md border border-indigo-200">
                Set #{currentSet}
              </span>
              <span>•</span>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Question #{questionNum}
              </span>
            </div>

            <div className="text-5xl font-mono font-extrabold tracking-wider text-slate-900">
              {formatTime(elapsedSec)}
            </div>

            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={handleStartStop}
                className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center font-bold text-xs tracking-wider transition-all shadow-md cursor-pointer ${
                  isRunning
                    ? 'bg-rose-50 border-rose-600 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-50 border-emerald-600 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {isRunning ? (
                  <>
                    <Square className="w-8 h-8 fill-current mb-1" />
                    <span>STOP & LOG</span>
                  </>
                ) : (
                  <>
                    <Play className="w-8 h-8 fill-current mb-1 pl-1" />
                    <span>START Q{questionNum}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1 text-xs">
              <button
                onClick={handleNewSet}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                New Set
              </button>

              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 bg-white hover:bg-rose-50 text-rose-600 font-semibold px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
              </button>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-3 text-center bg-slate-50 p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Questions</p>
              <p className="text-base font-extrabold text-slate-900">{totalQuestionsLogged}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Total Time</p>
              <p className="text-base font-extrabold text-slate-900">{formatTime(totalTimeSec)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Avg Pace / Question</p>
              <p className="text-base font-extrabold text-emerald-600">{avgTimePerQuestion}s</p>
            </div>
          </div>

          {/* Set-by-Set Performance Comparison */}
          {setStatsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileBarChart2 className="w-4 h-4 text-indigo-600" /> Set-by-Set Performance Comparison
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-indigo-50/70 text-indigo-950 border-b border-indigo-100 font-bold">
                    <tr>
                      <th className="p-2.5">Set Name</th>
                      <th className="p-2.5 text-center">Questions</th>
                      <th className="p-2.5 text-center">Total Duration</th>
                      <th className="p-2.5 text-right">Avg Pace / Q</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {setStatsList.map((st, idx) => {
                      const avgPace = st.count > 0 ? Math.round(st.totalSecs / st.count) : 0;
                      const prevAvg = idx > 0 && setStatsList[idx - 1].count > 0
                        ? Math.round(setStatsList[idx - 1].totalSecs / setStatsList[idx - 1].count)
                        : null;
                      
                      let diffLabel = null;
                      if (prevAvg !== null) {
                        const diff = avgPace - prevAvg;
                        if (diff < 0) {
                          diffLabel = <span className="text-[10px] text-emerald-600 font-bold ml-1.5">({Math.abs(diff)}s faster)</span>;
                        } else if (diff > 0) {
                          diffLabel = <span className="text-[10px] text-rose-600 font-medium ml-1.5">({diff}s slower)</span>;
                        } else {
                          diffLabel = <span className="text-[10px] text-slate-400 font-medium ml-1.5">(same pace)</span>;
                        }
                      }

                      return (
                        <tr key={st.setNumber} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-bold text-indigo-700">Set #{st.setNumber}</td>
                          <td className="p-2.5 text-center font-semibold text-slate-700">{st.count} Qs</td>
                          <td className="p-2.5 text-center font-mono font-medium text-slate-800">{formatTime(st.totalSecs)}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">
                            {avgPace}s
                            {diffLabel}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Laps History Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-emerald-600" /> Attempt Logs
              </h4>
              <span className="text-[11px] text-slate-400">
                {laps.length} logged attempts
              </span>
            </div>

            <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold sticky top-0 bg-white">
                  <tr>
                    <th className="p-2.5">Set</th>
                    <th className="p-2.5">Question</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5 text-right">Time Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {laps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                        No attempts recorded yet. Click Start to log question time.
                      </td>
                    </tr>
                  ) : (
                    laps.map((lap) => (
                      <tr key={lap.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-900">Set #{lap.setNumber}</td>
                        <td className="p-2.5 font-medium text-slate-700">Q{lap.questionNum}</td>
                        <td className="p-2.5 font-mono text-emerald-700 font-bold">
                          {formatTime(lap.durationSec)}
                        </td>
                        <td className="p-2.5 text-right text-slate-500">
                          {new Date(lap.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Dedicated Fixed Footer */}
        <div className="border-t border-slate-200 p-4 shrink-0 flex justify-end bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Timer
          </button>
        </div>
      </div>

      {/* Reset Confirmation Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-5 text-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Reset All Timer Data?
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete all recorded attempt logs and reset sets to #1? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={performResetAll}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
