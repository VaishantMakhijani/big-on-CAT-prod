const TRACK_VISIT_KEY = 'bp_visit_date';
const TRACK_WORDPOWER_KEY = 'bp_wordpower_date';

function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
  return istTime.toISOString().split('T')[0];
}

async function sendTrack(type: 'visit' | 'wordpower') {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  } catch (e) {
    // Silently fail – analytics should not break the user experience
    console.warn('Tracking failed:', e);
  }
}

export function trackVisit() {
  const today = getTodayIST();
  const stored = localStorage.getItem(TRACK_VISIT_KEY);
  if (stored !== today) {
    localStorage.setItem(TRACK_VISIT_KEY, today);
    sendTrack('visit');
  }
}

export function trackWordPower() {
  const today = getTodayIST();
  const stored = localStorage.getItem(TRACK_WORDPOWER_KEY);
  if (stored !== today) {
    localStorage.setItem(TRACK_WORDPOWER_KEY, today);
    sendTrack('wordpower');
  }
}