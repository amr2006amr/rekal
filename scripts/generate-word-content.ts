import fs from 'fs';
import path from 'path';

// Types matching lib/data and types/index.ts
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface WordExample {
  sentence: string;
  translation_ar: string;
}

export interface WordItem {
  id: string;
  word: string;
  level: CEFRLevel;
  pronunciation: string;
  part_of_speech: string;
  definition_ar: string;
  definition_en: string;
  examples: WordExample[];
}

interface GeminiGeneratedWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition_ar: string;
  definition_en: string;
  examples: Array<{
    sentence: string;
    translation_ar: string;
  }>;
}

// ---------------------------------------------------------------------------
// Environment & CLI Arguments Helper
// ---------------------------------------------------------------------------

function loadEnvFile(envPath: string) {
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // Ignore error reading env file
  }
}

// Load env files
loadEnvFile(path.resolve(process.cwd(), '.env.local'));
loadEnvFile(path.resolve(process.cwd(), '.env'));

const AVAILABLE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options: {
    apiKeys: string[];
    level?: string;
    delayMs: number;
    batchSize: number;
    limit?: number;
    model: string;
    inputFile: string;
    overwrite: boolean;
  } = {
    apiKeys: [],
    delayMs: 3500, // 3.5s safe delay to respect Google AI Studio RPM
    batchSize: 6,  // 6 words per batch is balanced and reliable
    model: 'gemini-3.5-flash',
    inputFile: 'oxford_words_by_level.json',
    overwrite: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--api-key=')) {
      const val = arg.split('=')[1]?.trim();
      if (val) options.apiKeys.push(...val.split(',').map((k) => k.trim()).filter(Boolean));
    } else if (arg.startsWith('--level=')) {
      options.level = arg.split('=')[1]?.trim().toUpperCase();
    } else if (arg.startsWith('--delay=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) options.delayMs = val;
    } else if (arg.startsWith('--batch=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) options.batchSize = val;
    } else if (arg.startsWith('--limit=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) options.limit = val;
    } else if (arg.startsWith('--model=')) {
      options.model = arg.split('=')[1]?.trim();
    } else if (arg.startsWith('--input=')) {
      options.inputFile = arg.split('=')[1]?.trim();
    } else if (arg === '--overwrite') {
      options.overwrite = true;
    }
  }

  if (options.apiKeys.length === 0) {
    const rawKeys =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      '';
    options.apiKeys = rawKeys.split(',').map((k) => k.trim()).filter(Boolean);
  }

  return options;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateWordId(word: string, level: string): string {
  const slug = word.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug}-${level.toLowerCase()}`;
}

const LEVEL_FILES: Record<CEFRLevel, string> = {
  A1: path.resolve(process.cwd(), 'lib/data/words-a1.json'),
  A2: path.resolve(process.cwd(), 'lib/data/words-a2.json'),
  B1: path.resolve(process.cwd(), 'lib/data/words-b1.json'),
  B2: path.resolve(process.cwd(), 'lib/data/words-b2.json'),
  C1: path.resolve(process.cwd(), 'lib/data/words-c1.json'),
};

function loadExistingWords(filePath: string): WordItem[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`⚠️ Warning reading ${path.basename(filePath)}: ${(err as Error).message}`);
    return [];
  }
}

function saveWordsToFile(filePath: string, words: WordItem[]) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(words, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Multi-Model / Multi-Key Resilient Batch Generator
// ---------------------------------------------------------------------------

async function callGeminiBatchWithFallback(
  apiKeys: string[],
  initialModel: string,
  words: string[],
  level: CEFRLevel
): Promise<GeminiGeneratedWord[]> {
  const modelsToTry = [
    initialModel,
    ...AVAILABLE_MODELS.filter((m) => m !== initialModel),
  ];

  const wordsListText = words.map((w, idx) => `${idx + 1}. "${w}"`).join('\n');

  const prompt = `You are an expert English-Arabic lexicographer for an English learning flashcard app (Rekal).
Generate educational vocabulary cards for the following ${words.length} English words at CEFR level "${level}":
${wordsListText}

For EACH word in the list, provide:
1. "word": The English word exactly as listed.
2. "pronunciation": IPA format (e.g. "/ɪkˈsplɔːr/").
3. "part_of_speech": The primary grammatical category for this word at level ${level} (e.g. "noun", "verb", "adjective", "adverb", "preposition", "conjunction", "idiom", "phrase").
4. "definition_ar": Clear, natural, and precise Arabic definition explaining the word simply and accurately.
5. "definition_en": Clear, simple, and concise English definition suitable for learners at level ${level}.
6. "examples": Exactly 3 realistic, natural example sentences illustrating this word in context at level ${level}.
   Each example must have:
   - "sentence": Natural English sentence.
   - "translation_ar": Fluent Arabic translation.

Return ONLY a JSON array containing ${words.length} objects matching this exact schema:
[
  {
    "word": "word1",
    "pronunciation": "/.../",
    "part_of_speech": "verb",
    "definition_ar": "تعريف دقيق بالعربية",
    "definition_en": "Clear English definition",
    "examples": [
      { "sentence": "Example 1", "translation_ar": "ترجمة 1" },
      { "sentence": "Example 2", "translation_ar": "ترجمة 2" },
      { "sentence": "Example 3", "translation_ar": "ترجمة 3" }
    ]
  }
]`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  let totalRounds = 0;
  const maxRounds = 4; // Try cycling through all models up to 4 times

  while (totalRounds < maxRounds) {
    totalRounds++;

    for (const key of apiKeys) {
      for (const model of modelsToTry) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(key)}`;

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            if (res.status === 429) {
              // Rate limited on this specific model -> silently try next model in pool!
              continue;
            } else if (res.status === 404 || res.status === 503) {
              // Model unavailable -> try next model
              continue;
            }
            throw new Error(`API error (${res.status}): ${errText}`);
          }

          const data = (await res.json()) as any;
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            continue;
          }

          // Parse JSON
          let cleaned = rawText.trim();
          if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const parsed = JSON.parse(cleaned);
          const items: GeminiGeneratedWord[] = Array.isArray(parsed) ? parsed : [parsed];

          if (items.length > 0) {
            return items;
          }
        } catch {
          // Continue to next model/key
        }
      }
    }

    // If all models hit 429, wait 15s before starting next round
    process.stdout.write(`\n⏳ All models busy (429). Pausing 15s to reset quota window... `);
    await sleep(15000);
  }

  throw new Error(`Failed to generate batch of ${words.length} words after trying all fallback models.`);
}

// ---------------------------------------------------------------------------
// Input Parser: Parses oxford_words_by_level.json
// ---------------------------------------------------------------------------

function loadOxfordWords(filePath: string): Record<CEFRLevel, string[]> {
  const result: Record<CEFRLevel, string[]> = {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
  };

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found: ${filePath}`);
    return result;
  }

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) {
    console.warn(`⚠️ Warning: ${filePath} is empty.`);
    return result;
  }

  try {
    const data = JSON.parse(content);

    if (typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        const upperKey = key.toUpperCase() as CEFRLevel;
        if (result[upperKey] && Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string') {
              result[upperKey].push(item.trim());
            } else if (item && typeof item === 'object' && typeof (item as any).word === 'string') {
              result[upperKey].push((item as any).word.trim());
            }
          }
        }
      }
    } else if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === 'string') {
          result.A1.push(item.trim());
        } else if (item && typeof item === 'object') {
          const w = (item.word || item.name || '').trim();
          const lvl = (item.level || item.cefr || 'A1').toString().toUpperCase() as CEFRLevel;
          if (w && result[lvl]) {
            result[lvl].push(w);
          }
        }
      }
    }
  } catch (err) {
    console.error(`❌ Error parsing JSON from ${filePath}: ${(err as Error).message}`);
  }

  for (const lvl of Object.keys(result) as CEFRLevel[]) {
    result[lvl] = Array.from(new Set(result[lvl].filter(Boolean)));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n============================================================');
  console.log('📚 Rekal - Gemini Word Content Generator (Multi-Model Pool)');
  console.log('============================================================\n');

  const options = parseArgs();

  if (options.apiKeys.length === 0) {
    console.error('❌ Error: Gemini API Key is required!\n');
    console.log('Add your key to .env.local:');
    console.log('   GEMINI_API_KEY=your_key_here\n');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), options.inputFile);
  const wordsByLevel = loadOxfordWords(inputPath);

  const totalInputWords = Object.values(wordsByLevel).reduce((acc, list) => acc + list.length, 0);

  if (totalInputWords === 0) {
    console.warn(`⚠️ No words found in ${options.inputFile}.`);
    process.exit(0);
  }

  const targetLevels: CEFRLevel[] = options.level
    ? [options.level as CEFRLevel]
    : ['A1', 'A2', 'B1', 'B2', 'C1'];

  console.log(`📁 Input file: ${options.inputFile}`);
  console.log(`🤖 Primary Model: ${options.model}`);
  console.log(`🔄 Fallback Pool: ${AVAILABLE_MODELS.join(', ')}`);
  console.log(`🔑 Active API Keys: ${options.apiKeys.length}`);
  console.log(`📦 Batch size: ${options.batchSize} words/request`);
  console.log(`⏱️ Delay between batches: ${options.delayMs}ms`);
  console.log(`🎯 Target levels: ${targetLevels.join(', ')}`);
  if (options.limit) console.log(`🔢 Word limit per level: ${options.limit}`);
  if (options.overwrite) console.log(`🔄 Overwrite mode: ON`);
  console.log('------------------------------------------------------------\n');

  let grandTotalGenerated = 0;
  let grandTotalSkipped = 0;
  let grandTotalFailed = 0;

  for (const level of targetLevels) {
    const rawWords = wordsByLevel[level] || [];
    const wordsToProcess = options.limit ? rawWords.slice(0, options.limit) : rawWords;
    const targetFilePath = LEVEL_FILES[level];

    // Load existing words
    const existingList = loadExistingWords(targetFilePath);
    const existingWordMap = new Map<string, WordItem>();
    for (const item of existingList) {
      existingWordMap.set(item.word.toLowerCase().trim(), item);
    }

    // Filter words that need generating
    const pendingWords: string[] = [];
    for (const w of wordsToProcess) {
      const key = w.toLowerCase().trim();
      if (existingWordMap.has(key) && !options.overwrite) {
        grandTotalSkipped++;
      } else {
        pendingWords.push(w);
      }
    }

    console.log(`\n🔹 [Level ${level}] Total input: ${wordsToProcess.length} | Already saved: ${existingWordMap.size} | Pending to generate: ${pendingWords.length}`);

    if (pendingWords.length === 0) {
      console.log(`✅ [Level ${level}] All words already generated! Skipping level.`);
      continue;
    }

    let generatedInLevel = 0;
    let failedInLevel = 0;

    for (let i = 0; i < pendingWords.length; i += options.batchSize) {
      const currentBatch = pendingWords.slice(i, i + options.batchSize);
      const batchNum = Math.floor(i / options.batchSize) + 1;
      const totalBatches = Math.ceil(pendingWords.length / options.batchSize);

      const startTime = Date.now();
      process.stdout.write(`  [Batch ${batchNum}/${totalBatches}] Generating (${currentBatch.join(', ')}) ... `);

      try {
        const generatedItems = await callGeminiBatchWithFallback(
          options.apiKeys,
          options.model,
          currentBatch,
          level
        );

        for (const gen of generatedItems) {
          const matchedWord = currentBatch.find(
            (w) => w.toLowerCase().trim() === (gen.word || '').toLowerCase().trim()
          ) || gen.word || currentBatch[0];

          const wordKey = matchedWord.toLowerCase().trim();

          const wordItem: WordItem = {
            id: existingWordMap.get(wordKey)?.id || generateWordId(matchedWord, level),
            word: matchedWord.trim(),
            level,
            pronunciation: gen.pronunciation || '',
            part_of_speech: gen.part_of_speech || '',
            definition_ar: gen.definition_ar || '',
            definition_en: gen.definition_en || '',
            examples: gen.examples || [],
          };

          existingWordMap.set(wordKey, wordItem);
          generatedInLevel++;
          grandTotalGenerated++;
        }

        // Save immediately to disk after each batch!
        const updatedList = Array.from(existingWordMap.values());
        saveWordsToFile(targetFilePath, updatedList);

        const elapsed = Date.now() - startTime;
        process.stdout.write(`✓ Done (${elapsed}ms) [Saved ${generatedItems.length} words]\n`);
      } catch (err: any) {
        process.stdout.write(`❌ FAILED: ${err.message}\n`);
        failedInLevel += currentBatch.length;
        grandTotalFailed += currentBatch.length;
      }

      // Safe delay between batches
      if (options.delayMs > 0 && i + options.batchSize < pendingWords.length) {
        await sleep(options.delayMs);
      }
    }

    console.log(
      `✅ [Level ${level}] Finished. Newly Generated: ${generatedInLevel}, Failed: ${failedInLevel}. File: ${path.basename(
        targetFilePath
      )}`
    );
  }

  console.log('\n============================================================');
  console.log('🎉 Execution Completed Summary:');
  console.log(`   ✨ Generated: ${grandTotalGenerated} words`);
  console.log(`   ⏭️ Skipped:   ${grandTotalSkipped} words`);
  if (grandTotalFailed > 0) {
    console.log(`   ⚠️ Failed:    ${grandTotalFailed} words`);
  }
  console.log('   💾 All data saved to lib/data/words-*.json');
  console.log('============================================================\n');
}

// Execute
main().catch((err) => {
  console.error('\n❌ Fatal error during execution:', err);
  process.exit(1);
});
