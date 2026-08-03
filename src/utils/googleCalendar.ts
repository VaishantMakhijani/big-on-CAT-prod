import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
console.log("FIREBASE_KEY_TEST:", import.meta.env.VITE_FIREBASE_API_KEY);
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
// Initialize Firebase (keep your existing initializeApp line below this)

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');

let isSigningIn = false;
let cachedAccessToken: string | null =
  typeof window !== 'undefined' ? sessionStorage.getItem('gcal_token') : null;

export const setCachedToken = (token: string | null) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('gcal_token', token);
    } else {
      sessionStorage.removeItem('gcal_token');
    }
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = sessionStorage.getItem('gcal_token');
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthSuccess) onAuthSuccess(user, '');
      }
    } else {
      setCachedToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google Calendar access token');
    }

    setCachedToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  setCachedToken(null);
  await signOut(auth);
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface TaskCalendarData {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
}

function parseDateTimeToIso(dateStr: string, timeStr?: string, defaultTime = '09:00'): string {
  const cleanTime = timeStr && timeStr.includes(':') ? timeStr : defaultTime;
  const [hhStr, mmStr] = cleanTime.split(':');
  const hh = parseInt(hhStr, 10) || 0;
  const mm = parseInt(mmStr, 10) || 0;

  const parts = (dateStr || '').split('-').map((p) => parseInt(p, 10));
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;
  let day = new Date().getDate();

  if (parts.length === 3) {
    if (parts[0] > 1000) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else if (parts[2] > 1000) {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  }

  const d = new Date(year, month - 1, day, hh, mm, 0);
  return d.toISOString();
}

export const createGoogleCalendarEvent = async (
  task: TaskCalendarData,
  token: string
): Promise<{ eventId: string; htmlLink: string } | null> => {
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startIso = parseDateTimeToIso(task.date, task.startTime, '09:00');
    const endIso = parseDateTimeToIso(task.date, task.endTime, '10:00');

    const body = {
      summary: task.title || 'Study Task',
      description: (task.description || '') + '\n\nSynced via Big on Productivity',
      start: {
        dateTime: startIso,
        timeZone: userTz,
      },
      end: {
        dateTime: endIso,
        timeZone: userTz,
      },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error creating calendar event:', res.status, errText);
      if (res.status === 401 || res.status === 403) setCachedToken(null);
      return null;
    }

    const data = await res.json();
    return { eventId: data.id, htmlLink: data.htmlLink };
  } catch (e) {
    console.error('Failed to create event in Google Calendar:', e);
    return null;
  }
};

export const updateGoogleCalendarEvent = async (
  eventId: string,
  task: TaskCalendarData,
  token: string
): Promise<boolean> => {
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const startIso = parseDateTimeToIso(task.date, task.startTime, '09:00');
    const endIso = parseDateTimeToIso(task.date, task.endTime, '10:00');

    const body = {
      summary: task.title || 'Study Task',
      description: (task.description || '') + '\n\nSynced via Big on Productivity',
      start: {
        dateTime: startIso,
        timeZone: userTz,
      },
      end: {
        dateTime: endIso,
        timeZone: userTz,
      },
    };

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Error updating calendar event:', res.status, errText);
      if (res.status === 401 || res.status === 403) setCachedToken(null);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Failed to update event in Google Calendar:', e);
    return false;
  }
};

export const deleteGoogleCalendarEvent = async (
  eventId: string,
  token: string
): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.ok || res.status === 404;
  } catch (e) {
    console.error('Failed to delete event from Google Calendar:', e);
    return false;
  }
};
