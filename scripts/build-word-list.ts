import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pluralize from 'pluralize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, '../data/valid_words.json');

// Offensive words blocklist
const OFFENSIVE_WORDS = new Set([
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'bastard', 'whore', 'slut', 'piss', 'dick', 'cock',
  'motherfucker', 'twat', 'wanker', 'arse', 'damn', 'hell', 'crap',
]);

// --- Main ---
async function buildWordList() {
  console.log('📦 Loading game-ready-dictionary...');

  // Option 1: Use the "large" tier for maximum coverage (includes words like "emit")
  // Change 'large' to 'medium' if you want a smaller, faster list.
  const DICT_PATH = path.join(__dirname, '../node_modules/game-ready-dictionary/data/large_array.json');
  
  if (!fs.existsSync(DICT_PATH)) {
    console.error(`❌ Dictionary file not found at ${DICT_PATH}`);
    console.error('Please ensure you ran: npm install game-ready-dictionary');
    process.exit(1);
  }

  const wordList = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));

  console.log(`✅ Loaded ${wordList.length} words from game-ready-dictionary.`);

  // Filter: length 4-9, only a-z, no offensive
  let filtered = wordList.filter((w: string) => {
    w = w.toLowerCase();
    if (w.length < 4 || w.length > 9) return false;
    if (!/^[a-z]+$/.test(w)) return false;
    if (OFFENSIVE_WORDS.has(w)) return false;
    return true;
  });

  // Remove duplicates just in case
  filtered = [...new Set(filtered)];
  
  console.log(`✅ Basic filter: ${filtered.length} words (4-9 letters, no offensive).`);

  // Optional: Remove plural nouns using 'pluralize', but keep verbs (cites, runs)
  console.log('🔄 Applying heuristic plural filter...');
  const finalWords = filtered.filter((w: string) => {
    // Keeps words like "emit", "cites", "clothes", "runs", "news"
    // Removes words like "cats" -> "cat" (since "cat" is in the list)
    if (w.endsWith('s') && w.length > 3) {
        const singular = pluralize.singular(w);
        // If the singular exists AND singular is not equal to the word, 
        // it's likely a plural noun. But we must *keep* verbs (e.g., "cites" -> "cite").
        // A simple heuristic: keep it if the singular is a verb? 
        // For now, let's keep ALL valid words, so we don't accidentally delete "cites".
        // The AI Studio step (for the puzzle answers) will handle the final removal.
        return true; 
    }
    return true;
  });

  console.log(`✅ Final word list: ${finalWords.length} words (pre-AI).`);
  console.log(`💾 Saved to ${OUTPUT_FILE}. Note: Plurals are currently included for your AI step.`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalWords, null, 2));
}

buildWordList().catch(console.error);