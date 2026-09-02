// src/components/InstallPrompt.tsx
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isStandalone);
    if (isStandalone) return; // Don't show prompt if already installed

    // Check if iOS (Safari)
    const userAgent = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setShowPrompt(false);
        console.log('User accepted install');
      } else {
        console.log('User dismissed install');
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show if already installed or not supported
  if (isStandalone) return null;

  // iOS fallback – show a static message with instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 p-3 text-white text-xs flex items-center justify-between gap-2">
        <div className="flex-1">
          <span className="font-bold">📲 Install this app</span>
          <p className="text-slate-300">Tap the Share button and select "Add to Home Screen".</p>
        </div>
        <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // For other browsers (Chrome, Edge) – show the install button
  return showPrompt ? (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700 p-3 text-white text-xs flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 flex-1">
        <Download className="w-5 h-5 text-indigo-400" />
        <div>
          <span className="font-bold">Install App</span>
          <p className="text-slate-300">Get the full experience with offline access.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold text-white text-xs transition-colors"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;
};