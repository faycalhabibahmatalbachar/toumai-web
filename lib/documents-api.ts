import { http, postForm } from "./http";
import { API_BASE } from "./config";
import { authHeaders, ensureFreshSession, refreshSession } from "./api";
import { handleUnauthorized } from "./session-guard";
import { HttpError } from "./errors";

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

type UploadEnvelope = {
  success?: boolean;
  message?: string;
  data?: UploadedDocument;
};

/** Upload un fichier (PDF/DOCX/XLSX/image, 10 Mo max) — indexé côté backend
 * pour que le prochain message puisse le référencer via document_id. */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file);
  return postForm<UploadedDocument>("/documents/upload", form);
}

function uploadOnce(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<{ status: number; body: UploadEnvelope }> {
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
      onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 99)));
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
      let body: UploadEnvelope = {};
      try {
        body = JSON.parse(xhr.responseText || "{}") as UploadEnvelope;
      } catch {
        if (xhr.status >= 200 && xhr.status < 300) {
          reject(new Error("Réponse d'upload invalide"));
          return;
        }
      }
      resolve({ status: xhr.status, body });
    };

    xhr.onerror = () => {
      cleanup();
      reject(new TypeError("Échec réseau pendant l'upload"));
    };
    xhr.ontimeout = () => {
      cleanup();
      reject(new DOMException("Délai d'upload dépassé", "TimeoutError"));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload annulé", "AbortError"));
    };
    xhr.timeout = 120_000;
    xhr.send(form);
  });
}

export async function uploadDocumentWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadedDocument> {
  // Renouvellement préventif avant un transfert potentiellement long.
  await ensureFreshSession();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { status, body } = await uploadOnce(file, onProgress, signal);

    if (status >= 200 && status < 300 && body.success !== false && body.data) {
      onProgress?.(100);
      return body.data;
    }

    if (status === 401 && attempt === 0) {
      // Le chemin avec progression utilisait XMLHttpRequest, donc il échappait
      // au retry 401 centralisé de authFetch. Résultat : un gros fichier pouvait
      // finir son transfert juste après rotation du token et échouer alors que
      // la session était parfaitement récupérable. On renouvelle et rejoue UNE
      // seule fois avec le nouveau Bearer, sans boucle infinie.
      const outcome = await refreshSession();
      if (outcome.status === "ok") {
        onProgress?.(0);
        continue;
      }
      if (outcome.status === "unavailable") throw new HttpError(503);
      handleUnauthorized();
      throw new HttpError(401);
    }

    throw new HttpError(status || 502, body.message);
  }

  throw new HttpError(502);
}

/** Supprime un document privé déjà uploadé mais retiré avant envoi. */
export async function deleteDocument(docId: string): Promise<void> {
  await http.delete<{ doc_id: string }>(`/documents/${encodeURIComponent(docId)}`);
}
