import React, { useState } from 'react';
import { X, Key, Tag, HardDrive, Eye, EyeOff, Calendar as CalendarIcon } from 'lucide-react';
import { UserSettings } from '../types';
import { saveSettings } from '../utils/storage';

interface SettingsModalProps {
  settings: UserSettings;
  onClose: () => void;
  onSave: (updated: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onClose,
  onSave,
}) => {
  const [keywords, setKeywords] = useState(settings.focusKeywords || '');
  const [apiKey, setApiKey] = useState(settings.geminiApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [calendarSyncMode, setCalendarSyncMode] = useState<'google' | 'local'>(
    settings.calendarSyncMode || 'google'
  );
  const [showPortableInfo, setShowPortableInfo] = useState(
    settings.showPortableInfo
  );

  const handleSave = () => {
    const updated = saveSettings({
      focusKeywords: keywords,
      geminiApiKey: apiKey,
      calendarSyncMode,
      showPortableInfo,
    });
    onSave(updated);
    onClose();
  };

  const handleResetPortableInfo = () => {
    setShowPortableInfo(true);
    saveSettings({ showPortableInfo: true });
    alert("Data location message will now show on startup.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-2xl space-y-6">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">
              System Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Focus Keywords */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Focus Keywords
          </label>
          <p className="text-xs italic text-slate-500">
            Keywords used to prioritize news articles. Articles containing these
            words get a ⭐ priority badge and indigo tint.
          </p>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g. AI, Tech, Markets, Economy"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
          />
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gemini API Key
            </label>
          </div>
          <p className="text-xs text-slate-500 italic">
            Required for generating AI-powered CAT Reading Comprehension questions. Your key is stored securely in your browser's local storage and never saved on any server.
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API Key here"
              className="w-full bg-white border border-slate-300 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Calendar Integration Choice */}
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Task Storage & Calendar Integration Mode
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Choose how you would like your study planner tasks and deadlines to be handled:
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label
              onClick={() => setCalendarSyncMode('google')}
              className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                calendarSyncMode === 'google'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="calendarSyncMode"
                checked={calendarSyncMode === 'google'}
                onChange={() => setCalendarSyncMode('google')}
                className="mt-0.5 accent-indigo-600 cursor-pointer"
              />
              <div>
                <span className="font-bold text-xs block text-slate-900">
                  📅 Google Calendar Integration
                </span>
                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                  Save tasks locally and attach/open 1-click Google Calendar sync events.
                </span>
              </div>
            </label>

            <label
              onClick={() => setCalendarSyncMode('local')}
              className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                calendarSyncMode === 'local'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="calendarSyncMode"
                checked={calendarSyncMode === 'local'}
                onChange={() => setCalendarSyncMode('local')}
                className="mt-0.5 accent-indigo-600 cursor-pointer"
              />
              <div>
                <span className="font-bold text-xs block text-slate-900">
                  🔒 Local Storage Only
                </span>
                <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                  Keep study tasks strictly stored inside the browser without Google Calendar links.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Portable Info */}
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Portable Data Location Info
              </p>
              <p className="text-xs text-slate-500">
                Shows data storage location details on startup.
              </p>
            </div>
            <button
              onClick={handleResetPortableInfo}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            >
              Reset Info Message
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
