import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "About Toumaï AI — AI built in Chad",
  description: "Learn about Toumaï AI: a practical multilingual AI assistant built in Chad for people, teams and businesses across Africa and beyond.",
  alternates: {
    canonical: "https://toumaiai.com/en/about",
    languages: { fr: "https://toumaiai.com/a-propos", en: "https://toumaiai.com/en/about", ar: "https://toumaiai.com/ar/about", "x-default": "https://toumaiai.com/a-propos" },
  },
  openGraph: { title: "About Toumaï AI", description: "A practical multilingual AI assistant built in Chad.", url: "https://toumaiai.com/en/about", locale: "en_US", type: "website" },
};

export default function EnglishAboutPage() {
  return <LegalLayout title="About Toumaï AI"><p><strong>Toumaï AI</strong> is an artificial intelligence assistant built in N&apos;Djamena, Chad. It brings together conversation, writing, code, images, voice, web research and optional connectors in one practical workspace.</p><h2>Our mission</h2><p>We want AI to be accessible and useful: for students learning, professionals getting work done, entrepreneurs building, developers creating, and teams serving their customers. Language, affordability and the quality of a person&apos;s connection should not decide who can benefit.</p><h2>Our vision</h2><p>We are building a multilingual, multimodal and connected AI platform that can grow with real work. Toumaï AI is designed with Chad and Africa in mind while remaining open to international use and collaboration.</p><h2>Why the name Toumaï?</h2><p>The name refers to Toumaï, the fossil discovered in the Djourab Desert in 2001 and associated with Chad&apos;s scientific heritage. It is a reference to curiosity, discovery and an ambition to build technology rooted locally and useful globally.</p><h2>More than a chatbot</h2><p>Chat is the starting point, not the whole product. Toumaï AI can help people write, translate, research, work with images and voice, explore code and connect selected tools with confirmation before sensitive actions.</p><h2>Explore</h2><p><Link href="/assistant-ia" className="underline underline-offset-2">Explore the AI assistant</Link>, <Link href="/intelligence-artificielle-tchad" className="underline underline-offset-2">read about AI in Chad</Link>, or <Link href="/ar/about" hrefLang="ar" className="underline underline-offset-2">read in Arabic</Link>.</p></LegalLayout>;
}
