# Session Toumaï Code — Workspace UX

Session: `web-workspace-20260924`  
Branch: `feat/toumai-code-workspace-20260924`  
Base auditée: `f576d64f9dc750080f7ea5d9b4f0696944baadc8`

## Objectif

Construire l’expérience utilisateur Toumaï Code dans `toumai-web` sans reconstruire les primitives déjà présentes. Le chat doit publier des actions et preuves observables, et le Workspace Code doit séparer conversation et surfaces de travail.

## Audit avant modification

- `lib/chat-stream.ts` possédait déjà le contrat `coding_run` avec phases, agent courant, fichier courant, commandes de validation, qualité et validation dynamique.
- `components/chat/CodingRunCard.tsx` rendait déjà une progression de Coding Agent mais ne couvrait pas explicitement plan, tâches, repair loop, security, review et deployment.
- `components/chat/ChatContextPanel.tsx` fournissait déjà un workspace générique.
- `app/globals.css` force déjà le panneau workspace en plein écran sur périphériques tactiles.
- `components/ChatMessage.tsx` pouvait rendre `ReasoningPanel` pendant un run de code. Toumaï Code doit au contraire afficher uniquement des actions et preuves publiques.

## Architecture implémentée

- Contrat typé de preuves publiques ajouté à `CodingRunSnapshot`.
- `CodingRunCard` devient le journal compact du run dans la conversation.
- `CodeWorkspace` fournit les surfaces Files, Diff, Terminal logs, Tests, Preview, Browser screenshot, Security, Agents, Artifacts et Deployments.
- Le Workspace Code est plein écran sur mobile/tactile et s’ouvre à côté de la conversation sur desktop.
- Les commandes/logs/diffs passent par une redaction défensive côté rendu.
- Les previews distantes sont rendues dans une iframe sandboxée.
- La chain-of-thought n’est pas rendue lorsqu’un `codingRun` est présent.

## Fichiers modifiés

- `lib/chat-stream.ts`
- `lib/code-evidence.ts`
- `components/chat/CodingRunCard.tsx`
- `components/chat/CodeWorkspace.tsx`
- `components/chat/ChatContextPanel.tsx`
- `components/ChatMessage.tsx`
- `scripts/verify-toumai-code-workspace.mjs`
- `package.json`
- `.github/workflows/toumai-code-workspace.yml`
- `docs/toumai-code/sessions/web-workspace-20260924.md`

## Tests

À compléter après exécution réelle. Aucun statut vert n’est affirmé dans ce document avant la preuve CI.

## Limites restantes

- Les nouvelles surfaces restent vides tant que le backend ne publie pas les champs de preuve correspondants.
- Aucun code utilisateur/généré n’est exécuté dans le processus API par ce chantier frontend.
- Aucun déploiement production n’est effectué.

## Commit SHA

À compléter après commit et vérification.
