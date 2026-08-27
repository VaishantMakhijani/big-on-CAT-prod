import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANDIDATES_FILE = path.join(__dirname, '../data/puzzle_candidates.json');
// IMPORTANT: Write directly to the public folder so React can fetch it!
const PUBLIC_DIR = path.join(__dirname, '../public');
const FINAL_OUTPUT_FILE = path.join(PUBLIC_DIR, 'puzzle.json');

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const genAI = new GoogleGenerativeAI(API_KEY);

async function cleanAndDefineWords() {
  if (!fs.existsSync(CANDIDATES_FILE)) {
    console.error(`❌ Could not find ${CANDIDATES_FILE}. Please run 'npm run find-puzzle-words' first.`);
    return;
  }

  console.log('📂 Loading candidate words...');
  const candidateData = JSON.parse(fs.readFileSync(CANDIDATES_FILE, 'utf-8'));
  
  // Strictly pull the word and letter from the file
  const candidateWords = candidateData.words;
  const centralLetter = candidateData.centralLetter;
  const puzzleWord = candidateData.puzzleWord;

  if (!candidateWords || !centralLetter || !puzzleWord) {
    console.error(`❌ Missing puzzle data. Please run 'npm run find-puzzle-words' first.`);
    return;
  }

  console.log(`✅ Loaded ${candidateWords.length} words. Puzzle: ${puzzleWord.toUpperCase()} | Central Letter: ${centralLetter.toUpperCase()}`);

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

  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  const prompt = `${SYSTEM_PROMPT}\n\nHere is the list of candidate words:\n${JSON.stringify(candidateWords)}`;

  console.log('🤖 Sending to AI Studio for cleaning and definitions...');
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Strip markdown just in case
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const finalWords = JSON.parse(cleanedJson);

    // Create the exact payload structure your React WebApp expects!
    const webAppPayload = {
      puzzleWord: puzzleWord,
      centralLetter: centralLetter,
      generatedDate: new Date().toISOString().split('T')[0], // e.g., "2026-08-25"
      words: finalWords
    };

    // Ensure the public folder exists
    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    fs.writeFileSync(FINAL_OUTPUT_FILE, JSON.stringify(webAppPayload, null, 2));
    console.log(`✅ AI processed successfully!`);
    console.log(`💾 Saved ${finalWords.length} words to: ${FINAL_OUTPUT_FILE}`);
    console.log(`   Ready for your React WebApp to fetch.`);

  } catch (error) {
    console.error('❌ Error calling AI Studio:', error);
  }
}

cleanAndDefineWords();