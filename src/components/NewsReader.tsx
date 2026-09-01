import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Settings,
  Clock,
  Play,
  Pause,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Star,
  FileText,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { Article, UserSettings } from '../types';

interface NewsReaderProps {
  settings: UserSettings;
  onOpenSettings: () => void;
  onOpenAnalytics?: () => void;
  onStartQuiz: (
    articleTitle: string,
    articleUrl: string,
    isPriority: boolean,
    readingTimeSec: number
  ) => void;
  onOpenWordPower: () => void;
}

const CATEGORY_NAMES = [
  'Business & Economics',
  'Science & Technology',
  'Philosophy & Psychology',
  'History • Society • Culture',
];

export const NewsReader: React.FC<NewsReaderProps> = ({
  settings,
  onOpenSettings,
  onOpenAnalytics,
  onStartQuiz,
  onOpenWordPower,
}) => {
  const [categories, setCategories] = useState<Record<string, Article[]>>({});
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>('Never synced');
  const [syncStatus, setSyncStatus] = useState('Intelligence feed segregated by domain.');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Business & Economics': false,
    'Science & Technology': false,
    'Philosophy & Psychology': false,
    'History • Society • Culture': false,
  });

  // Reading Timer state
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>('');
  const [activeIsPriority, setActiveIsPriority] = useState<boolean>(false);
  const [timerState, setTimerState] = useState<'idle' | 'reading' | 'paused' | 'finished'>('idle');
  const [seconds, setSeconds] = useState(0);

  // Timer interval effect
  useEffect(() => {
    let interval: any = null;
    if (timerState === 'reading') {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerState]);

  // Sync Feeds
  const fetchNews = async () => {
    setLoading(true);
    setSyncStatus('Fetching RSS feeds...');
    try {
      const res = await fetch('/api/rss');
      if (!res.ok) {
        console.error("RSS API failed:", res.status);
        setCategories([]); // Or whatever your empty state is
        return;
      }
      const data = await res.json();

      if (data.success && data.categories) {
        const keywords = (settings.focusKeywords || '')
          .split(',')
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean);

        const processed: Record<string, Article[]> = {};
        let totalCount = 0;

        Object.entries(data.categories as Record<string, any[]>).forEach(
          ([category, articles]) => {
            const mapped: Article[] = articles.map((art, idx) => {
              const titleLower = art.title.toLowerCase();
              const score = keywords.reduce(
                (count, kw) => (titleLower.includes(kw) ? count + 1 : count),
                0
              );
              return {
                id: `${category}_${idx}_${Date.now()}`,
                title: art.title,
                link: art.link,
                source: art.source || 'RSS Feed',
                snippet: art.snippet,
                category,
                isPriority: score > 0,
                score,
              };
            });

            // Sort priority first
            mapped.sort((a, b) => b.score - a.score);
            processed[category] = mapped;
            totalCount += mapped.length;
          }
        );

        setCategories(processed);
        const now = new Date();
        setLastSynced(`Last synced ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        setSyncStatus(`✅ ${totalCount} articles loaded · ${now.toLocaleDateString()}`);
      } else {
        setSyncStatus('Failed to load RSS feeds.');
      }
    } catch (err: any) {
      setSyncStatus(`❌ Sync error: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [settings.focusKeywords]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleOpenArticle = (art: Article) => {
    setActiveUrl(art.link);
    setActiveTitle(art.title);
    setActiveIsPriority(art.isPriority);
    setSeconds(0);
    setTimerState('reading');

    // Open article in new tab
    window.open(art.link, '_blank', 'noopener,noreferrer');
  };

  const handlePauseTimer = () => {
    if (timerState === 'reading') setTimerState('paused');
  };

  const handleResumeTimer = () => {
    if (timerState === 'paused') setTimerState('reading');
  };

  const handleFinishReading = () => {
    if (!activeUrl || !activeTitle) return;
    const finalSecs = seconds;
    setTimerState('finished');

    // Launch Quiz Modal
    onStartQuiz(activeTitle, activeUrl, activeIsPriority, finalSecs);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to extract clean publisher source
  const getArticleSource = (art: Article) => {
    const genericList = ['latest updates', 'rss feed', 'latest articles', 'feed', 'uncategorized', 'latest', 'news source', 'articles'];
    const src = (art.source || '').trim();

    if (src && !genericList.includes(src.toLowerCase())) {
      return src;
    }

    try {
      const url = new URL(art.link);
      const host = url.hostname.replace(/^www\./, '');
      if (host) {
        const domainMap: Record<string, string> = {
          'economist.com': 'Economist.com',
          'econlib.org': 'Econlib.org',
          'imf.org': 'IMF Blogs',
          'indiatimes.com': 'Economic Times',
          'cnbc.com': 'CNBC',
          'realclearmarkets.com': 'RealClearMarkets',
          'phys.org': 'Phys.org',
          'brookings.edu': 'Brookings',
          'mises.org': 'Mises Institute',
          'dj.com': 'Wall Street Journal',
          'ft.com': 'Financial Times',
          'sciam.com': 'Scientific American',
          'nature.com': 'Nature.com',
          'quantamagazine.org': 'Quanta Magazine',
          'space.com': 'Space.com',
          'theconversation.com': 'The Conversation',
          'nautil.us': 'Nautilus',
          'technologyreview.com': 'MIT Tech Review',
          'arstechnica.com': 'Ars Technica',
          'aeon.co': 'Aeon.co',
          'psyche.co': 'Psyche.co',
          'psychologytoday.com': 'Psychology Today',
          'jstor.org': 'JSTOR Daily',
          'smithsonianmag.com': 'Smithsonian Magazine',
          'aldaily.com': 'Arts & Letters Daily',
        };
        for (const [d, name] of Object.entries(domainMap)) {
          if (host.includes(d)) return name;
        }
        return host.charAt(0).toUpperCase() + host.slice(1);
      }
    } catch (e) {}

    return 'News Source';
  };

  return (
    <div className="flex-1 flex flex-col space-y-5 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              GLOBAL INTELLIGENCE STAND
            </h1>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <button
              onClick={onOpenSettings}
              className="text-xs text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer settings-button"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span>Keywords / Info Settings</span>
            </button>
            {onOpenAnalytics && (
              <button
                onClick={onOpenAnalytics}
                className="text-xs text-slate-700 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-md flex items-center gap-1 font-semibold transition-colors cursor-pointer analytics-button"
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quiz Analytics</span>
              </button>
            )}
          </div>
        </div>

        {/* WORD POWER BUTTON */}
        <button
          onClick={onOpenWordPower}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md transition-all cursor-pointer shrink-0 self-start sm:self-auto word-power-button"
        >
          <Sparkles className="w-4 h-4" />
          <div className="flex flex-col items-start leading-tight">
            <span>WORD POWER</span>
            <span className="text-[9px] text-yellow-300 font-medium">for Competitive Exams</span>
          </div>
        </button>

        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto sync-feeds-button"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Syncing Feeds...' : 'Sync Feeds'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-5 flex flex-col space-y-4 overflow-hidden shadow-xs news-feed-area">
        {/* Subheader & legend */}
        <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-3 shrink-0">
          <div className="space-y-0.5">
            <p className="text-slate-600">
              <strong className="text-slate-900">Curated news consumption</strong> with AI-powered priority filtering & reading comprehension quizzes.
            </p>
            <p className="text-[10px] text-slate-400 italic">
              🔹 Indigo tint = ⭐ priority article &nbsp;|&nbsp; Light blue highlight = currently reading
            </p>
          </div>
          <span className="text-[10px] text-slate-400 italic hidden md:block">
            {lastSynced}
          </span>
        </div>

        {/* Reading Stopwatch Bar */}
        {activeUrl && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="bg-white border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-2 font-mono text-base font-bold text-indigo-700 shadow-xs">
                <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>{formatTimer(seconds)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 block line-clamp-1 max-w-sm">
                  {activeTitle}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {timerState === 'reading' && 'Reading in progress...'}
                  {timerState === 'paused' && 'Timer Paused'}
                  {timerState === 'finished' && 'Reading session completed!'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {timerState === 'reading' && (
                <button
                  onClick={handlePauseTimer}
                  className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}

              {timerState === 'paused' && (
                <button
                  onClick={handleResumeTimer}
                  className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              )}

              <button
                onClick={handleFinishReading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-1.5 rounded-md flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Finish & Take AI-generated Quiz
              </button>
            </div>
          </div>
        )}

        {/* Categories Feed List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {loading && Object.keys(categories).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs italic">Syncing global RSS feeds...</p>
            </div>
          ) : (
            CATEGORY_NAMES.map((catName) => {
              const catArticles = categories[catName] || [];
              const isExpanded = expandedCategories[catName] ?? false;

              return (
                <div
                  key={catName}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                >
                  {/* Category Banner */}
                  <button
                    onClick={() => toggleCategory(catName)}
                    className="w-full bg-slate-50 hover:bg-slate-100 p-3 flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-indigo-600" />
                      )}
                      <h3 className="font-bold text-sm text-slate-800">
                        {catName}
                      </h3>
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {catArticles.length} items
                      </span>
                    </div>
                  </button>

                  {/* Articles list */}
                  {isExpanded && (
                    <div className="p-3 space-y-2.5">
                      {catArticles.length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-2">
                          No articles fetched for this domain.
                        </p>
                      ) : (
                        catArticles.map((art, idx) => {
                          const isCurrentlyReading = activeUrl === art.link;

                          return (
                            <div
                              key={art.id || idx}
                              className={`p-3 rounded-lg border transition-all ${
                                isCurrentlyReading
                                  ? 'bg-sky-50 border-sky-300 shadow-xs'
                                  : art.isPriority
                                  ? 'bg-indigo-50/50 border-indigo-200 hover:border-indigo-300'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">
                                      {idx + 1}.
                                    </span>
                                    <h4 className="text-xs font-semibold text-slate-800 leading-snug">
                                      {art.title}
                                    </h4>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                                    <span className="bg-slate-200/80 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                                      <FileText className="w-3 h-3 text-slate-500" />
                                      <span>Source: {getArticleSource(art)}</span>
                                    </span>
                                    {art.isPriority && (
                                      <span className="text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current text-amber-500" /> Priority Match
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleOpenArticle(art)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-md flex items-center gap-1 font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Open Article</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};