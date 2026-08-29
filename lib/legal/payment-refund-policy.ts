// Structured content for the Payment & Refund Policy page, in Arabic and English.
// Reuses the same PolicyBlock/PolicyContent shape as the Privacy Policy page.

import { PolicyBlock, PolicyContent } from './privacy-policy';

export const paymentRefundPolicyContent: Record<'ar' | 'en', PolicyContent> = {
  ar: {
    title: 'سياسة الدفع والاسترجاع — ركال (Rekal)',
    lastUpdated: 'آخر تحديث: [التاريخ]',
    blocks: [
      {
        type: 'p',
        text: 'توضح هذه السياسة تفاصيل الاشتراك المدفوع بموقع [اسم الشركة]، وكيفية معالجة الدفع، وشروط الإلغاء والاسترجاع. يُرجى قراءتها بعناية قبل الاشتراك.',
      },
      { type: 'h2', text: '١. طبيعة الاشتراك' },
      {
        type: 'p',
        text: 'الاشتراك في خطة PRO هو اشتراك شهري متجدد تلقائيًا بسعر 5 دولار أمريكي/شهر، ما لم يُذكر خلاف ذلك بوضوح عند الاشتراك. يتجدد الاشتراك تلقائيًا في نهاية كل دورة شهرية ما لم يتم إلغاؤه قبل موعد التجديد.',
      },
      {
        type: 'ul',
        items: [
          'الخطة المجانية: حد أقصى 50 مراجعة كلمة يوميًا.',
          'خطة PRO: عدد غير محدود من المراجعات اليومية.',
        ],
      },
      { type: 'h2', text: '٢. من يعالج الدفع' },
      {
        type: 'p',
        text: 'جميع المدفوعات تُعالج بالكامل عبر Lemon Squeezy، الذي يعمل بصفة "بائع السجل" (Merchant of Record). يعني هذا أن المعاملة المالية تتم رسميًا بينك وبين Lemon Squeezy مباشرة، وليس بينك وبين [اسم الشركة] بشكل مباشر.',
      },
      {
        type: 'ul',
        items: [
          'تقع مسؤولية معالجة الدفع والامتثال الضريبي على عاتق Lemon Squeezy.',
          'أي مشاكل متعلقة بالفوترة، أو محاولات استرداد أموال، أو نزاعات دفع (Chargebacks)، تُدار وفق سياسات وإجراءات Lemon Squeezy الخاصة بها.',
          'لا نحتفظ نحن بأي تفاصيل دفع خام على خوادمنا؛ فقط معرّف الاشتراك ومعرّف العميل الصادرين من Lemon Squeezy.',
        ],
      },
      { type: 'h2', text: '٣. إلغاء الاشتراك' },
      { type: 'p', text: 'يمكنك إلغاء التجديد التلقائي لاشتراكك في أي وقت. عند الإلغاء:' },
      {
        type: 'ul',
        items: [
          'يستمر وصولك الكامل (غير المحدود) لمزايا خطة PRO فعالاً حتى نهاية الفترة المدفوعة التي دفعتها بالفعل.',
          'بعد انتهاء تلك الفترة، يعود حسابك تلقائيًا إلى حدود الخطة المجانية (50 مراجعة/يوم).',
          'لا يوجد استرجاع جزئي عن الأيام المتبقية من الفترة المدفوعة في حال الإلغاء المبكر، ما لم يُذكر خلاف ذلك صراحةً.',
        ],
      },
      { type: 'h2', text: '٤. سياسة استرداد الأموال' },
      {
        type: 'callout',
        text: 'لا يوجد استرداد للأموال عن أي مبلغ مدفوع، إلا في الحالات التي يُلزم بها القانون المعمول به. بالاشتراك في خطة PRO، فإنك تقر بموافقتك على هذه السياسة.',
      },
      {
        type: 'p',
        text: 'لأي استفسار متعلق بالفوترة أو الاسترداد، يُرجى التواصل أولًا مع دعم [اسم الشركة] عبر [البريد الإلكتروني للدعم]، مع العلم أن معالجة أي طلب استرداد فعلي تخضع لإجراءات Lemon Squeezy.',
      },
      { type: 'h2', text: '٥. إخلاء المسؤولية وحدود المسؤولية' },
      {
        type: 'p',
        text: 'يُقدَّم الموقع وخدماته "كما هي" دون أي ضمانات من أي نوع، صريحة أو ضمنية. لا يتحمل [اسم الشركة] المسؤولية عن أي أضرار غير مباشرة أو عرضية أو تبعية تنشأ عن استخدامك للموقع. في جميع الأحوال، لا تتجاوز المسؤولية الإجمالية لـ [اسم الشركة] تجاهك المبلغ الذي دفعته فعليًا خلال الأشهر الثلاثة السابقة للحادثة موضوع المطالبة.',
      },
      { type: 'h2', text: '٦. القانون الحاكم والجهة القضائية المختصة' },
      {
        type: 'p',
        text: 'تخضع هذه السياسة وتُفسَّر وفقًا لقوانين ماليزيا، وتكون المحاكم الماليزية المختصة هي الجهة المختصة بالفصل في أي نزاع ينشأ عنها، ما لم يقتضِ القانون المعمول به خلاف ذلك.',
      },
      { type: 'h2', text: '٧. التغييرات على هذه السياسة' },
      {
        type: 'p',
        text: 'قد نقوم بتحديث هذه السياسة من وقت لآخر، وسيتم نشر أي تحديثات على هذه الصفحة.',
      },
      { type: 'h2', text: '٨. تواصل معنا' },
      { type: 'p', text: 'لأي استفسار يتعلق بالدفع أو الاشتراك، يمكنك التواصل معنا عبر:' },
      { type: 'ul', items: ['📧 [البريد الإلكتروني للدعم]', '🌐 [رابط الموقع]'] },
    ],
  },
  en: {
    title: 'Payment & Refund Policy — Rekal',
    lastUpdated: 'Last updated: [Date]',
    blocks: [
      {
        type: 'p',
        text: 'This policy explains the details of the paid subscription on the [Company Name] website, how payment is processed, and the terms of cancellation and refunds. Please read it carefully before subscribing.',
      },
      { type: 'h2', text: '1. Nature of the Subscription' },
      {
        type: 'p',
        text: 'The PRO plan subscription is a monthly, auto-renewing subscription priced at $5 USD/month, unless clearly stated otherwise at checkout. The subscription renews automatically at the end of each monthly cycle unless canceled before the renewal date.',
      },
      {
        type: 'ul',
        items: [
          'Free plan: capped at 50 word reviews per day.',
          'PRO plan: unlimited daily reviews.',
        ],
      },
      { type: 'h2', text: '2. Who Processes Payment' },
      {
        type: 'p',
        text: 'All payments are processed entirely through Lemon Squeezy, which acts as the Merchant of Record. This means the financial transaction takes place officially between you and Lemon Squeezy directly, not directly between you and [Company Name].',
      },
      {
        type: 'ul',
        items: [
          'Responsibility for payment processing and tax compliance lies with Lemon Squeezy.',
          'Any issues related to billing, refund requests, or payment disputes (chargebacks) are handled according to Lemon Squeezy\'s own policies and procedures.',
          'We do not retain any raw payment details on our servers; only the subscription ID and customer ID issued by Lemon Squeezy.',
        ],
      },
      { type: 'h2', text: '3. Canceling Your Subscription' },
      { type: 'p', text: 'You may cancel auto-renewal of your subscription at any time. Upon cancellation:' },
      {
        type: 'ul',
        items: [
          'Your full (unlimited) access to PRO features remains active until the end of the paid period you have already paid for.',
          "After that period ends, your account automatically reverts to the free plan's limits (50 reviews/day).",
          'No partial refund is issued for the remaining days of the paid period in the case of early cancellation, unless explicitly stated otherwise.',
        ],
      },
      { type: 'h2', text: '4. Refund Policy' },
      {
        type: 'callout',
        text: 'No refunds are issued for any amount paid, except where required by applicable law. By subscribing to the PRO plan, you acknowledge and agree to this policy.',
      },
      {
        type: 'p',
        text: 'For any billing or refund inquiries, please first contact [Company Name] support at [Support Email], noting that processing of any actual refund request is subject to Lemon Squeezy\'s procedures.',
      },
      { type: 'h2', text: '5. Disclaimer and Limitation of Liability' },
      {
        type: 'p',
        text: 'The website and its services are provided "as is," without warranties of any kind, express or implied. [Company Name] shall not be liable for any indirect, incidental, or consequential damages arising from your use of the website. In all cases, [Company Name]\'s total liability to you shall not exceed the amount you actually paid during the three months preceding the incident giving rise to the claim.',
      },
      { type: 'h2', text: '6. Governing Law and Jurisdiction' },
      {
        type: 'p',
        text: 'This policy is governed by and construed in accordance with the laws of Malaysia, and the competent Malaysian courts shall have jurisdiction over any dispute arising from it, unless applicable law requires otherwise.',
      },
      { type: 'h2', text: '7. Changes to This Policy' },
      {
        type: 'p',
        text: 'We may update this policy from time to time, and any updates will be posted on this page.',
      },
      { type: 'h2', text: '8. Contact Us' },
      { type: 'p', text: 'For any questions about payment or your subscription, you can reach us at:' },
      { type: 'ul', items: ['📧 [Support Email]', '🌐 [Website URL]'] },
    ],
  },
};