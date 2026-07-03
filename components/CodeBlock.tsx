"use client";

import { useEffect, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import java from "highlight.js/lib/languages/java";
import yaml from "highlight.js/lib/languages/yaml";

let registered = false;
function ensureLanguages() {
  if (registered) return;
  hljs.registerLanguage("javascript", javascript);
  hljs.registerLanguage("js", javascript);
  hljs.registerLanguage("typescript", typescript);
  hljs.registerLanguage("ts", typescript);
  hljs.registerLanguage("tsx", typescript);
  hljs.registerLanguage("jsx", javascript);
  hljs.registerLanguage("python", python);
  hljs.registerLanguage("py", python);
  hljs.registerLanguage("bash", bash);
  hljs.registerLanguage("sh", bash);
  hljs.registerLanguage("shell", bash);
  hljs.registerLanguage("json", json);
  hljs.registerLanguage("html", xml);
  hljs.registerLanguage("xml", xml);
  hljs.registerLanguage("css", css);
  hljs.registerLanguage("sql", sql);
  hljs.registerLanguage("java", java);
  hljs.registerLanguage("yaml", yaml);
  hljs.registerLanguage("yml", yaml);
  registered = true;
}

export function CodeBlock({ language, code }: { language: string; code: string }) {
  ensureLanguages();
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    try {
      const lang = language && hljs.getLanguage(language) ? language : undefined;
      const result = lang ? hljs.highlight(code, { language: lang }) : hljs.highlightAuto(code);
      ref.current.innerHTML = result.value;
    } catch {
      if (ref.current) ref.current.textContent = code;
    }
  }, [code, language]);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-center justify-between bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-tertiary)]">
        <span>{language || "text"}</span>
        <button
          onClick={copy}
          className="rounded px-2 py-0.5 transition hover:bg-white/5 hover:text-[var(--text-primary)]"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto bg-[var(--surface)] p-3">
        <code ref={ref} className={`hljs language-${language || "plaintext"} text-[13px]`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
