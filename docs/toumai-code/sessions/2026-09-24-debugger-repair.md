# Toumaï Code — Session Debugger / Repair Web — 2026-09-24

## Portée

Session: `2026-09-24-debugger-repair`

Branche: `toumai-code/debugger-repair-20260924`

Base auditée: `main@f576d64f9dc750080f7ea5d9b4f0696944baadc8`

Aucun déploiement production n'a été demandé ni effectué.

## Architecture / contrat

Le frontend type et affiche le contrat public produit par le backend :
- `CodingCommandEvidence` ;
- `CodingDebugDiagnostic` ;
- `CodingDebugCycle` ;
- familles d'échec supportées ;
- statut `escalated` et raison ;
- agents séparés `debugger` et `repair`.

La phase UI est désormais `Debug & Repair`, et une escalade est visible sans présenter l'opération comme vérifiée.

## Fichiers modifiés

- `lib/chat-stream.ts` — contrat TypeScript Debugger/Repair et `debug_cycle`.
- `components/chat/CodingRunCard.tsx` — agents séparés et affichage de l'escalade.
- `scripts/verify-coding-debug-repair-contract.mjs` — test de contrat.
- `package.json` — commande `test:coding-debug-repair` et intégration à `npm test`.
- `.github/workflows/chat-rich-response-ci.yml` — test de contrat exécuté avant typecheck/build.

## Tests exécutés et résultats exacts

PR draft : #56.

Run final ciblé : `35932230718`, job `verify`, conclusion GitHub `success`.

Étapes :
- Install exact lockfile : success.
- Lint changed chat surface : success, avec 5 warnings existants et 0 erreur.
- Coding Debugger/Repair contract : success ; sortie `coding debug/repair contract: ok`.
- Typecheck (`tsc --noEmit`) : success.
- Production build (`next build`) : success ; compilation en 8.9 s, 41/41 pages statiques générées.
- Regression tests (`npm test`) : étape GitHub success.

Important : le log de `npm test` contient un contrôle historique qui imprime :
`DÉMONSTRATION DE L'ACCUEIL — contrôle en échec`
sur `components/ChatMessage.tsx` (ancienne forme de bulle), mais ce script retourne malgré cela exit code 0. Cette session ne présente donc pas l'intégralité des contrôles textuels comme réellement verte. Ce fichier n'a pas été modifié par le chantier Debugger/Repair.

Un run précédent (`35932052379`) avait échoué de façon intermittente pendant `next build` sur Newsreader/`next/font/google`; le run final ci-dessus a ensuite construit complètement avec succès sans changement de code lié aux fonts.

## Limites restantes

- Le frontend ne décide pas lui-même qu'un diagnostic est valide ; il affiche le contrat backend.
- Le contrôle historique de démonstration accueil doit être corrigé dans un chantier séparé, car sans relation avec la cause Debugger/Repair.
- Aucun merge et aucun déploiement production.

## Commits d'implémentation

- `61ddf867c550e26f7d463faec418e632c70f88a6` — contrat/UI.
- `8c1957e491dd4258d87bd3570f221e92a28eb22d` — preuve CI du contrat avant build.
