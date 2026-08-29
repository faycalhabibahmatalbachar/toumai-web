import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Version arabe — le gisement de visibilité qu'on n'avait pas touché.
 *
 * POURQUOI L'ARABE, ET POURQUOI MAINTENANT
 * -----------------------------------------
 * L'arabe est langue officielle du Tchad au même titre que le français, et
 * l'arabe tchadien est la langue véhiculaire d'une grande partie du pays. Or
 * tout le site est en français : sur « ذكاء اصطناعي تشاد » — « intelligence
 * artificielle Tchad » en arabe — il n'y a rien de nous à trouver.
 *
 * C'est le contraire d'un marché encombré : la concurrence y est quasi nulle,
 * là où « IA Tchad » en français se dispute déjà. Une page arabe réelle,
 * écrite et non traduite à la machine, se classe sur un espace de requêtes que
 * personne n'occupe.
 *
 * Le lien `hreflang` entre les deux versions dit aux moteurs qu'il s'agit de
 * la MÊME page en deux langues : sans lui, elles se concurrencent au lieu de
 * s'appuyer l'une sur l'autre.
 */
export const metadata: Metadata = {
  title: "توماي — الذكاء الاصطناعي التشادي",
  description:
    "توماي: ذكاء اصطناعي تشادي مجاني يتحدث العربية والعربية التشادية والفرنسية. محادثة، صور، صوت، واتساب. صُنع في نجامينا.",
  alternates: {
    canonical: "https://toumaiai.com/ar",
    languages: {
      fr: "https://toumaiai.com/intelligence-artificielle-tchad",
      ar: "https://toumaiai.com/ar",
    },
  },
  openGraph: {
    title: "توماي — الذكاء الاصطناعي التشادي",
    description: "ذكاء اصطناعي تشادي مجاني: محادثة بالعربية التشادية، صور، صوت، واتساب.",
    url: "https://toumaiai.com/ar",
    locale: "ar_TD",
    type: "article",
  },
};

const FAQ = [
  {
    q: "هل يوجد ذكاء اصطناعي تشادي؟",
    r: "نعم. توماي مساعد ذكاء اصطناعي صُمّم في تشاد، في نجامينا، على يد فيصل حبيب أحمد. يمكن استخدامه مجانًا على toumaiai.com وعلى أندرويد، وهو يفهم العربية والعربية التشادية والفرنسية.",
  },
  {
    q: "هل توماي مجاني؟",
    r: "نعم. المحادثة وتوليد الصور والإملاء والوضع الصوتي متاحة مجانًا، دون الحاجة إلى بطاقة بنكية للبدء.",
  },
  {
    q: "هل يفهم توماي العربية التشادية؟",
    r: "نعم، وهذا ما يميّزه. معظم المساعدين يتعاملون مع العربية الفصحى فقط، بينما يُطوَّر توماي اعتمادًا على مدوّنة من العربية التشادية (الشوا) جُمعت ميدانيًا، ليفهم اللغة كما تُنطق فعلًا في تشاد.",
  },
  {
    q: "ماذا يستطيع توماي أن يفعل؟",
    r: "الإجابة عن الأسئلة، كتابة النصوص وتصحيحها، كتابة البرمجيات وتنفيذها، توليد الصور وتحليلها، تفريغ الصوت والقراءة الصوتية، البحث في الويب مع ذكر المصادر، والاتصال بواتساب والبريد والتقويم.",
  },
  {
    q: "هل أحتاج إلى إنترنت سريع؟",
    r: "لا. التطبيق مصمَّم للشبكات التشادية: يعرض فورًا ما هو محفوظ لديه، ويقيس جودة الاتصال الفعلية، ويحتفظ بما هو معروض عند ضعف الشبكة بدل إفراغ الشاشة.",
  },
];

const FAQ_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: "ar",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.r },
  })),
});

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_LD }} />
      {/* `dir="rtl"` porté ici, et non sur <html> : le reste du site est en
          français, et basculer la direction globale casserait toutes les
          autres pages. */}
      <div dir="rtl" lang="ar" className="flex min-h-dvh flex-col">
        <header className="flex select-none items-center justify-between px-4 py-3">
          <Link href="/" draggable={false} className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-sm font-semibold">توماي</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/chat"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              افتح المحادثة
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-8">
          <h1 className="landing-serif text-3xl tracking-tight sm:text-4xl">
            الذكاء الاصطناعي في تشاد
          </h1>

          <div className="mt-8 space-y-4 text-[16px] leading-loose text-[var(--text-secondary)]">
            <p>
              وصل الذكاء الاصطناعي إلى تشاد عبر خدمات صُمّمت في أماكن أخرى،
              بالإنجليزية أو بالفرنسية الفصيحة، مدفوعة في الغالب، ونادرًا ما
              تناسب الشبكات المتاحة فعلًا في نجامينا أو موندو أو أبشة.{" "}
              <strong className="text-[var(--text-primary)]">توماي</strong> وُلد
              من هذه الملاحظة: ذكاء اصطناعي تشادي، مجاني، يتحدث لغات البلد،
              ويعمل على شبكة البلد.
            </p>

            <h2 className="landing-serif mt-10 text-xl text-[var(--text-primary)]">
              صُنع في تشاد
            </h2>
            <p>
              يُطوَّر توماي في نجامينا على يد فيصل حبيب أحمد. الاسم مأخوذ من
              «توماي»، الأحفورة البشرية التي اكتُشفت في صحراء جوراب عام ٢٠٠١،
              وهي من أقدم ما عُرف من سلالة الإنسان، وأحد الرموز العلمية لتشاد.
            </p>
            <p>
              المساعد متاح على الويب وعلى أندرويد. لا يطلب بطاقة بنكية ولا
              اشتراكًا للبدء — وهو شرط يحسم وحده، في بلد يصعب فيه الدفع الدولي،
              من يستطيع استخدام الأداة ومن لا يستطيع.
            </p>

            <h2 className="landing-serif mt-10 text-xl text-[var(--text-primary)]">
              العربية، والعربية التشادية
            </h2>
            <p>
              هنا الفارق الجوهري مع المساعدين العالميين. لتشاد لغتان رسميتان،
              الفرنسية والعربية، ولغة تواصل واسعة الانتشار:{" "}
              <strong className="text-[var(--text-primary)]">
                العربية التشادية
              </strong>{" "}
              (الشوا)، وهي ليست العربية الفصحى ولا مجرد لهجة في النطق.
            </p>
            <p>
              يُطوَّر توماي اعتمادًا على مدوّنة من العربية التشادية جُمعت
              ميدانيًا — تسجيلات، تفريغات، وعمل معجمي — ليفهم اللغة كما تُنطق،
              لا كما تُكتب في الكتب.
            </p>

            <h2 className="landing-serif mt-10 text-xl text-[var(--text-primary)]">
              ماذا يفعل توماي
            </h2>
            <ul className="list-disc space-y-1.5 pr-5">
              <li>يجيب ويكتب: أسئلة، رسائل، ملخصات، ترجمات، تصحيح لغوي.</li>
              <li>يكتب البرمجيات وينفّذها في نحو ثلاثين لغة برمجة.</li>
              <li>يولّد الصور، ويحلّل ما يُرسَل إليه منها.</li>
              <li>يتكلم ويسمع: إملاء، قراءة صوتية، ووضع محادثة صوتية متصلة.</li>
              <li>يبحث في الويب عند الحاجة، ويذكر ما اطّلع عليه.</li>
              <li>يتصل بأدواتك: واتساب، البريد، التقويم — بتأكيد قبل كل إجراء فعلي.</li>
            </ul>

            <h2 className="landing-serif mt-10 text-xl text-[var(--text-primary)]">
              مصمَّم لشبكة البلد
            </h2>
            <p>
              التطبيق الذي يفترض ألياف بصرية يصبح عديم الفائدة على اتصال محمول
              تشادي. يعرض توماي فورًا ما هو محفوظ لديه، ويقيس زمن الاستجابة
              الفعلي إلى خوادمه بدل الاكتفاء بأيقونة الشبكة في الهاتف، ويحتفظ
              بما هو معروض عند ضعف الاتصال بدل إفراغ الصفحة.
            </p>

            <h2 className="landing-serif mt-10 text-xl text-[var(--text-primary)]">
              أسئلة شائعة
            </h2>
            <dl className="mt-4 space-y-5">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold text-[var(--text-primary)]">{f.q}</dt>
                  <dd className="mt-1">{f.r}</dd>
                </div>
              ))}
            </dl>

            <h2 className="landing-serif mt-10 text-xl text-[var(--text-primary)]">
              جرّبه
            </h2>
            <p>
              <Link href="/chat" className="font-semibold underline underline-offset-2">
                افتح توماي
              </Link>{" "}
              — مجانًا، بلا تثبيت. النسخة الفرنسية من هذه الصفحة متاحة{" "}
              <Link
                href="/intelligence-artificielle-tchad"
                hrefLang="fr"
                className="underline underline-offset-2"
              >
                هنا
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
