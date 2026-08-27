import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_WORDS_FILE = path.join(__dirname, '../data/valid_words.json');

// Read from command line arguments!
// Example: npm run find-puzzle-words -- annulment l
const args = process.argv.slice(2);
const PUZZLE_WORD = (args[0] || '').toLowerCase(); // NO default fallback anymore
const CENTRAL_LETTER = (args[1] || '').toLowerCase(); // NO default fallback

// Helper: Create a frequency map of letters
function getLetterCountMap(word: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const char of word) map[char] = (map[char] || 0) + 1;
  return map;
}

// Helper: Check if a word can be formed from the puzzle letters
function canFormWord(word: string, puzzleMap: Record<string, number>): boolean {
  const wordMap = getLetterCountMap(word);
  for (const letter in wordMap) {
    if (!puzzleMap[letter] || puzzleMap[letter] < wordMap[letter]) return false;
  }
  return true;
}

function findPotentialWords() {
  if (!PUZZLE_WORD || !CENTRAL_LETTER) {
    console.error(`❌ Error: Please provide a puzzle word and central letter.`);
    console.error(`   Example: npm run find-puzzle-words -- annulment l`);
    return;
  }

  console.log(`🔍 Finding words using letters from: ${PUZZLE_WORD.toUpperCase()} with central letter '${CENTRAL_LETTER.toUpperCase()}'...`);

  if (!fs.existsSync(VALID_WORDS_FILE)) {
    console.error(`❌ Could not find ${VALID_WORDS_FILE}. Please run 'npm run build-word-list' first.`);
    return;
  }

  const allWords: string[] = JSON.parse(fs.readFileSync(VALID_WORDS_FILE, 'utf-8'));
  const puzzleMap = getLetterCountMap(PUZZLE_WORD);

  const foundWords = allWords.filter(word => {
    if (word.length < 4 || word.length > 9) return false;
    if (!word.includes(CENTRAL_LETTER)) return false;
    return canFormWord(word, puzzleMap);
  });

  foundWords.sort((a, b) => a.length - b.length || a.localeCompare(b));

  // Now saving puzzleWord and centralLetter!
  const outputData = {
    puzzleWord: PUZZLE_WORD,
    centralLetter: CENTRAL_LETTER,
    words: foundWords
  };

  console.log(`✅ Found ${foundWords.length} valid words for this puzzle.`);
  console.log(outputData.words.join(', '));

  const outputFile = path.join(__dirname, '../data/puzzle_candidates.json');
  fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
  console.log(`💾 Saved list to: ${outputFile}`);
}

findPotentialWords();