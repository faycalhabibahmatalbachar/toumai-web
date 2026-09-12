import fs from "node:fs";

const response = fs.readFileSync("lib/chat-response.ts", "utf8");
const renderer = fs.readFileSync("components/chat/RichResponseBlocks.tsx", "utf8");
const stream = fs.readFileSync("lib/chat-stream.ts", "utf8");
const chat = fs.readFileSync("app/chat/page.tsx", "utf8");
const dropZone = fs.readFileSync("components/chat/media/DropZone.tsx", "utf8");

const checks = [
  ["typed sources block", response.includes('type: "sources"')],
  ["typed web images block", response.includes('type: "web_images"')],
  ["typed widget block", response.includes('type: "widget"')],
  ["legacy bridge", response.includes("blocksFromMetadata")],
  ["block merge", response.includes("mergeResponseBlocks")],
  ["safe external URL gate", renderer.includes("safeHttpUrl")],
  ["weather widget", renderer.includes('widget.type === "weather"')],
  ["table widget", renderer.includes('widget.type === "table"')],
  ["SSE accepts blocks", stream.includes("blocks?: ResponseBlock[]")],
  ["multi-document stream", stream.includes("document_ids: params.documentIds")],
  ["composer max five", chat.includes("5 - attachedDocs.length")],
  ["server delete on remove", chat.includes("deleteDocument(docId)")],
  ["drag-drop extension matching", dropZone.includes('pattern.startsWith(".")') && dropZone.includes("name.endsWith(pattern)")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  for (const [name] of failed) console.error(`chat-rich-response: missing ${name}`);
  process.exit(1);
}
console.log(`Chat rich response checks passed (${checks.length}).`);
