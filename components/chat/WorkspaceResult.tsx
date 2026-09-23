"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, Eye, FileCode2 } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import {
  assembleForPreview,
  entryHtml,
  parseProject,
  type ProjectFile,
} from "@/lib/project-parser";

function extractHtmlBlock(content: string): string | null {
  const match = content.match(/\`\`\`html[^\n\`]*\n([\s\S]*?)\`\`\`/i);
  if (!match) return null;
  const html = match[1].trim();
  return html.length > 40 ? html : null;
}

function cleanResultMarkdown(content: string): string {
  return content.trim();
}

export function WorkspaceResult({ content }: { content: string }) {
  const projectFiles = useMemo(() => parseProject(content), [content]);
  const html = useMemo(() => extractHtmlBlock(content), [content]);
  const isProject = projectFiles.length >= 2;
  const hasPreview = isProject || Boolean(html);
  const firstProjectFile = isProject
    ? entryHtml(projectFiles)?.path || projectFiles[0]?.path || ""
    : "";
  const [mode, setMode] = useState<"result" | "preview" | "code">(
    hasPreview ? "preview" : "result",
  );
  const [activePath, setActivePath] = useState(firstProjectFile);
  const [copied, setCopied] = useState(false);

  const activeFile: ProjectFile | undefined = isProject
    ? projectFiles.find((file) => file.path === activePath) || projectFiles[0]
    : undefined;

  const previewHtml = useMemo(() => {
    if (isProject) return assembleForPreview(projectFiles, firstProjectFile);
    return html || "";
  }, [firstProjectFile, html, isProject, projectFiles]);

  async function copyResult() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadResult() {
    const isCodeArtifact = isProject || Boolean(html);
    const blob = new Blob([isCodeArtifact && previewHtml ? previewHtml : content], {
      type: isCodeArtifact ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isCodeArtifact ? "toumai-resultat.html" : "toumai-resultat.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="workspace-result flex min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-0.5">
          <button
            type="button"
            onClick={() => setMode("result")}
            aria-pressed={mode === "result"}
            className="rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition data-[active=true]:bg-[var(--card)] data-[active=true]:text-[var(--text-primary)]"
            data-active={mode === "result"}
          >
            Résultat
          </button>
          {hasPreview ? (
            <button
              type="button"
              onClick={() => setMode("preview")}
              aria-pressed={mode === "preview"}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition data-[active=true]:bg-[var(--card)] data-[active=true]:text-[var(--text-primary)]"
              data-active={mode === "preview"}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Aperçu
            </button>
          ) : null}
          {hasPreview ? (
            <button
              type="button"
              onClick={() => setMode("code")}
              aria-pressed={mode === "code"}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition data-[active=true]:bg-[var(--card)] data-[active=true]:text-[var(--text-primary)]"
              data-active={mode === "code"}
            >
              <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" />
              Code
            </button>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={copyResult}
            className="chat-iconbtn"
            aria-label={copied ? "Résultat copié" : "Copier le résultat"}
            title={copied ? "Copié" : "Copier"}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={downloadResult}
            className="chat-iconbtn"
            aria-label="Télécharger le résultat"
            title="Télécharger"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {mode === "preview" && hasPreview ? (
        <div className="min-h-[28rem] flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          <iframe
            title="Aperçu du résultat"
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            srcDoc={previewHtml}
            className="h-[min(68vh,46rem)] w-full border-0 bg-white"
          />
        </div>
      ) : null}

      {mode === "code" && hasPreview ? (
        <div className="min-h-0">
          {isProject ? (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {projectFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setActivePath(file.path)}
                  aria-pressed={activeFile?.path === file.path}
                  className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 font-mono text-[10.5px] text-[var(--text-secondary)] transition data-[active=true]:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] data-[active=true]:bg-[var(--card)] data-[active=true]:text-[var(--text-primary)]"
                  data-active={activeFile?.path === file.path}
                >
                  {file.path}
                </button>
              ))}
            </div>
          ) : null}
          <CodeBlock
            language={activeFile?.lang || "html"}
            code={activeFile?.content || html || ""}
            runnable={false}
          />
        </div>
      ) : null}

      {mode === "result" ? (
        <div className="workspace-result-markdown prose-toumai min-w-0">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre(props) {
                return <>{props.children}</>;
              },
              code(props) {
                const { className, children } = props;
                const match = /language-(\w+)/.exec(className || "");
                const codeText = children === undefined || children === null
                  ? ""
                  : String(children).replace(/\n$/, "");
                if (!match) return <code className={className}>{children}</code>;
                if (!codeText.trim()) return null;
                return <CodeBlock language={match[1]} code={codeText} runnable={false} />;
              },
            }}
          >
            {cleanResultMarkdown(content)}
          </ReactMarkdown>
        </div>
      ) : null}
    </section>
  );
}
