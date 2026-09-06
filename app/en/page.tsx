import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "AI Assistant for Africa — Toumaï AI",
  description: "Toumaï AI is a free AI assistant built in Chad for chat, writing, images, voice, web research and practical work in French, Arabic and Chadian Arabic.",
  alternates: {
    canonical: "https://toumaiai.com/en",
    languages: { fr: "https://toumaiai.com/", en: "https://toumaiai.com/en/", ar: "https://toumaiai.com/ar/", "x-default": "https://toumaiai.com/" },
  },
  openGraph: { title: "AI Assistant for Africa — Toumaï AI", description: "A practical AI assistant built in Chad for multilingual work.", url: "https://toumaiai.com/en", locale: "en_US" },
  other: { "content-language": "en" },
};

const FAQ = [
  ["What is Toumaï AI?", "Toumaï AI is a web-based artificial intelligence assistant built in Chad. It helps people chat, write, translate, research, work with images and use voice features."],
  ["Which languages does Toumaï AI support?", "Toumaï AI is designed for French, Arabic and Chadian Arabic alongside other languages used in everyday work and study."],
  ["Who is it for?", "It is useful for students, professionals, entrepreneurs, researchers and developers who need an accessible multilingual AI assistant."],
];
const faqLd = JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", inLanguage: "en", mainEntity: FAQ.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });

export default function EnglishPage() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqLd }} /><LegalLayout title="AI assistant for Africa, built in Chad"><p><strong>Toumaï AI</strong> is a practical artificial intelligence assistant built in Chad for people who work, learn and create across French, Arabic and Chadian Arabic.</p><h2>One assistant, practical work</h2><p>Use Toumaï AI to explore ideas, draft and revise text, translate, summarize documents, ask research questions, generate or analyse images, and use voice features. It is available in the browser without requiring an installation to begin.</p><h2>Designed for multilingual Africa</h2><p>Language and connectivity shape whether an AI tool is genuinely useful. Toumaï AI focuses on an experience that is understandable in the languages people use in Chad, while remaining useful for broader African and international work.</p><h2>Learn more</h2><ul><li><Link href="/assistant-ia">Explore the AI assistant</Link></li><li><Link href="/intelligence-artificielle-tchad">Read about artificial intelligence in Chad</Link></li><li><Link href="/ar" hrefLang="ar">اقرأ بالعربية</Link></li></ul><h2>Questions</h2>{FAQ.map(([q, a]) => <section key={q}><h3>{q}</h3><p>{a}</p></section>)}<p><Link href="/chat" className="font-semibold underline">Try Toumaï AI</Link></p></LegalLayout></>;
}
