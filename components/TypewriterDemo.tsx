"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";

interface Exchange {
  question: string;
  answer: string;
}

const EXCHANGES: Exchange[] = [
  {
    question: "Résume l'histoire du royaume du Kanem en 3 phrases.",
    answer:
      "Le Kanem est l'un des plus anciens empires d'Afrique, fondé vers le IXe siècle près du lac Tchad. Il a prospéré grâce au commerce transsaharien et à l'islamisation progressive de ses dirigeants. Son influence s'est étendue sur des siècles, donnant naissance plus tard à l'empire du Kanem-Bornou.",
  },
  {
    question: "Écris une fonction Python qui calcule la suite de Fibonacci.",
    answer:
      "def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a",
  },
  {
    question: "Traduis en arabe tchadien : « Comment vas-tu aujourd'hui ? »",
    answer: "إنت كيف اليوم؟ — une formulation proche du parler tchadien courant.",
  },
];

/** Démo animée : simule une conversation Toumaï AI avec frappe en temps réel. */
export function TypewriterDemo() {
  const [exchangeIndex, setExchangeIndex] = useState(0);
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [phase, setPhase] = useState<"question" | "answer" | "pause">("question");

  useEffect(() => {
    const current = EXCHANGES[exchangeIndex];
    let cancelled = false;

    async function run() {
      // Frappe de la question
      for (let i = 1; i <= current.question.length; i++) {
        if (cancelled) return;
        setQuestionText(current.question.slice(0, i));
        await sleep(22);
      }
      await sleep(500);
      if (cancelled) return;
      setPhase("answer");

      // Frappe de la réponse
      for (let i = 1; i <= current.answer.length; i++) {
        if (cancelled) return;
        setAnswerText(current.answer.slice(0, i));
        await sleep(14);
      }
      await sleep(2200);
      if (cancelled) return;
      setPhase("pause");
      await sleep(600);
      if (cancelled) return;

      setQuestionText("");
      setAnswerText("");
      setPhase("question");
      setExchangeIndex((i) => (i + 1) % EXCHANGES.length);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [exchangeIndex]);

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-2xl shadow-black/5">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--error)]/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/60" />
        <div className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/60" />
        <span className="ml-2 text-xs text-[var(--text-tertiary)]">Toumaï AI</span>
      </div>

      <div className="min-h-[190px] space-y-3">
        {questionText && (
          <div className="flex justify-end">
            <div
              className="max-w-[85%] rounded-xl rounded-tr-sm px-3.5 py-2 text-sm text-white"
              style={{ background: "var(--primary)" }}
            >
              {questionText}
              {phase === "question" && <Cursor />}
            </div>
          </div>
        )}
        {phase !== "question" && (
          <div className="flex items-start gap-2">
            <div
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
            >
              <Logo size={17} />
            </div>
            <div className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-tl-sm border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm leading-relaxed">
              {answerText}
              {phase === "answer" && <Cursor />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Cursor() {
  return <span className="streaming-cursor ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-current align-middle" />;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
