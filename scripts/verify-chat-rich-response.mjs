import fs from "node:fs";

const response = fs.readFileSync("lib/chat-response.ts", "utf8");
const renderer = fs.readFileSync("components/chat/RichResponseBlocks.tsx", "utf8");
const stream = fs.readFileSync("lib/chat-stream.ts", "utf8");
const chat = fs.readFileSync("app/chat/page.tsx", "utf8");
const dropZone = fs.readFileSync("components/chat/media/DropZone.tsx", "utf8");
const actionCard = fs.readFileSync("components/chat/widgets/ActionExecutionCard.tsx", "utf8");
const registry = fs.readFileSync("components/chat/widgets/registry.tsx", "utf8");
const research = fs.readFileSync("components/chat/widgets/kinds/ResearchWidgets.tsx", "utf8");
const i18n = fs.readFileSync("lib/widgets/i18n.ts", "utf8");

const checks = [
  ["typed sources block", response.includes('type: "sources"')],
  ["typed web images block", response.includes('type: "web_images"')],
  ["typed widget block", response.includes('type: "widget"')],
  ["legacy bridge", response.includes("blocksFromMetadata")],
  ["block merge", response.includes("mergeResponseBlocks")],
  ["safe external URL gate", renderer.includes("safeHttpUrl")],
  ["web research header", i18n.includes('title: "Recherche sur le Web"') && research.includes("t.search.title")],
  ["visited websites", research.includes("readCount") && research.includes("t.search.visited")],
  ["site icons", research.includes("SourceFavicon") && research.includes("favicon_url") && research.includes("safeHttpUrl(favicon)")],
  ["expandable source websites", research.includes("aria-expanded") && renderer.includes("<SourcesCard")],
  ["source numbering stays visible", research.includes("{index + 1}")],
  ["weather widget", registry.includes("weather: {") && registry.includes("WeatherWidget")],
  ["table widget", registry.includes("table: {") && registry.includes("TableWidget")],
  ["unknown widget falls back safely", registry.includes("GenericWidget")],
  ["SSE accepts blocks", stream.includes("blocks?: ResponseBlock[]")],
  ["multi-document stream", stream.includes("document_ids: params.documentIds")],
  ["composer max five", chat.includes("5 - attachedDocs.length")],
  ["server delete on remove", chat.includes("deleteDocument(docId)")],
  ["drag-drop extension matching", dropZone.includes('pattern.startsWith(".")') && dropZone.includes("name.endsWith(pattern)")],
  ["attachment ids kept in messages", chat.includes("id: doc.doc_id")],
  ["regenerate keeps document ids", chat.includes("dernierUtilisateur?.pieces?.map((piece) => piece.id)")],
  ["edit keeps document ids", chat.includes("edited.pieces?.map((piece) => piece.id)")],
  ["per-file upload progress", chat.includes('role="progressbar"') && chat.includes("upload.progress")],
  ["progress upload api", fs.readFileSync("lib/documents-api.ts", "utf8").includes("uploadDocumentWithProgress")],
  ["upload cancellation", chat.includes("uploadControllersRef") && chat.includes("annulerUpload(upload.id)")],
  ["unsent upload cleanup", chat.includes("documentsNonEnvoyes") && chat.includes("deleteDocument(doc.doc_id)")],
  ["unmount upload cleanup", chat.includes("attachedDocsRef.current") && chat.includes("controller.abort()")],
  ["active uploads count toward limit", chat.includes("5 - attachedDocs.length - uploadsActifs")],
  ["typed actions block", response.includes('type: "actions"') && response.includes("interface ActionStep")],
  ["actions block rendered", renderer.includes("<ActionStepsWidget") && renderer.includes('"actions"')],
  ["legacy action_steps bridge", response.includes("meta.action_steps")],
  ["confirmation carries pending_id", stream.includes("pending_id?: string | null")],
  ["confirm sends pending_id", actionCard.includes("pending_id: confirmation.pending_id")],
  ["cancel releases pending action", actionCard.includes("runtime.tools.cancel(confirmation.pending_id)")],
  ["pending action reconciled after reload", actionCard.includes("runtime.tools.pendingStatus(pendingId)") && fs.readFileSync("components/chat/widgets/runtime.tsx", "utf8").includes("/agent/actions/pending/status")],
  ["confirmation result is truth-based", !actionCard.includes('"already_processed"') && actionCard.includes("body.data?.action") && actionCard.includes("pending_status")],
  ["double confirm is client-locked", actionCard.includes("confirmInFlight.current")],
  ["running confirmation is polled", actionCard.includes('status === "confirmed" || status === "executing"') && actionCard.includes("setTimeout(reconcile, 1800)")],
  ["blocked workflow step rendered", actionCard.includes('step.state === "blocked"') && actionCard.includes("Non exécuté")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`chat-rich-response: missing ${name}`);
  process.exit(1);
}
console.log(`Chat rich response checks passed (${checks.length}).`);
