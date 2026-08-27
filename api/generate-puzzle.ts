// api/generate-puzzle.ts
import { put, head } from '@vercel/blob';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// 3. Read the small words file
const csvPath = path.join(process.cwd(), 'api', 'words.csv');
const fileContent = fs.readFileSync(csvPath, 'utf-8');
const lines = fileContent.split('\n');
const header = lines[0]?.toLowerCase() || '';
const hasHeader = header.includes('word') || header.includes('zipf');
const startIndex = hasHeader ? 1 : 0;

const wordsList: string[] = [];
for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // FIXED: Split on commas OR tabs (using Regular Expression)
  const parts = line.split(/[,\t]/); 
  let word = parts[0].trim().toLowerCase();
  
  // Remove quotes if present
  if (word.startsWith('"') && word.endsWith('"')) {
    word = word.slice(1, -1);
  }
  
  // Only keep 9-letter valid words
  if (word.length === 9 && /^[a-z]+$/.test(word)) {
    wordsList.push(word);
  }
}

// Helper: Create a frequency map of letters (from find-puzzle-words.ts)
function getLetterCountMap(word: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const char of word) map[char] = (map[char] || 0) + 1;
  return map;
}

// Helper: Check if a word can be formed (from find-puzzle-words.ts)
function canFormWord(word: string, puzzleMap: Record<string, number>): boolean {
  const wordMap = getLetterCountMap(word);
  for (const letter in wordMap) {
    if (!puzzleMap[letter] || puzzleMap[letter] < wordMap[letter]) return false;
  }
  return true;
}

// Helper for date
function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
  return istTime.toISOString().split('T')[0];
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const today = getTodayIST();
  
  // 1. Check if puzzle already exists for today
  const existingBlob = await head(`puzzles/${today}.json`, {
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  if (existingBlob) {
    const response = await fetch(existingBlob.url);
    const data = await response.json();
    return res.status(200).json({ success: true, message: "Already exists", data });
  }

  // 2. Pick a random word from the list (excluding used ones later if needed)
  const puzzleWord = wordsList[Math.floor(Math.random() * wordsList.length)];
  
  // 3. Pick a central letter from the puzzle word
  const centralLetter = puzzleWord[Math.floor(Math.random() * puzzleWord.length)];

  // 4. GENERATE VALID WORDS (Your exact find-puzzle-words logic)
  const puzzleMap = getLetterCountMap(puzzleWord);
  const candidates = wordsList.filter(word => {
    if (word.length < 4 || word.length > 9) return false;
    if (!word.includes(centralLetter)) return false;
    return canFormWord(word, puzzleMap);
  });
  
  // 5. Call Gemini with your exact cleaning prompt
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const SYSTEM_PROMPT = `
  You are a lexicographer for The Guardian's Word Wheel puzzle.
  I will provide a JSON array of candidate words.
  The mandatory central letter is "${centralLetter.toUpperCase()}".

  DICTIONARY AUTHORITY:
  Use the Collins English Dictionary (Standard British English) as your sole authority. Use UK spellings.

  PLEASE FOLLOW THESE RULES STRICTLY:
  1. **Mandatory Letter Rule:** All words MUST contain the letter "${centralLetter.toUpperCase()}".
  2. **Dictionary Rule:** Only accept words that are valid standard British English words, even if they are rare.
  3. **Rare but Valid Exception (CRITICAL):** Some valid words might look like proper nouns but have lowercase dictionary definitions. Do NOT remove "luna" (moth), "leat" (water channel), "manul" (wildcat), or "lutea" (botanical). Only remove words that are strictly proper nouns like "John" or "Paris".
  4. **Jargon Filter:** Remove highly specific scientific, chemical, archaic poetry, or foreign cultural jargon that a general puzzle audience would never guess (e.g., "laten", "eluant", "muleta", "tela", "tael", "ulema"). 
  5. **Botanical/Technical Exception:** You may keep common technical, anatomical, or botanical terms (like "ulnae" or "lunate") as long as they are recognized in standard British English.
  6. **Output Format:** Return ONLY a JSON array formatted exactly like this:
  [
    { "word": "annul", "definition": "to declare invalid", "usage": "The contract was annulled." },
    { "word": "lutea", "definition": "a yellow pigment", "usage": "The flower is known for its lutea color." }
  ]
  - Output ONLY the JSON array. Do NOT use markdown code blocks or any other text.
  - The "word" must match the input word exactly.

  7. **CRITICAL - DEFINITION QUALITY CONTROL:**
  - **FORBIDDEN:** You are strictly FORBIDDEN from returning definitions that are just grammatical rules. 
    - DO NOT say: "past tense of X", "plural of X", "third person singular of X", "present participle of X", or "a form of X".
  - **REQUIRED:** You MUST provide a clear, standalone, dictionary-style definition that explains the actual object, concept, or action in plain English, so a casual puzzle player can understand it.
  - **EXAMPLES OF BAD DEFINITIONS (DO NOT COPY):**
    - "leant": "past tense and past participle of lean" -> **BAD**
    - "ulnae": "plural form of ulna" -> **BAD**
  - **EXAMPLES OF GOOD DEFINITIONS (USE THIS STYLE):**
    - "leant": "to have rested your body against something for support" (Usage: "He leant against the wall.")
    - "ulnae": "the two long bones located on the inner side of the human forearm" (Usage: "Both of the patient's ulnae were examined.")

  8. **MULTIPLE MEANINGS (CRITICAL):** If a word has multiple distinct, common meanings (e.g., "lean" as a verb meaning to incline, AND as an adjective meaning thin), you MUST include ALL major meanings in the "definition" field, separated by a semicolon (;). Ensure the meanings are clear and understandable to a general audience.
  - **EXAMPLE FOR "lean":**
    Definition: "to incline or rest against something; also, having very little fat or substance (as in lean meat or a lean budget)"
    Usage: "She leaned against the railing; The company had to survive on a lean budget."
  `;

  const responseGemini = await ai.models.generateContent({
    model: "gemini-2.5-flash", // Updated to a reliable model
    contents: `${SYSTEM_PROMPT}\n\nHere is the list of candidate words:\n${JSON.stringify(candidates)}`,
    config: { responseMimeType: "application/json" },
  });

  const cleanedWords = JSON.parse(responseGemini.text || '[]');

  // 6. Save the final puzzle to Blob
  const puzzleData = {
    puzzleWord,
    centralLetter,
    generatedDate: today,
    words: cleanedWords
  };

  await put(`puzzles/${today}.json`, JSON.stringify(puzzleData), {
    access: 'private',
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  res.status(200).json({ success: true, data: puzzleData });
}
