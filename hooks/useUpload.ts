"use client";
import { useCallback, useState } from "react";
import { API_BASE } from "@/lib/config";
import { authHeaders } from "@/lib/api";
import type { UploadedDocument } from "@/lib/documents-api";
import type { UploadItem } from "@/components/chat/media/types";

/** Upload réel vers POST /documents/upload avec suivi de progression (XHR —
 * fetch ne remonte pas la progression d'un upload). Une pièce jointe à la
 * fois, comme le supporte le backend actuel (`document_id` unique par
 * message) — pas de file d'attente multi-fichiers simulée artificiellement. */
export function useUpload() {
  const [item, setItem] = useState<UploadItem | null>(null);

  const upload = useCallback((file: File) => {
    const id = `${file.name}-${file.size}-${Date.now()}`;
    setItem({ id, file, name: file.name, size: file.size, progress: 0, status: "uploading" });

    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/documents/upload`);
    const headers = authHeaders();
    for (const [k, v] of Object.entries(headers)) {
      if (typeof v === "string") xhr.setRequestHeader(k, v);
    }

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      setItem((prev) => (prev && prev.id === id ? { ...prev, progress: Math.round((e.loaded / e.total) * 100) } : prev));
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.success !== false) {
          const doc = body.data as UploadedDocument;
          setItem((prev) =>
            prev && prev.id === id
              ? {
                  ...prev,
                  progress: 100,
                  status: "done",
                  result: {
                    id: doc.doc_id,
                    url: URL.createObjectURL(file),
                    size: file.size,
                    mimeType: file.type,
                    alt: doc.filename,
                    isUserAttachment: true,
                  },
                }
              : prev,
          );
        } else {
          setItem((prev) =>
            prev && prev.id === id ? { ...prev, status: "error", error: body.message || `Erreur ${xhr.status}` } : prev,
          );
        }
      } catch {
        setItem((prev) => (prev && prev.id === id ? { ...prev, status: "error", error: "Réponse invalide" } : prev));
      }
    };

    xhr.onerror = () => {
      setItem((prev) => (prev && prev.id === id ? { ...prev, status: "error", error: "Échec réseau" } : prev));
    };

    xhr.send(form);
  }, []);

  const retry = useCallback(() => {
    if (item) upload(item.file);
  }, [item, upload]);

  const clear = useCallback(() => setItem(null), []);

  return { item, upload, retry, clear };
}
