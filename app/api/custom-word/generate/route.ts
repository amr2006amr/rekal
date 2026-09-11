import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';
import { findStaticWord } from '@/lib/data/words';
import { getCustomWordByWord } from '@/lib/services/supabaseService';
import { CEFRLevel } from '@/types';

export const dynamic = 'force-dynamic';

const CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT = parseInt(
  process.env.CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT || '30',
  10
);
const CUSTOM_WORD_FREE_TOTAL_LIMIT = parseInt(
  process.env.CUSTOM_WORD_FREE_TOTAL_LIMIT || '10',
  10
);
const CUSTOM_WORD_PRO_DAILY_LIMIT = parseInt(
  process.env.CUSTOM_WORD_PRO_DAILY_LIMIT || '20',
  10
);

// Layer 1 validation: English letters, hyphens, apostrophes only. Length 2 to 30.
const LAYER_1_REGEX = /^[a-zA-Z'-]{2,30}$/;

const GEMINI_SYSTEM_INSTRUCTION = `You are a strict, authoritative English lexicographer and vocabulary assistant for Rekal (رِكال), a vocabulary learning platform for Arabic speakers.

Your task is to analyze a candidate English word submitted by a user:
1. LAYER 2 SEMANTIC VALIDATION: First and foremost, determine whether the input is a genuine, real, and recognizable English word (found in reputable English dictionaries like Oxford, Merriam-Webster, Cambridge, or Collins).
   - If it is gibberish, an arbitrary sequence of letters, an acronym/slang without widespread standard lexical recognition, a non-English word, or a typo: you MUST output {"valid": false, "reason": "Not a recognized English word"}.
   - DO NOT fabricate, guess, or generate fake definitions or examples for non-existent words under any circumstance.

2. IF VALID: Generate high-quality pedagogical vocabulary data in standard JSON format:
   - "valid": true
   - "word": The word in lowercase.
   - "level": Approximate CEFR level ('A1', 'A2', 'B1', 'B2', or 'C1').
   - "part_of_speech": Primary grammatical category ('noun', 'verb', 'adjective', 'adverb', etc.).
   - "pronunciation": Standard IPA transcription, e.g. "/ˈkæn.dɪt/".
   - "definition_en": Concise, clear definition in standard English.
   - "definition_ar": Clear, natural definition in standard modern Arabic (فصحى) tailored for Arabic learners.
   - "examples": Array of exactly 2 practical, natural English sentences containing the word, each with its Arabic translation:
     [
       {"sentence": "English sentence...", "translation_ar": "الترجمة العربية..."},
       {"sentence": "English sentence...", "translation_ar": "الترجمة العربية..."}
     ]

You must output ONLY valid JSON matching this schema.`;

/**
 * POST /api/custom-word/generate
 * Validates, checks limits, and generates preview data for a custom word via Gemini.
 * Does NOT persist to database — persistence is performed upon user confirmation.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const rawWord = body?.word;

    if (typeof rawWord !== 'string' || !rawWord.trim()) {
      return NextResponse.json({ error: 'Invalid or missing word' }, { status: 400 });
    }

    const normalized = rawWord.trim().toLowerCase();

    // =========================================================================
    // LAYER 1: Immediate server-side formal check (No AI)
    // =========================================================================
    if (!LAYER_1_REGEX.test(normalized)) {
      return NextResponse.json(
        {
          error: 'invalid_format',
          message:
            'Word must contain English letters, hyphens (-), or apostrophes (\') only, and be between 2 and 30 characters.',
        },
        { status: 400 }
      );
    }

    // =========================================================================
    // Check if word already exists in static or custom words
    // =========================================================================
    const staticMatch = findStaticWord(normalized);
    if (staticMatch) {
      return NextResponse.json(
        {
          error: 'already_exists',
          source: 'static',
          message: 'Word already exists in the standard curriculum.',
          word: staticMatch,
        },
        { status: 409 }
      );
    }

    const authedClient = createAuthedClient(token);
    const customMatch = await getCustomWordByWord(user.id, normalized, authedClient);
    if (customMatch) {
      return NextResponse.json(
        {
          error: 'already_exists',
          source: 'custom',
          message: 'Word already added to your custom vocabulary.',
          word: customMatch,
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // Check user subscription & enforce limits (Atomic RPC)
    // =========================================================================
    const { data: settingsData } = await authedClient
      .from('user_settings')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = settingsData?.subscription_status === 'active';

    const { data: attemptResult, error: rpcError } = await authedClient.rpc(
      'check_and_record_custom_word_attempt',
      {
        p_user_id: user.id,
        p_is_pro: isPro,
        p_attempts_limit: CUSTOM_WORD_DAILY_ATTEMPTS_LIMIT,
        p_pro_daily_limit: CUSTOM_WORD_PRO_DAILY_LIMIT,
        p_free_total_limit: CUSTOM_WORD_FREE_TOTAL_LIMIT,
      }
    );

    if (rpcError) {
      console.error('check_and_record_custom_word_attempt RPC error:', rpcError);
      return NextResponse.json(
        {
          error: 'database_error',
          message:
            'Failed to verify quota. Please ensure custom_words migration has been executed in Supabase.',
        },
        { status: 500 }
      );
    }

    if (!attemptResult?.allowed) {
      const reason = attemptResult?.error || 'limit_reached';
      let message = 'Generation limit reached.';
      let statusCode = 429;

      if (reason === 'daily_attempts_limit_reached') {
        message = 'You have reached the maximum daily generation attempts limit.';
      } else if (reason === 'pro_daily_limit_reached') {
        message = 'You have reached your daily PRO generation limit.';
      } else if (reason === 'free_total_limit_reached') {
        message = 'You have reached the total custom words limit for the free tier.';
      }

      return NextResponse.json(
        {
          error: reason,
          message,
          usage: attemptResult,
        },
        { status: statusCode }
      );
    }

    // =========================================================================
    // LAYER 2: Semantic check & AI generation via Gemini
    // =========================================================================
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured on the server.');
      return NextResponse.json(
        { error: 'server_configuration_error', message: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const promptText = `Analyze and generate vocabulary entry for the candidate word: "${normalized}"`;

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 1024,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => '');
      console.error(`Gemini generation error (${geminiResponse.status}):`, errText);
      return NextResponse.json(
        { error: 'gemini_api_error', message: 'Failed to generate word data from AI.' },
        { status: geminiResponse.status >= 500 ? 502 : geminiResponse.status }
      );
    }

    const geminiData = await geminiResponse.json();
    const rawContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawContent) {
      return NextResponse.json(
        { error: 'empty_ai_response', message: 'AI returned an empty response.' },
        { status: 502 }
      );
    }

    let parsedResult: any;
    try {
      parsedResult = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', rawContent, parseErr);
      return NextResponse.json(
        { error: 'ai_format_error', message: 'AI returned invalid JSON response.' },
        { status: 502 }
      );
    }

    // Check Layer 2 validation outcome
    if (!parsedResult?.valid) {
      // Invalid word: Do NOT deduct from successful word quota!
      return NextResponse.json({
        valid: false,
        error: 'unrecognized_word',
        message: 'الكلمة غير معروفة ككلمة إنجليزية حقيقية في المعاجم القياسية.',
        attempts_remaining: attemptResult.attempts_remaining,
      });
    }

    // =========================================================================
    // Successful valid generation: Deduct generation quota
    // =========================================================================
    const { error: successRpcError } = await authedClient.rpc('record_custom_word_success', {
      p_user_id: user.id,
      p_is_pro: isPro,
    });

    if (successRpcError) {
      console.error('record_custom_word_success RPC error:', successRpcError);
    }

    // Sanitize and validate level
    const validLevels: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const level: CEFRLevel = validLevels.includes(parsedResult.level)
      ? parsedResult.level
      : 'B1';

    // Format preview response
    const preview = {
      word: normalized,
      level,
      part_of_speech: parsedResult.part_of_speech || 'noun',
      pronunciation: parsedResult.pronunciation || '',
      definition_ar: parsedResult.definition_ar || '',
      definition_en: parsedResult.definition_en || '',
      examples: Array.isArray(parsedResult.examples)
        ? parsedResult.examples.map((ex: any) => ({
            sentence: String(ex.sentence || ''),
            translation_ar: String(ex.translation_ar || ''),
          }))
        : [],
    };

    return NextResponse.json({
      valid: true,
      preview,
      usage: {
        is_pro: isPro,
        attempts_remaining: attemptResult.attempts_remaining,
      },
    });
  } catch (err: any) {
    console.error('Unhandled error in /api/custom-word/generate:', err);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
