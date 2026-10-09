"use client";

import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Loader2, RefreshCw, Upload, X } from "lucide-react";

import {
  getWaMediaEditResearchResult,
  runWaMediaEditResearch,
  uploadWaAttachment,
  type WaLiveMessage,
  type WaMediaEditResearchMode,
  type WaMediaEditResearchResult,
} from "@/lib/whatsapp-enterprise-api";

const BORDER = "#1e2c36";
const SURFACE = "#0d1923";
const RAISED = "#101e29";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const ORANGE = "#ff9518";

const MODE_LABELS: Record<WaMediaEditResearchMode, string> = {
  E0_TEXT_CONTROL: "E0 — texte → texte (contrôle)",
  E1_MEDIA_TO_TEXT: "E1 — média → texte",
  E2_SAME_MEDIA_CAPTION: "E2 — même descripteur média, nouvelle légende",
  E3_REUPLOAD_SAME_MEDIA_CAPTION: "E3 — mêmes octets, ré-upload frais + nouvelle légende",
  E4_REPLACE_MEDIA: "E4 — remplacer le média",
  E5_SAME_ID_IMAGE_RESEND: "E5 — ré-envoyer une nouvelle image avec le même ID",
  E6_SAME_ID_EDIT_ENVELOPE: "E6 — edit + enveloppe portant le même ID",
  E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA: "E7 — nouveau média, vignette et dimensions d’origine",
  E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH: "E8 — nouveau média, hash de l’image d’origine",
};

function availableModes(message: WaLiveMessage): WaMediaEditResearchMode[] {
  const type = message.type === "voix" ? "voice" : message.type;
  if (type === "text" || type === "texte") return ["E0_TEXT_CONTROL"];
  if (type === "image") {
    return [
      "E1_MEDIA_TO_TEXT",
      "E2_SAME_MEDIA_CAPTION",
      "E3_REUPLOAD_SAME_MEDIA_CAPTION",
      "E4_REPLACE_MEDIA",
      "E5_SAME_ID_IMAGE_RESEND",
      "E6_SAME_ID_EDIT_ENVELOPE",
      "E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA",
      "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH",
    ];
  }
  if (["video", "gif", "document"].includes(type)) {
    return ["E1_MEDIA_TO_TEXT", "E2_SAME_MEDIA_CAPTION", "E4_REPLACE_MEDIA"];
  }
  return ["E1_MEDIA_TO_TEXT"];
}

export function WhatsAppMediaEditResearchModal({
  open,
  chatId,
  message,
  onClose,
}: {
  open: boolean;
  chatId: string;
  message: WaLiveMessage | null;
  onClose: () => void;
}) {
  const modes = useMemo(() => (message ? availableModes(message) : []), [message]);
  const [mode, setMode] = useState<WaMediaEditResearchMode>("E0_TEXT_CONTROL");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [runningStage, setRunningStage] = useState<"upload" | "gateway" | null>(null);
  const [runningSeconds, setRunningSeconds] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<WaMediaEditResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !message) return;
    const nextModes = availableModes(message);
    setMode(nextModes[0] || "E0_TEXT_CONTROL");
    setText("");
    setCaption(message.text || "");
    setFile(null);
    setResult(null);
    setError(null);
  }, [open, message]);

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      setRunningSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (!open || !message) return null;
  const activeMessage = message;

  async function run() {
    if (running) return;
    setRunningSeconds(0);
    setRunning(true);
    setRunningStage(needsReplacementFile ? "upload" : "gateway");
    setError(null);
    try {
      let url: string | undefined;
      let filename: string | undefined;
      let mimetype: string | undefined;
      const needsReplacementFile =
        mode === "E4_REPLACE_MEDIA" ||
        mode === "E5_SAME_ID_IMAGE_RESEND" ||
        mode === "E6_SAME_ID_EDIT_ENVELOPE" ||
        mode === "E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA" ||
        mode === "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH";
      if (needsReplacementFile) {
        if (!file) throw new Error("Choisissez la nouvelle image avant cette expérience.");
        const uploaded = await uploadWaAttachment(file, { normalize: false });
        url = uploaded.url;
        filename = uploaded.file_name || file.name;
        mimetype = file.type || undefined;
      }

      setRunningStage("gateway");

      const response = await runWaMediaEditResearch({
        chat_id: chatId,
        msg_id: activeMessage.id,
        mode,
        text: mode === "E0_TEXT_CONTROL" || mode === "E1_MEDIA_TO_TEXT" ? text.trim() : undefined,
        caption:
          mode === "E2_SAME_MEDIA_CAPTION" ||
          mode === "E3_REUPLOAD_SAME_MEDIA_CAPTION" ||
          mode === "E4_REPLACE_MEDIA" ||
          mode === "E5_SAME_ID_IMAGE_RESEND" ||
          mode === "E6_SAME_ID_EDIT_ENVELOPE" ||
          mode === "E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA" ||
          mode === "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH"
            ? caption
            : undefined,
        url,
        filename,
        mimetype,
        confirmed: true,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expérience impossible.");
    } finally {
      setRunning(false);
      setRunningStage(null);
    }
  }

  async function refreshResult() {
    if (!result?.experiment_id || refreshing) return;
    setRefreshing(true);
    setError(null);
    try {
      setResult(await getWaMediaEditResearchResult(result.experiment_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de relire l’expérience.");
    } finally {
      setRefreshing(false);
    }
  }

  const needsText = mode === "E0_TEXT_CONTROL" || mode === "E1_MEDIA_TO_TEXT";
  const needsCaption =
    mode === "E2_SAME_MEDIA_CAPTION" ||
    mode === "E3_REUPLOAD_SAME_MEDIA_CAPTION" ||
    mode === "E4_REPLACE_MEDIA" ||
    mode === "E5_SAME_ID_IMAGE_RESEND" ||
    mode === "E6_SAME_ID_EDIT_ENVELOPE" ||
    mode === "E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA" ||
    mode === "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH";
  const needsReplacementFile =
    mode === "E4_REPLACE_MEDIA" ||
    mode === "E5_SAME_ID_IMAGE_RESEND" ||
    mode === "E6_SAME_ID_EDIT_ENVELOPE" ||
    mode === "E7_FRESH_MEDIA_ORIGINAL_VISUAL_METADATA" ||
    mode === "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Laboratoire MEDIA_EDIT">
      <div className="w-full max-w-[620px] overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: BORDER, background: SURFACE, color: TEXT }}>
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical size={17} color={ORANGE} />
              Laboratoire MEDIA_EDIT
            </div>
            <p className="mt-1 text-[11px] leading-5" style={{ color: MUTED }}>
              Expérience protocolaire. « Transport accepté » ne signifie jamais que WhatsApp a réellement remplacé le rendu.
            </p>
          </div>
          <button type="button" aria-label="Fermer le laboratoire" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/[0.05]" style={{ color: MUTED }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border px-3 py-2.5 text-[11px]" style={{ borderColor: BORDER, background: RAISED }}>
            <div><span style={{ color: MUTED }}>Message :</span> {activeMessage.id}</div>
            <div className="mt-1"><span style={{ color: MUTED }}>Type :</span> {activeMessage.type}</div>
            <div className="mt-1"><span style={{ color: MUTED }}>Âge :</span> {Math.max(0, Math.floor((Date.now() - activeMessage.timestamp_ms) / 1000))} s</div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold" style={{ color: MUTED }}>Expérience</span>
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as WaMediaEditResearchMode);
                setResult(null);
                setError(null);
              }}
              className="h-10 w-full rounded-xl border bg-transparent px-3 text-[11px] outline-none"
              style={{ borderColor: BORDER, background: RAISED }}
            >
              {modes.map((candidate) => (
                <option key={candidate} value={candidate}>{MODE_LABELS[candidate]}</option>
              ))}
            </select>
          </label>

          {needsText && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold" style={{ color: MUTED }}>Texte de remplacement</span>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                placeholder={mode === "E0_TEXT_CONTROL" ? "E0 contrôle — texte modifié" : "E1 média → texte"}
                className="w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-[11px] outline-none"
                style={{ borderColor: BORDER, background: RAISED }}
              />
            </label>
          )}

          {needsCaption && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold" style={{ color: MUTED }}>Nouvelle légende</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={2}
                placeholder="Légende expérimentale"
                className="w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-[11px] outline-none"
                style={{ borderColor: BORDER, background: RAISED }}
              />
            </label>
          )}

          {needsReplacementFile && (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 text-[11px]" style={{ borderColor: BORDER, background: RAISED }}>
              <span className="min-w-0 truncate">{file ? file.name : "Choisir le média de remplacement"}</span>
              <span className="flex items-center gap-1.5" style={{ color: GREEN }}><Upload size={14} /> Parcourir</span>
              <input
                type="file"
                className="hidden"
                accept={activeMessage.type === "image" ? "image/*" : activeMessage.type === "document" ? "*/*" : "video/*"}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
          )}

          <div className="rounded-xl border px-3 py-2.5 text-[10px] leading-5" style={{ borderColor: "rgba(255,149,24,.35)", background: "rgba(255,149,24,.07)", color: "#ffd6a3" }}>
            Utilisez uniquement un message que vous venez d’envoyer. Le laboratoire ne modifie jamais localement le cache pour fabriquer un faux succès.
          </div>
          {mode === "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH" && (
            <div className="rounded-xl border px-3 py-2.5 text-[10px] leading-5" style={{ borderColor: "rgba(255,100,100,.35)", background: "rgba(255,100,100,.07)", color: "#ffb1b1" }}>
              Contrôle négatif : le hash annoncé sera celui de A alors que les octets téléversés seront ceux de B. Le média peut devenir illisible. Réservez ce test à un nouveau message sans importance.
            </div>
          )}

          {error && (
            <div className="rounded-xl border px-3 py-2.5 text-[10px]" style={{ borderColor: "rgba(255,100,100,.35)", background: "rgba(255,100,100,.07)", color: "#ffb1b1" }}>
              {error}
            </div>
          )}

          {running && (
            <div role="status" aria-live="polite" className="rounded-xl border px-3 py-2.5 text-[10px] leading-5" style={{ borderColor: "rgba(255,149,24,.35)", background: "rgba(255,149,24,.07)", color: "#ffd6a3" }}>
              {runningStage === "upload" ? "Téléversement de l’image de remplacement" : "Soumission à la passerelle WhatsApp"} · {runningSeconds} s
              {runningSeconds >= 30 && (
                <div>L’opération prend plus de temps que prévu. Attendez le résultat et ne relancez pas l’expérience : un envoi peut encore être en cours.</div>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-xl border px-3 py-3 text-[10px] leading-5" style={{ borderColor: BORDER, background: RAISED }}>
              <div><span style={{ color: MUTED }}>Experiment ID :</span> {result.experiment_id}</div>
              <div><span style={{ color: MUTED }}>Verdict technique :</span> {result.verdict}</div>
              <div><span style={{ color: MUTED }}>Transport :</span> {result.transport_accepted ? "accepté" : "non accepté"}</div>
              <div><span style={{ color: MUTED }}>Événement edit observé :</span> {result.gateway_update_has_edited_message ? "oui" : "pas encore"}</div>
              <div><span style={{ color: MUTED }}>Type observé :</span> {result.gateway_update_type || "—"}</div>
              <div><span style={{ color: MUTED }}>Mutation cache Toumaï :</span> {result.cache_mutation ? "oui" : "non"}</div>
              {typeof result.gateway_update_matches_replacement === "boolean" && (
                <div>
                  <span style={{ color: MUTED }}>Update passerelle porte la nouvelle image :</span>{" "}
                  {result.gateway_update_matches_replacement ? "oui" : "non"}
                </div>
              )}
              {result.protocol_upserts && result.protocol_upserts.length > 0 && (
                <div>
                  <span style={{ color: MUTED }}>Enveloppes edit observées :</span>{" "}
                  {result.protocol_upserts
                    .map((item) =>
                      `${item.eventType || "?"}:${item.editedType || "?"}:${item.matchesReplacement ? "nouvelle-image" : "autre"}`,
                    )
                    .join(" · ")}
                </div>
              )}
              {result.evidence?.strategy && (
                <div className="mt-2 border-t pt-2" style={{ borderColor: BORDER }}>
                  <div><span style={{ color: MUTED }}>Stratégie de preuve :</span> {result.evidence.strategy}</div>
                  {typeof result.evidence.descriptorIdentical === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>Descripteur média strictement identique :</span>{" "}
                      {result.evidence.descriptorIdentical ? "oui" : "non"}
                    </div>
                  )}
                  {typeof result.evidence.sourceHashMatchesOriginalProto === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>SHA-256 téléchargé = fichier original :</span>{" "}
                      {result.evidence.sourceHashMatchesOriginalProto ? "oui" : "non"}
                    </div>
                  )}
                  {typeof result.evidence.samePlainBytesAfterReupload === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>Même contenu après ré-upload :</span>{" "}
                      {result.evidence.samePlainBytesAfterReupload ? "oui" : "non"}
                    </div>
                  )}
                  {typeof result.evidence.descriptorChanged === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>Nouveau descripteur chiffré :</span>{" "}
                      {result.evidence.descriptorChanged ? "oui" : "non"}
                    </div>
                  )}
                  {typeof result.evidence.replacementDiffersFromOriginal === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>Nouvelle image différente de l’originale :</span>{" "}
                      {result.evidence.replacementDiffersFromOriginal ? "oui" : "non"}
                    </div>
                  )}
                  {typeof result.evidence.outputMatchesReplacement === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>{result.mode === "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH" ? "Hash annoncé = nouvelle image :" : "Fichier WhatsApp = nouvelle image :"}</span>{" "}
                      {result.evidence.outputMatchesReplacement ? "oui" : "non"}
                    </div>
                  )}
                  {typeof result.evidence.returnedSameMessageId === "boolean" && (
                    <div>
                      <span style={{ color: MUTED }}>ID retourné = ID original :</span>{" "}
                      {result.evidence.returnedSameMessageId ? "oui" : "non"}
                    </div>
                  )}
                  {result.evidence.copiedFields && (
                    <div><span style={{ color: MUTED }}>Métadonnées A conservées :</span> {result.evidence.copiedFields.join(", ") || "aucune"}</div>
                  )}
                  {result.evidence.uploadedFileSha256 && (
                    <div className="break-all font-mono"><span style={{ color: MUTED }}>SHA-256 des octets téléversés :</span> {result.evidence.uploadedFileSha256}</div>
                  )}
                  {result.evidence.submittedFileSha256 && (
                    <div className="break-all font-mono"><span style={{ color: MUTED }}>fileSha256 annoncé dans l’edit :</span> {result.evidence.submittedFileSha256}</div>
                  )}
                  {result.evidence.hybridDimensions && (
                    <div><span style={{ color: MUTED }}>Dimensions envoyées :</span> {result.evidence.hybridDimensions.width ?? "—"} × {result.evidence.hybridDimensions.height ?? "—"}</div>
                  )}
                  {result.evidence.hybridThumbnailFingerprint && (
                    <div className="break-all font-mono"><span style={{ color: MUTED }}>Empreinte vignette envoyée :</span> {result.evidence.hybridThumbnailFingerprint}</div>
                  )}
                  {result.evidence.originalByteLength != null && (
                    <div><span style={{ color: MUTED }}>Octets image originale :</span> {result.evidence.originalByteLength}</div>
                  )}
                  {result.evidence.replacementByteLength != null && (
                    <div><span style={{ color: MUTED }}>Octets nouvelle image :</span> {result.evidence.replacementByteLength}</div>
                  )}
                  {result.evidence.originalPlainSha256 && (
                    <div className="break-all font-mono">
                      <span style={{ color: MUTED }}>SHA-256 original :</span> {result.evidence.originalPlainSha256}
                    </div>
                  )}
                  {result.evidence.replacementPlainSha256 && (
                    <div className="break-all font-mono">
                      <span style={{ color: MUTED }}>SHA-256 remplacement :</span> {result.evidence.replacementPlainSha256}
                    </div>
                  )}
                  {result.evidence.sourceByteLength != null && (
                    <div><span style={{ color: MUTED }}>Octets source :</span> {result.evidence.sourceByteLength}</div>
                  )}
                  {result.evidence.sourcePlainSha256 && (
                    <div className="break-all font-mono">
                      <span style={{ color: MUTED }}>SHA-256 source :</span> {result.evidence.sourcePlainSha256}
                    </div>
                  )}
                  {result.evidence.outputFileSha256 && result.mode !== "E8_FRESH_MEDIA_ORIGINAL_PLAIN_HASH" && (
                    <div className="break-all font-mono">
                      <span style={{ color: MUTED }}>SHA-256 du média envoyé :</span> {result.evidence.outputFileSha256}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => void refreshResult()}
                disabled={refreshing}
                className="mt-2 inline-flex h-8 items-center gap-2 rounded-lg border px-3 font-semibold disabled:opacity-60"
                style={{ borderColor: BORDER, color: GREEN }}
              >
                {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Relire la passerelle
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: BORDER }}>
          <button type="button" onClick={onClose} className="h-9 rounded-xl px-4 text-[11px] font-semibold hover:bg-white/[0.04]" style={{ color: MUTED }}>
            Fermer
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || (needsText && !text.trim()) || (needsReplacementFile && !file)}
            className="inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[11px] font-semibold disabled:opacity-50"
            style={{ background: GREEN, color: "#032417" }}
          >
            {running ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            Lancer l’expérience
          </button>
        </div>
      </div>
    </div>
  );
}
