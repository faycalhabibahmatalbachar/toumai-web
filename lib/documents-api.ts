import { API_BASE } from "./config";
import { authHeaders } from "./api";
import { handleUnauthorized } from "./session-guard";

export interface UploadedDocument {
  doc_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  preview_text: string;
}

/** Upload un fichier (PDF/DOCX/XLSX/image, 10 Mo max) — indexé côté backend
 * pour que le prochain message puisse le référencer via document_id. */
export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  if (res.status === 401) handleUnauthorized();
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.message || `Erreur ${res.status}`);
  }
  return body.data as UploadedDocument;
}
