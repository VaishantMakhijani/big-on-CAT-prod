import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

// --- Configuration ---
const WORDS_CSV = 'data/refined_and_checked_words.csv';
const USED_WORDS_FILE = 'data/used_words.json';
const PUZZLES_DIR = 'data/puzzles';

// Ensure directories exist
if (!fs.existsSync(PUZZLES_DIR)) {
  fs.mkdirSync(PUZZLES_DIR, { recursive: true });
}

// --- Helpers ---
function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + istOffset);
  return istTime.toISOString().split('T')[0];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function pickCentreLetter(word: string, seed: number): string {
  const index = seed % word.length;
  return word[index];
}

function shuffleLetters(word: string, seed: number): string[] {
  const letters = word.split('');
  // Use a more robust deterministic shuffle
  let rand = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    // Use a better pseudo-random generator
    rand = (rand * 1664525 + 1013904223) & 0xFFFFFFFF;
    const j = Math.floor((rand / 0xFFFFFFFF) * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}

// After shuffling, ensure centre letter is first
const shuffled = shuffleLetters(chosenWord, seed);
const centreIndex = shuffled.indexOf(centreLetter);
if (centreIndex > 0) {
  [shuffled[0], shuffled[centreIndex]] = [shuffled[centreIndex], shuffled[0]];
}

// --- Main generator ---
async function generatePuzzle() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('❌ GEMINI_API_KEY not set in .env file. Please add it and try again.');
  }

  const today = getTodayIST();
  console.log(`📅 Generating puzzle for ${today}...`);

  // 1. Load word list from CSV (skip header, extract first column)
  if (!fs.existsSync(WORDS_CSV)) {
    throw new Error(`❌ Word list file not found at ${WORDS_CSV}. Please place your CSV there.`);
  }
  const fileContent = fs.readFileSync(WORDS_CSV, 'utf-8');
  const lines = fileContent.split('\n');
  // Check if first line is header (contains "word" or "zipf")
  const header = lines[0].toLowerCase();
  const hasHeader = header.includes('word') || header.includes('zipf');
  const startIndex = hasHeader ? 1 : 0;

  const wordList: string[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Split by comma (handle quoted fields if needed)
    const parts = line.split(',');
    let word = parts[0].trim().toLowerCase();
    // Remove quotes if present
    if (word.startsWith('"') && word.endsWith('"')) {
      word = word.slice(1, -1);
    }
    // Only keep 9-letter words
    if (word.length === 9 && /^[a-z]+$/.test(word)) {
      wordList.push(word);
    }
  }

  if (wordList.length === 0) {
    throw new Error('❌ No valid 9‑letter words found in the CSV file.');
  }
  console.log(`✅ Loaded ${wordList.length} words from CSV.`);

  // 2. Load used words history
  let usedWords: Record<string, string> = {};
  if (fs.existsSync(USED_WORDS_FILE)) {
    usedWords = JSON.parse(fs.readFileSync(USED_WORDS_FILE, 'utf-8'));
  }

  // 3. Pick a word that hasn't been used yet (or reset if all used)
  let available = wordList.filter(w => !usedWords[w]);
  if (available.length === 0) {
    console.warn('⚠️ All words have been used. Resetting history.');
    usedWords = {};
    available = wordList;
  }

  const seed = hashString(today);
  const index = seed % available.length;
  const chosenWord = available[index];
  console.log(`📌 Chosen word: ${chosenWord}`);

  // 4. Pick centre letter (using same seed)
  const centreLetter = pickCentreLetter(chosenWord, seed);
  console.log(`🔠 Centre letter: ${centreLetter}`);

  // 5. Shuffle letters for the puzzle display (centre letter first)
  const shuffled = shuffleLetters(chosenWord, seed);
  // Remove the centre letter from the shuffled list to avoid duplication, then prepend it
  const othersCopy = [...shuffled];
  const centreIndex = othersCopy.indexOf(centreLetter);
  if (centreIndex !== -1) othersCopy.splice(centreIndex, 1);
  const letters = [centreLetter, ...othersCopy];

  // 6. Build the prompt
  const prompt = `You are a word game engine. I am building a word game.
The 9‑letter word is: ${chosenWord}
The centre letter (which must appear in every word) is: ${centreLetter}

Task: Find all valid English words (length 4 or more) that can be made using these letters, with the following rules:
- Every word must include the centre letter.
- Each letter can be used only as many times as it appears in the 9‑letter word.
  (e.g., if the word has two 'E's, you may use 'E' up to twice.)
- Exclude all archaic, offensive, or highly obscure words.
- Exclude plurals (i.e., words that are formed by adding 's' or 'es' to a singular).
- **Include the 9‑letter word itself** as one of the valid words.

For each valid word, provide:
- The word itself.
- A simple definition (if the word has multiple meanings, include the top 3 most common meanings).
- For each meaning, provide a short, clear example sentence.

Format the output as a single JSON object with the following structure:
{
  "words": [
    {
      "word": "example",
      "meanings": [
        {
          "definition": "a representative form or pattern",
          "example": "This is an example of good writing."
        }
      ]
    }
  ]
}

Return ONLY the JSON object – no additional text, no markdown, no explanation.`;

  // 7. Call Gemini
  const ai = new GoogleGenAI({ apiKey });
  console.log('🤖 Calling Gemini API...');
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.text?.trim() || '';
  let wordData;
  try {
    wordData = JSON.parse(rawText);
  } catch (err) {
    console.error('❌ Failed to parse Gemini response:', rawText);
    throw new Error('Invalid JSON from Gemini');
  }

  if (!wordData.words || !Array.isArray(wordData.words) || wordData.words.length === 0) {
    throw new Error('❌ Gemini returned no words. Check your prompt or API key.');
  }

  console.log(`✅ Gemini returned ${wordData.words.length} words.`);

  // 8. Build the final puzzle format
  const allWords = wordData.words.map((item: any) => ({
    word: item.word.toLowerCase(),
    definition: item.meanings.map((m: any) => m.definition).join('; '),
    example: item.meanings.map((m: any) => m.example).join('; '),
    meanings: item.meanings,
  }));

  const puzzle = {
    puzzleId: `puzzle_${today}`,
    date: today,
    centerLetter: centreLetter,
    availableLetters: letters.slice(1), // the 8 outer letters
    validWords: allWords.map(w => w.word),
    targetCount: allWords.length,
    wordDetails: allWords,
  };

  // 9. Save puzzle
  const puzzlePath = path.join(PUZZLES_DIR, `${puzzle.puzzleId}.json`);
  fs.writeFileSync(puzzlePath, JSON.stringify(puzzle, null, 2));
  console.log(`💾 Saved puzzle to ${puzzlePath}`);

  // 10. Update used words
  usedWords[chosenWord] = today;
  fs.writeFileSync(USED_WORDS_FILE, JSON.stringify(usedWords, null, 2));
  console.log(`📝 Updated used words list.`);

  console.log(`📊 Summary: ${puzzle.targetCount} words found.`);
}

// --- Run ---
generatePuzzle().catch(console.error);