// api/generate-puzzle.ts
import { put, head } from '@vercel/blob';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

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
  const parts = line.split(/[,\t]/); 
  let word = parts[0].trim().toLowerCase();
  if (word.startsWith('"') && word.endsWith('"')) word = word.slice(1, -1);
  if (word.length === 9 && /^[a-z]+$/.test(word)) wordsList.push(word);
}

const dictPath = path.join(process.cwd(), 'api', 'dictionary.json');
const fullDictionary: string[] = JSON.parse(fs.readFileSync(dictPath, 'utf-8'));

function getLetterCountMap(word: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const char of word) map[char] = (map[char] || 0) + 1;
  return map;
}

function canFormWord(word: string, puzzleMap: Record<string, number>): boolean {
  const wordMap = getLetterCountMap(word);
  for (const letter in wordMap) {
    if (!puzzleMap[letter] || puzzleMap[letter] < wordMap[letter]) return false;
  }
  return true;
}

function getTodayIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + istOffset);
  return istTime.toISOString().split('T')[0];
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const today = getTodayIST();

    // Check if puzzle exists (using try-catch to handle missing blob)
    let existingBlob = null;
    try {
      existingBlob = await head(`puzzles/${today}.json`, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
    } catch (e) {
      console.log("Blob not found, generating new puzzle...");
    }

    if (existingBlob) {
      // FIX: Authenticate the fetch request
      const response = await fetch(existingBlob.url, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return res.status(200).json({ success: true, message: "Already exists", data });
    }

    // Pick the 9-letter puzzle word
    const puzzleWord = wordsList[Math.floor(Math.random() * wordsList.length)];
    //const puzzleWord = "advertise"; // TEMPORARILY HARDCODED FOR TESTING
    
    // Pick a preferred central letter (vowels or L, N, R, S, T)
    const preferredLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
    let centralLetter = puzzleWord[Math.floor(Math.random() * puzzleWord.length)];
    if (!preferredLetters.includes(centralLetter)) {
        const preferred = puzzleWord.split('').filter(char => preferredLetters.includes(char));
        if (preferred.length > 0) {
            centralLetter = preferred[Math.floor(Math.random() * preferred.length)];
        }
    }

    //const centralLetter = "e"; // TEMPORARILY HARDCODED FOR TESTING

    const puzzleMap = getLetterCountMap(puzzleWord);
    const candidates = fullDictionary.filter(word => {
      if (word.length < 4 || word.length > 9) return false;
      if (!word.includes(centralLetter)) return false;
      return canFormWord(word, puzzleMap);
    });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const SYSTEM_PROMPT = `
  You are a master lexicographer for The Guardian's Word Wheel puzzle.
  I will provide a JSON array of candidate words.
  The mandatory central letter is "${centralLetter.toUpperCase()}".

  DICTIONARY AUTHORITY:
  Use the Collins English Dictionary (Standard British English) as your sole authority. Use UK spellings throughout.

  PLEASE FOLLOW THESE RULES STRICTLY:

  1. MANDATORY LETTER RULE:
  - Every word MUST contain the mandatory central letter "${centralLetter.toUpperCase()}".

  2. THE "GUARDIAN NEWSPAPER" READABILITY TEST (CRITICAL):
  Every accepted word must pass this test: "Would an educated, general reader of a mainstream UK broadsheet recognize this word in standard prose without consulting a specialist dictionary?"
  - EXCLUDE the following categories:
    * Chemical / Biochemical / Medical compounds (e.g., discard "haem", "eluant").
    * Obscure agricultural, equestrian, or heraldic equipment (e.g., discard "hame", "surcingle").
    * Archaic, obsolete, or historical poetic words not in common modern use (e.g., discard "leas", "laten", "oft").
    * Non-UK regional slang or colloquial proper-noun nicknames (e.g., discard Australian slang like "sheila").
    * Proper nouns, place names, and capitalized personal names.
  - KEEP: Standard everyday words, widely recognized botanical/zoological terms, and common technical words an educated reader would know (e.g., "ulna", "isle", "kale").

  3. ZERO PLURALS (CRITICAL):
  - If a word is a plural noun (e.g., "males", "miles", "hikes", "hakes", "lakes", "meals"), AND the base singular noun (e.g., "male", "mile", "hike", "hake", "lake", "meal") is also valid, you MUST return ONLY the singular word.
  - Strictly EXCLUDE the plural form.
  - Exception: If the word ending in 's' is primarily a 3rd-person singular verb (e.g., "heals", "makes") where the base form has a distinct primary verb meaning, or if the plural form has an independent, unique meaning not captured by the singular (e.g., "arms" as weapons vs "arm" as a limb), you may evaluate it accordingly. When in doubt, prefer the root/base lemma.

  4. DEFINITION QUALITY CONTROL (NO GRAMMATICAL COPIES):
  - FORBIDDEN: Do NOT write definitions that merely state grammar rules (e.g., DO NOT say "past tense of X", "plural of X", "third-person singular of X", or "a form of X").
  - REQUIRED: Provide an engaging, standalone, dictionary-style definition explaining the concept, object, or action clearly in plain English.

  5. MULTIPLE MEANINGS & HOMOGRAPHS (CRITICAL):
  For every word, you MUST perform a multi-sense audit before writing the definition:
  - Check for distinct Noun vs. Verb meanings (e.g., "shake" as a physical motion vs. a cold beverage).
  - Check for completely unrelated homographs/domains (e.g., "seal" as an animal vs. an official stamp vs. a watertight barrier).
  - If a word has multiple common meanings, you MUST list all major definitions separated by a semicolon (;), and provide a matching multi-part usage sentence.

  5a. MINIMUM LENGTH RULE (CRITICAL):
  - All words MUST be at least 4 letters long.
  - Do NOT include any 3-letter words, 2-letter words, or 1-letter words.
  - If you are unsure, check the length. If it is less than 4, remove it.

  6. OUTPUT FORMAT:
  Return ONLY a valid JSON array matching the exact structure below. Do not wrap it in parent objects (no {"success": true...}) and do not add any surrounding text or markdown wrappers beyond the array:

  [
    {
      "word": "seal",
      "definition": "a fish-eating aquatic mammal with flippers; an embossed design, stamp, or piece of wax used to authenticate a document; a tight closure preventing the escape of liquid or gas",
      "usage": "A seal surfaced near the dock; the royal decree bore the king's seal; ensure the rubber seal on the jar is intact."
    },
    {
      "word": "semi",
      "definition": "an informal term for a semi-detached house; a semi-final match or round in a competition; a large articulated lorry",
      "usage": "They bought a 1930s semi in London; the team qualified for the semi; the motorway lane was blocked by a semi."
    },
    {
      "word": "lean",
      "definition": "to incline, bend, or rest against something for support; containing little or no fat; sparse or producing little",
      "usage": "He leaned against the mantelpiece; choose lean cuts of meat; the company survived a lean financial year."
    }
  ]

  7. PRE-OUTPUT AUDIT:
  Before finalizing your output, review every word in your candidate list:
  1. Did any plural nouns whose singulars are present (e.g., "miles", "males", "lakes") slip through? If so, REMOVE them.
  2. Did any chemical, equestrian, archaic, or regional slang words (like "haem", "hame", "leas", "sheila") slip through? If so, REMOVE them.
  3. Did you include all primary noun/verb senses for common words like "shake", "like", "semi", and "seal"?
  `;
    
    const responseGemini = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${SYSTEM_PROMPT}\n\nHere is the list of candidate words:\n${JSON.stringify(candidates)}`,
      config: { responseMimeType: "application/json" },
    });

    const cleanedWords = JSON.parse(responseGemini.text || '[]');

    const puzzleData = {
      puzzleWord,
      centralLetter,
      generatedDate: today,
      words: cleanedWords
    };

    // FIX: Ensure the blob is PUBLIC
    await put(`puzzles/${today}.json`, JSON.stringify(puzzleData), {
      access: 'private',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    res.status(200).json({ success: true, data: puzzleData });

  } catch (error: any) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
}
