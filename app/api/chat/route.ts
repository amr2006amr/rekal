import { NextRequest, NextResponse } from 'next/server';
import { supabase, createAuthedClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// Limits read from environment variables as required, with safe defaults
const CHAT_FREE_DAILY_LIMIT = parseInt(process.env.CHAT_FREE_DAILY_LIMIT || '7', 10);
const CHAT_PRO_DAILY_LIMIT = parseInt(process.env.CHAT_PRO_DAILY_LIMIT || '200', 10);

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Builds the strictly scoped system instruction for Gemini based on whether
 * the user query contains Arabic characters.
 */
function getSystemInstruction(isArabic: boolean): string {
  if (isArabic) {
    return `أنت «رِكال» (Rekal) — معلم ومساعد ذكاء اصطناعي متخصص حصرياً في شرح وتوضيح مفردات اللغة الإنجليزية لمتعلمي اللغة على منصة «رِكال» (Rekal).

قواعد إلزامية صارمة يجب الالتزام بها تماماً:
1. نطاقك محصور حصراً بمفردات اللغة الإنجليزية: شرح المعاني بدقة، توضيح الفروقات الدقيقة بين الكلمات المتقاربة أو المعاني المتعددة لنفس الكلمة، بيان نوع الكلمة (Part of Speech)، وتقديم أمثلة حية وسياقية مترجمة.
2. إذا طرح المستخدم أي سؤال خارج نطاق تعلم وفهم مفردات اللغة الإنجليزية (مثل: أسئلة البرمجة، الرياضيات، السياسة، كتابة المقالات، الترجمة العامة للنصوص الطويلة، أو المحادثات العامة غير المتعلقة بكلمة إنجليزية)، ارفض الطلب بأدب واختصار، ووجّهه للعودة لسؤالك عن كلمة أو مفردة إنجليزية.
3. بما أن المستخدم سأل بالعربية: يجب أن يكون ردك وشرحك باللغة العربية الفصحى الواضحة والسهلة، مع بقاء الكلمات الإنجليزية المستهدفة بالإنجليزية، وترجمة كل مثال عربيًا.
4. اجعل الإجابة مركزة، منظمة بنقاط ورؤوس أقلام، وسهلة القراءة على شاشات الهاتف المحمول، وتجنب الحشو الزائد.
5. لا تعرّف عن نفسك أو ترحب بالمستخدم داخل ردودك أبدًا — الرد يبدأ مباشرة بالمحتوى المطلوب (الشرح)، بدون أي مقدمة تعريفية أو ترحيب، إلا إذا سأل المستخدم تحديدًا «من أنت» أو ما شابه.`;
  }

  return `You are "Rekal" — an AI English vocabulary tutor and assistant built specifically for learners on the "Rekal" spaced repetition platform.

Strict mandatory rules you must follow without exception:
1. Your scope is EXCLUSIVELY limited to English vocabulary: explaining word meanings and nuances, distinguishing between multiple definitions or easily confused words, identifying parts of speech, and providing practical, natural example sentences.
2. If the user asks anything outside English vocabulary learning (e.g. programming, math, science, world news, writing generic essays, long text translations, or general off-topic conversation), politely and briefly decline, and guide the user back to asking about an English word.
3. Since the user asked in English: respond entirely in clear, natural, and encouraging English.
4. Keep explanations concise, well-structured with clear bullet points, and optimized for quick reading on both mobile and desktop screens.
5. Never introduce yourself or greet the user in your responses — start immediately with the requested content/explanation without any introductory greetings, unless the user specifically asks who you are or similar.`;
}

/**
 * POST /api/chat
 * Handles sending a message to Rekal AI.
 * Enforces authentication, subscription-based daily limits (atomic via RPC),
 * context truncation (last 8-10 messages), language matching, and Gemini API streaming/generation.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Authenticate user statelessly via token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const rawMessages = body?.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty messages array' }, { status: 400 });
    }

    // Filter valid messages
    const validMessages: IncomingMessage[] = rawMessages
      .filter(
        (m: any) =>
          (m?.role === 'user' || m?.role === 'assistant') &&
          typeof m?.content === 'string' &&
          m.content.trim().length > 0
      )
      .map((m: any) => ({
        role: m.role,
        content: m.content.trim(),
      }));

    if (validMessages.length === 0) {
      return NextResponse.json({ error: 'No valid messages provided' }, { status: 400 });
    }

    const lastUserMessage = [...validMessages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message found' }, { status: 400 });
    }

    // Create user-scoped authed client
    const authedClient = createAuthedClient(token);

    // Fetch user's subscription status from user_settings table
    const { data: settingsData } = await authedClient
      .from('user_settings')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = settingsData?.subscription_status === 'active';
    const dailyLimit = isPro ? CHAT_PRO_DAILY_LIMIT : CHAT_FREE_DAILY_LIMIT;

    // Check & increment usage counter atomically via Postgres function
    const { data: quotaResult, error: rpcError } = await authedClient.rpc(
      'check_and_increment_chat_usage',
      {
        p_user_id: user.id,
        p_daily_limit: dailyLimit,
      }
    );

    if (rpcError) {
      console.error('Error executing check_and_increment_chat_usage RPC:', rpcError);
      return NextResponse.json(
        {
          error: 'database_error',
          message: 'Failed to verify chat quota. Please ensure chat_usage migration has been executed in Supabase.',
        },
        { status: 500 }
      );
    }

    if (!quotaResult?.allowed) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          usage: {
            messages_used_today: quotaResult?.messages_used_today ?? dailyLimit,
            daily_limit: dailyLimit,
            remaining: 0,
            is_pro: isPro,
          },
        },
        { status: 429 }
      );
    }

    // Language detection: simple unicode check for Arabic characters
    const hasArabic = /[\u0600-\u06FF]/.test(lastUserMessage.content);
    const systemInstruction = getSystemInstruction(hasArabic);

    // Context management: slice only the last 8-10 messages to limit token cost
    const contextMessages = validMessages.slice(-10);

    // Prepare contents formatted for Gemini API
    const geminiContents = contextMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Server environment variables for Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    if (!apiKey) {
      console.error('GEMINI_API_KEY environment variable is not configured on the server.');
      return NextResponse.json(
        { error: 'server_configuration_error', message: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    // Call Google Gemini REST API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`Gemini API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: 'gemini_api_error', message: 'Failed to generate response from AI model.' },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const geminiData = await response.json();
    const replyText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      (hasArabic
        ? 'عذراً، لم أتمكن من صياغة إجابة لهذه الكلمة. يرجى المحاولة مرة أخرى.'
        : 'Sorry, I could not generate an explanation for this query. Please try again.');

    return NextResponse.json({
      reply: replyText,
      usage: {
        messages_used_today: quotaResult.messages_used_today,
        daily_limit: dailyLimit,
        remaining: quotaResult.remaining,
        is_pro: isPro,
      },
    });
  } catch (err: any) {
    console.error('Unhandled error in /api/chat:', err);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

/**
 * GET /api/chat
 * Returns the current daily chat usage and remaining messages for the user.
 */
export async function GET(request: NextRequest) {
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

    const authedClient = createAuthedClient(token);

    const { data: settingsData } = await authedClient
      .from('user_settings')
      .select('subscription_status')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPro = settingsData?.subscription_status === 'active';
    const dailyLimit = isPro ? CHAT_PRO_DAILY_LIMIT : CHAT_FREE_DAILY_LIMIT;

    const { data: usageData, error: rpcError } = await authedClient.rpc('get_chat_usage', {
      p_user_id: user.id,
      p_daily_limit: dailyLimit,
    });

    if (rpcError) {
      console.error('get_chat_usage RPC error:', rpcError);
      return NextResponse.json(
        {
          messages_used_today: 0,
          daily_limit: dailyLimit,
          remaining: dailyLimit,
          is_pro: isPro,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      messages_used_today: usageData?.messages_used_today ?? 0,
      daily_limit: dailyLimit,
      remaining: usageData?.remaining ?? dailyLimit,
      is_pro: isPro,
    });
  } catch (err) {
    console.error('Error fetching chat usage:', err);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}
