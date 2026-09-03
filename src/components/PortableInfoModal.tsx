import React, { useState } from 'react';
import { HardDrive, X, ShieldAlert } from 'lucide-react';
import { saveSettings } from '../utils/storage';

interface PortableInfoModalProps {
  onClose: () => void;
}

export const PortableInfoModal: React.FC<PortableInfoModalProps> = ({ onClose }) => {
  const [dontShow, setDontShow] = useState(false);

  const handleClose = () => {
    if (dontShow) {
      saveSettings({ showPortableInfo: false });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-6 text-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-indigo-600">
            <HardDrive className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">Data Storage Location</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-slate-700">
          <p>
            Your data is stored securely in your browser's local storage (<code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-semibold">localStorage</code>).
            No data is saved on any external server — everything remains strictly on your device.
          </p>

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <strong className="text-amber-900 font-bold">Note:</strong> Clearing your browser's site cookies or cache will permanently reset your local progress, including word power puzzle for the day, study projects, calendar tasks, quiz history, and analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="rounded bg-white border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            Don't show this again
          </label>

          <button
            onClick={handleClose}
            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
