// Structured content for the Usage Guidelines page, in Arabic and English.
// Reuses the same PolicyBlock/PolicyContent shape as the other legal pages.

import { PolicyBlock, PolicyContent } from './privacy-policy';

export const usageGuidelinesContent: Record<'ar' | 'en', PolicyContent> = {
  ar: {
    title: 'دليل استخدام رِكال (Rekal)',
    lastUpdated: '',
    blocks: [
      {
        type: 'p',
        text: 'مرحبًا فيك في رِكال! هذا الدليل يشرح لك فكرة الموقع وكيف تستفيد منه أقصى استفادة.',
      },
      { type: 'h2', text: '١. ما هو رِكال، ولأي مشكلة يحلها؟' },
      {
        type: 'p',
        text: 'تطبيقات حفظ المفردات التقليدية قوية، لكنها غالبًا معقّدة الإعداد، بواجهة بلغة واحدة، وما تراعي مستواك الحقيقي أو تعطيك نطق الكلمة وأمثلة عملية عليها. رِكال صُمم ليجمع أفضل ما فيها بحزمة أبسط:',
      },
      {
        type: 'ul',
        items: [
          'واجهة سهلة وثنائية اللغة (عربي/إنجليزي) — يعني تقدر تستخدمه براحتك بأي لغة تفضّلها.',
          'نظام تكرار متباعد ذكي ومخصص لمستواك، بدل ما يكون عشوائي.',
          'نطق صوتي لكل كلمة، عشان تتعلم النطق الصحيح مو بس الكتابة.',
          '3 جمل توضيحية مخصصة لكل كلمة، عشان تفهم استخدامها الفعلي بالسياق، مو بس تحفظ الترجمة.',
        ],
      },
      {
        type: 'p',
        text: 'الموقع موجّه لأي شخص يبغى يتعلم مفردات إنجليزية جديدة ويثبتها بذاكرته على المدى الطويل، سواء كنت ناطق بالعربية أو بلغة ثانية — لأن الواجهة والمحتوى مصممين ليخدموا الطرفين.',
      },
      { type: 'h2', text: '٢. فكرة التكرار المتباعد (Spaced Repetition)' },
      {
        type: 'p',
        text: 'يعتمد رِكال على خوارزمية علمية تُسمى SM-2، وفكرتها بسيطة:',
      },
      {
        type: 'ul',
        items: [
          'يعرض عليك الموقع كلمة إنجليزية.',
          'تحاول تتذكر معناها، وتقيّم مدى صعوبتها عليك (سهلة، متوسطة، صعبة... إلخ).',
          'بناءً على تقييمك، يقرر النظام متى يعيد عرض هذي الكلمة عليك مرة ثانية: كل ما كانت سهلة تتباعد المراجعة، وكل ما كانت صعبة تتكرر عليك بفترات أقرب.',
        ],
      },
      {
        type: 'p',
        text: 'هذي الطريقة مثبتة علميًا إنها أكفأ بكثير من الحفظ العشوائي أو المراجعة المكثفة لمرة وحدة، لأنها تستغل "منحنى النسيان" وتراجع الكلمة قبل ما تنساها بالضبط.',
      },
      { type: 'h2', text: '٣. مستويات CEFR' },
      {
        type: 'p',
        text: 'يوفر رِكال 5 مستويات لغوية حسب المعيار الأوروبي المرجعي المشترك للغات (CEFR): A1 → A2 → B1 → B2 → C1.',
      },
      {
        type: 'p',
        text: 'عند إنشاء حسابك (أو من الإعدادات لاحقًا)، تختار المستوى اللي يناسب مستواك الحالي بالإنجليزي. لو ما متأكد من مستواك بالضبط، اختار المستوى اللي تحس إنه أقرب لمستوى مفرداتك الحالي — تقدر تغيّره لاحقًا بأي وقت من الإعدادات.',
      },
      { type: 'h2', text: '٤. كيف يختار الموقع الكلمات الجديدة لك' },
      { type: 'p', text: 'الكلمات الجديدة اللي يعرضها عليك رِكال ما تكون عشوائية بالكامل:' },
      {
        type: 'ul',
        items: [
          'أغلب الكلمات تكون من نفس مستواك المختار.',
          'نسبة أقل تدريجيًا تكون من المستويات الأدنى من مستواك — لتثبيت الأساسيات.',
          'لا يعرض عليك الموقع أي كلمات من مستوى أعلى من مستواك الحالي.',
        ],
      },
      { type: 'h2', text: '٥. الخطة المجانية مقابل خطة PRO' },
      {
        type: 'ul',
        items: [
          'الخطة المجانية: حتى 50 مراجعة كلمة/يوم.',
          'خطة PRO: عدد مراجعات غير محدود.',
        ],
      },
      {
        type: 'p',
        text: 'لو وصلت للحد اليومي بالخطة المجانية، بتحتاج تنتظر لليوم التالي أو تشترك بخطة PRO عشان تكمل المراجعة بدون حدود.',
      },
      { type: 'h2', text: '٦. نصائح للاستفادة القصوى من رِكال' },
      {
        type: 'ul',
        items: [
          'المراجعة اليومية المنتظمة أفضل بكثير من جلسات مكثفة متباعدة — حتى بضع دقائق يوميًا أفعل من ساعة كاملة مرة كل أسبوع.',
          'كن صادق بتقييمك للكلمة. لا تحدد "سهلة" على كلمة ما تعرفها فعلًا — هذا يفسد جدولة المراجعة القادمة ويخليك تنساها لاحقًا.',
          'استخدم زر الاستماع للنطق مع كل كلمة، خصوصًا لو تتعلم النطق الصحيح مو بس الكتابة.',
          'اقرأ الجمل الثلاث المرفقة مع كل كلمة عشان تفهم استخدامها الفعلي بسياقات مختلفة.',
          'تابع تقدمك من لوحة التحكم/الإحصائيات بحسابك، عشان تشوف كم كلمة ثبّتها فعليًا وكم باقي عليك.',
        ],
      },
      { type: 'h2', text: '٧. إعادة ضبط البيانات' },
      {
        type: 'p',
        text: 'بإعدادات حسابك، تلقى خيار "إعادة ضبط البيانات". هذا الخيار يمسح سجل تقدمك التعليمي بالكامل (تواريخ المراجعة، تقييماتك السابقة) ويرجّعك تبدأ من الصفر.',
      },
      {
        type: 'p',
        text: 'استخدمه فقط لو تبغى تبدأ رحلة تعلمك من جديد بالكامل، أو غيّرت مستواك اللغوي بشكل جذري وتبغى تعيد بناء سجلك من الصفر.',
      },
      {
        type: 'callout',
        text: '⚠️ هذا الإجراء لا يمكن التراجع عنه، فتأكد قبل لا تضغط عليه.',
      },
      {
        type: 'p',
        text: 'لأي استفسار أو مساعدة إضافية، تواصل معنا عبر amr.k.qaid@gmail.com.',
      },
    ],
  },
  en: {
    title: 'Rekal Usage Guide',
    lastUpdated: '',
    blocks: [
      {
        type: 'p',
        text: "Welcome to Rekal! This guide explains the idea behind the app and how to get the most out of it.",
      },
      { type: 'h2', text: '1. What Is Rekal, and What Problem Does It Solve?' },
      {
        type: 'p',
        text: "Traditional vocabulary apps (like Anki or Quizlet) are powerful, but they're often complex to set up, single-language, and don't adapt to your real level or give you pronunciation and practical examples. Rekal was designed to combine the best of both in a simpler package:",
      },
      {
        type: 'ul',
        items: [
          'An easy-to-use, bilingual interface (Arabic/English) — so you can use it comfortably in whichever language you prefer.',
          'A smart, personalized spaced-repetition system, tailored to your level instead of being random.',
          'Audio pronunciation for every word, so you learn the correct pronunciation, not just the spelling.',
          '3 custom example sentences for each word, so you understand its real-world usage in context, not just memorize a translation.',
        ],
      },
      {
        type: 'p',
        text: "The app is aimed at anyone who wants to learn new English vocabulary and retain it in long-term memory, whether you're a native Arabic speaker or speak another language — since both the interface and content are designed to serve both.",
      },
      { type: 'h2', text: '2. The Idea Behind Spaced Repetition' },
      {
        type: 'p',
        text: 'Rekal is built on a scientific algorithm called SM-2. The idea is simple:',
      },
      {
        type: 'ul',
        items: [
          'The app shows you an English word.',
          'You try to recall its meaning and rate how difficult it was for you (easy, medium, hard... etc).',
          'Based on your rating, the system decides when to show you this word again: the easier it is, the further apart reviews get spaced; the harder it is, the sooner it repeats.',
        ],
      },
      {
        type: 'p',
        text: 'This method is scientifically proven to be far more effective than random memorization or a single intensive cram session, because it works with the "forgetting curve" and reviews the word right before you\'d naturally forget it.',
      },
      { type: 'h2', text: '3. CEFR Levels' },
      {
        type: 'p',
        text: 'Rekal offers 5 language levels based on the Common European Framework of Reference for Languages (CEFR): A1 → A2 → B1 → B2 → C1.',
      },
      {
        type: 'p',
        text: "When you create your account (or later from settings), you choose the level that matches your current English proficiency. If you're not sure of your exact level, pick the one closest to your current vocabulary level — you can change it anytime later from settings.",
      },
      { type: 'h2', text: '4. How New Words Are Selected For You' },
      { type: 'p', text: "The new words Rekal shows you aren't fully random:" },
      {
        type: 'ul',
        items: [
          'Most words come from your selected level.',
          'A gradually smaller portion comes from levels below yours — to reinforce the fundamentals.',
          'The app never shows you words from a level higher than your current one.',
        ],
      },
      { type: 'h2', text: '5. Free Plan vs. PRO Plan' },
      {
        type: 'ul',
        items: [
          'Free plan: up to 50 word reviews/day.',
          'PRO plan: unlimited reviews.',
        ],
      },
      {
        type: 'p',
        text: "If you hit the daily limit on the free plan, you'll need to wait until the next day or subscribe to the PRO plan to keep reviewing without limits.",
      },
      { type: 'h2', text: '6. Tips to Get the Most Out of Rekal' },
      {
        type: 'ul',
        items: [
          'Regular daily review is far better than infrequent intensive sessions — even a few minutes a day beats a full hour once a week.',
          'Be honest with your ratings. Don\'t mark a word as "easy" if you don\'t actually know it — this throws off future scheduling and makes you forget it later.',
          "Use the audio button for each word, especially if you're learning correct pronunciation, not just spelling.",
          'Read the three example sentences attached to each word to understand its real usage in different contexts.',
          "Track your progress from your account's dashboard/stats page to see how many words you've truly mastered and how many are left.",
        ],
      },
      { type: 'h2', text: '7. Resetting Your Data' },
      {
        type: 'p',
        text: 'In your account settings, you\'ll find a "Reset Data" option. This completely erases your learning progress history (review dates, past ratings) and starts you from scratch.',
      },
      {
        type: 'p',
        text: "Only use it if you want to start your learning journey completely over, or if you've drastically changed your language level and want to rebuild your history from zero.",
      },
      {
        type: 'callout',
        text: '⚠️ This action cannot be undone, so make sure before you click it.',
      },
      {
        type: 'p',
        text: 'For any questions or additional help, contact us at amr.k.qaid@gmail.com.',
      },
    ],
  },
};