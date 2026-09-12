import { http, postForm } from "./http";
import { API_BASE } from "./config";
import { authHeaders } from "./api";

export interface UploadedDocument {
  doc_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  file_size?: number;
  mime_type?: string;
  preview_text: string;
  storage_url?: string;
  texte_lu?: boolean;
}

/** Upload un fichier (PDF/DOCX/XLSX/image, 10 Mo max) — indexé côté backend
 * pour que le prochain message puisse le référencer via document_id. */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file);
  return postForm<UploadedDocument>("/documents/upload", form);
}

export function uploadDocumentWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadedDocument> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/documents/upload`);
    for (const [key, value] of Object.entries(authHeaders())) {
      if (typeof value === "string") xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    const onAbort = () => xhr.abort();
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Upload annulé", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.onload = () => {
      cleanup();
      try {
        const body = JSON.parse(xhr.responseText || "{}") as {
          success?: boolean;
          message?: string;
          data?: UploadedDocument;
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.success !== false && body.data) {
          onProgress?.(100);
          resolve(body.data);
          return;
        }
        reject(new Error(body.message || `Erreur upload ${xhr.status}`));
      } catch {
        reject(new Error("Réponse d'upload invalide"));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Échec réseau pendant l'upload"));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new Error("Délai d'upload dépassé"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload annulé", "AbortError"));
    };
    xhr.timeout = 120_000;
    xhr.send(form);
  });
}


/** Supprime un document privé déjà uploadé mais retiré avant envoi. */
export async function deleteDocument(docId: string): Promise<void> {
  await http.delete<{ doc_id: string }>(`/documents/${encodeURIComponent(docId)}`);
}
