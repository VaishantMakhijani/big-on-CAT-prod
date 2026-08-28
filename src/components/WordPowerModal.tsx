import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, RotateCcw, AlertTriangle, Clock, CheckCircle2, Brain, Star, XCircle, HelpCircle } from 'lucide-react';
import { WordPowerPuzzle, WordPowerProgress, WordPowerWord } from '../types';
import { getWordPowerProgress, saveWordPowerProgress, clearWordPowerProgress } from '../utils/storage';

interface WordPowerModalProps {
  onClose: () => void;
}

function getScore(wordLength: number): number {
  if (wordLength === 4) return 1;
  if (wordLength === 5) return 2;
  if (wordLength === 6) return 3;
  if (wordLength === 7) return 5;
  return 11;
}

export const WordPowerModal: React.FC<WordPowerModalProps> = ({ onClose }) => {
  const [puzzle, setPuzzle] = useState<WordPowerPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundDetails, setFoundDetails] = useState<WordPowerWord[]>([]);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [showRevealConfirm, setShowRevealConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // NEW: Help Modal state
  const [inputWord, setInputWord] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const [revealMode, setRevealMode] = useState<'none' | 'simple' | 'full'>('none');
  const [userFoundCount, setUserFoundCount] = useState(0);
  const [userFoundWordsSnapshot, setUserFoundWordsSnapshot] = useState<string[]>([]);
  
  const [shuffledOuterLetters, setShuffledOuterLetters] = useState<string[]>([]);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const loadPuzzle = async () => {
      try {
        // 1. Fetch puzzle from server
        let res = await fetch('/api/get-puzzle'); // CHANGED FROM const TO let
        const text = await res.text();
        if (!text) throw new Error('Puzzle data is empty. Please regenerate the puzzle.');

        // Fail-safe: If the puzzle doesn't exist yet, force the generator to create it, then fetch again!
        if (!res.ok) {
          console.log("Puzzle not found, generating a new one now...");
          await fetch('/api/generate-puzzle'); // Trigger generation
          res = await fetch('/api/get-puzzle'); // Reassigning res (this works now)
        }

        let rawData;
        try {
          rawData = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse puzzle JSON:', text);
          throw new Error('Puzzle data is corrupted.');
        }

        const puzzleData: WordPowerPuzzle = {
          date: rawData.generatedDate || new Date().toISOString().split('T')[0],
          letters: [rawData.centralLetter, ...rawData.puzzleWord.split('').filter((l: string) => l !== rawData.centralLetter)],
          targetCount: rawData.words.length,
          validWords: rawData.words.map((w: any) => w.word),
          allWords: rawData.words.map((w: any) => ({
            word: w.word,
            definition: w.definition,
            example: w.usage || w.example || 'No example available.'
          })),
        };
        puzzleData.wordDetails = puzzleData.allWords;

        setPuzzle(puzzleData);
        setShuffledOuterLetters(puzzleData.letters.slice(1));

        if (puzzleData.targetCount === 0) {
          clearWordPowerProgress();
          setFoundWords([]);
          setFoundDetails([]);
          setScore(0);
          setStartTime(Date.now());
          setElapsed(0);
          setCompleted(false);
          setMessage({ text: 'No valid words found for today\'s puzzle. Try again tomorrow!', type: 'info' });
          setLoading(false);
          return;
        }

        const saved = getWordPowerProgress();
        if (saved && saved.puzzleDate === puzzleData.date) {
          setFoundWords(saved.foundWords);
          setUserFoundWordsSnapshot(saved.foundWords);
          const details = puzzleData.allWords.filter(w => saved.foundWords.includes(w.word));
          setFoundDetails(details);
          setScore(saved.score);
          setStartTime(saved.startTime);
          setElapsed(saved.elapsedSeconds);
          setCompleted(saved.completed);
          if (saved.completed) setUserFoundCount(saved.foundWords.length);
        } else {
          clearWordPowerProgress();
          setFoundWords([]);
          setFoundDetails([]);
          setScore(0);
          setStartTime(Date.now());
          setElapsed(0);
          setCompleted(false);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load puzzle');
      } finally {
        setLoading(false);
      }
    };

    loadPuzzle();
  }, []);

  useEffect(() => {
    if (completed || loading) return;
    timerRef.current = window.setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [completed, loading]);

  useEffect(() => {
    if (!puzzle || loading || completed) return;
    const progress: WordPowerProgress = {
      puzzleDate: puzzle.date,
      foundWords,
      startTime,
      elapsedSeconds: elapsed,
      score,
      completed: false,
    };
    saveWordPowerProgress(progress);
  }, [foundWords, elapsed, score, puzzle, loading, completed, startTime]);

  // Natural completion
  useEffect(() => {
    if (!puzzle || completed) return;
    if (puzzle.targetCount === 0) return;
    if (foundWords.length === puzzle.targetCount) {
      setCompleted(true);
      setUserFoundCount(foundWords.length);
      setUserFoundWordsSnapshot(foundWords);
      saveWordPowerProgress({
        puzzleDate: puzzle.date,
        foundWords,
        startTime,
        elapsedSeconds: elapsed,
        score,
        completed: true,
      });
    }
  }, [foundWords, puzzle, completed, elapsed, score, startTime]);

  const getLetterCounts = (word: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const char of word) counts[char] = (counts[char] || 0) + 1;
    return counts;
  };

  const updateInputWord = (newWord: string) => {
    if (!puzzle) return;
    const puzzleCounts = getLetterCounts(puzzle.letters.join(''));
    const wordCounts = getLetterCounts(newWord);
    for (const letter in wordCounts) {
      if (wordCounts[letter] > puzzleCounts[letter]) {
        setFlashMessage('Each letter can be used only once');
        setTimeout(() => setFlashMessage(null), 1500);
        return;
      }
    }
    setInputWord(newWord);
  };

  const handleShuffle = () => {
    const baseLetters = shuffledOuterLetters.length > 0 ? shuffledOuterLetters : puzzle!.letters.slice(1);
    const arr = [...baseLetters];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledOuterLetters(arr);
  };

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puzzle || completed) return;
    const word = inputWord.trim().toLowerCase();
    if (!word) return;

    const centreLetter = puzzle.letters[0]; // Need to define this here for the message logic

    // 1. NEW: Check if it's too short
    if (word.length < 4) {
      setMessage({ text: 'This word is too short.', type: 'error' });
      setInputWord('');
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // 2. NEW: Check if central letter is missing
    if (!word.includes(centreLetter)) {
      setMessage({ text: 'Central letter missing.', type: 'error' });
      setInputWord('');
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // 3. Prevent overuse of letters on submit (for pasted words)
    const puzzleCounts = getLetterCounts(puzzle.letters.join(''));
    const wordCounts = getLetterCounts(word);
    for (const letter in wordCounts) {
      if (wordCounts[letter] > puzzleCounts[letter]) {
        setMessage({ text: 'Each letter can be used only once', type: 'error' });
        setInputWord('');
        setTimeout(() => setMessage(null), 2000);
        return;
      }
    }

    // 4. Check if it's a valid word
    if (!puzzle.validWords.includes(word)) {
      setMessage({ text: `"${word}" is not a valid word. Plurals and improper words are not allowed.`, type: 'error' });
      setInputWord('');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (foundWords.includes(word)) {
      setMessage({ text: `"${word}" already found!`, type: 'error' });
      setInputWord('');
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const wordData = puzzle.allWords.find(w => w.word === word);
    const definition = wordData?.definition || 'No definition available.';
    const example = wordData?.example || 'No example available.';

    setFoundWords(prev => [...prev, word]);
    setUserFoundWordsSnapshot(prev => [...prev, word]);
    setFoundDetails(prev => [...prev, { word, definition, example }]);
    const wordScore = getScore(word.length);
    setScore(prev => prev + wordScore);
    setMessage({ text: `✅ "${word}" – ${wordScore} point${wordScore > 1 ? 's' : ''}!`, type: 'success' });
    setInputWord('');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReveal = () => setShowRevealConfirm(true);

  const confirmReveal = () => {
    if (!puzzle) return;
    
    setUserFoundCount(foundWords.length);
    setUserFoundWordsSnapshot(foundWords);
    setCompleted(true);
    
    saveWordPowerProgress({
      puzzleDate: puzzle.date,
      foundWords,
      startTime,
      elapsedSeconds: elapsed,
      score,
      completed: true,
    });
    
    setShowRevealConfirm(false);
    setRevealMode('full');
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-8 text-white shadow-2xl flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-400">Loading today's puzzle...</p>
        </div>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 text-white shadow-2xl max-w-sm text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-300">{error || 'Puzzle unavailable'}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-semibold transition-colors">Close</button>
        </div>
      </div>
    );
  }

  const centreLetter = puzzle.letters[0];
  const outerLetters = shuffledOuterLetters.length > 0 ? shuffledOuterLetters : puzzle.letters.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 text-[#E8E6E3] shadow-2xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A2520] pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Word Power</h2>
            {/* NEW: Help Button */}
            <button
              onClick={() => setShowHelp(true)}
              title="How to play"
              className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 transition-colors cursor-pointer">
              <HelpCircle className="w-4 h-4" /> Help
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Info bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 py-2 border-b border-[#2A2520] shrink-0">
          <span>🎯 {foundWords.length} / {puzzle.targetCount} found</span>
          <span>⭐ Score: {score}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(elapsed)}</span>
          <span className="text-[10px] text-slate-500">Resets daily at around 12:00 midnight IST</span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex flex-col md:flex-row gap-6 h-full">
            
            {/* Left side: Wheel */}
            <div className="flex-shrink-0 flex flex-col items-center justify-start pt-4 pb-4">
              <div className="relative w-64 h-64 mx-auto">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {outerLetters.map((letter, idx) => {
                    const angle = (idx / 8) * 360 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const cx = 100 + 65 * Math.cos(rad);
                    const cy = 100 + 65 * Math.sin(rad);
                    return (
                      <g key={idx}
                        onClick={() => { if (!completed) { updateInputWord(inputWord + letter); document.getElementById('word-input')?.focus(); } }}
                        className="cursor-pointer hover:opacity-80 transition-opacity">
                        <circle cx={cx} cy={cy} r={20} fill="#2A2520" stroke="#3A3530" strokeWidth="2" />
                        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="20" fontWeight="bold" fill="#E8E6E3" className="select-none">{letter.toUpperCase()}</text>
                      </g>
                    );
                  })}
                  <g
                    onClick={() => { if (!completed) { updateInputWord(inputWord + centreLetter); document.getElementById('word-input')?.focus(); } }}
                    className="cursor-pointer hover:opacity-80 transition-opacity">
                    <circle cx={100} cy={100} r={32} fill="#4F46E5" stroke="#6366F1" strokeWidth="3" />
                    <text x={100} y={106} textAnchor="middle" fontSize="26" fontWeight="bold" fill="#FFFFFF" className="select-none">{centreLetter.toUpperCase()}</text>
                  </g>
                </svg>
                <p className="text-center text-[10px] text-slate-500 mt-2">
                  Every word must contain central letter <span className="text-indigo-400 font-bold">{centreLetter.toUpperCase()}</span>
                </p>
                <button onClick={handleShuffle} className="mt-4 mx-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#2A2520] hover:bg-[#3A3530] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                  <RotateCcw className="w-3 h-3" /> Re-shuffle Letters
                </button>
              </div>
            </div>

            {/* Right side: Input, Found Words, Reveal */}
            <div className="flex-1 min-w-0 flex flex-col">
              
              {/* Top: Input & Messages */}
              <div className="space-y-4 shrink-0">
                <form onSubmit={handleSubmitWord} className="flex gap-2">
                  <input
                    id="word-input"
                    type="text"
                    value={inputWord}
                    onChange={(e) => updateInputWord(e.target.value.toLowerCase())}
                    placeholder="Type a word..."
                    disabled={completed}
                    className="flex-1 bg-[#141414] border border-[#2A2520] rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                  <button type="submit" disabled={completed || !inputWord} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">Submit</button>
                </form>

                {flashMessage && (
                  <div className="text-xs px-3 py-2 rounded-md bg-rose-900/50 text-rose-300 border border-rose-800/50">{flashMessage}</div>
                )}

                {message && (
                  <div className={`text-xs px-3 py-2 rounded-md ${message.type === 'success' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-800/50' : 'bg-rose-900/50 text-rose-300 border border-rose-800/50'}`}>{message.text}</div>
                )}
              </div>

              {/* Middle: Found Words */}
              <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                {foundDetails.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Found Words</h4>
                    <div className="space-y-2">
                      {foundDetails.slice().reverse().map((item, idx) => (
                        <div key={idx} className="bg-[#141414] border border-[#2A2520] rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-300 text-sm">{item.word}</span>
                            <span className="text-xs text-emerald-400">+{getScore(item.word.length)} pts</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 italic">“{item.definition}”</p>
                          {item.example && <p className="text-xs text-slate-500 mt-0.5">📖 {item.example}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom: Two Buttons OR Reveal */}
              <div className="mt-auto pt-4 shrink-0">
                {completed && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setRevealMode('simple')} 
                      className="flex-1 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                    >
                      Complete Word List
                    </button>
                    <button 
                      onClick={() => setRevealMode('full')} 
                      className="flex-1 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      Complete Word List with Meanings
                    </button>
                  </div>
                )}

                {!completed && (
                  <button onClick={handleReveal} className="w-full py-2 text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-800/50 hover:border-amber-700 rounded-lg transition-colors bg-amber-950/20">
                    Reveal remaining words ({puzzle.targetCount - foundWords.length})
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A2520] pt-3 shrink-0 flex items-center justify-between gap-4">
          <p className="text-[10px] text-slate-500 leading-relaxed max-w-[70%]">
            <span className="font-bold">Disclaimer:</span> In absence of a reliable free source, the puzzle relies on a mix of non-AI and AI dependent actions to generate the word list and meanings. You may find a few words missing or some definitions a little off. However, in testing we have seen that the accuracy is close to 95%.
          </p>
          <button onClick={onClose} className="px-6 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shrink-0">Close</button>
        </div>

        {/* Reveal confirmation */}
        {showRevealConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 max-w-sm w-full text-white space-y-4">
              <h3 className="font-bold text-lg">Reveal all words?</h3>
              <p className="text-sm text-slate-300">This will show all remaining words and end the game. You cannot undo this.</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowRevealConfirm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button onClick={confirmReveal} className="px-4 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">OK, Reveal</button>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#2A2520] pb-2">
                <h3 className="text-lg font-bold">Word Wheel: 9 Letters</h3>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed">
                The aim of the game is to find words using letters in the Word wheel to meet the target. The target does not include every possible acceptable word.
              </p>
              
              <ul className="text-sm text-slate-300 space-y-2 list-disc pl-5">
                <li>Every word must contain the letter in the centre of the wheel.</li>
                <li>Each letter can only be used once in a word.</li>
                <li>Words must be at least four letters long.</li>
                <li>Plurals and proper nouns are not allowed.</li>
                <li>Longer words earn more points.</li>
                <li>Every wheel has a nine-letter word.</li>
              </ul>

              <button 
                onClick={() => setShowHelp(false)} 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-bold transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}

        {/* Popup Logic (Simple vs Full) */}
        {revealMode !== 'none' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[#1A1A1A] border border-[#2A2520] rounded-xl p-6 max-w-4xl w-full text-white space-y-4 shadow-2xl h-[85vh] flex flex-col">
              <h3 className="text-lg font-bold text-center border-b border-[#2A2520] pb-2 shrink-0">
                {revealMode === 'full' ? 'All Words with Meanings' : 'All Words'}
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-4 gap-4">
                  {puzzle.allWords
                    .slice()
                    .sort((a, b) => a.word.localeCompare(b.word))
                    .map((item) => {
                      const isFound = userFoundWordsSnapshot.includes(item.word);
                      const isPuzzleWord = item.word.length === 9;
                      return (
                        <div key={item.word} className="bg-[#141414] border border-[#2A2520] rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm">
                            {isFound ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <span className={`${isFound ? 'text-white font-bold' : 'text-slate-400'} capitalize`}>{item.word}</span>
                            {isPuzzleWord && (
                              isFound ? (
                                <Star className="w-3 h-3 text-emerald-400 fill-emerald-400 ml-auto shrink-0" />
                              ) : (
                                <Star className="w-3 h-3 text-rose-500 fill-rose-500 ml-auto shrink-0" />
                              )
                            )}
                          </div>
                          {revealMode === 'full' && (
                            <>
                              <p className="text-xs text-slate-400 mt-2">“{item.definition}”</p>
                              {item.example && <p className="text-[10px] text-slate-600 mt-1">📖 {item.example}</p>}
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <button 
                onClick={() => setRevealMode('none')} 
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-bold transition-colors shrink-0"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
