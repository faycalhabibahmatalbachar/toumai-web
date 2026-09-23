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

## Tests exécutés et résultats exacts

Code vérifié : `514b74a78b97738ff1c451486ee40b6f102b153f`  
Workflow : `Toumai Code Workspace` — run `35932507840`, job `107422098289`.

- `npm ci` → success.
- `npm run typecheck` → success.
- `npm run test:toumai-code` → success, **8/8 PASS** :
  - typed public evidence contract ;
  - chat exposes requested public phases ;
  - coding run hides chain of thought ;
  - workspace has all requested surfaces ;
  - workspace uses secret redaction ;
  - preview is sandboxed ;
  - context switches to code workspace ;
  - mobile workspace remains fullscreen.
- `npx eslint components/ChatMessage.tsx components/chat/ChatContextPanel.tsx components/chat/CodingRunCard.tsx components/chat/CodeWorkspace.tsx lib/chat-stream.ts lib/code-evidence.ts` → success avec **0 erreur, 2 warnings** `@next/next/no-img-element` :
  - `components/ChatMessage.tsx:466:13` (préexistant au chantier) ;
  - `components/chat/CodeWorkspace.tsx:436:15` (capture navigateur distante).
- Le premier run de CI avait échoué avec exit code 1 sur deux erreurs ESLint (`react-hooks/set-state-in-effect` et `react-hooks/preserve-manual-memoization`). Les deux causes ont été corrigées sans désactiver les règles ; le run ci-dessus est la preuve de réexécution réussie.
- Après la dernière vérification du SHA de code, les 10 workflows déclenchés sur la PR sont `completed/success` : `Toumai Code Workspace`, `Chat rich response CI`, `Chat rich results regression`, `Reasoning privacy web`, `No anonymous auth regression`, `Dependency security`, `Today Center Web`, `Reminder multichannel web`, `Personal reminder widget` et `Toumai Voice V1 Web`. Cela ne constitue pas une affirmation de production-readiness : aucun build de production ni déploiement n’a été exécuté dans cette session.

## Limites restantes

- Les nouvelles surfaces restent vides tant que le backend ne publie pas les champs de preuve correspondants.
- Le frontend n’invente aucun statut de test, review, sécurité ou déploiement ; l’absence de preuve est explicitement affichée.
- Deux warnings `no-img-element` restent présents ; ils ne bloquent pas ESLint mais doivent être traités séparément si l’optimisation d’image devient une exigence.
- Aucun code utilisateur/généré n’est exécuté dans le processus API par ce chantier frontend.
- Aucun déploiement production n’a été effectué.
- La PR reste en draft et n’est pas fusionnée.

## Commit SHA

Commit de code vérifié : `514b74a78b97738ff1c451486ee40b6f102b153f`.
