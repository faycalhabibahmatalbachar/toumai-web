"use client";

/**
 * Rendu ordonné des blocs d'une réponse (contrat SSE `metadata.blocks`).
 *
 * Chaque type de bloc est délégué au système de widgets :
 * `components/chat/widgets/registry.tsx` pour les widgets, et les composants
 * de `widgets/kinds/` pour les sources, actions et fichiers. Ce fichier ne
 * dessine plus rien lui-même.
 */

import type { ResponseBlock } from "@/lib/chat-response";
import { activityLabel } from "@/lib/tool-ui";
import { rec, type Rec } from "@/lib/widgets/core";
import { MediaMessage, imagesFromUrls } from "./media/MediaMessage";
import type { ChatImage } from "./media/types";
import { ActionExecutionCard } from "./widgets/ActionExecutionCard";
import { ActionStepsWidget } from "./widgets/kinds/ActionStepsWidget";
import { FileWidget } from "./widgets/kinds/FileWidget";
import { SourcesCard } from "./widgets/kinds/ResearchWidgets";
import { InlineProgress } from "./widgets/primitives";
import { WidgetRenderer } from "./widgets/registry";
import { safeHttpUrl } from "@/lib/widgets/core";

function webImages(block: Extract<ResponseBlock, { type: "web_images" }>): ChatImage[] {
  return block.images
    .map((image, index): ChatImage | null => {
      const url = safeHttpUrl(image.url);
      if (!url) return null;
      return {
        id: `${url}-${index}`,
        url,
        alt: image.title || "Image issue de la recherche Web",
        sourceUrl: safeHttpUrl(image.source_url) || undefined,
        sourceTitle: image.title,
      };
    })
    .filter((image): image is ChatImage => Boolean(image));
}

function isFinishedResearch(block: ResponseBlock): boolean {
  if (block.type !== "widget" || !["search_activity", "web_search"].includes(block.widget.type)) return false;
  return (rec(block.widget.data) as Rec).status === "done";
}

export function RichResponseBlocks({
  blocks,
  hideConfirmation = false,
  streaming = false,
}: {
  blocks?: ResponseBlock[];
  /** Un bloc `activity` décrit ce qui se passe MAINTENANT. Le serveur le
   * persiste avec la réponse : relu depuis l'historique, il afficherait un
   * indicateur qui tourne pour toujours. Il n'est donc rendu qu'en direct. */
  streaming?: boolean;
  /** ChatMessage peut encore porter `toolConfirmation` pendant la migration.
   * Quand il existe, ActionExecutionCard est l'unique surface du runtime :
   * ni le bloc de confirmation ni le bloc actions ne sont dupliqués. */
  hideConfirmation?: boolean;
}) {
  if (!blocks?.length) return null;

  // Une recherche terminée ET ses sources = une seule carte : les sources.
  const hasSources = blocks.some((block) => block.type === "sources" && block.sources.length > 0);

  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id || `${block.type}-${index}`;
        switch (block.type) {
          case "sources":
            return <SourcesCard key={key} sources={block.sources} />;
          case "web_images": {
            const images = webImages(block);
            return images.length ? <section key={key} className="mt-3" aria-label="Images de la recherche Web"><MediaMessage images={images} /></section> : null;
          }
          case "generated_images":
            return block.urls.length ? (
              <div key={key} className="mt-3">
                <MediaMessage images={imagesFromUrls(block.urls, { alt: "Image générée par Toumaï AI" })} />
              </div>
            ) : null;
          case "widget":
            if (hasSources && isFinishedResearch(block)) return null;
            return <WidgetRenderer key={key} widget={block.widget} />;
          case "actions":
            return hideConfirmation ? null : <ActionStepsWidget key={key} steps={block.steps} />;
          case "file":
            return <FileWidget key={key} data={block.file as unknown as Rec} />;
          case "activity":
            return streaming ? <InlineProgress key={key} label={block.label || activityLabel(block.activity, block.detail)} /> : null;
          case "tool_confirmation":
            return hideConfirmation ? null : <ActionExecutionCard key={key} confirmation={block.confirmation} />;
          default:
            return null;
        }
      })}
    </>
  );
}
