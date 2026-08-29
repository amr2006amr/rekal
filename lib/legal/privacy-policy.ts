// Structured content for the Privacy Policy page, in Arabic and English.
// Each language is an array of simple content blocks rendered by
// components/PolicyPage.tsx. Keep placeholders like [اسم الشركة] /
// [Company Name] until real values are available, then replace here only.

export type PolicyBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'callout'; text: string };

export interface PolicyContent {
  title: string;
  lastUpdated: string;
  blocks: PolicyBlock[];
}

export const privacyPolicyContent: Record<'ar' | 'en', PolicyContent> = {
  ar: {
    title: 'سياسة الخصوصية — ركال (Rekal)',
    lastUpdated: 'آخر تحديث: [التاريخ]',
    blocks: [
      {
        type: 'p',
        text: 'مرحبًا بك في ركال (Rekal). نحن نولي حماية خصوصيتك أهمية كبيرة، وتوضح هذه السياسة البيانات التي نجمعها عنك، وأسباب جمعها، وكيفية حمايتها، وحقوقك المتعلقة بها.',
      },
      { type: 'h2', text: '١. البيانات التي نجمعها' },
      {
        type: 'p',
        text: 'عند استخدامك لموقع [اسم الشركة]، قد نجمع الأنواع التالية من البيانات:',
      },
      {
        type: 'ul',
        items: [
          'البريد الإلكتروني: يُجمع عند إنشاء حسابك أو تسجيل دخولك، سواء عبر البريد الإلكتروني وكلمة المرور أو عبر حساب جوجل (Google OAuth).',
          'المستوى اللغوي: المستوى الذي تختاره وفق معيار الإطار الأوروبي المرجعي المشترك للغات (CEFR)، من A1 إلى C1.',
          'سجل التقدم التعليمي: يشمل تواريخ المراجعة القادمة لكل كلمة، عدد مرات مراجعتها، وتقييمك لصعوبتها.',
          'عدد المراجعات اليومية: لتطبيق الحد الأقصى المسموح به ضمن الخطة المجانية.',
          'حالة الاشتراك: مجاني، مفعّل (PRO)، أو غير ذلك من الحالات.',
          'معرّفات الاشتراك: عند الاشتراك المدفوع، نحتفظ بمعرّف الاشتراك ومعرّف العميل الصادرين من مزوّد الدفع Lemon Squeezy، دون أي تفاصيل دفع خام.',
          'بيانات تحليلية وموقع تقريبي: نستخدم أدوات تحليل من جوجل (مثل Google Analytics) لفهم كيفية استخدام الموقع، وقد تتيح لنا هذه الأدوات معرفة موقعك الجغرافي التقريبي (على مستوى المدينة أو الدولة، استنادًا إلى عنوان IP) وبيانات استخدام عامة مثل نوع الجهاز والمتصفح. هذه البيانات تُجمع بواسطة جوجل وفق سياساتها الخاصة.',
        ],
      },
      {
        type: 'callout',
        text: 'ما لا نجمعه ولا نخزّنه إطلاقًا: لا نجمع ولا نخزّن على خوادمنا أي أرقام بطاقات بنكية أو تفاصيل دفع خام. تُعالج جميع بيانات الدفع بالكامل عبر Lemon Squeezy.',
      },
      { type: 'h2', text: '٢. لماذا نجمع هذه البيانات' },
      { type: 'p', text: 'نستخدم بياناتك للأغراض التالية فقط:' },
      {
        type: 'ul',
        items: [
          'تشغيل الخدمة الأساسية للموقع وتمكينك من تسجيل الدخول واستخدام حسابك.',
          'تتبع تقدمك التعليمي وجدولة مراجعة الكلمات بما يتناسب مع أدائك.',
          'تطبيق حدود الخطة المجانية أو منحك مزايا خطة PRO حسب حالة اشتراكك.',
          'إدارة اشتراكك المدفوع والتواصل معك بخصوصه عند الحاجة.',
          'فهم كيفية استخدام زوارنا للموقع وتحسين تجربتهم من خلال بيانات التحليل.',
        ],
      },
      { type: 'h2', text: '٣. كيف نحمي بياناتك' },
      {
        type: 'p',
        text: 'نتخذ إجراءات تقنية وتنظيمية معقولة لحماية بياناتك من الوصول غير المصرّح به أو الفقدان أو سوء الاستخدام. نحن لا نبيع بياناتك الشخصية لأي طرف ثالث، ولا نشاركها إلا مع الجهات المذكورة أدناه وللأغراض المحددة فقط.',
      },
      { type: 'h2', text: '٤. الجهات التي نشارك معها البيانات' },
      {
        type: 'p',
        text: 'نشارك بياناتك فقط مع الجهات التالية، وكل منها يعالج بياناتك وفق سياسته الخاصة:',
      },
      {
        type: 'ul',
        items: [
          'Supabase: لتخزين بيانات حسابك وبيانات تقدمك التعليمي بشكل آمن.',
          'Lemon Squeezy: لمعالجة عمليات الدفع والاشتراك (كمعالج دفع مستقل يعمل بصفة "بائع السجل").',
          'Google (أدوات التحليل): لتحليل استخدام الموقع، بما يشمل معرفة الموقع الجغرافي التقريبي كما هو موضح أعلاه.',
        ],
      },
      { type: 'p', text: 'لا نشارك بياناتك مع أي جهة أخرى خارج هذا النطاق.' },
      { type: 'h2', text: '٥. حقوقك' },
      { type: 'p', text: 'لك الحق في:' },
      {
        type: 'ul',
        items: [
          'طلب نسخة من البيانات التي نحتفظ بها عنك.',
          'طلب حذف حسابك وبياناتك المرتبطة به.',
          'تصحيح أي بيانات غير دقيقة تخصك.',
        ],
      },
      {
        type: 'p',
        text: 'لممارسة أي من هذه الحقوق، يُرجى التواصل معنا عبر [البريد الإلكتروني للدعم].',
      },
      { type: 'h2', text: '٦. الاحتفاظ بالبيانات' },
      {
        type: 'p',
        text: 'نحتفظ ببياناتك طالما كان حسابك نشطًا، أو حسب الحاجة لتقديم الخدمة، ما لم تطلب حذفها أو يقتضِ القانون خلاف ذلك.',
      },
      { type: 'h2', text: '٧. التغييرات على هذه السياسة' },
      {
        type: 'p',
        text: 'قد نقوم بتحديث هذه السياسة من وقت لآخر. سيتم نشر أي تحديثات على هذه الصفحة، ويُنصح بمراجعتها دوريًا.',
      },
      { type: 'h2', text: '٨. تواصل معنا' },
      {
        type: 'p',
        text: 'لأي استفسار يتعلق بهذه السياسة أو ببياناتك، يمكنك التواصل معنا عبر:',
      },
      { type: 'ul', items: ['📧 [البريد الإلكتروني للدعم]', '🌐 [رابط الموقع]'] },
    ],
  },
  en: {
    title: 'Privacy Policy — Rekal',
    lastUpdated: 'Last updated: [Date]',
    blocks: [
      {
        type: 'p',
        text: 'Welcome to Rekal. We take the protection of your privacy seriously. This policy explains what data we collect about you, why we collect it, how we protect it, and your rights regarding it.',
      },
      { type: 'h2', text: '1. Data We Collect' },
      {
        type: 'p',
        text: 'When you use the [Company Name] website, we may collect the following types of data:',
      },
      {
        type: 'ul',
        items: [
          'Email address: collected when you create an account or sign in, whether via email and password or Google OAuth.',
          'Language level: the level you select according to the Common European Framework of Reference for Languages (CEFR), from A1 to C1.',
          'Learning progress data: including the next review date for each word, the number of times it has been reviewed, and your difficulty rating for it.',
          "Daily review count: used to enforce the free plan's daily limit.",
          'Subscription status: free, active (PRO), or other applicable states.',
          'Subscription identifiers: for paid subscribers, we retain the subscription ID and customer ID issued by our payment provider, Lemon Squeezy, with no raw payment details.',
          'Analytics and approximate location data: we use Google analytics tools (such as Google Analytics) to understand how the site is used. These tools may allow us to determine your approximate geographic location (at the city or country level, based on IP address) along with general usage data such as device and browser type. This data is collected by Google under its own policies.',
        ],
      },
      {
        type: 'callout',
        text: 'What we never collect or store: we do not collect or store any bank card numbers or raw payment details on our servers. All payment data is processed entirely through Lemon Squeezy.',
      },
      { type: 'h2', text: '2. Why We Collect This Data' },
      { type: 'p', text: 'We use your data solely for the following purposes:' },
      {
        type: 'ul',
        items: [
          'Operating the core service and enabling you to sign in and use your account.',
          'Tracking your learning progress and scheduling word reviews based on your performance.',
          "Enforcing free-plan limits or granting PRO-plan benefits according to your subscription status.",
          'Managing your paid subscription and contacting you about it when necessary.',
          'Understanding how visitors use the site and improving their experience through analytics data.',
        ],
      },
      { type: 'h2', text: '3. How We Protect Your Data' },
      {
        type: 'p',
        text: 'We take reasonable technical and organizational measures to protect your data from unauthorized access, loss, or misuse. We do not sell your personal data to any third party, and we only share it with the parties listed below, and only for the specific purposes stated.',
      },
      { type: 'h2', text: '4. Who We Share Data With' },
      {
        type: 'p',
        text: 'We share your data only with the following parties, each of which handles your data under its own policy:',
      },
      {
        type: 'ul',
        items: [
          'Supabase: to securely store your account data and learning progress data.',
          'Lemon Squeezy: to process payments and subscriptions (as an independent payment processor acting as Merchant of Record).',
          'Google (analytics tools): to analyze site usage, including determining approximate geographic location as described above.',
        ],
      },
      { type: 'p', text: 'We do not share your data with any party outside this scope.' },
      { type: 'h2', text: '5. Your Rights' },
      { type: 'p', text: 'You have the right to:' },
      {
        type: 'ul',
        items: [
          'Request a copy of the data we hold about you.',
          'Request deletion of your account and associated data.',
          'Correct any inaccurate data about you.',
        ],
      },
      {
        type: 'p',
        text: 'To exercise any of these rights, please contact us at [Support Email].',
      },
      { type: 'h2', text: '6. Data Retention' },
      {
        type: 'p',
        text: 'We retain your data for as long as your account is active, or as needed to provide the service, unless you request deletion or the law requires otherwise.',
      },
      { type: 'h2', text: '7. Changes to This Policy' },
      {
        type: 'p',
        text: 'We may update this policy from time to time. Any updates will be posted on this page, and we recommend reviewing it periodically.',
      },
      { type: 'h2', text: '8. Contact Us' },
      {
        type: 'p',
        text: 'For any questions about this policy or your data, you can reach us at:',
      },
      { type: 'ul', items: ['📧 [Support Email]', '🌐 [Website URL]'] },
    ],
  },
};