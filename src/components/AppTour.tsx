// src/components/AppTour.tsx
import React, { useState, useEffect } from 'react';
import * as Joyride from 'react-joyride';

// Define all tour steps
const TOUR_STEPS = [
  {
    target: 'body',
    content: '👋 Welcome to Big on Productivity! Let’s take a quick tour of the main features.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '.word-power-button',
    content: '🧠 **Word Power** – a daily word puzzle to build your vocabulary for competitive exams.',
    placement: 'bottom',
  },
  {
    target: '.news-feed-area',
    content: '📰 **Global Intelligence Stand** – read curated articles from RSS feeds. AI highlights priority items based on your keywords.',
    placement: 'left',
  },
  {
    target: '.sync-feeds-button',
    content: '🔄 **Sync Feeds** – refresh the news list manually.',
    placement: 'bottom',
  },
  {
    target: '.sidebar-study',
    content: '📚 **Study Progress** – track your PDF reading projects with deadlines and page goals.',
    placement: 'right',
  },
  {
    target: '.sidebar-calendar',
    content: '📅 **Calendar Manager** – plan tasks and sync them with Google Calendar.',
    placement: 'right',
  },
  {
    target: '.question-timer-button',
    content: '⏱️ **Question Timer** – log your attempt times for practice questions and track your speed.',
    placement: 'right',
  },
  {
    target: '.settings-button',
    content: '⚙️ **Settings** – add your Gemini API Key, focus keywords, and change calendar mode.',
    placement: 'bottom',
  },
  {
    target: '.analytics-button',
    content: '📊 **Quiz Analytics** – review your performance, accuracy, and strengths/weaknesses.',
    placement: 'bottom',
  },
  {
    target: 'body',
    content: '🎉 That’s it! Explore and enjoy. You can close this tour anytime.',
    placement: 'center',
  },
];

const TOUR_STORAGE_KEY = 'bp_tour_seen';

export const AppTour: React.FC = () => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      setRun(true);
      sessionStorage.setItem(TOUR_STORAGE_KEY, 'true');
    }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    if (status === Joyride.STATUS.FINISHED || status === Joyride.STATUS.SKIPPED) {
      setRun(false);
    }
  };

  return (
    <Joyride.default
      steps={TOUR_STEPS}
      run={run}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#4F46E5',
          textColor: '#0F172A',
          zIndex: 1000,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};