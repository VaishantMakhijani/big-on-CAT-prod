// src/components/AppTour.tsx
import React, { useState, useEffect } from 'react';
import Joyride from 'react-joyride';

// Define all tour steps – NEW ORDER:
// 1. Welcome
// 2. Word Power
// 3. News Feed (with AI quiz info, placement: 'right')
// 4. Quiz Analytics (moved here)
// 5. Sync Feeds
// 6. Study Progress
// 7. Calendar Manager
// 8. Question Timer
// 9. Settings
// 10. Closing
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
    content: '📰 **Global Intelligence Stand** – read curated articles from RSS feeds. AI highlights priority items based on your keywords.\n\n🤖 **AI Quiz**: After reading an article, you can answer AI-generated CAT-pattern questions (needs a free Gemini API key to be saved by the user).',
    placement: 'center', // Changed from 'left' to 'right' to avoid scrolling
  },
  {
    target: '.analytics-button',
    content: '📊 **Quiz Analytics** – review your performance, accuracy, and strengths/weaknesses across all your quiz attempts.',
    placement: 'bottom',
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
    target: 'body',
    content: '🎉 That’s it! Explore and enjoy. You can close this tour anytime.',
    placement: 'center',
  },
];

const TOUR_STORAGE_KEY = 'bp_tour_seen';

interface AppTourProps {
  onFinish?: () => void;
}

export const AppTour: React.FC<AppTourProps> = ({ onFinish }) => {
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
    if (status === 'finished' || status === 'skipped' || status === 'closed') {
      setRun(false);
      if (onFinish) {
        onFinish();
      }
    }
  };

  return (
    <Joyride
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